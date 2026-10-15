export type BillingInterval = "month" | "year";

/** The one package every new workspace starts on. Its id is fixed so billing code can find it. */
export const FREE_PACKAGE_ID = "free";

/** Stripe rejects recurring charges below this. */
export const MIN_PAID_PRICE_CENTS = 50;

export type PricingPackage = {
  id: string;
  name: string;
  description: string;
  /** 0 only for the free package. */
  priceCents: number;
  interval: BillingInterval;
  features: string[];
  /** Free package only: lifetime advisor messages. Paid packages are unlimited. */
  advisorMessageLimit: number | null;
  highlighted: boolean;
  badge: string | null;
  published: boolean;
  archived: boolean;
  sortOrder: number;
  stripeProductId: string | null;
  stripePriceId: string | null;
  createdAtMs: number | null;
  updatedAtMs: number | null;
};

/** Fields a super admin edits. Everything else is managed by the system. */
export type PricingPackageInput = Pick<
  PricingPackage,
  "name" | "description" | "priceCents" | "interval" | "features" | "advisorMessageLimit" | "highlighted" | "badge" | "published" | "sortOrder"
>;

export function isFreePackage(pkg: Pick<PricingPackage, "id">): boolean {
  return pkg.id === FREE_PACKAGE_ID;
}

/** A package a workspace can check out with right now. */
export function isPurchasable(pkg: PricingPackage): boolean {
  return !isFreePackage(pkg) && !pkg.archived && pkg.published && pkg.priceCents >= MIN_PAID_PRICE_CENTS && Boolean(pkg.stripePriceId);
}

export function formatDollars(cents: number): string {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function intervalLabel(interval: BillingInterval): string {
  return interval === "year" ? "year" : "month";
}

/** "$49 / month", or "$0" for the free package. */
export function formatPackagePrice(pkg: Pick<PricingPackage, "priceCents" | "interval">): { amount: string; period: string } {
  if (pkg.priceCents === 0) return { amount: "$0", period: "forever" };
  return { amount: formatDollars(pkg.priceCents), period: `/ ${intervalLabel(pkg.interval)}` };
}

export function monthlyEquivalentCents(pkg: Pick<PricingPackage, "priceCents" | "interval">): number {
  return pkg.interval === "year" ? Math.round(pkg.priceCents / 12) : pkg.priceCents;
}

/** What a landing-page card lists: the free allowance is derived so it can never disagree with enforcement. */
export function displayFeatures(pkg: PricingPackage): string[] {
  const allowance =
    isFreePackage(pkg) && pkg.advisorMessageLimit !== null
      ? [`${pkg.advisorMessageLimit} advisor ${pkg.advisorMessageLimit === 1 ? "message" : "messages"}`]
      : [];
  return [...allowance, ...pkg.features];
}

export type ExistingStripePrice = {
  active: boolean;
  unitAmount: number | null;
  currency: string;
  interval: string | null;
  productId: string | null;
};

/** Stripe Prices are immutable, so any change to amount, interval or currency needs a fresh Price. */
export function needsNewStripePrice(
  existing: ExistingStripePrice | null,
  pkg: Pick<PricingPackage, "priceCents" | "interval">,
): boolean {
  if (!existing || !existing.active) return true;
  return existing.unitAmount !== pkg.priceCents || existing.interval !== pkg.interval || existing.currency !== "usd";
}

export const DEFAULT_PACKAGES: Array<Omit<PricingPackage, "createdAtMs" | "updatedAtMs" | "stripeProductId" | "stripePriceId" | "archived">> = [
  {
    id: FREE_PACKAGE_ID,
    name: "Free",
    description: "Try the full briefing room with your real team.",
    priceCents: 0,
    interval: "month",
    features: [
      "Daily AI briefing deck",
      "Unlimited employees and team seats",
      "Conversation memory per employee",
      "Advisor escalation routing",
      "PDF employee file exports",
    ],
    advisorMessageLimit: 5,
    highlighted: false,
    badge: null,
    published: true,
    sortOrder: 0,
  },
  {
    id: "professional",
    name: "Professional",
    description: "Per workspace, billed monthly. Cancel any time.",
    priceCents: 4900,
    interval: "month",
    features: [
      "Everything in Free",
      "Unlimited advisor messages",
      "Secure checkout and invoices by Stripe",
      "Change card or cancel from the billing portal",
    ],
    advisorMessageLimit: null,
    highlighted: true,
    badge: "Most teams",
    published: true,
    sortOrder: 1,
  },
];
