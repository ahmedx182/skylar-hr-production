"use client";

import { useState } from "react";
import { EmailForm } from "@/components/auth/email-form";
import { VERIFY_PATH } from "@/constants/routes";
import { clearPendingSignup, saveMagicEmail } from "@/features/auth/magic-email";
import { AccountBlockedClientError, accountBlockPath } from "@/features/auth/account-block";
import { sendSignInLink } from "@/features/auth/send-sign-in-link";

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

/** Returns the explanation page to show when the account is suspended or deleted, otherwise null. */
async function assertEmailCanSignIn(email: string): Promise<string | null> {
  const response = await fetch("/api/auth/allowed-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(result?.error?.message || "Skylar could not check access for this email. Try again.");
  }

  const result = (await response.json()) as { allowed?: boolean; accountState?: "suspended" | "deleted" };
  if (result.accountState) return accountBlockPath(result.accountState);
  if (!result.allowed) {
    throw new Error("This email has not been added to Skylar. Ask an admin to add it first.");
  }
  return null;
}

export function LoginForm() {
  const [status, setStatus] = useState<Status>({ phase: "idle" });

  async function requestLink(email: string) {
    setStatus({ phase: "idle" });
    try {
      const blockedPath = await assertEmailCanSignIn(email);
      if (blockedPath) {
        window.location.assign(blockedPath);
        return;
      }
      await sendSignInLink({ purpose: "login", email }, signInLinkUrl());
    } catch (error) {
      if (error instanceof AccountBlockedClientError) {
        window.location.assign(error.path);
        return;
      }
      console.error("Magic-link send failed", error);
      setStatus({ phase: "failed", message: authErrorMessage(error) });
      return;
    }
    clearPendingSignup();
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
      <EmailForm submitLabel="Email me a link" pendingLabel="Sending..." onSubmit={requestLink} />
      {status.phase === "failed" && (
        <p role="alert" className="mt-4 text-sm text-attention">
          {status.message}
        </p>
      )}
    </>
  );
}
