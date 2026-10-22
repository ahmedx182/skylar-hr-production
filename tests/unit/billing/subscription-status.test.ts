import { describe, expect, it } from "vitest";
import {
  billingPlanForState,
  FREE_MESSAGE_LIMIT,
  giftDaysRemaining,
  isGiftActive,
  planGiftFrom,
  freeMessagesRemaining,
  normalizeBillingStatus,
} from "@/features/billing/subscription-status";

describe("billingPlanForState", () => {
  it("starts workspaces on the free plan", () => {
    expect(billingPlanForState("free", null, 1_000)).toBe("free");
    expect(billingPlanForState("none", null, 1_000)).toBe("free");
  });

  it("treats paid access granted by Skylar as paid regardless of Stripe status", () => {
    expect(billingPlanForState("free", null, 1_000, "paid")).toBe("paid");
    expect(billingPlanForState("canceled", null, 1_000, "paid")).toBe("paid");
    expect(billingPlanForState("free", null, 1_000, null)).toBe("free");
  });

  it("treats active subscriptions as paid", () => {
    expect(billingPlanForState("active", null, 1_000)).toBe("paid");
  });

  it("keeps a live Stripe trial paid and drops it to free when it ends", () => {
    expect(billingPlanForState("trialing", 2_000, 1_000)).toBe("paid");
    expect(billingPlanForState("trialing", 500, 1_000)).toBe("free");
  });

  it("keeps past_due paid during Stripe's payment retry window", () => {
    expect(billingPlanForState("past_due", null, 1_000)).toBe("paid");
  });

  it("drops unpaid, canceled and incomplete subscriptions back to free", () => {
    for (const status of ["unpaid", "canceled", "incomplete"] as const) {
      expect(billingPlanForState(status, null, 1_000)).toBe("free");
    }
  });
});

describe("freeMessagesRemaining", () => {
  it("counts down from the free limit and never goes negative", () => {
    expect(FREE_MESSAGE_LIMIT).toBe(5);
    expect(freeMessagesRemaining(0)).toBe(5);
    expect(freeMessagesRemaining(4)).toBe(1);
    expect(freeMessagesRemaining(5)).toBe(0);
    expect(freeMessagesRemaining(9)).toBe(0);
  });
});

describe("normalizeBillingStatus", () => {
  it("keeps known statuses and falls back to none", () => {
    expect(normalizeBillingStatus("free")).toBe("free");
    expect(normalizeBillingStatus("active")).toBe("active");
    expect(normalizeBillingStatus("paused")).toBe("none");
  });
});

describe("gifted access", () => {
  const gift = { endsAtMs: 10_000, messageLimit: 3, messagesUsed: 1, note: null };

  it("is paid while both days and messages remain, then falls back to the original plan", () => {
    expect(billingPlanForState("free", null, 5_000, null, gift)).toBe("paid");
    expect(billingPlanForState("free", null, 10_000, null, gift)).toBe("free");
    expect(billingPlanForState("free", null, 5_000, null, { ...gift, messagesUsed: 3 })).toBe("free");
    expect(billingPlanForState("active", null, 20_000, null, gift)).toBe("paid");
  });

  it("reads only complete gifts", () => {
    expect(planGiftFrom({ endsAtMs: null, messageLimit: 3, messagesUsed: 0, note: null })).toBeNull();
    expect(planGiftFrom({ endsAtMs: 1, messageLimit: "3", messagesUsed: 0, note: null })).toBeNull();
    expect(planGiftFrom({ endsAtMs: 1, messageLimit: 3, messagesUsed: undefined, note: " " })).toEqual({ endsAtMs: 1, messageLimit: 3, messagesUsed: 0, note: null });
    expect(isGiftActive(null)).toBe(false);
  });

  it("rounds days left up", () => {
    expect(giftDaysRemaining({ ...gift, endsAtMs: 1 }, 0)).toBe(1);
    expect(giftDaysRemaining({ ...gift, endsAtMs: 0 }, 5)).toBe(0);
  });
});
