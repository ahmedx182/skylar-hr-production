/** How long a new workspace may use Skylar for free before it must pay. A super admin sets the length. */
export const DEFAULT_FREE_TRIAL_DAYS = 14;
export const MAX_FREE_TRIAL_DAYS = 365;

const DAY_MS = 86_400_000;

export type FreeTrial = {
  /** Length in days. 0 means there is no time limit, only the free message count. */
  days: number;
  /** When it ends, or null if there is no time limit or the workspace's start date is unknown. */
  endsAtMs: number | null;
  /** Whole days left, rounded up, so the last day still reads "1 day left". */
  daysLeft: number | null;
  expired: boolean;
};

export function isValidTrialDays(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_FREE_TRIAL_DAYS;
}

/** A stored value that is missing or damaged falls back to 14 days. */
export function normalizeTrialDays(value: unknown): number {
  return isValidTrialDays(value) ? value : DEFAULT_FREE_TRIAL_DAYS;
}

/**
 * The free trial for a workspace created at `createdAtMs`. An unknown start date counts as not expired: a workspace
 * is never locked out because a record is incomplete.
 */
export function freeTrialFor(createdAtMs: number | null, days: number, nowMs = Date.now()): FreeTrial {
  if (days <= 0 || createdAtMs === null) return { days, endsAtMs: null, daysLeft: null, expired: false };
  const endsAtMs = createdAtMs + days * DAY_MS;
  return {
    days,
    endsAtMs,
    daysLeft: Math.max(0, Math.ceil((endsAtMs - nowMs) / DAY_MS)),
    expired: nowMs >= endsAtMs,
  };
}
