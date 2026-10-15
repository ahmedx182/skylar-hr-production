import { describe, expect, it } from "vitest";
import {
  DEFAULT_PACKAGES,
  displayFeatures,
  formatDollars,
  formatPackagePrice,
  isPurchasable,
  monthlyEquivalentCents,
  needsNewStripePrice,
  type PricingPackage,
} from "@/features/pricing/package";
import { daysUntilPurge, deleteAfterMs, DELETION_GRACE_DAYS, isPurgeDue } from "@/features/platform/lifecycle";
import { packageInputSchema, toPackageInput } from "@/schemas/pricing.schema";

const base: PricingPackage = {
  ...DEFAULT_PACKAGES[1],
  archived: false,
  stripeProductId: "prod_1",
  stripePriceId: "price_1",
  createdAtMs: null,
  updatedAtMs: null,
};

describe("package pricing helpers", () => {
  it("formats prices without trailing zeros", () => {
    expect(formatDollars(4900)).toBe("$49");
    expect(formatDollars(1999)).toBe("$19.99");
    expect(formatPackagePrice(base)).toEqual({ amount: "$49", period: "/ month" });
    expect(formatPackagePrice({ priceCents: 0, interval: "month" })).toEqual({ amount: "$0", period: "forever" });
  });

  it("counts yearly plans as a twelfth for monthly revenue", () => {
    expect(monthlyEquivalentCents({ priceCents: 49_000, interval: "year" })).toBe(4083);
    expect(monthlyEquivalentCents({ priceCents: 4900, interval: "month" })).toBe(4900);
  });

  it("only offers published, synced, paid, unarchived packages for checkout", () => {
    expect(isPurchasable(base)).toBe(true);
    expect(isPurchasable({ ...base, archived: true })).toBe(false);
    expect(isPurchasable({ ...base, published: false })).toBe(false);
    expect(isPurchasable({ ...base, stripePriceId: null })).toBe(false);
    expect(isPurchasable({ ...base, id: "free", priceCents: 0 })).toBe(false);
  });

  it("lists the free allowance first so the page can't disagree with enforcement", () => {
    const free: PricingPackage = { ...base, id: "free", priceCents: 0, advisorMessageLimit: 12, features: ["Briefings"] };
    expect(displayFeatures(free)).toEqual(["12 advisor messages", "Briefings"]);
    expect(displayFeatures({ ...free, advisorMessageLimit: 1 })[0]).toBe("1 advisor message");
    expect(displayFeatures(base)).toEqual(base.features);
  });
});

describe("needsNewStripePrice", () => {
  const live = { active: true, unitAmount: 4900, currency: "usd", interval: "month", productId: "prod_1" };

  it("keeps the existing price when nothing changed", () => {
    expect(needsNewStripePrice(live, base)).toBe(false);
  });

  it.each([
    ["a different amount", { ...live, unitAmount: 3900 }],
    ["a different interval", { ...live, interval: "year" }],
    ["a different currency", { ...live, currency: "eur" }],
    ["an archived price", { ...live, active: false }],
    ["no price at all", null],
  ])("creates a fresh price for %s", (_label, existing) => {
    expect(needsNewStripePrice(existing, base)).toBe(true);
  });
});

describe("package input rules", () => {
  const payload = (overrides: Record<string, unknown> = {}) =>
    packageInputSchema.parse({
      name: "Team",
      priceUsd: 99,
      interval: "month",
      features: ["Everything", "  ", "Priority support"],
      ...overrides,
    });

  it("converts dollars to cents and drops blank features", () => {
    const result = toPackageInput(payload({ priceUsd: 19.99 }), { id: null });
    expect(result).toMatchObject({ ok: true, input: { priceCents: 1999, features: ["Everything", "Priority support"] } });
  });

  it("rejects free or sub-50-cent paid packages", () => {
    expect(toPackageInput(payload({ priceUsd: 0 }), { id: null })).toMatchObject({ ok: false });
    expect(toPackageInput(payload({ priceUsd: 0.2 }), { id: "team" })).toMatchObject({ ok: false });
  });

  it("keeps the Free package free and requires its allowance", () => {
    expect(toPackageInput(payload({ priceUsd: 25, advisorMessageLimit: 8 }), { id: "free" })).toMatchObject({
      ok: true,
      input: { priceCents: 0, advisorMessageLimit: 8 },
    });
    expect(toPackageInput(payload({ priceUsd: 0 }), { id: "free" })).toMatchObject({ ok: false });
  });

  it("never stores a message limit on a paid package", () => {
    expect(toPackageInput(payload({ advisorMessageLimit: 50 }), { id: "team" })).toMatchObject({
      ok: true,
      input: { advisorMessageLimit: null },
    });
  });

  it("rejects an empty name and too many features", () => {
    expect(packageInputSchema.safeParse({ name: " ", priceUsd: 10, interval: "month", features: [] }).success).toBe(false);
    expect(
      packageInputSchema.safeParse({ name: "Team", priceUsd: 10, interval: "month", features: Array.from({ length: 13 }, (_, i) => `f${i}`) }).success,
    ).toBe(false);
  });
});

describe("deletion grace period", () => {
  const day = 24 * 60 * 60 * 1000;

  it("allows 30 days before permanent removal", () => {
    expect(DELETION_GRACE_DAYS).toBe(30);
    expect(deleteAfterMs(0)).toBe(30 * day);
  });

  it("counts whole days left and never goes negative", () => {
    expect(daysUntilPurge(30 * day, 0)).toBe(30);
    expect(daysUntilPurge(30 * day, 29.5 * day)).toBe(1);
    expect(daysUntilPurge(30 * day, 40 * day)).toBe(0);
    expect(daysUntilPurge(null)).toBeNull();
  });

  it("is due only once the date has passed", () => {
    expect(isPurgeDue(30 * day, 29 * day)).toBe(false);
    expect(isPurgeDue(30 * day, 30 * day)).toBe(true);
    expect(isPurgeDue(null, 100 * day)).toBe(false);
  });
});
