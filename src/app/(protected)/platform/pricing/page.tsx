import type { Metadata } from "next";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import { PricingManager, type PackageWithStats } from "@/components/platform/pricing-manager";
import { FREE_PACKAGE_ID } from "@/features/pricing/package";
import { getSession } from "@/server/auth/get-session";
import { requirePlatformAdminPage } from "@/server/auth/platform-admin";
import { listWorkspaceRows } from "@/server/repositories/platform.repository";
import { listPackages } from "@/server/repositories/pricing.repository";
import { isStripeConfigured } from "@/server/stripe/pricing-sync";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getSession())?.isPlatformAdmin ? "Pricing" : "Not found" };
}
export const dynamic = "force-dynamic";

export default async function PlatformPricingPage() {
  const session = await requirePlatformAdminPage();
  const [packages, rows] = await Promise.all([listPackages({ includeArchived: true }), listWorkspaceRows()]);
  const live = rows.filter((row) => row.status !== "deleted");

  const withStats: PackageWithStats[] = packages.map((pkg) => ({
    ...pkg,
    subscribers:
      pkg.id === FREE_PACKAGE_ID
        ? live.filter((row) => row.plan === "free").length
        : live.filter((row) => row.payingViaStripe && row.packageId === pkg.id).length,
  }));
  const unassigned = live.filter((row) => row.payingViaStripe && !row.packageId).length;

  return (
    <BriefingRoomFrame session={session} active="Pricing" mode="platform">
      <section className="grid content-start gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-paper">Pricing</h1>
          <p className="mt-1 text-sm text-paper-3">
            The packages shown on the landing page and offered in Billing. Prices are created in Stripe for you.
          </p>
          {unassigned > 0 && (
            <p className="mt-2 text-xs text-paper-3">
              {unassigned} paying workspace{unassigned === 1 ? "" : "s"} subscribed before packages existed and {unassigned === 1 ? "isn't" : "aren't"} counted per package.
            </p>
          )}
        </div>
        <PricingManager packages={withStats} stripeConfigured={isStripeConfigured()} />
      </section>
    </BriefingRoomFrame>
  );
}
