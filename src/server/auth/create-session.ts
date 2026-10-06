import "server-only";
import type { DecodedIdToken } from "firebase-admin/auth";
import { SESSION_MAX_AGE_MS } from "@/constants/auth";
import { AuthenticationError } from "@/lib/errors";
import { adminAuth } from "@/lib/firebase/admin";
import {
  findUserById,
  provisionInvitedUser,
  provisionSignupWorkspace,
} from "@/server/repositories/user.repository";
import {
  acceptInvite,
  findPendingInviteByEmail,
} from "@/server/repositories/invite.repository";
import { isFirebaseAuthError } from "./firebase-auth-error";
import { assertWorkspaceEmailAllowed } from "./workspace-domain";

/** Only a sign-in this recent may be exchanged, so a stolen older ID token is useless (Firebase guidance). */
const MAX_SIGN_IN_AGE_SECONDS = 5 * 60;

export interface CreatedSession {
  cookie: string;
  maxAgeMs: number;
}

/** Exchanges a fresh Firebase ID token for a long-lived, HttpOnly-able session cookie value. */
export async function createSession(
  idToken: string,
  signup?: { companyName: string },
): Promise<CreatedSession> {
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

  const email = decoded.email?.trim().toLowerCase();
  if (!email) {
    throw new AuthenticationError("Sign in with a verified work email.");
  }

  const user = await findUserById(decoded.uid);
  if (user && user.status !== "active") {
    throw new AuthenticationError("This account is disabled. Contact your workspace admin.");
  }
  if (user?.role === "employee") await assertWorkspaceEmailAllowed(user.companyId, email);
  if (!user) {
    if (signup) {
      await provisionSignupWorkspace({ uid: decoded.uid, email, companyName: signup.companyName });
    } else {
      const invite = await findPendingInviteByEmail(email);
      if (!invite) {
        throw new AuthenticationError("This email has not been added to Skylar.");
      }
      await provisionInvitedUser({
        uid: decoded.uid,
        email,
        companyId: invite.companyId,
        role: invite.role,
        linkedEmployeeId: invite.linkedEmployeeId,
      });
      await acceptInvite(invite.id);
    }
  }

  const cookie = await auth.createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_MS,
  });
  return { cookie, maxAgeMs: SESSION_MAX_AGE_MS };
}
