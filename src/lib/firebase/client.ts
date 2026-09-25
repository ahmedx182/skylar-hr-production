import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getClientEnv } from "@/lib/env/client";

/**
 * Browser-only. The client SDK just completes the email-link sign-in; the server
 * session cookie is the authority (§14, §16), so callers sign out right after.
 */
export function getFirebaseAuth(): Auth {
  const env = getClientEnv();
  const app = getApps().length
    ? getApp()
    : initializeApp({
        apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
      });
  return getAuth(app);
}
