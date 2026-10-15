export const DELETION_GRACE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export function deleteAfterMs(deletedAtMs: number): number {
  return deletedAtMs + DELETION_GRACE_DAYS * DAY_MS;
}

/** Whole days left before permanent removal, never below zero. */
export function daysUntilPurge(deleteAfter: number | null, now = Date.now()): number | null {
  if (deleteAfter === null) return null;
  return Math.max(0, Math.ceil((deleteAfter - now) / DAY_MS));
}

export function isPurgeDue(deleteAfter: number | null, now = Date.now()): boolean {
  return deleteAfter !== null && deleteAfter <= now;
}
