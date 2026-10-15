"use client";

import { useState } from "react";
import { ArrowUpRight, CreditCard } from "lucide-react";

type Plan = { id: string; name: string; priceLabel: string };
type Pending = { kind: "checkout"; packageId: string } | { kind: "portal" } | null;

export function BillingActions({ hasCustomer, plans }: { hasCustomer: boolean; plans: Plan[] }) {
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);

  async function open(target: NonNullable<Pending>) {
    setPending(target);
    setError(null);
    try {
      const response = await fetch(`/api/billing/${target.kind}`, {
        method: "POST",
        ...(target.kind === "checkout"
          ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packageId: target.packageId }) }
          : {}),
      });
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

  const busy = pending !== null;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-3">
        {plans.map((plan) => {
          const isOpening = pending?.kind === "checkout" && pending.packageId === plan.id;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => void open({ kind: "checkout", packageId: plan.id })}
              disabled={busy}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-paper px-5 text-sm font-semibold text-ink transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
            >
              <CreditCard className="size-4" aria-hidden="true" />
              {isOpening ? "Opening checkout..." : `Upgrade to ${plan.name}`}
              {!isOpening && <span className="font-normal text-ink/60">{plan.priceLabel}</span>}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => void open({ kind: "portal" })}
          disabled={busy || !hasCustomer}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-paper/[0.08] px-5 text-sm font-semibold text-paper shadow-[inset_0_0_0_1px_rgba(244,239,231,0.08)] transition-colors hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ArrowUpRight className="size-4" aria-hidden="true" />
          {pending?.kind === "portal" ? "Opening portal..." : "Customer portal"}
        </button>
      </div>
      {error && <p className="text-sm font-semibold text-risk">{error}</p>}
    </div>
  );
}
