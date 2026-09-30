import type { Metadata } from "next";
import { CalendarClock, CheckCircle2, CreditCard, ShieldAlert, type LucideIcon } from "lucide-react";
import { BillingActions } from "@/components/billing/billing-actions";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import type { BillingStatus, CompanyBillingState } from "@/features/billing/subscription-status";
import { getServerEnv } from "@/lib/env/server";
import { requirePageSession } from "@/server/auth/require-session";
import { requireRole } from "@/server/auth/require-role";
import { getOrCreateCompanyBillingState } from "@/server/repositories/billing.repository";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage() {
  const session = await requirePageSession();
  requireRole(session, ["admin"]);
  const billing = await getOrCreateCompanyBillingState(session);
  const paymentGateDisabled = getServerEnv().DEMO_DISABLE_PAYMENT_GATE;

  return (
    <BriefingRoomFrame session={session} active="Billing">
      <section className="grid content-start gap-4">
        <div className="rounded-[24px] bg-ink-2 px-5 py-5 text-paper shadow-[0_20px_56px_rgba(0,0,0,0.22),inset_0_0_0_1px_rgba(244,239,231,0.055)] md:px-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase text-paper-3">Billing</p>
              <h1 className="mt-2 max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">
                Keep the web app ready for release.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-paper-3 md:text-base">
                Trial access is server controlled. Stripe Checkout starts the paid plan, and
                webhooks update the company record after Stripe confirms the subscription.
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
                value={statusLabel(billing.status)}
              />
              <BillingMetric
                icon={CalendarClock}
                label="Trial ends"
                value={formatDate(billing.trialEndsAtMs)}
              />
              <BillingMetric
                icon={CheckCircle2}
                label="Access"
                value={billing.access === "allowed" ? "Allowed" : "Billing required"}
              />
            </div>

            <div className="mt-4 rounded-2xl bg-paper/[0.055] p-4">
              <p className="font-mono text-xs uppercase text-paper-3">Stripe actions</p>
              {paymentGateDisabled ? (
                <p className="mt-3 text-sm leading-6 text-paper-2">
                  Payment is disabled for the client demo. The core app remains accessible while
                  live Stripe setup stays out of tomorrow&apos;s scope.
                </p>
              ) : (
                <div className="mt-3">
                  <BillingActions hasCustomer={Boolean(billing.stripeCustomerId)} />
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
                  : "Add live Stripe keys, set the webhook endpoint, then run the full trial to paid flow before releasing the web app."}
              </p>
            </div>
          </aside>
        </div>
      </section>
    </BriefingRoomFrame>
  );
}

function BillingBadge({ billing }: { billing: CompanyBillingState }) {
  const isAllowed = billing.access === "allowed";
  return (
    <div className={`w-fit rounded-full px-4 py-2 text-sm font-semibold ${isAllowed ? "bg-success/15 text-success" : "bg-risk/15 text-risk"}`}>
      {isAllowed ? "Access active" : "Billing required"}
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
  if (status === "trialing") return "Trial";
  if (status === "active") return "Active";
  if (status === "past_due") return "Past due";
  if (status === "incomplete") return "Incomplete";
  if (status === "unpaid") return "Unpaid";
  if (status === "canceled") return "Canceled";
  return "Not started";
}

function formatDate(value: number | null): string {
  if (value === null) return "Not set";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
