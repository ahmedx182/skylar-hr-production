import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { deleteAfterMs } from "@/features/platform/lifecycle";
import { isPlatformAdminEmail } from "@/server/auth/platform-admin-email";
import type { AuthSession } from "@/types/auth";

export type UserAction = "suspend" | "unsuspend" | "delete" | "restore";
type Actor = Pick<AuthSession, "uid" | "email">;

const USERS = "users";
const AUDIT = "platform_audit_log";
const AUDIT_ACTION = {
  suspend: "user_suspend",
  unsuspend: "user_unsuspend",
  delete: "user_delete",
  restore: "user_restore",
} as const;

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Signs the user out everywhere. The status check already blocks every request; this also ends their Firebase sessions. */
async function revokeSessions(uid: string) {
  try {
    await adminAuth().revokeRefreshTokens(uid);
  } catch {
    /* the account is blocked by its status either way */
  }
}

/**
 * Suspending and deleting both set the account to "disabled", which every sign-in and request check
 * already honours. Deleting also starts the retention clock, after which the daily job erases the account.
 */
export async function applyUserAction({
  userId,
  action,
  reason,
  confirmEmail,
  actor,
}: {
  userId: string;
  action: UserAction;
  reason: string | null;
  confirmEmail?: string;
  actor: Actor;
}): Promise<void> {
  const db = adminDb();
  const ref = db.collection(USERS).doc(userId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new NotFoundError("User not found.");

  const email = text(snapshot.get("email")) ?? "";
  const isDeleted = snapshot.get("deletedAt") != null;
  const isSuspended = snapshot.get("status") === "disabled" && !isDeleted;

  if (userId === actor.uid) throw new ConflictError("You can't change your own account.");
  if (await isPlatformAdminEmail(email, true)) throw new ConflictError("Super admins can't be suspended or deleted. Remove their super admin access first.");

  const now = FieldValue.serverTimestamp();
  let patch: Record<string, unknown>;

  switch (action) {
    case "suspend":
      if (isDeleted) throw new ConflictError("This account is deleted. Restore it first.");
      if (isSuspended) throw new ConflictError("This account is already suspended.");
      patch = { status: "disabled", suspendedAt: now, suspendedBy: actor.uid, suspendedReason: reason };
      break;
    case "unsuspend":
      if (isDeleted || !isSuspended) throw new ConflictError("This account isn't suspended.");
      patch = {
        status: "active",
        suspendedAt: FieldValue.delete(),
        suspendedBy: FieldValue.delete(),
        suspendedReason: FieldValue.delete(),
      };
      break;
    case "delete":
      if (isDeleted) throw new ConflictError("This account is already deleted.");
      if (!email || confirmEmail?.trim().toLowerCase() !== email.toLowerCase()) {
        throw new ValidationError("The email you typed doesn't match this account.");
      }
      patch = {
        status: "disabled",
        deletedAt: now,
        deleteAfter: Timestamp.fromMillis(deleteAfterMs(Date.now())),
        deletedBy: actor.uid,
        deletedReason: reason,
      };
      break;
    case "restore":
      if (!isDeleted) throw new ConflictError("This account isn't deleted.");
      patch = {
        // An account that was suspended before it was deleted stays suspended.
        status: snapshot.get("suspendedAt") != null ? "disabled" : "active",
        deletedAt: FieldValue.delete(),
        deleteAfter: FieldValue.delete(),
        deletedBy: FieldValue.delete(),
        deletedReason: FieldValue.delete(),
      };
      break;
  }

  const batch = db.batch();
  batch.update(ref, { ...patch, updatedAt: now });
  batch.set(db.collection(AUDIT).doc(), {
    action: AUDIT_ACTION[action],
    kind: "user",
    companyId: text(snapshot.get("companyId")),
    userId,
    companyName: email,
    actorUid: actor.uid,
    actorEmail: actor.email,
    reason,
    createdAt: now,
  });
  await batch.commit();

  if (action === "suspend" || action === "delete") await revokeSessions(userId);
}

/** Permanently erases accounts whose 30-day retention has ended, including their Firebase sign-in. */
export async function purgeExpiredUsers({ now = Date.now(), limit = 100 } = {}) {
  const db = adminDb();
  const due = await db.collection(USERS).where("deleteAfter", "<=", Timestamp.fromMillis(now)).limit(limit).get();

  const purged: string[] = [];
  const failed: string[] = [];
  for (const doc of due.docs) {
    // Nothing is erased unless it is explicitly marked deleted and past its date.
    const deleteAfter = doc.get("deleteAfter")?.toMillis?.() ?? Infinity;
    if (doc.get("deletedAt") == null || deleteAfter > now) continue;

    try {
      await adminAuth()
        .deleteUser(doc.id)
        .catch((error: { code?: string }) => {
          if (error.code !== "auth/user-not-found") throw error;
        });
      await doc.ref.delete();
      await db.collection(AUDIT).add({
        action: "user_purge",
        kind: "user",
        companyId: text(doc.get("companyId")),
        userId: doc.id,
        companyName: text(doc.get("email")) ?? doc.id,
        actorUid: "system",
        actorEmail: "System (30-day purge)",
        reason: "Account permanently removed after the 30-day retention period",
        createdAt: FieldValue.serverTimestamp(),
      });
      purged.push(doc.id);
    } catch (error) {
      console.error(JSON.stringify({ level: "error", event: "user_purge_failed", userId: doc.id, error: error instanceof Error ? error.message : "unknown" }));
      failed.push(doc.id);
    }
  }
  return { due: due.size, purged, failed };
}
