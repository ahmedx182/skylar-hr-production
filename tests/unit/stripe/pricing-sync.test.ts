import { beforeEach, describe, expect, it, vi } from "vitest";

const productsUpdate = vi.fn();
const productsCreate = vi.fn();
const pricesRetrieve = vi.fn();
const pricesCreate = vi.fn();
const pricesUpdate = vi.fn();
const attachStripeIds = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/server", () => ({ getServerEnv: () => ({ STRIPE_SECRET_KEY: "sk_test" }) }));
vi.mock("@/server/stripe/client", () => ({
  stripe: () => ({
    products: { update: productsUpdate, create: productsCreate },
    prices: { retrieve: pricesRetrieve, create: pricesCreate, update: pricesUpdate },
  }),
}));
vi.mock("@/server/repositories/pricing.repository", () => ({ attachStripeIds: (...args: unknown[]) => attachStripeIds(...args) }));

import { syncPackageToStripe } from "@/server/stripe/pricing-sync";
import type { PricingPackage } from "@/features/pricing/package";

const pkg: PricingPackage = {
  id: "professional",
  name: "Professional",
  description: "Per workspace",
  priceCents: 14900,
  interval: "month",
  features: [],
  advisorMessageLimit: null,
  highlighted: true,
  badge: null,
  published: true,
  archived: false,
  sortOrder: 1,
  stripeProductId: "prod_test_mode",
  stripePriceId: "price_test_mode",
  createdAtMs: null,
  updatedAtMs: null,
};

const missing = () => Object.assign(new Error("No such product"), { code: "resource_missing" });

describe("syncPackageToStripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productsCreate.mockResolvedValue({ id: "prod_live" });
    pricesCreate.mockResolvedValue({ id: "price_live" });
    pricesUpdate.mockResolvedValue({});
  });

  it("keeps the stored product and price when nothing changed", async () => {
    pricesRetrieve.mockResolvedValue({ active: true, unit_amount: 14900, currency: "usd", recurring: { interval: "month" }, product: "prod_test_mode" });
    productsUpdate.mockResolvedValue({});

    expect(await syncPackageToStripe(pkg)).toEqual({ status: "synced", stripePriceId: "price_test_mode", createdNewPrice: false });
    expect(productsCreate).not.toHaveBeenCalled();
    expect(pricesCreate).not.toHaveBeenCalled();
  });

  it("creates a new product and price when the stored ones belong to the other Stripe mode", async () => {
    pricesRetrieve.mockRejectedValue(missing());
    productsUpdate.mockRejectedValue(missing());

    expect(await syncPackageToStripe(pkg)).toEqual({ status: "synced", stripePriceId: "price_live", createdNewPrice: true });
    expect(productsCreate).toHaveBeenCalledWith(expect.objectContaining({ name: "Professional", metadata: { packageId: "professional" } }));
    expect(pricesCreate).toHaveBeenCalledWith(expect.objectContaining({ product: "prod_live", unit_amount: 14900 }));
    expect(attachStripeIds).toHaveBeenCalledWith("professional", { stripeProductId: "prod_live", stripePriceId: "price_live" });
  });

  it("reports a real Stripe failure instead of silently replacing the product", async () => {
    pricesRetrieve.mockResolvedValue(null);
    productsUpdate.mockRejectedValue(new Error("Stripe is down"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect((await syncPackageToStripe(pkg)).status).toBe("failed");
    expect(productsCreate).not.toHaveBeenCalled();
  });
});
