import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { adminDb } from "@/lib/firebase/admin";
import { isPlatformAdminEmail, normalizeEmail, PLATFORM_ADMINS } from "@/server/auth/platform-admin-email";
import type { AuthSession } from "@/types/auth";

export type PlatformAdminAction = "grant" | "revoke";
type Actor = Pick<AuthSession, "uid" | "email">;

const AUDIT = "platform_audit_log";
const AUDIT_ACTION = { grant: "platform_admin_grant", revoke: "platform_admin_revoke" } as const;

/**
 * Any super admin can add or remove any other, by email, whether or not they have an account yet.
 * Access is checked on every request, so it applies on the person's next page load without signing them out.
 * Nobody can remove themselves, so there is always at least one super admin left.
 */
export async function applyPlatformAdminAction({
  email: rawEmail,
  action,
  reason,
  actor,
}: {
  email: string;
  action: PlatformAdminAction;
  reason: string | null;
  actor: Actor;
}): Promise<void> {
  const email = normalizeEmail(rawEmail);
  if (!email.includes("@")) throw new ValidationError("Enter a valid email address.");

  const isAdmin = await isPlatformAdminEmail(email, true);
  const now = FieldValue.serverTimestamp();
  const db = adminDb();
  const ref = db.collection(PLATFORM_ADMINS).doc(email);
  const batch = db.batch();

  if (action === "grant") {
    if (isAdmin) throw new ConflictError("This person is already a super admin.");
    batch.set(ref, { email, revoked: false, grantedBy: actor.uid, grantedByEmail: actor.email, reason, createdAt: now });
  } else {
    if (actor.email && normalizeEmail(actor.email) === email) throw new ConflictError("You can't remove your own super admin access.");
    if (!isAdmin) throw new NotFoundError("This person isn't a super admin.");
    // Kept as a revoked doc rather than deleted, so it also overrides a PLATFORM_ADMIN_EMAILS entry.
    batch.set(ref, { email, revoked: true, revokedBy: actor.uid, revokedByEmail: actor.email, reason, revokedAt: now }, { merge: true });
  }

  batch.set(db.collection(AUDIT).doc(), {
    action: AUDIT_ACTION[action],
    kind: "user",
    companyId: null,
    userId: null,
    companyName: email,
    actorUid: actor.uid,
    actorEmail: actor.email,
    reason,
    createdAt: now,
  });
  await batch.commit();
}
