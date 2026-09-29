"use client";

import { useState } from "react";
import { ArrowUpRight, CreditCard } from "lucide-react";

type BillingAction = "checkout" | "portal";

export function BillingActions({ hasCustomer }: { hasCustomer: boolean }) {
  const [pending, setPending] = useState<BillingAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function openStripe(action: BillingAction) {
    setPending(action);
    setError(null);
    try {
      const response = await fetch(`/api/billing/${action}`, { method: "POST" });
      const payload = (await response.json().catch(() => null)) as
        | { url?: string; error?: { message?: string } }
        | null;

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error?.message ?? "Stripe could not be opened.");
      }

      window.location.assign(payload.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Stripe could not be opened.");
      setPending(null);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void openStripe("checkout")}
          disabled={pending !== null}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-paper px-5 text-sm font-semibold text-ink transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
        >
          <CreditCard className="size-4" aria-hidden="true" />
          {pending === "checkout" ? "Opening checkout..." : "Start billing"}
        </button>
        <button
          type="button"
          onClick={() => void openStripe("portal")}
          disabled={pending !== null || !hasCustomer}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-paper/[0.08] px-5 text-sm font-semibold text-paper shadow-[inset_0_0_0_1px_rgba(244,239,231,0.08)] transition-colors hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ArrowUpRight className="size-4" aria-hidden="true" />
          {pending === "portal" ? "Opening portal..." : "Customer portal"}
        </button>
      </div>
      {error && <p className="text-sm font-semibold text-risk">{error}</p>}
    </div>
  );
}
