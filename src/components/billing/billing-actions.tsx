"use client";

import { useState } from "react";
import { ArrowUpRight, CreditCard } from "lucide-react";
import { openStripe, type StripeTarget } from "@/components/billing/open-stripe";
import { cn } from "@/lib/utils/cn";

type Plan = { id: string; name: string; priceLabel: string };
type Pending = StripeTarget | null;

const buttonBase =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-[background-color,color,opacity,transform] duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/40 disabled:cursor-wait disabled:opacity-60";

/**
 * With plans, the upgrade buttons lead and the portal is a quieter second choice (only once a Stripe customer exists).
 * With no plans the workspace is already subscribed, so the portal is the one action.
 */
export function BillingActions({ hasCustomer, plans }: { hasCustomer: boolean; plans: Plan[] }) {
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);

  async function open(target: NonNullable<Pending>) {
    setPending(target);
    setError(null);
    try {
      await openStripe(target);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Stripe could not be opened.");
      setPending(null);
    }
  }

  const busy = pending !== null;
  const portalLeads = plans.length === 0;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {plans.map((plan) => {
          const isOpening = pending?.kind === "checkout" && pending.packageId === plan.id;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => void open({ kind: "checkout", packageId: plan.id })}
              disabled={busy}
              className={cn(buttonBase, "bg-paper text-ink hover:opacity-90")}
            >
              <CreditCard className="size-4" aria-hidden="true" />
              {isOpening ? "Opening checkout..." : `Upgrade to ${plan.name}`}
            </button>
          );
        })}
        {hasCustomer && (
          <button
            type="button"
            onClick={() => void open({ kind: "portal" })}
            disabled={busy}
            className={cn(
              buttonBase,
              portalLeads
                ? "bg-paper text-ink hover:opacity-90"
                : "text-paper-2 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.12)] hover:bg-paper/[0.08] hover:text-paper",
            )}
          >
            <ArrowUpRight className="size-4" aria-hidden="true" />
            {pending?.kind === "portal" ? "Opening portal..." : portalLeads ? "Manage subscription" : "Billing portal"}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-risk">
          {error}
        </p>
      )}
    </div>
  );
}
