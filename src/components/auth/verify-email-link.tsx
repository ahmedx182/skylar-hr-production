"use client";

import { isSignInWithEmailLink, signInWithEmailLink, signOut } from "firebase/auth";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { EmailForm } from "@/components/auth/email-form";
import { focusRing } from "@/components/ui/focus-ring";
import { BRIEFING_PATH, LOGIN_PATH } from "@/constants/routes";
import { clearMagicEmail, readMagicEmail } from "@/features/auth/magic-email";
import { createServerSession } from "@/features/auth/session-client";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { cn } from "@/lib/utils/cn";

type Phase = "verifying" | "needs-email" | "failed";

export function VerifyEmailLink() {
  const [phase, setPhase] = useState<Phase>("verifying");
  const started = useRef(false);

  const completeSignIn = useCallback(async (email: string) => {
    const auth = getFirebaseAuth();
    setPhase("verifying");
    try {
      const { user } = await signInWithEmailLink(auth, email, window.location.href);
      await createServerSession(await user.getIdToken());
      clearMagicEmail();
      // Hard navigation: a soft one could reuse a router-cached, signed-out render.
      window.location.replace(BRIEFING_PATH);
    } catch {
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
        <h1 className="text-2xl font-medium">Link not valid</h1>
        <p role="alert" className="mt-2 text-paper-2">
          This sign-in link is invalid, expired, or already used.
        </p>
        <Link
          href={LOGIN_PATH}
          className={cn("mt-8 inline-flex h-[52px] items-center underline underline-offset-4", focusRing)}
        >
          Request a new link
        </Link>
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
