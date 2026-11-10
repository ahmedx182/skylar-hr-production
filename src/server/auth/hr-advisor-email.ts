import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { normalizeEmail } from "./platform-admin-email";

/**
 * One doc per email, keyed by lowercased email, managed by super admins from Platform > Users.
 * `revoked: true` removes access. Anyone listed here can sign in and work the advisor desk.
 */
export const HR_ADVISORS = "hr_advisors";

/** Verified emails only, checked on every request so a revoke applies on the next page load. */
export async function isHrAdvisorEmail(email: string | null | undefined, emailVerified: boolean): Promise<boolean> {
  if (!email || !emailVerified) return false;
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const doc = await adminDb().collection(HR_ADVISORS).doc(normalized).get();
  return doc.exists && doc.get("revoked") !== true;
}

/** Emails of every current HR advisor, for new-case notifications. */
export async function listHrAdvisorEmails(): Promise<string[]> {
  const snapshot = await adminDb().collection(HR_ADVISORS).get();
  return snapshot.docs.filter((doc) => doc.get("revoked") !== true).map((doc) => normalizeEmail(doc.id)).sort();
}
