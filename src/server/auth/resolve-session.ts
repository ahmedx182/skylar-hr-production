import "server-only";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "@/lib/firebase/admin";
import { findUserById } from "@/server/repositories/user.repository";
import type { AuthSession } from "@/types/auth";
import { isFirebaseAuthError } from "./firebase-auth-error";

/**
 * Turns a session cookie into a session, or null for anything that is not a
 * currently valid, active, provisioned user (fail closed). Company and role come
 * from the user record, never from the cookie. Infrastructure errors propagate.
 */
export async function resolveSession(cookie: string | undefined): Promise<AuthSession | null> {
  if (!cookie) return null;

  let claims: DecodedIdToken;
  try {
    claims = await adminAuth().verifySessionCookie(cookie, true);
  } catch (error) {
    if (isFirebaseAuthError(error)) return null;
    throw error;
  }

  const user = await findUserById(claims.uid);
  if (!user || user.status !== "active") return null;

  return {
    uid: claims.uid,
    email: claims.email ?? null,
    companyId: user.companyId,
    role: user.role,
  };
}
