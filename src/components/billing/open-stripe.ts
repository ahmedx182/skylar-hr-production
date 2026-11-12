export type StripeTarget = { kind: "checkout"; packageId: string } | { kind: "portal" };

/** Starts a Stripe Checkout or Customer Portal session and sends the browser there. Throws a user-facing message on failure. */
export async function openStripe(target: StripeTarget): Promise<void> {
  const response = await fetch(`/api/billing/${target.kind}`, {
    method: "POST",
    ...(target.kind === "checkout"
      ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packageId: target.packageId }) }
      : {}),
  });
  const payload = (await response.json().catch(() => null)) as { url?: string; error?: { message?: string } } | null;

  if (!response.ok || !payload?.url) {
    throw new Error(payload?.error?.message ?? "Stripe could not be opened.");
  }

  window.location.assign(payload.url);
}
