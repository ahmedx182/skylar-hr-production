import type { Metadata } from "next";
import { BillingView } from "@/components/billing/billing-view";
import { parseBillingReturn } from "@/components/billing/billing-return-notice";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import { displayFeatures, formatPackagePrice, isPurchasable } from "@/features/pricing/package";
import { getServerEnv } from "@/lib/env/server";
import { requirePageSession } from "@/server/auth/require-session";
import { requireRole } from "@/server/auth/require-role";
import { getEscalationAllowanceForCompany, getFreeTrialForCompany, getOrCreateCompanyBillingState } from "@/server/repositories/billing.repository";
import { listPublishedPackages } from "@/server/repositories/pricing.repository";
import { listBillingHistory } from "@/server/stripe/billing-history";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { billing?: string | string[] };
}) {
  const session = await requirePageSession();
  requireRole(session, ["admin"]);
  const [billing, trial, escalations] = await Promise.all([
    getOrCreateCompanyBillingState(session),
    getFreeTrialForCompany(session.companyId),
    getEscalationAllowanceForCompany(session),
  ]);
  const history = billing.stripeCustomerId ? await listBillingHistory(billing.stripeCustomerId) : [];
  const env = getServerEnv();
  const offers = (await listPublishedPackages()).filter(isPurchasable).map((pkg) => {
    const price = formatPackagePrice(pkg);
    return {
      id: pkg.id,
      name: pkg.name,
      priceLabel: `${price.amount} ${price.period}`,
      amount: price.amount,
      period: price.period,
      features: displayFeatures(pkg),
    };
  });

  return (
    <BriefingRoomFrame session={session} active="Billing">
      <BillingView
        billing={billing}
        trial={trial}
        escalations={escalations}
        history={history}
        offers={offers}
        stripeReady={Boolean(env.STRIPE_SECRET_KEY) && offers.length > 0}
        paymentGateDisabled={env.DEMO_DISABLE_PAYMENT_GATE}
        isPlatformAdmin={session.isPlatformAdmin === true}
        billingReturn={parseBillingReturn(searchParams.billing)}
      />
    </BriefingRoomFrame>
  );
}
