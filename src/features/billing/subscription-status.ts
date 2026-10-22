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

/** Permanent paid access granted by a Skylar platform admin before gifts existed. New grants are gifts. */
export type PlanOverride = "paid" | null;

export const GIFT_MAX_DAYS = 365;
export const GIFT_MAX_MESSAGES = 100_000;

/**
 * Time- and message-limited paid access gifted by a platform admin. It ends at whichever
 * comes first, and the workspace falls back to whatever plan it had underneath (Stripe or Free).
 */
export type PlanGift = {
  endsAtMs: number;
  messageLimit: number;
  messagesUsed: number;
  note: string | null;
};

export function planGiftFrom(fields: {
  endsAtMs: number | null;
  messageLimit: unknown;
  messagesUsed: unknown;
  note: unknown;
}): PlanGift | null {
  if (fields.endsAtMs === null || typeof fields.messageLimit !== "number" || fields.messageLimit <= 0) return null;
  return {
    endsAtMs: fields.endsAtMs,
    messageLimit: fields.messageLimit,
    messagesUsed: typeof fields.messagesUsed === "number" ? Math.max(0, fields.messagesUsed) : 0,
    note: typeof fields.note === "string" && fields.note.trim() ? fields.note.trim() : null,
  };
}

export function isGiftActive(gift: PlanGift | null, nowMs = Date.now()): gift is PlanGift {
  return gift !== null && gift.endsAtMs > nowMs && gift.messagesUsed < gift.messageLimit;
}

export function giftMessagesRemaining(gift: PlanGift): number {
  return Math.max(0, gift.messageLimit - gift.messagesUsed);
}

/** Whole days left, rounded up, so a gift ending later today still reads as 1 day. */
export function giftDaysRemaining(gift: PlanGift, nowMs = Date.now()): number {
  return Math.max(0, Math.ceil((gift.endsAtMs - nowMs) / 86_400_000));
}

export type CompanyBillingState = {
  companyId: string;
  status: BillingStatus;
  plan: BillingPlan;
  planOverride: PlanOverride;
  planOverrideNote: string | null;
  /** The latest gift, active or not. Check `giftActive` before treating it as current. */
  gift: PlanGift | null;
  giftActive: boolean;
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
  gift: PlanGift | null = null,
): BillingPlan {
  if (planOverride === "paid") return "paid";
  if (isGiftActive(gift, nowMs)) return "paid";
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
