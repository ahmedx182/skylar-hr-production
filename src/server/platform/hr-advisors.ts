import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { adminDb } from "@/lib/firebase/admin";
import { HR_ADVISORS, isHrAdvisorEmail } from "@/server/auth/hr-advisor-email";
import { normalizeEmail } from "@/server/auth/platform-admin-email";
import type { AuthSession } from "@/types/auth";

export type HrAdvisorAction = "grant" | "revoke";
type Actor = Pick<AuthSession, "uid" | "email">;

const AUDIT = "platform_audit_log";
const AUDIT_ACTION = { grant: "hr_advisor_grant", revoke: "hr_advisor_revoke" } as const;

/**
 * A super admin adds or removes an HR advisor by email, whether or not they have an account yet.
 * The advisor signs in with that email and lands in the advisor desk; revoking applies on their next page load.
 */
export async function applyHrAdvisorAction({
  email: rawEmail,
  action,
  reason,
  actor,
}: {
  email: string;
  action: HrAdvisorAction;
  reason: string | null;
  actor: Actor;
}): Promise<void> {
  const email = normalizeEmail(rawEmail);
  if (!email.includes("@")) throw new ValidationError("Enter a valid email address.");

  const isAdvisor = await isHrAdvisorEmail(email, true);
  const now = FieldValue.serverTimestamp();
  const db = adminDb();
  const ref = db.collection(HR_ADVISORS).doc(email);
  const batch = db.batch();

  if (action === "grant") {
    if (isAdvisor) throw new ConflictError("This person is already an HR advisor.");
    batch.set(ref, { email, revoked: false, grantedBy: actor.uid, grantedByEmail: actor.email, reason, createdAt: now });
  } else {
    if (!isAdvisor) throw new NotFoundError("This person isn't an HR advisor.");
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
