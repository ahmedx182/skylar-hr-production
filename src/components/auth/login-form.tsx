"use client";

import { sendSignInLinkToEmail } from "firebase/auth";
import { useState } from "react";
import { EmailForm } from "@/components/auth/email-form";
import { VERIFY_PATH } from "@/constants/routes";
import { saveMagicEmail } from "@/features/auth/magic-email";
import { getFirebaseAuth } from "@/lib/firebase/client";

type Status =
  | { phase: "idle" }
  | { phase: "failed"; message: string }
  | { phase: "sent"; email: string };

function signInLinkUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  const origin = configuredUrl || window.location.origin;
  return `${origin.replace(/\/$/, "")}${VERIFY_PATH}`;
}

function authErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;

  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code?: unknown }).code);
    if (code === "auth/unauthorized-domain") {
      return "This domain is not allowed in Firebase Auth. Add localhost to Authorized domains.";
    }
    if (code === "auth/operation-not-allowed") {
      return "Email-link sign-in is not enabled in Firebase Auth.";
    }
    if (code === "auth/quota-exceeded") {
      return "Firebase has reached its email sign-in quota for now. Wait for the quota to reset or raise the Firebase Auth quota.";
    }
    if (code === "auth/invalid-email") return "Enter a valid work email.";
    return `Firebase rejected the sign-in link request: ${code}.`;
  }

  return "The link could not be sent. Try again.";
}

async function assertEmailCanSignIn(email: string) {
  const response = await fetch("/api/auth/allowed-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error("Skylar could not check access for this email. Try again.");
  }

  const result = (await response.json()) as { allowed?: boolean };
  if (!result.allowed) {
    throw new Error("This email has not been added to Skylar. Ask an admin to add it first.");
  }
}

export function LoginForm() {
  const [status, setStatus] = useState<Status>({ phase: "idle" });

  async function requestLink(email: string) {
    setStatus({ phase: "idle" });
    try {
      await assertEmailCanSignIn(email);
      await sendSignInLinkToEmail(getFirebaseAuth(), email, {
        url: signInLinkUrl(),
        handleCodeInApp: true,
      });
    } catch (error) {
      console.error("Magic-link send failed", error);
      setStatus({ phase: "failed", message: authErrorMessage(error) });
      return;
    }
    saveMagicEmail(email);
    setStatus({ phase: "sent", email });
  }

  if (status.phase === "sent") {
    return (
      <div role="status" className="mt-8 rounded-2xl border border-success/30 bg-success/10 p-4">
        <p className="font-semibold text-paper">Check your inbox</p>
        <p className="mt-2 text-sm leading-6 text-paper-2">
          We sent a private sign-in link to <span className="text-paper">{status.email}</span>.
          Keep this tab open, then return here after you click the link.
        </p>
      </div>
    );
  }

  return (
    <>
      <EmailForm submitLabel="Email me a link" pendingLabel="Sending…" onSubmit={requestLink} />
      {status.phase === "failed" && (
        <p role="alert" className="mt-4 text-sm text-attention">
          {status.message}
        </p>
      )}
    </>
  );
}
