import { CheckCircle2 } from "lucide-react";
import { BillingActions } from "@/components/billing/billing-actions";
import { BillingHistory } from "@/components/billing/billing-history";
import { BillingReturnNotice, type BillingReturn } from "@/components/billing/billing-return-notice";
import {
  giftDaysRemaining,
  giftMessagesRemaining,
  type CompanyBillingState,
} from "@/features/billing/subscription-status";
import { cn } from "@/lib/utils/cn";
import type { BillingHistoryItem } from "@/server/stripe/billing-history";

const longDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export type BillingOffer = { id: string; name: string; priceLabel: string; amount: string; period: string; features: string[] };
type Trial = { days: number; daysLeft: number | null; expired: boolean };
type Escalations = { counter: "lifetime" | "monthly"; remaining: number; limit: number };

export function BillingView({
  billing,
  trial,
  escalations,
  history,
  offers,
  stripeReady,
  paymentGateDisabled,
  isPlatformAdmin,
  billingReturn,
}: {
  billing: CompanyBillingState;
  trial: Trial;
  escalations: Escalations;
  history: BillingHistoryItem[] | null;
  offers: BillingOffer[];
  stripeReady: boolean;
  paymentGateDisabled: boolean;
  isPlatformAdmin: boolean;
  billingReturn: BillingReturn | null;
}) {
  const trialEnded = billing.plan !== "paid" && trial.expired;

  // A gift only matters while nothing else already makes the workspace paid.
  const gift =
    billing.giftActive && billing.gift && billing.planOverride !== "paid" && billing.status !== "active" && billing.status !== "past_due"
      ? billing.gift
      : null;
  const stripeSubscribed = Boolean(billing.stripeSubscriptionId) && (billing.status === "active" || billing.status === "past_due");
  // Already paid by Stripe, a grant or a manual override: there is nothing to buy. A gift still lets them subscribe.
  const alreadyPaid = stripeSubscribed || billing.planOverride === "paid" || (billing.plan === "paid" && !gift);
  const canBuy = stripeReady && !paymentGateDisabled && !alreadyPaid;

  const summary = planSummary({ billing, trial, gift, stripeSubscribed, trialEnded });
  const offer = offers[0];
  const showOffer = canBuy && Boolean(offer);
  const unlimitedMessages = billing.plan === "paid" || billing.freeMessageLimit === null;

  return (
    <section className="mx-auto grid w-full max-w-[1120px] content-start gap-6">
        {billingReturn && <BillingReturnNotice result={billingReturn} isPaid={billing.plan === "paid"} />}
        {trialEnded && (
          <p role="status" className="rounded-2xl bg-attention/10 px-4 py-3 text-sm leading-6 text-attention">
            Your {trial.days}-day free trial has ended. Upgrade to keep chatting with Skylar and your HR advisor.
          </p>
        )}

        <div>
          <h1 className="text-2xl font-semibold text-paper">Billing</h1>
          <p className="mt-1 text-sm text-paper-3">Your plan, what you have left this period, and your invoices.</p>
        </div>

        <div className={cn("grid items-stretch gap-5", showOffer && "lg:grid-cols-2")}>
          <div className="flex flex-col gap-6 rounded-[22px] bg-paper/[0.04] p-6 ring-1 ring-paper/[0.08] md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-paper-3">Current plan</p>
                <h2 className="mt-1 text-3xl font-semibold tracking-tight text-paper">{summary.headline}</h2>
                {summary.subline && <p className={cn("mt-1 text-sm", summary.sublineTone === "warning" ? "text-risk" : "text-paper-3")}>{summary.subline}</p>}
              </div>
              <PlanBadge billing={billing} hasGift={Boolean(gift)} />
            </div>

            <p className="max-w-[62ch] text-sm leading-6 text-paper-2">{summary.body}</p>

            <div className="grid gap-5 border-t border-paper/[0.08] pt-6 sm:grid-cols-2">
              <Meter
                label="Advisor messages"
                value={
                  gift
                    ? `${giftMessagesRemaining(gift)} of ${gift.messageLimit} left`
                    : unlimitedMessages
                      ? "Unlimited"
                      : `${billing.freeMessagesRemaining} of ${billing.freeMessageLimit} left`
                }
                remaining={gift ? giftMessagesRemaining(gift) : unlimitedMessages ? null : billing.freeMessagesRemaining}
                total={gift ? gift.messageLimit : unlimitedMessages ? null : billing.freeMessageLimit}
              />
              <Meter
                label={escalations.counter === "monthly" ? "Human escalations this month" : "Free human escalation"}
                value={`${escalations.remaining} of ${escalations.limit} left`}
                remaining={escalations.remaining}
                total={escalations.limit}
              />
              {billing.plan !== "paid" && trial.daysLeft !== null && trial.days > 0 && (
                <Meter
                  label="Free trial"
                  value={trial.expired ? "Ended" : `${trial.daysLeft} ${trial.daysLeft === 1 ? "day" : "days"} left`}
                  remaining={trial.expired ? 0 : trial.daysLeft}
                  total={trial.days}
                />
              )}
            </div>

            {!canBuy && !alreadyPaid && (
              <p className="rounded-2xl bg-paper/[0.05] px-4 py-3 text-sm leading-6 text-paper-2">
                {paymentGateDisabled
                  ? "Payments are turned off for this demo. Everything else works as normal."
                  : isPlatformAdmin
                    ? "Upgrades need a STRIPE_SECRET_KEY and at least one paid plan synced to Stripe in Platform → Pricing."
                    : "Upgrades aren't available yet. Check back soon."}
              </p>
            )}

            {stripeSubscribed && (
              <div className="mt-auto">
                <BillingActions hasCustomer={Boolean(billing.stripeCustomerId)} plans={[]} />
              </div>
            )}
          </div>

          {showOffer && (
            <div className="flex flex-col rounded-[22px] bg-sun/[0.06] p-6 ring-1 ring-sun/25 md:p-8">
              <p className="text-xs font-semibold text-sun">{gift ? "Keep it after your gift ends" : "Upgrade"}</p>
              <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-3xl font-semibold tracking-tight text-paper">{offer.name}</h2>
                <p className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-semibold tracking-tight tabular-nums text-paper">{offer.amount}</span>
                  <span className="text-sm text-paper-3">{offer.period}</span>
                </p>
              </div>
              <ul className="mt-6 grid gap-3">
                {offer.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm leading-5 text-paper-2">
                    <CheckCircle2 className="mt-px size-4 shrink-0 text-sun" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-auto grid gap-3 pt-8">
                <BillingActions hasCustomer={Boolean(billing.stripeCustomerId)} plans={offers} />
                <p className="text-xs text-paper-3">Have a promo code? You can enter it on the checkout page.</p>
              </div>
            </div>
          )}
        </div>

        <BillingHistory items={history} />
      </section>
  );
}

type Summary = { headline: string; subline: string | null; sublineTone: "muted" | "warning"; body: string };

function planSummary({
  billing,
  trial,
  gift,
  stripeSubscribed,
  trialEnded,
}: {
  billing: CompanyBillingState;
  trial: { days: number; daysLeft: number | null; expired: boolean };
  gift: CompanyBillingState["gift"];
  stripeSubscribed: boolean;
  trialEnded: boolean;
}): Summary {
  if (billing.planOverride === "paid") {
    return {
      headline: "Paid plan",
      subline: "Access granted by Skylar",
      sublineTone: "muted",
      body: "Skylar has granted this workspace paid access, so there's nothing to pay. Advisor messages are unlimited.",
    };
  }
  if (gift) {
    const days = giftDaysRemaining(gift);
    const messages = giftMessagesRemaining(gift);
    return {
      headline: "Gifted paid plan",
      subline: `Until ${longDate.format(gift.endsAtMs)}`,
      sublineTone: "muted",
      body: `Skylar has gifted this workspace the paid plan until ${longDate.format(gift.endsAtMs)} (${days} ${days === 1 ? "day" : "days"} left) or ${messages} more advisor ${
        messages === 1 ? "message" : "messages"
      }, whichever comes first. After that it goes back to the free plan unless you subscribe.`,
    };
  }
  if (billing.plan === "paid") {
    const pastDue = billing.status === "past_due";
    return {
      headline: "Paid plan",
      subline: pastDue
        ? "Your last payment failed. Update your card in the billing portal."
        : billing.currentPeriodEndMs
          ? `Renews ${longDate.format(billing.currentPeriodEndMs)}`
          : null,
      sublineTone: pastDue ? "warning" : "muted",
      body: stripeSubscribed
        ? "Advisor chat is unlimited and you get three human escalations a month. Update your card, download invoices or cancel in the billing portal."
        : "Advisor chat is unlimited and you get three human escalations a month.",
    };
  }

  const allowance = billing.freeMessageLimit === null ? "unlimited chat with Skylar AI" : `${billing.freeMessageLimit} advisor messages`;
  return {
    headline: trialEnded ? "Trial ended" : trial.daysLeft !== null && trial.days > 0 ? "Free trial" : "Free plan",
    subline: trialEnded ? null : trial.daysLeft !== null && trial.days > 0 ? `${trial.daysLeft} ${trial.daysLeft === 1 ? "day" : "days"} left` : null,
    sublineTone: "muted",
    body: `Free workspaces include ${allowance}${trial.days > 0 ? ` during a ${trial.days}-day free trial` : ""}, plus one free escalation to a human Skylar HR professional. Upgrade for unlimited advisor chat and three human escalations a month.`,
  };
}

function PlanBadge({ billing, hasGift }: { billing: CompanyBillingState; hasGift: boolean }) {
  const isPaid = billing.plan === "paid";
  const exhausted = !isPaid && billing.freeMessageLimit !== null && billing.freeMessagesRemaining === 0;
  return (
    <span className={cn("w-fit rounded-full px-3.5 py-1.5 text-xs font-semibold", exhausted ? "bg-risk/15 text-risk" : isPaid ? "bg-success/15 text-success" : "bg-paper/[0.08] text-paper-2")}>
      {isPaid ? (hasGift ? "Gifted paid plan" : "Paid plan") : exhausted ? "Upgrade required" : "Free plan"}
    </span>
  );
}

/** The bar shows what is left, matching the label. `remaining` and `total` are both null for an unlimited allowance, which has nothing to fill. */
function Meter({ label, value, remaining, total }: { label: string; value: string; remaining: number | null; total: number | null }) {
  const bounded = remaining !== null && total !== null && total > 0;
  const left = bounded ? Math.min(100, Math.max(0, (remaining / total) * 100)) : 0;
  const spent = bounded && remaining === 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-paper-2">{label}</p>
        <p className="text-sm font-semibold tabular-nums text-paper">{value}</p>
      </div>
      {bounded && (
        <div
          role="meter"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={remaining}
          className={cn("mt-2.5 h-1.5 overflow-hidden rounded-full", spent ? "bg-risk/30" : "bg-paper/[0.08]")}
        >
          <div className="h-full rounded-full bg-sun transition-[width] duration-500" style={{ width: `${left}%` }} />
        </div>
      )}
    </div>
  );
}
