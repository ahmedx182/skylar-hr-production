"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, X } from "lucide-react";
import { openStripe } from "@/components/billing/open-stripe";
import { cn } from "@/lib/utils/cn";

export type UpgradePlan = { id: string; name: string; priceLabel: string; description: string };

const triggerClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-paper px-4 text-sm font-semibold text-ink transition-opacity hover:opacity-90";

/** Top-bar upgrade entry. With no purchasable plan it falls back to the Billing page, which explains what is missing. */
export function UpgradeModal({ plans }: { plans: UpgradePlan[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedId, setSelectedId] = useState(plans[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!plans.some((plan) => plan.id === selectedId)) setSelectedId(plans[0]?.id ?? "");
  }, [plans, selectedId]);

  if (plans.length === 0) {
    return (
      <Link href="/billing" className={triggerClass}>
        Upgrade
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </Link>
    );
  }

  async function checkout() {
    setPending(true);
    setError(null);
    try {
      await openStripe({ kind: "checkout", packageId: selectedId });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Stripe could not be opened.");
      setPending(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className={triggerClass}>
        Upgrade
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby="upgrade-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-3xl bg-ink-2 p-0 text-paper shadow-[inset_0_0_0_1px_rgba(244,239,231,0.1)] backdrop:bg-ink/70 backdrop:backdrop-blur-sm"
      >
        <div className="grid gap-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="grid gap-1.5">
              <h2 id="upgrade-title" className="text-xl font-semibold">
                Choose your plan
              </h2>
              <p className="text-sm leading-6 text-paper-2">Unlimited advisor chat and more human escalations each month.</p>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close"
              className="grid size-8 shrink-0 place-items-center rounded-full text-paper-2 transition-colors hover:bg-paper/10 hover:text-paper"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div role="radiogroup" aria-labelledby="upgrade-title" className="grid gap-2.5">
            {plans.map((plan) => {
              const selected = plan.id === selectedId;
              return (
                <button
                  key={plan.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setSelectedId(plan.id)}
                  className={cn(
                    "flex items-center justify-between gap-4 rounded-2xl px-4 py-3.5 text-left transition-colors",
                    selected ? "bg-paper/[0.1] shadow-[inset_0_0_0_1.5px_rgba(244,239,231,0.7)]" : "bg-paper/[0.04] shadow-[inset_0_0_0_1px_rgba(244,239,231,0.08)] hover:bg-paper/[0.07]",
                  )}
                >
                  <span className="grid gap-0.5">
                    <span className="text-base font-semibold">{plan.name}</span>
                    {plan.description && <span className="text-sm leading-5 text-paper-2">{plan.description}</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-semibold">{plan.priceLabel}</span>
                    <span
                      aria-hidden="true"
                      className={cn("grid size-5 place-items-center rounded-full", selected ? "bg-paper text-ink" : "shadow-[inset_0_0_0_1px_rgba(244,239,231,0.25)]")}
                    >
                      {selected && <Check className="size-3.5" />}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {error && <p role="alert" className="text-sm font-semibold text-risk">{error}</p>}

          <button
            type="button"
            onClick={() => void checkout()}
            disabled={pending || !selectedId}
            className="inline-flex h-11 items-center justify-center rounded-full bg-paper px-5 text-sm font-semibold text-ink transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "Opening checkout..." : "Continue to checkout"}
          </button>
        </div>
      </dialog>
    </>
  );
}
