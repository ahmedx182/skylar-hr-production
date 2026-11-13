import type { Metadata } from "next";
import { BadgeDollarSign, CloudCheck, CreditCard, Users } from "lucide-react";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import { PricingManager, type PackageWithStats } from "@/components/platform/pricing-manager";
import { PricingTabs, type PricingTab } from "@/components/platform/pricing-tabs";
import { PromotionCodesPanel } from "@/components/platform/promotion-codes-panel";
import { StatTile } from "@/components/platform/stat-tile";
import { FREE_PACKAGE_ID, isFreePackage } from "@/features/pricing/package";
import type { PromotionCodeSummary } from "@/features/pricing/promotion-code";
import { getSession } from "@/server/auth/get-session";
import { requirePlatformAdminPage } from "@/server/auth/platform-admin";
import { listWorkspaceRows } from "@/server/repositories/platform.repository";
import { listPackages } from "@/server/repositories/pricing.repository";
import { isStripeConfigured } from "@/server/stripe/pricing-sync";
import { listPromotionCodes } from "@/server/stripe/promotion-codes";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getSession())?.isPlatformAdmin ? "Pricing" : "Not found" };
}
export const dynamic = "force-dynamic";

async function loadPromotionCodes(): Promise<{ codes: PromotionCodeSummary[]; loadError: string | null }> {
  try {
    return { codes: await listPromotionCodes(), loadError: null };
  } catch (error) {
    console.error(JSON.stringify({ level: "error", event: "stripe_promotion_codes_load_failed", error: error instanceof Error ? error.message : "unknown" }));
    return { codes: [], loadError: "Promo codes couldn't be loaded from Stripe. Refresh to try again." };
  }
}

export default async function PlatformPricingPage({ searchParams }: { searchParams: { tab?: string } }) {
  const session = await requirePlatformAdminPage();
  const tab: PricingTab = searchParams.tab === "promo" ? "promo" : "plans";
  const stripeConfigured = isStripeConfigured();
  const [packages, rows, promotionCodes] = await Promise.all([
    listPackages({ includeArchived: true }),
    listWorkspaceRows(),
    tab === "promo" && stripeConfigured ? loadPromotionCodes() : null,
  ]);
  const live = rows.filter((row) => row.status !== "deleted");

  const withStats: PackageWithStats[] = packages.map((pkg) => ({
    ...pkg,
    subscribers:
      pkg.id === FREE_PACKAGE_ID
        ? live.filter((row) => row.plan === "free").length
        : live.filter((row) => row.payingViaStripe && row.packageId === pkg.id).length,
  }));
  const unassigned = live.filter((row) => row.payingViaStripe && !row.packageId).length;

  const offered = packages.filter((pkg) => !pkg.archived);
  const paidOffered = offered.filter((pkg) => !isFreePackage(pkg));
  const unsynced = paidOffered.filter((pkg) => !pkg.stripePriceId).length;

  return (
    <BriefingRoomFrame session={session} active="Pricing" mode="platform">
      <section className="mx-auto grid w-full max-w-[1120px] content-start gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-paper">Pricing</h1>
          <p className="mt-1 text-sm text-paper-3">What customers see on the landing page and in Billing. Prices are created in Stripe for you.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Plans offered" value={String(offered.filter((pkg) => pkg.published).length)} detail={`${offered.length} in total`} icon={BadgeDollarSign} />
          <StatTile label="Paying workspaces" value={String(live.filter((row) => row.payingViaStripe).length)} icon={CreditCard} tone="success" />
          <StatTile label="Free workspaces" value={String(live.filter((row) => row.plan === "free").length)} icon={Users} />
          <StatTile
            label="Stripe sync"
            value={!stripeConfigured ? "Not connected" : unsynced ? `${paidOffered.length - unsynced} of ${paidOffered.length}` : "All synced"}
            detail={!stripeConfigured ? "Add STRIPE_SECRET_KEY" : unsynced ? `${unsynced} paid ${unsynced === 1 ? "plan needs" : "plans need"} syncing` : undefined}
            icon={CloudCheck}
            tone={!stripeConfigured || unsynced ? "accent" : "success"}
          />
        </div>

        {unassigned > 0 && (
          <p className="text-xs text-paper-3">
            {unassigned} paying workspace{unassigned === 1 ? "" : "s"} subscribed before packages existed and {unassigned === 1 ? "isn't" : "aren't"} counted per package.
          </p>
        )}

        <PricingTabs active={tab} />

        {tab === "plans" ? (
          <PricingManager packages={withStats} stripeConfigured={stripeConfigured} />
        ) : promotionCodes ? (
          <PromotionCodesPanel codes={promotionCodes.codes} loadError={promotionCodes.loadError} />
        ) : (
          <p className="rounded-2xl bg-sun/10 px-4 py-3 text-sm leading-6 text-paper">
            Stripe isn&apos;t connected (no <code className="font-mono">STRIPE_SECRET_KEY</code>), so promo codes can&apos;t be loaded.
          </p>
        )}
      </section>
    </BriefingRoomFrame>
  );
}
