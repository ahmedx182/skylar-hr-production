import { beforeEach, describe, expect, it, vi } from "vitest";

const constructEvent = vi.fn();
const syncStripeSubscription = vi.fn();
const markCheckoutCompleted = vi.fn();
let webhookSecret: string | undefined = "whsec_test";

vi.mock("@/lib/env/server", () => ({
  getServerEnv: () => ({ STRIPE_WEBHOOK_SECRET: webhookSecret }),
}));
vi.mock("@/server/stripe/client", () => ({
  stripe: () => ({ webhooks: { constructEvent } }),
}));
vi.mock("@/server/repositories/billing.repository", () => ({
  syncStripeSubscription: (...args: unknown[]) => syncStripeSubscription(...args),
  markCheckoutCompleted: (...args: unknown[]) => markCheckoutCompleted(...args),
}));

import { POST } from "@/app/api/stripe/webhook/route";

function webhookRequest(signature: string | null = "t=1,v1=abc") {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: signature ? { "stripe-signature": signature } : {},
    body: "{}",
  });
}

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    webhookSecret = "whsec_test";
  });

  it("rejects requests without a signature", async () => {
    const response = await POST(webhookRequest(null));

    expect(response.ok).toBe(false);
    expect(constructEvent).not.toHaveBeenCalled();
  });

  it("rejects requests when the webhook secret is not configured", async () => {
    webhookSecret = undefined;

    const response = await POST(webhookRequest());

    expect(response.ok).toBe(false);
    expect(constructEvent).not.toHaveBeenCalled();
  });

  it("does not sync anything when the signature is invalid", async () => {
    constructEvent.mockImplementation(() => {
      throw new Error("No signatures found matching the expected signature");
    });

    const response = await POST(webhookRequest());

    expect(response.ok).toBe(false);
    expect(syncStripeSubscription).not.toHaveBeenCalled();
    expect(markCheckoutCompleted).not.toHaveBeenCalled();
  });

  it.each([
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ])("syncs the subscription on %s", async (type) => {
    const subscription = { id: "sub_1", metadata: { companyId: "c1" } };
    constructEvent.mockReturnValue({ type, data: { object: subscription } });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(syncStripeSubscription).toHaveBeenCalledWith(subscription);
  });

  it("marks the checkout completed with the subscription id", async () => {
    constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { id: "cs_1", subscription: "sub_1", metadata: { companyId: "c1" } } },
    });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(markCheckoutCompleted).toHaveBeenCalledWith("cs_1", "sub_1", "c1");
  });

  it("acknowledges unrelated events without touching billing state", async () => {
    constructEvent.mockReturnValue({ type: "invoice.paid", data: { object: {} } });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(syncStripeSubscription).not.toHaveBeenCalled();
    expect(markCheckoutCompleted).not.toHaveBeenCalled();
  });
});
