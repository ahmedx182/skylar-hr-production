import { sendSignInLinkToEmail } from "firebase/auth";
import { AccountBlockedClientError, accountBlockStateFromCode } from "@/features/auth/account-block";
import { getFirebaseAuth } from "@/lib/firebase/client";

type SignInLinkRequest =
  | { purpose: "login"; email: string }
  | { purpose: "signup"; email: string; companyName: string };

/** Sends the branded sign-in email from the server, falling back to Firebase's default email when that isn't configured. */
export async function sendSignInLink(input: SignInLinkRequest, fallbackContinueUrl: string): Promise<void> {
  const response = await fetch("/api/auth/email-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = (await response.json().catch(() => null)) as
    | { delivery?: "sent" | "client"; error?: { code?: string; message?: string } }
    | null;

  if (!response.ok) {
    const blocked = accountBlockStateFromCode(payload?.error?.code);
    if (blocked) throw new AccountBlockedClientError(blocked);
    throw new Error(payload?.error?.message ?? "Could not send your sign-in link. Try again.");
  }
  if (payload?.delivery === "sent") return;

  await sendSignInLinkToEmail(getFirebaseAuth(), input.email, {
    url: fallbackContinueUrl,
    handleCodeInApp: true,
  });
}
