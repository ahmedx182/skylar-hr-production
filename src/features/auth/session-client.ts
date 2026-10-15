import { AccountBlockedClientError, accountBlockStateFromCode } from "@/features/auth/account-block";

/** Browser calls to the session endpoints. The server cookie is the only session; nothing is stored here. */

export async function createServerSession(
  idToken: string,
  signup?: { companyName: string },
): Promise<void> {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, signup }),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    const blocked = accountBlockStateFromCode(result?.error?.code);
    if (blocked) throw new AccountBlockedClientError(blocked);
    throw new Error(result?.error?.message || "Could not complete sign-in. Request a new link and try again.");
  }
}

export async function endServerSession(): Promise<void> {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Logout request failed (${response.status})`);
}
