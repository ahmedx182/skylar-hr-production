/** Fallback allowance when the Free package hasn't been configured. The live value lives in pricing packages. */
export const FREE_MESSAGE_LIMIT = 5;

export type BillingStatus =
  | "free"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "unpaid"
  | "none";

export type BillingPlan = "free" | "paid";

/** Paid access granted by a Skylar platform admin, independent of Stripe. */
export type PlanOverride = "paid" | null;

export type CompanyBillingState = {
  companyId: string;
  status: BillingStatus;
  plan: BillingPlan;
  planOverride: PlanOverride;
  planOverrideNote: string | null;
  freeMessagesUsed: number;
  /** The Free package's allowance when this state was read. */
  freeMessageLimit: number;
  freeMessagesRemaining: number;
  trialEndsAtMs: number | null;
  currentPeriodEndMs: number | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  checkoutCompletedAtMs: number | null;
};

/**
 * Workspaces start free. A subscription (or a still-running Stripe trial) makes them paid.
 * past_due stays paid: Stripe retries the card and moves the subscription to unpaid/canceled
 * once retries are exhausted, so a failed payment doesn't cut the workspace off immediately.
 */
export function billingPlanForState(
  status: BillingStatus,
  trialEndsAtMs: number | null,
  nowMs = Date.now(),
  planOverride: PlanOverride = null,
): BillingPlan {
  if (planOverride === "paid") return "paid";
  if (status === "active" || status === "past_due") return "paid";
  if (status === "trialing" && trialEndsAtMs !== null && trialEndsAtMs > nowMs) return "paid";
  return "free";
}

export function freeMessagesRemaining(used: number, limit = FREE_MESSAGE_LIMIT): number {
  return Math.max(0, limit - used);
}

export function normalizeBillingStatus(value: unknown): BillingStatus {
  if (
    value === "free" ||
    value === "trialing" ||
    value === "active" ||
    value === "past_due" ||
    value === "canceled" ||
    value === "incomplete" ||
    value === "unpaid" ||
    value === "none"
  ) {
    return value;
  }
  return "none";
}
