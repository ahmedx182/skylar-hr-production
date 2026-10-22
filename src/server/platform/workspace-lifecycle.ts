import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { ConflictError, ExternalServiceError, NotFoundError, ValidationError } from "@/lib/errors";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { getServerEnv } from "@/lib/env/server";
import { deleteAfterMs, isPurgeDue } from "@/features/platform/lifecycle";
import { listPlatformAdmins, normalizeEmail } from "@/server/auth/platform-admin-email";
import { stripe } from "@/server/stripe/client";
import type { AuthSession } from "@/types/auth";

type Actor = Pick<AuthSession, "uid" | "email" | "companyId">;

/** Collections whose documents carry a `companyId` field. */
const WORKSPACE_COLLECTIONS = [
  "users",
  "employees",
  "employee_ledger_entries",
  "advisor_escalations",
  "skylar_conversations",
  "briefing_card_actions",
  "invites",
] as const;

const LIVE_STRIPE_STATUSES = new Set(["active", "trialing", "past_due", "unpaid", "incomplete"]);
const AUTH_DELETE_BATCH = 1000;
const SYSTEM_ACTOR = { uid: "system", email: "System (30-day purge)" };

async function writeAudit(entry: {
  action: "delete" | "restore_workspace" | "purge";
  companyId: string;
  companyName: string;
  actor: { uid: string; email: string | null };
  reason: string | null;
}) {
  await adminDb().collection("platform_audit_log").add({
    action: entry.action,
    kind: "workspace",
    companyId: entry.companyId,
    companyName: entry.companyName,
    actorUid: entry.actor.uid,
    actorEmail: entry.actor.email,
    reason: entry.reason,
    createdAt: FieldValue.serverTimestamp(),
  });
}

