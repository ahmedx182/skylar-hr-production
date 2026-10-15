"use client";

import { isSignInWithEmailLink, signInWithEmailLink, signOut } from "firebase/auth";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { EmailForm } from "@/components/auth/email-form";
import { focusRing } from "@/components/ui/focus-ring";
import { BRIEFING_PATH, LOGIN_PATH, ONBOARDING_PATH, SIGNUP_PATH } from "@/constants/routes";
import { signupSchema } from "@/schemas/auth.schema";
import {
  clearMagicEmail,
  clearPendingSignup,
  readMagicEmail,
  readPendingSignup,
} from "@/features/auth/magic-email";
import { AccountBlockedClientError } from "@/features/auth/account-block";
import { createServerSession } from "@/features/auth/session-client";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { cn } from "@/lib/utils/cn";

type Phase = "verifying" | "needs-email" | "failed";

export function VerifyEmailLink() {
  const [phase, setPhase] = useState<Phase>("verifying");
  const [failureMessage, setFailureMessage] = useState("This sign-in link is invalid, expired, or already used.");
  const started = useRef(false);

  const completeSignIn = useCallback(async (email: string) => {
      const auth = getFirebaseAuth();
      setPhase("verifying");
    try {
      const { user } = await signInWithEmailLink(auth, email, window.location.href);
      const companyName = new URL(window.location.href).searchParams.get("companyName");
      const linkSignup = companyName === null ? null : signupSchema.safeParse({ email, companyName });
      if (linkSignup && !linkSignup.success) throw new Error("Workspace details are invalid. Start signup again.");
      const pendingSignup = linkSignup?.success ? linkSignup.data : readPendingSignup(email);
      await createServerSession(
        await user.getIdToken(),
        pendingSignup ? { companyName: pendingSignup.companyName } : undefined,
      );
      clearMagicEmail();
      clearPendingSignup();
      // Hard navigation: a soft one could reuse a router-cached, signed-out render.
      window.location.replace(pendingSignup ? ONBOARDING_PATH : BRIEFING_PATH);
    } catch (error) {
      if (error instanceof AccountBlockedClientError) {
        window.location.replace(error.path);
        return;
      }
      if (error instanceof Error && !("code" in error)) setFailureMessage(error.message);
      setPhase("failed");
    } finally {
      // The server cookie is the session; leave no Firebase auth state in the browser.
      signOut(auth).catch(() => {
        /* local state only; nothing to recover */
      });
    }
  }, []);

  useEffect(() => {
    // Strict Mode runs effects twice in dev, and the email link is single-use.
    if (started.current) return;
    started.current = true;

    if (!isSignInWithEmailLink(getFirebaseAuth(), window.location.href)) {
      setPhase("failed");
      return;
    }
    const email = readMagicEmail();
    if (email) void completeSignIn(email);
    else setPhase("needs-email");
  }, [completeSignIn]);

  if (phase === "needs-email") {
    return (
      <>
        <h1 className="text-2xl font-medium">Confirm your email</h1>
        <p className="mt-2 text-paper-2">
          This link was opened on a different device. Enter your work email to finish signing in.
        </p>
        <EmailForm submitLabel="Continue" pendingLabel="Signing in…" onSubmit={completeSignIn} />
      </>
    );
  }

  if (phase === "failed") {
    return (
      <>
        <h1 className="text-2xl font-medium">Could not finish signing in</h1>
        <p role="alert" className="mt-2 text-paper-2">
          {failureMessage}
        </p>
        <Link
          href={LOGIN_PATH}
          className={cn("mt-8 inline-flex h-[52px] items-center underline underline-offset-4", focusRing)}
        >
          Request a new link
        </Link>
        <Link href={SIGNUP_PATH} className={cn("ml-4 underline underline-offset-4", focusRing)}>Restart workspace signup</Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-medium">Signing you in</h1>
      <p role="status" className="mt-2 text-paper-2">
        One moment…
      </p>
    </>
  );
}
