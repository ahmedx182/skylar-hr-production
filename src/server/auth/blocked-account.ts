import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/constants/auth";
import { accountBlockStateOf, type AccountBlockState } from "@/features/auth/account-block";
import { adminAuth } from "@/lib/firebase/admin";
import { findUserById } from "@/server/repositories/user.repository";

/**
 * For someone who still holds a session cookie after their account was suspended or deleted. Revocation is
 * deliberately not checked here, because suspending revokes the session; the cookie only picks which explanation
 * page to show and grants nothing.
 */
export async function blockedAccountFromCookie(): Promise<AccountBlockState | null> {
  const cookie = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) return null;

  try {
    const claims = await adminAuth().verifySessionCookie(cookie, false);
    const user = await findUserById(claims.uid);
    return user ? accountBlockStateOf(user) : null;
  } catch {
    return null;
  }
}
