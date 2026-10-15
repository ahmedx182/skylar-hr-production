import "server-only";
import { getServerEnv } from "@/lib/env/server";

/** Platform access is granted only to verified emails on the PLATFORM_ADMIN_EMAILS allowlist. */
export function isPlatformAdminEmail(email: string | null | undefined, emailVerified: boolean): boolean {
  if (!email || !emailVerified) return false;
  const allowlist = (getServerEnv().PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.trim().toLowerCase());
}
