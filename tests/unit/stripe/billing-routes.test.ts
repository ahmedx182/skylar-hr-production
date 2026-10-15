import { beforeEach, describe, expect, it, vi } from "vitest";

const customersCreate = vi.fn();
const checkoutCreate = vi.fn();
const portalCreate = vi.fn();
const getBilling = vi.fn();
const setCustomer = vi.fn();
const saveCheckoutSession = vi.fn();
const requireSession = vi.fn();
const getPackage = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/server", () => ({
  getServerEnv: () => ({ NEXT_PUBLIC_APP_URL: "https://app.example.com/" }),
}));
vi.mock("@/server/stripe/client", () => ({
  stripe: () => ({
    customers: { create: customersCreate },
    checkout: { sessions: { create: checkoutCreate } },
    billingPortal: { sessions: { create: portalCreate } },
  }),
}));
vi.mock("@/server/repositories/pricing.repository", () => ({
  getPackage: (...args: unknown[]) => getPackage(...args),
}));
vi.mock("@/server/auth/require-session", () => ({ requireSession: () => requireSession() }));
vi.mock("@/server/repositories/billing.repository", () => ({
  getOrCreateCompanyBillingState: (...args: unknown[]) => getBilling(...args),
  setStripeCustomerForCompany: (...args: unknown[]) => setCustomer(...args),
  saveCheckoutSessionForCompany: (...args: unknown[]) => saveCheckoutSession(...args),
}));

import { POST as checkout } from "@/app/api/billing/checkout/route";
import { POST as portal } from "@/app/api/billing/portal/route";

const admin = { uid: "u1", role: "admin", companyId: "acme", companyName: "Acme", email: "a@acme.com" };

function post(path: string, origin: string | null = "http://localhost", body?: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      ...(origin ? { origin, host: "localhost" } : { host: "localhost" }),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

const checkoutRequest = (packageId = "professional", origin = "http://localhost") =>
  post("/api/billing/checkout", origin, { packageId });

const professional = {
  id: "professional",
  name: "Professional",
  priceCents: 4900,
  interval: "month",
  published: true,
  archived: false,
  stripePriceId: "price_test",
};

const freeBilling = { status: "free", plan: "free", stripeCustomerId: null, stripeSubscriptionId: null };

describe("POST /api/billing/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(admin);
    getBilling.mockResolvedValue(freeBilling);
    getPackage.mockResolvedValue(professional);
    customersCreate.mockResolvedValue({ id: "cus_1" });
    checkoutCreate.mockResolvedValue({ id: "cs_1", url: "https://checkout.stripe.com/c/cs_1" });
  });

  it("creates a customer, a subscription checkout tied to the company, and returns the url", async () => {
    const response = await checkout(checkoutRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: "https://checkout.stripe.com/c/cs_1" });
    expect(customersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { companyId: "acme" } }),
    );
    expect(setCustomer).toHaveBeenCalledWith(admin, "cus_1");
    expect(checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        customer: "cus_1",
        line_items: [{ price: "price_test", quantity: 1 }],
        subscription_data: { metadata: { companyId: "acme", packageId: "professional" } },
        metadata: { companyId: "acme", packageId: "professional" },
        success_url: "https://app.example.com/briefing?billing=success",
        cancel_url: "https://app.example.com/billing?billing=cancelled",
      }),
    );
    expect(saveCheckoutSession).toHaveBeenCalledWith(admin, "cs_1");
  });

  it("reuses an existing Stripe customer", async () => {
    getBilling.mockResolvedValue({ ...freeBilling, stripeCustomerId: "cus_existing" });

    await checkout(checkoutRequest());

    expect(customersCreate).not.toHaveBeenCalled();
    expect(checkoutCreate).toHaveBeenCalledWith(expect.objectContaining({ customer: "cus_existing" }));
  });

  it("refuses to create a second subscription for a workspace that already has one", async () => {
    getBilling.mockResolvedValue({
      ...freeBilling,
      status: "active",
      plan: "paid",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
    });

    const response = await checkout(checkoutRequest());

    expect(response.status).toBe(409);
    expect(checkoutCreate).not.toHaveBeenCalled();
  });

  it("lets a canceled workspace subscribe again", async () => {
    getBilling.mockResolvedValue({
      ...freeBilling,
      status: "canceled",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_old",
    });

    const response = await checkout(checkoutRequest());

    expect(response.status).toBe(200);
  });

  it.each([
    ["an unknown package", null],
    ["an archived package", { ...professional, archived: true }],
    ["an unpublished package", { ...professional, published: false }],
    ["a package that isn't synced to Stripe", { ...professional, stripePriceId: null }],
    ["the free package", { ...professional, id: "free", priceCents: 0 }],
  ])("refuses to check out %s", async (_label, pkg) => {
    getPackage.mockResolvedValue(pkg);

    const response = await checkout(checkoutRequest("whatever"));

    expect(response.status).toBe(409);
    expect(checkoutCreate).not.toHaveBeenCalled();
    expect(customersCreate).not.toHaveBeenCalled();
  });

  it("requires a package id", async () => {
    const response = await checkout(post("/api/billing/checkout"));

    expect(response.status).toBe(400);
    expect(checkoutCreate).not.toHaveBeenCalled();
  });

  it("uses the Stripe price of the package that was chosen", async () => {
    getPackage.mockResolvedValue({ ...professional, id: "team", stripePriceId: "price_team" });

    await checkout(checkoutRequest("team"));

    expect(getPackage).toHaveBeenCalledWith("team");
    expect(checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ line_items: [{ price: "price_team", quantity: 1 }], metadata: { companyId: "acme", packageId: "team" } }),
    );
  });

  it("rejects non-admins", async () => {
    requireSession.mockResolvedValue({ ...admin, role: "employee" });

    const response = await checkout(checkoutRequest());

    expect(response.status).toBe(403);
    expect(checkoutCreate).not.toHaveBeenCalled();
  });

  it("rejects cross-origin requests", async () => {
    const response = await checkout(checkoutRequest("professional", "https://evil.example"));

    expect(response.status).toBe(403);
    expect(checkoutCreate).not.toHaveBeenCalled();
  });

  it("surfaces a Stripe outage as a safe 500", async () => {
    checkoutCreate.mockRejectedValue(new Error("stripe down"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await checkout(checkoutRequest());

    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("stripe down");
  });
});

describe("POST /api/billing/portal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(admin);
    portalCreate.mockResolvedValue({ url: "https://billing.stripe.com/p/session" });
  });

  it("opens the portal for a workspace with a Stripe customer", async () => {
    getBilling.mockResolvedValue({ ...freeBilling, stripeCustomerId: "cus_1" });

    const response = await portal(post("/api/billing/portal"));

    expect(await response.json()).toEqual({ url: "https://billing.stripe.com/p/session" });
    expect(portalCreate).toHaveBeenCalledWith({
      customer: "cus_1",
      return_url: "https://app.example.com/billing",
    });
  });

  it("returns 409 when billing was never started", async () => {
    getBilling.mockResolvedValue(freeBilling);

    const response = await portal(post("/api/billing/portal"));

    expect(response.status).toBe(409);
    expect(portalCreate).not.toHaveBeenCalled();
  });

  it("rejects non-admins", async () => {
    requireSession.mockResolvedValue({ ...admin, role: "manager" });

    const response = await portal(post("/api/billing/portal"));

    expect(response.status).toBe(403);
  });
});
