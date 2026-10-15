import "server-only";
import { redirect } from "next/navigation";
import { WORKSPACE_SUSPENDED_MESSAGE } from "@/constants/auth";
import { LOGIN_PATH, SUSPENDED_PATH } from "@/constants/routes";
import { AuthenticationError, AuthorizationError } from "@/lib/errors";
import type { AuthSession } from "@/types/auth";
import { accountBlockPath } from "@/features/auth/account-block";
import { blockedAccountFromCookie } from "./blocked-account";
import { getSession } from "./get-session";

function isLockedOut(session: AuthSession): boolean {
  return Boolean(session.workspaceBlocked) && !session.isPlatformAdmin;
}

/** For route handlers and actions: throws, so the error maps to a 401/403. */
export async function requireSession(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) throw new AuthenticationError();
  if (isLockedOut(session)) throw new AuthorizationError(WORKSPACE_SUSPENDED_MESSAGE);
  return session;
}

/** For Server Component pages and layouts: sends signed-out users to login and suspended workspaces to the notice page. */
export async function requirePageSession(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) {
    // Someone suspended or deleted mid-session should see why, not an unexplained sign-in form.
    const blocked = await blockedAccountFromCookie();
    redirect(blocked ? accountBlockPath(blocked) : LOGIN_PATH);
  }
  if (isLockedOut(session)) redirect(SUSPENDED_PATH);
  return session;
}
