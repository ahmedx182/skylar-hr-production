import Link from "next/link";
import { PLATFORM_PRICING_PATH } from "@/constants/routes";
import { cn } from "@/lib/utils/cn";

export type PricingTab = "plans" | "promo";

const tabs: { key: PricingTab; label: string; href: string }[] = [
  { key: "plans", label: "Plans", href: PLATFORM_PRICING_PATH },
  { key: "promo", label: "Promo codes", href: `${PLATFORM_PRICING_PATH}?tab=promo` },
];

/** Tabs are links, so the view is shareable and promo codes are only fetched from Stripe when that tab is open. */
export function PricingTabs({ active }: { active: PricingTab }) {
  return (
    <nav aria-label="Pricing sections" className="flex gap-1 border-b border-paper/10">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/40",
            tab.key === active ? "border-sun text-paper" : "border-transparent text-paper-3 hover:text-paper",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
