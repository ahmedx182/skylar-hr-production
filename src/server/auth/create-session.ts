import "server-only";
import type { DecodedIdToken } from "firebase-admin/auth";
import { SESSION_MAX_AGE_MS } from "@/constants/auth";
import { AuthenticationError } from "@/lib/errors";
import { adminAuth } from "@/lib/firebase/admin";
import { isFirebaseAuthError } from "./firebase-auth-error";

/** Only a sign-in this recent may be exchanged, so a stolen older ID token is useless (Firebase guidance). */
const MAX_SIGN_IN_AGE_SECONDS = 5 * 60;

export interface CreatedSession {
  cookie: string;
  maxAgeMs: number;
}

/** Exchanges a fresh Firebase ID token for a long-lived, HttpOnly-able session cookie value. */
export async function createSession(idToken: string): Promise<CreatedSession> {
  const auth = adminAuth();

  let decoded: DecodedIdToken;
  try {
    decoded = await auth.verifyIdToken(idToken, true);
  } catch (error) {
    if (isFirebaseAuthError(error)) {
      throw new AuthenticationError("Invalid sign-in.", { cause: error });
    }
    throw error;
  }

  const signInAgeSeconds = Date.now() / 1000 - decoded.auth_time;
  if (!decoded.email_verified || signInAgeSeconds > MAX_SIGN_IN_AGE_SECONDS) {
    throw new AuthenticationError("Sign in again.");
  }

  const cookie = await auth.createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_MS,
  });
  return { cookie, maxAgeMs: SESSION_MAX_AGE_MS };
}
