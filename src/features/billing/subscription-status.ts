export const TRIAL_DAYS = 14;

export type BillingStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "unpaid"
  | "none";

export type BillingAccess = "allowed" | "billing_required";

export type CompanyBillingState = {
  companyId: string;
  status: BillingStatus;
  access: BillingAccess;
  trialEndsAtMs: number | null;
  currentPeriodEndMs: number | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  checkoutCompletedAtMs: number | null;
};

export function trialEndsAtFromCreatedAt(createdAtMs: number, trialDays = TRIAL_DAYS): number {
  return createdAtMs + trialDays * 24 * 60 * 60 * 1000;
}

export function billingAccessForState(
  status: BillingStatus,
  trialEndsAtMs: number | null,
  nowMs = Date.now(),
): BillingAccess {
  if (status === "active") return "allowed";
  if (trialEndsAtMs !== null && trialEndsAtMs > nowMs) return "allowed";
  return "billing_required";
}

export function normalizeBillingStatus(value: unknown): BillingStatus {
  if (
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
