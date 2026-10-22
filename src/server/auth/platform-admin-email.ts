import "server-only";
import { getServerEnv } from "@/lib/env/server";
import { adminDb } from "@/lib/firebase/admin";

/**
 * One doc per email, keyed by lowercased email, managed from Platform → Users.
 * `revoked: true` removes access, including for someone listed in PLATFORM_ADMIN_EMAILS.
 */
export const PLATFORM_ADMINS = "platform_admins";

/** "env": seeded by PLATFORM_ADMIN_EMAILS. "console": granted from the platform console. */
export type PlatformAdminSource = "env" | "console";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function envPlatformAdminEmails(): Set<string> {
  return new Set(
    (getServerEnv().PLATFORM_ADMIN_EMAILS ?? "")
      .split(",")
      .map(normalizeEmail)
      .filter(Boolean),
  );
}

/** Every current super admin and where their access comes from. A Firestore doc overrides the env list. */
export async function listPlatformAdmins(): Promise<Map<string, PlatformAdminSource>> {
  const admins = new Map<string, PlatformAdminSource>();
  const overridden = new Set<string>();
  const snapshot = await adminDb().collection(PLATFORM_ADMINS).get();
  for (const doc of snapshot.docs) {
    const email = normalizeEmail(doc.id);
    overridden.add(email);
    if (doc.get("revoked") !== true) admins.set(email, "console");
  }
  envPlatformAdminEmails().forEach((email) => {
    if (!overridden.has(email)) admins.set(email, "env");
  });
  return admins;
}

/**
 * Platform access is granted only to verified emails that are currently super admins.
 * Checked on every request, so adding or removing someone takes effect on their next page load.
 */
export async function isPlatformAdminEmail(email: string | null | undefined, emailVerified: boolean): Promise<boolean> {
  if (!email || !emailVerified) return false;
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const doc = await adminDb().collection(PLATFORM_ADMINS).doc(normalized).get();
  if (doc.exists) return doc.get("revoked") !== true;
  return envPlatformAdminEmails().has(normalized);
}
