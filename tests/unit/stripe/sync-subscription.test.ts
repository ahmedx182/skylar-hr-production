import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

type Doc = Record<string, unknown>;
const store = new Map<string, Doc>();

vi.mock("server-only", () => ({}));
vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { increment: (n: number) => n, serverTimestamp: () => "server-time" },
  Timestamp: class {
    static fromMillis(ms: number) {
      return { toMillis: () => ms };
    }
  },
}));
vi.mock("@/lib/firebase/admin", () => ({
  adminDb: () => {
    const writes: Array<() => void> = [];
    return {
      collection: (name: string) => ({
        doc: (id: string) => ({
          path: `${name}/${id}`,
          get: async () => ({ exists: store.has(`${name}/${id}`), data: () => store.get(`${name}/${id}`) }),
          set: async (data: Doc) => store.set(`${name}/${id}`, { ...(store.get(`${name}/${id}`) ?? {}), ...data }),
        }),
        where: () => ({ limit: () => ({ get: async () => ({ docs: [] }) }) }),
      }),
      batch: () => ({
        set(ref: { path: string }, data: Doc) {
          writes.push(() => store.set(ref.path, { ...(store.get(ref.path) ?? {}), ...data }));
        },
        commit: async () => writes.forEach((write) => write()),
      }),
    };
  },
}));

import { billingPlanForState } from "@/features/billing/subscription-status";
import {
  getOrCreateCompanyBillingState,
  markCheckoutCompleted,
  syncStripeSubscription,
} from "@/server/repositories/billing.repository";

function subscription(overrides: Partial<Stripe.Subscription> = {}): Stripe.Subscription {
  return {
    id: "sub_1",
    status: "active",
    customer: "cus_1",
    trial_end: null,
    metadata: { companyId: "acme" },
    items: { data: [{ current_period_end: 1_900_000_000 }] },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

describe("syncStripeSubscription", () => {
  beforeEach(() => store.clear());

  it("turns a new subscription into a paid workspace on both records", async () => {
    await syncStripeSubscription(subscription());

    expect(store.get("subscriptions/acme")).toMatchObject({
      status: "active",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
    });
    expect(store.get("companies/acme")).toMatchObject({ subscriptionStatus: "active" });
    const state = await getOrCreateCompanyBillingState({ companyId: "acme" });
    expect(state.plan).toBe("paid");
    expect(state.currentPeriodEndMs).toBe(1_900_000_000_000);
  });

  it("drops the workspace back to free when the subscription is canceled", async () => {
    await syncStripeSubscription(subscription());
    await syncStripeSubscription(subscription({ status: "canceled" }));

    const state = await getOrCreateCompanyBillingState({ companyId: "acme" });
    expect(state.status).toBe("canceled");
    expect(state.plan).toBe("free");
  });

  it("keeps the workspace paid while a failed payment is retried", async () => {
    await syncStripeSubscription(subscription({ status: "past_due" }));

    expect((await getOrCreateCompanyBillingState({ companyId: "acme" })).plan).toBe("paid");
  });

  it("maps Stripe statuses we don't model (paused, incomplete_expired) to free", async () => {
    await syncStripeSubscription(subscription({ status: "paused" }));

    const state = await getOrCreateCompanyBillingState({ companyId: "acme" });
    expect(state.status).toBe("none");
    expect(state.plan).toBe("free");
  });

  it("handles an expanded customer object", async () => {
    await syncStripeSubscription(
      subscription({ customer: { id: "cus_obj" } as unknown as Stripe.Subscription["customer"] }),
    );

    expect(store.get("subscriptions/acme")).toMatchObject({ stripeCustomerId: "cus_obj" });
  });

  it("ignores subscriptions that aren't tied to a company", async () => {
    await syncStripeSubscription(subscription({ metadata: {} }));

    expect(store.size).toBe(0);
  });

  it("does not wipe the free message count when a subscription is synced", async () => {
    store.set("subscriptions/acme", { status: "free", freeMessagesUsed: 3 });

    await syncStripeSubscription(subscription());

    expect(store.get("subscriptions/acme")?.freeMessagesUsed).toBe(3);
  });
});

describe("new workspaces", () => {
  beforeEach(() => store.clear());

  it("are created free with the full allowance, even when a record is missing", async () => {
    store.set("companies/fresh", { name: "Fresh" });

    const state = await getOrCreateCompanyBillingState({ companyId: "fresh" });

    expect(state).toMatchObject({ status: "free", plan: "free", freeMessagesUsed: 0, freeMessagesRemaining: 5 });
    expect(billingPlanForState(state.status, state.trialEndsAtMs)).toBe("free");
  });
});

describe("markCheckoutCompleted", () => {
  beforeEach(() => store.clear());

  it("records the completion on the company named in the checkout metadata", async () => {
    await markCheckoutCompleted("cs_1", "sub_1", "acme");

    expect(store.get("subscriptions/acme")).toMatchObject({ stripeSubscriptionId: "sub_1" });
  });
});
