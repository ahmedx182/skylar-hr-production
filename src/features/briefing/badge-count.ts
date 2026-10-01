const MAX_BADGE_COUNT = 9;

/** Label for a small count badge, or null when there is nothing to show. */
export function formatBadgeCount(count: number | undefined): string | null {
  if (!count || count < 1) return null;
  return count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(count);
}
