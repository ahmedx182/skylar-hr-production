import type { Metadata } from "next";
import { CheckCircle2, CreditCard, MessageSquare, ShieldAlert, type LucideIcon } from "lucide-react";
import { BillingActions } from "@/components/billing/billing-actions";
import { BillingReturnNotice, parseBillingReturn } from "@/components/billing/billing-return-notice";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import {
  giftDaysRemaining,
  giftMessagesRemaining,
  type BillingStatus,
  type CompanyBillingState,
} from "@/features/billing/subscription-status";
import { formatPackagePrice, isPurchasable } from "@/features/pricing/package";
import { getServerEnv } from "@/lib/env/server";
import { requirePageSession } from "@/server/auth/require-session";
import { requireRole } from "@/server/auth/require-role";
import { getOrCreateCompanyBillingState } from "@/server/repositories/billing.repository";
import { listPublishedPackages } from "@/server/repositories/pricing.repository";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { billing?: string | string[] };
}) {
  const session = await requirePageSession();
  requireRole(session, ["admin"]);
  const billing = await getOrCreateCompanyBillingState(session);
  const billingReturn = parseBillingReturn(searchParams.billing);
  const env = getServerEnv();
  const paymentGateDisabled = env.DEMO_DISABLE_PAYMENT_GATE;
  const plans = (await listPublishedPackages()).filter(isPurchasable).map((pkg) => {
    const price = formatPackagePrice(pkg);
    return { id: pkg.id, name: pkg.name, priceLabel: `${price.amount} ${price.period}` };
  });
  const stripeReady = Boolean(env.STRIPE_SECRET_KEY) && plans.length > 0;
  // A gift only matters while nothing else already makes the workspace paid.
  const gift =
    billing.giftActive && billing.gift && billing.planOverride !== "paid" && billing.status !== "active" && billing.status !== "past_due"
      ? billing.gift
      : null;
  const giftEnds = gift
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(gift.endsAtMs)
    : null;

  return (
    <BriefingRoomFrame session={session} active="Billing">
      <section className="grid content-start gap-4">
        {billingReturn && <BillingReturnNotice result={billingReturn} isPaid={billing.plan === "paid"} />}
        <div className="rounded-[24px] bg-ink-2 px-5 py-5 text-paper shadow-[0_20px_56px_rgba(0,0,0,0.22),inset_0_0_0_1px_rgba(244,239,231,0.055)] md:px-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase text-paper-3">Billing</p>
              <h1 className="mt-2 max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">
                {billing.plan === "paid" ? "Your workspace is on the paid plan." : "Your workspace is on the free plan."}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-paper-3 md:text-base">
                Free workspaces include {billing.freeMessageLimit} advisor messages. Stripe Checkout starts the
                paid plan for unlimited advisor chat, and webhooks update the company record after Stripe
                confirms the subscription.
              </p>
            </div>
            <BillingBadge billing={billing} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="rounded-[20px] bg-ink-2/70 p-4 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.04)]">
            <div className="grid gap-3 sm:grid-cols-3">
              <BillingMetric
                icon={CreditCard}
                label="Status"
                value={billing.planOverride === "paid" ? "Granted" : gift ? "Gift" : statusLabel(billing.status)}
              />
              <BillingMetric
                icon={MessageSquare}
                label="Advisor messages"
                value={
                  gift
                    ? `${giftMessagesRemaining(gift)} of ${gift.messageLimit} left`
                    : billing.plan === "paid"
                    ? "Unlimited"
                    : `${billing.freeMessagesRemaining} of ${billing.freeMessageLimit} left`
                }
              />
              <BillingMetric
                icon={CheckCircle2}
                label="Plan"
                value={billing.plan === "paid" ? "Paid" : "Free"}
              />
            </div>

            <div className="mt-4 rounded-2xl bg-paper/[0.055] p-4">
              <p className="font-mono text-xs uppercase text-paper-3">Stripe actions</p>
              {billing.planOverride === "paid" ? (
                <p className="mt-3 text-sm leading-6 text-paper-2">
                  Skylar has granted this workspace paid access, so there&apos;s nothing to pay. Advisor messages are
                  unlimited.
                </p>
              ) : gift ? (
                <div className="mt-3 grid gap-3">
                  <p className="text-sm leading-6 text-paper-2">
                    Skylar has gifted this workspace the paid plan until {giftEnds} ({giftDaysRemaining(gift)}{" "}
                    {giftDaysRemaining(gift) === 1 ? "day" : "days"} left) or {giftMessagesRemaining(gift)} more advisor{" "}
                    {giftMessagesRemaining(gift) === 1 ? "message" : "messages"}, whichever comes first. After that it goes
                    back to the free plan unless you subscribe.
                  </p>
                  {stripeReady && !paymentGateDisabled && (
                    <BillingActions hasCustomer={Boolean(billing.stripeCustomerId)} plans={plans} />
                  )}
                </div>
              ) : paymentGateDisabled ? (
                <p className="mt-3 text-sm leading-6 text-paper-2">
                  Payment is disabled for the client demo. The core app remains accessible while
                  live Stripe setup stays out of tomorrow&apos;s scope.
                </p>
              ) : !stripeReady ? (
                <p className="mt-3 text-sm leading-6 text-paper-2">
                  Upgrades aren&apos;t available yet. Stripe needs a <code className="font-mono text-paper">STRIPE_SECRET_KEY</code>{" "}
                  and at least one paid plan synced to Stripe in the Platform pricing page.
                </p>
              ) : (
                <div className="mt-3">
                  <BillingActions hasCustomer={Boolean(billing.stripeCustomerId)} plans={plans} />
                </div>
              )}
            </div>
          </div>

          <aside className="rounded-[20px] bg-ink-2/70 p-5 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.04)]">
            <div className="flex items-start gap-3 rounded-2xl bg-risk/10 p-4 text-risk">
              <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">Webhook is authoritative</p>
                <p className="mt-2 text-sm leading-6 text-paper-3">
                  Returning from Stripe does not unlock the app by itself. The subscription state
                  changes only after `/api/stripe/webhook` verifies Stripe&apos;s signature.
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-paper/[0.055] p-4">
              <p className="font-mono text-xs uppercase text-paper-3">Release check</p>
              <p className="mt-2 text-sm leading-6 text-paper-2">
                {paymentGateDisabled
                  ? "For tomorrow, demo every core flow except payment. Re-enable the gate before live billing UAT."
                  : "Add live Stripe keys, set the webhook endpoint, then run the full free to paid flow before releasing the web app."}
              </p>
            </div>
          </aside>
        </div>
      </section>
    </BriefingRoomFrame>
  );
}

