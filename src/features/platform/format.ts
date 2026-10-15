const DAY_MS = 24 * 60 * 60 * 1000;

export function formatCount(value: number): string {
  return new Intl.NumberFormat("en").format(value);
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function formatPercent(part: number, whole: number): string {
  if (!whole) return "0%";
  return `${Math.round((part / whole) * 1000) / 10}%`;
}

export function formatDate(ms: number | null): string {
  if (!ms) return "Unknown";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(ms);
}

export function formatShortDate(ms: number): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(ms);
}

export function formatRelative(ms: number | null, now = Date.now()): string {
  if (!ms) return "Never";
  const days = Math.floor((now - ms) / DAY_MS);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return formatDate(ms);
}

export function withinDays(ms: number | null, days: number, now = Date.now()): boolean {
  return ms !== null && now - ms <= days * DAY_MS;
}

const utcDay = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
const utcMonth = new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" });

/** Bucket boundaries are UTC, so labels are too. */
export function formatBucket(ms: number, granularity: "day" | "week" | "month"): string {
  if (granularity === "month") return utcMonth.format(ms);
  return granularity === "week" ? `Week of ${utcDay.format(ms)}` : utcDay.format(ms);
}

export function formatBucketEdge(ms: number, granularity: "day" | "week" | "month"): string {
  return granularity === "month" ? utcMonth.format(ms) : utcDay.format(ms);
}
