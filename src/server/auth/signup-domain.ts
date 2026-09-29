import "server-only";
import { AuthorizationError } from "@/lib/errors";
import { getServerEnv, type ServerEnv } from "@/lib/env/server";

function emailDomain(email: string): string {
  return email.trim().toLowerCase().split("@").at(1) ?? "";
}

export function isSignupDomainAllowed(email: string, env: ServerEnv = getServerEnv()): boolean {
  if (env.SIGNUP_ALLOWED_DOMAINS.length === 0) return false;
  return env.SIGNUP_ALLOWED_DOMAINS.includes(emailDomain(email));
}

export function assertSignupDomainAllowed(email: string, env: ServerEnv = getServerEnv()): void {
  if (!isSignupDomainAllowed(email, env)) {
    throw new AuthorizationError("This email domain is not approved for new Skylar workspaces.");
  }
}
