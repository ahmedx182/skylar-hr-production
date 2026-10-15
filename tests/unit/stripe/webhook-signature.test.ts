import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const SECRET = "whsec_unit_test_secret";
const syncStripeSubscription = vi.fn();
const markCheckoutCompleted = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/server", () => ({
  getServerEnv: () => ({ STRIPE_WEBHOOK_SECRET: SECRET, STRIPE_SECRET_KEY: "sk_test_dummy" }),
}));
vi.mock("@/server/repositories/billing.repository", () => ({
  syncStripeSubscription: (...args: unknown[]) => syncStripeSubscription(...args),
  markCheckoutCompleted: (...args: unknown[]) => markCheckoutCompleted(...args),
}));

import { POST } from "@/app/api/stripe/webhook/route";

const stripeLib = new Stripe("sk_test_dummy");

function signedRequest(payload: object, secret = SECRET) {
  const body = JSON.stringify(payload);
  const signature = stripeLib.webhooks.generateTestHeaderString({ payload: body, secret });
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": signature },
    body,
  });
}

const subscriptionEvent = {
  id: "evt_1",
  object: "event",
  type: "customer.subscription.created",
  data: { object: { id: "sub_1", object: "subscription", metadata: { companyId: "acme" } } },
};

describe("POST /api/stripe/webhook with real Stripe signatures", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepts an event signed with the webhook secret", async () => {
    const response = await POST(signedRequest(subscriptionEvent));

    expect(response.status).toBe(200);
    expect(syncStripeSubscription).toHaveBeenCalledTimes(1);
  });

  it("rejects an event signed with the wrong secret", async () => {
    const response = await POST(signedRequest(subscriptionEvent, "whsec_someone_else"));

    expect(response.ok).toBe(false);
    expect(syncStripeSubscription).not.toHaveBeenCalled();
  });

  it("rejects a payload that was changed after signing", async () => {
    const original = signedRequest(subscriptionEvent);
    const signature = original.headers.get("stripe-signature") ?? "";
    const tampered = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": signature },
      body: JSON.stringify({ ...subscriptionEvent, id: "evt_forged" }),
    });

    const response = await POST(tampered);

    expect(response.ok).toBe(false);
    expect(syncStripeSubscription).not.toHaveBeenCalled();
  });
});