function BillingBadge({ billing }: { billing: CompanyBillingState }) {
  const isPaid = billing.plan === "paid";
  const exhausted = !isPaid && billing.freeMessagesRemaining === 0;
  return (
    <div className={`w-fit rounded-full px-4 py-2 text-sm font-semibold ${exhausted ? "bg-risk/15 text-risk" : "bg-success/15 text-success"}`}>
      {isPaid ? (billing.giftActive && billing.status !== "active" && billing.status !== "past_due" && billing.planOverride !== "paid" ? "Gifted paid plan" : "Paid plan") : exhausted ? "Upgrade required" : "Free plan"}
    </div>
  );
}

function BillingMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-paper/[0.055] p-4">
      <Icon className="size-5 text-paper-3" aria-hidden="true" />
      <p className="mt-4 font-mono text-xs uppercase text-paper-3">{label}</p>
      <p className="mt-1 text-lg font-semibold text-paper">{value}</p>
    </div>
  );
}

function statusLabel(status: BillingStatus): string {
  if (status === "free") return "Free";
  if (status === "trialing") return "Trial";
  if (status === "active") return "Active";
  if (status === "past_due") return "Past due";
  if (status === "incomplete") return "Incomplete";
  if (status === "unpaid") return "Unpaid";
  if (status === "canceled") return "Canceled";
  return "Not started";
}
