import { describe, expect, it } from "vitest";
import {
  billingAccessForState,
  normalizeBillingStatus,
  trialEndsAtFromCreatedAt,
} from "@/features/billing/subscription-status";

describe("billingAccessForState", () => {
  it("allows active subscriptions without requiring a trial date", () => {
    expect(billingAccessForState("active", null, 1_000)).toBe("allowed");
  });

  it("allows a live trial", () => {
    expect(billingAccessForState("trialing", 2_000, 1_000)).toBe("allowed");
  });

  it("requires billing when the trial is expired", () => {
    expect(billingAccessForState("trialing", 500, 1_000)).toBe("billing_required");
  });

  it("requires billing for unpaid or canceled subscriptions without live trial time", () => {
    expect(billingAccessForState("past_due", null, 1_000)).toBe("billing_required");
    expect(billingAccessForState("canceled", null, 1_000)).toBe("billing_required");
  });
});

describe("trialEndsAtFromCreatedAt", () => {
  it("adds the configured number of trial days", () => {
    expect(trialEndsAtFromCreatedAt(1_000, 2)).toBe(172_801_000);
  });
});

describe("normalizeBillingStatus", () => {
  it("keeps known statuses and falls back to none", () => {
    expect(normalizeBillingStatus("active")).toBe("active");
    expect(normalizeBillingStatus("paused")).toBe("none");
  });
});
