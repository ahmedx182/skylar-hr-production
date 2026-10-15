import { CheckCircle2, Info } from "lucide-react";

export type BillingReturn = "success" | "cancelled";

export function parseBillingReturn(value: string | string[] | undefined): BillingReturn | null {
  return value === "success" || value === "cancelled" ? value : null;
}

/** Shown after Stripe Checkout redirects back. The webhook, not this redirect, is what activates the plan. */
export function BillingReturnNotice({ result, isPaid }: { result: BillingReturn; isPaid: boolean }) {
  if (result === "cancelled") {
    return (
      <p role="status" className="flex items-start gap-3 rounded-2xl bg-paper/[0.06] px-4 py-3 text-sm leading-6 text-paper-2">
        <Info className="mt-1 size-4 shrink-0 text-paper-3" aria-hidden="true" />
        Checkout was cancelled. You have not been charged, and you can upgrade any time.
      </p>
    );
  }

  return (
    <p role="status" className="flex items-start gap-3 rounded-2xl bg-success/10 px-4 py-3 text-sm leading-6 text-paper">
      <CheckCircle2 className="mt-1 size-4 shrink-0 text-success" aria-hidden="true" />
      {isPaid
        ? "You're on Professional. Advisor messages are now unlimited."
        : "Payment received. Your plan switches on as soon as Stripe confirms it, usually within a minute. Refresh to see it."}
    </p>
  );
}
