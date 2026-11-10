import type { BillingPlan } from "./subscription-status";

/** Human HR escalations a workspace may ask for. The trial gets a one-off allowance; paid workspaces get a monthly one. */
export const TRIAL_ESCALATION_LIMIT = 1;
export const PAID_ESCALATIONS_PER_MONTH = 3;

export type EscalationUsage = {
  /** Escalations used over the workspace's whole life. Only the trial allowance reads this. */
  used: number;
  /** The calendar month (UTC) that `usedThisMonth` was counted in. */
  periodKey: string | null;
  usedThisMonth: number;
};

export type EscalationAllowance = {
  limit: number;
  used: number;
  remaining: number;
  /** Which counter a reservation must bump. */
  counter: "lifetime" | "monthly";
};

export function escalationPeriodKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 7);
}

export function escalationUsageFrom(data: Record<string, unknown>): EscalationUsage {
  const count = (value: unknown) => (typeof value === "number" && value > 0 ? value : 0);
  return {
    used: count(data.escalationsUsed),
    periodKey: typeof data.escalationPeriodKey === "string" ? data.escalationPeriodKey : null,
    usedThisMonth: count(data.escalationsUsedThisMonth),
  };
}

/** A new month starts the paid allowance again; the trial allowance never resets. */
export function escalationAllowanceFor(plan: BillingPlan, usage: EscalationUsage, nowMs = Date.now()): EscalationAllowance {
  if (plan === "paid") {
    const used = usage.periodKey === escalationPeriodKey(nowMs) ? usage.usedThisMonth : 0;
    return { limit: PAID_ESCALATIONS_PER_MONTH, used, remaining: Math.max(0, PAID_ESCALATIONS_PER_MONTH - used), counter: "monthly" };
  }
  return { limit: TRIAL_ESCALATION_LIMIT, used: usage.used, remaining: Math.max(0, TRIAL_ESCALATION_LIMIT - usage.used), counter: "lifetime" };
}