async function loadCompany(companyId: string) {
  const ref = adminDb().collection("companies").doc(companyId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new NotFoundError("Workspace not found.");
  return { ref, name: String(snapshot.get("name") ?? "").trim(), status: snapshot.get("status") as string | undefined };
}

function assertNameConfirmed(name: string, typed: string) {
  if (!name || typed.trim() !== name) throw new ValidationError("The name you typed doesn't match this workspace.");
}

/**
 * Soft delete: the workspace is locked immediately and its billing stops, but nothing is removed.
 * It can be restored for DELETION_GRACE_DAYS; after that the daily purge removes it permanently.
 */
export async function softDeleteWorkspace({
  companyId,
  confirmName,
  reason,
  actor,
}: {
  companyId: string;
  confirmName: string;
  reason: string;
  actor: Actor;
}): Promise<{ deleteAfterMs: number; cancelledSubscription: boolean }> {
  const db = adminDb();
  const company = await loadCompany(companyId);
  assertNameConfirmed(company.name, confirmName);
  if (company.status === "deleted") throw new ConflictError("This workspace is already deleted.");
  if (companyId === actor.companyId) throw new ConflictError("You can't delete your own workspace.");

  const [members, platformAdmins] = await Promise.all([
    db.collection("users").where("companyId", "==", companyId).select("email").get(),
    listPlatformAdmins(),
  ]);
  if (members.docs.some((doc) => typeof doc.get("email") === "string" && platformAdmins.has(normalizeEmail(doc.get("email"))))) {
    throw new ConflictError("This workspace includes a super admin. Remove their super admin access first.");
  }

  // Stop billing first, so a failure leaves the workspace untouched rather than deleted but still charging.
  const subscription = await db.collection("subscriptions").doc(companyId).get();
  const stripeSubscriptionId = subscription.get("stripeSubscriptionId");
  let cancelledSubscription = false;
  if (typeof stripeSubscriptionId === "string" && LIVE_STRIPE_STATUSES.has(String(subscription.get("status")))) {
    if (!getServerEnv().STRIPE_SECRET_KEY) {
      throw new ConflictError("This workspace has a live Stripe subscription, but Stripe isn't configured to cancel it.");
    }
    try {
      await stripe().subscriptions.cancel(stripeSubscriptionId);
      cancelledSubscription = true;
    } catch (error) {
      if ((error as { code?: string }).code !== "resource_missing") {
        throw new ExternalServiceError("Stripe could not cancel this workspace's subscription, so nothing was deleted.", { cause: error });
      }
    }
  }

  const now = Date.now();
  const purgeAt = deleteAfterMs(now);
  await company.ref.set(
    {
      status: "deleted",
      deletedAt: FieldValue.serverTimestamp(),
      deleteAfter: Timestamp.fromMillis(purgeAt),
      deletedBy: actor.uid,
      deletedReason: reason,
    },
    { merge: true },
  );

  await writeAudit({
    action: "delete",
    companyId,
    companyName: company.name,
    actor,
    reason: `${reason}${cancelledSubscription ? " (Stripe subscription cancelled)" : ""}`,
  });
  return { deleteAfterMs: purgeAt, cancelledSubscription };
}

/** Brings a soft-deleted workspace back. Its Stripe subscription, if any, was cancelled at deletion, so it returns on its free plan. */
export async function restoreWorkspace({ companyId, actor, note }: { companyId: string; actor: Actor; note: string | null }) {
  const company = await loadCompany(companyId);
  if (company.status !== "deleted") throw new ConflictError("This workspace isn't deleted.");

  await company.ref.set(
    {
      status: "active",
      deletedAt: FieldValue.delete(),
      deleteAfter: FieldValue.delete(),
      deletedBy: FieldValue.delete(),
      deletedReason: FieldValue.delete(),
      restoredAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await writeAudit({ action: "restore_workspace", companyId, companyName: company.name, actor, reason: note });
}

export type PurgeResult = { removed: Record<string, number> };

/** Permanent removal. Only ever runs on a workspace that is already soft-deleted. */
export async function purgeWorkspace({
  companyId,
  actor,
  confirmName,
}: {
  companyId: string;
  actor: { uid: string; email: string | null } | null;
  /** Required for a manual purge; the scheduled purge passes null. */
  confirmName: string | null;
}): Promise<PurgeResult> {
  const db = adminDb();
  const company = await loadCompany(companyId);
  if (company.status !== "deleted") throw new ConflictError("Only a deleted workspace can be permanently removed.");
  if (confirmName !== null) assertNameConfirmed(company.name, confirmName);

  const removed: Record<string, number> = {};
  const memberUids: string[] = [];
  const writer = db.bulkWriter();
  for (const collection of WORKSPACE_COLLECTIONS) {
    const snapshot = await db.collection(collection).where("companyId", "==", companyId).select().get();
    removed[collection] = snapshot.size;
    if (collection === "users") memberUids.push(...snapshot.docs.map((doc) => doc.id));
    snapshot.docs.forEach((doc) => void writer.delete(doc.ref));
  }
  void writer.delete(db.collection("subscriptions").doc(companyId));
  await writer.close();

  for (let start = 0; start < memberUids.length; start += AUTH_DELETE_BATCH) {
    await adminAuth().deleteUsers(memberUids.slice(start, start + AUTH_DELETE_BATCH));
  }
  await company.ref.delete();

  await writeAudit({
    action: "purge",
    companyId,
    companyName: company.name,
    actor: actor ?? SYSTEM_ACTOR,
    reason: `Permanently removed ${removed.users} users, ${removed.employees} employees, ${removed.employee_ledger_entries} records`,
  });
  return { removed };
}

/** Daily sweep: permanently removes workspaces whose 30-day grace period has ended. */
export async function purgeExpiredWorkspaces({ limit = 5, now = Date.now() } = {}) {
  // Filtering by date in code avoids a composite index; there are only ever a few deleted workspaces.
  const snapshot = await adminDb().collection("companies").where("status", "==", "deleted").select("deleteAfter").get();
  const due = snapshot.docs.filter((doc) => isPurgeDue(doc.get("deleteAfter")?.toMillis?.() ?? null, now)).slice(0, limit);

  const purged: string[] = [];
  const failed: string[] = [];
  for (const doc of due) {
    try {
      await purgeWorkspace({ companyId: doc.id, actor: null, confirmName: null });
      purged.push(doc.id);
    } catch (error) {
      console.error(JSON.stringify({ level: "error", event: "workspace_purge_failed", companyId: doc.id, error: error instanceof Error ? error.message : "unknown" }));
      failed.push(doc.id);
    }
  }
  return { checked: snapshot.size, due: due.length, purged, failed };
}
