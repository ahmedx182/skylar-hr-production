export type PresetRange = "7d" | "30d" | "90d" | "12m";
export type RangeKey = PresetRange | "custom";
export type Granularity = "day" | "week" | "month";

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const MAX_CUSTOM_DAYS = 731;
export const DEFAULT_PRESET: PresetRange = "30d";

export const PRESET_RANGES: { value: PresetRange; label: string; description: string; days: number; granularity: Granularity }[] = [
  { value: "7d", label: "7 days", description: "the last 7 days", days: 7, granularity: "day" },
  { value: "30d", label: "30 days", description: "the last 30 days", days: 30, granularity: "day" },
  { value: "90d", label: "90 days", description: "the last 90 days", days: 90, granularity: "week" },
  { value: "12m", label: "12 months", description: "the last 12 months", days: 365, granularity: "month" },
];

export type ResolvedRange = {
  key: RangeKey;
  startMs: number;
  endMs: number;
  granularity: Granularity;
  /** Reads naturally after "in": "the last 30 days" or "the period Oct 1, 2026 to Oct 14, 2026". */
  description: string;
  /** Ascending UTC bucket start times. */
  bucketStarts: number[];
  /** False for a custom range that ended in the past. */
  endsToday: boolean;
  /** YYYY-MM-DD (UTC), used to prefill the custom range form. */
  fromDate: string;
  toDate: string;
};

export function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Parses YYYY-MM-DD as the start of that UTC day, rejecting impossible dates like 2026-02-31. */
function parseDay(value: string | undefined): number | null {
  if (!value || !DATE_PATTERN.test(value)) return null;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(ms) || isoDay(ms) !== value ? null : ms;
}

function presetStarts(preset: (typeof PRESET_RANGES)[number], now: number): number[] {
  if (preset.granularity === "month") {
    const current = new Date(now);
    return Array.from({ length: 12 }, (_, index) => Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - 11 + index, 1));
  }
  if (preset.granularity === "week") {
    const weeks = Math.ceil(preset.days / 7);
    return Array.from({ length: weeks }, (_, index) => now - (weeks - index) * 7 * DAY_MS);
  }
  const today = Math.floor(now / DAY_MS) * DAY_MS;
  return Array.from({ length: preset.days }, (_, index) => today - (preset.days - 1 - index) * DAY_MS);
}

function granularityForSpan(days: number): Granularity {
  if (days <= 45) return "day";
  return days <= 150 ? "week" : "month";
}

function customStarts(startMs: number, endMs: number, granularity: Granularity): number[] {
  if (granularity === "month") {
    const first = new Date(startMs);
    const last = new Date(endMs);
    const months = (last.getUTCFullYear() - first.getUTCFullYear()) * 12 + last.getUTCMonth() - first.getUTCMonth() + 1;
    return Array.from({ length: months }, (_, index) => Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + index, 1));
  }
  const step = granularity === "week" ? 7 * DAY_MS : DAY_MS;
  const starts: number[] = [];
  for (let at = startMs; at <= endMs; at += step) starts.push(at);
  return starts;
}

function formatFullDate(ms: number): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(ms);
}

function resolveCustom(from: string | undefined, to: string | undefined, now: number): ResolvedRange | null {
  const startMs = parseDay(from);
  const toMs = parseDay(to);
  if (startMs === null || toMs === null || startMs > toMs || startMs > now) return null;

  const endMs = Math.min(toMs + DAY_MS - 1, now);
  const spanDays = Math.ceil((endMs - startMs + 1) / DAY_MS);
  if (spanDays > MAX_CUSTOM_DAYS) return null;

  const granularity = granularityForSpan(spanDays);
  return {
    key: "custom",
    startMs,
    endMs,
    granularity,
    description: `the period ${formatFullDate(startMs)} to ${formatFullDate(endMs)}`,
    bucketStarts: customStarts(startMs, endMs, granularity),
    endsToday: endMs >= now - DAY_MS,
    fromDate: isoDay(startMs),
    toDate: isoDay(endMs),
  };
}

/** Turns URL params into a window, falling back to the default preset for anything invalid. */
export function resolveRange(
  input: { range?: string | string[]; from?: string | string[]; to?: string | string[] },
  now = Date.now(),
): ResolvedRange {
  const single = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

  if (single(input.range) === "custom") {
    const custom = resolveCustom(single(input.from), single(input.to), now);
    if (custom) return custom;
  }

  const preset = PRESET_RANGES.find((entry) => entry.value === single(input.range)) ?? PRESET_RANGES.find((entry) => entry.value === DEFAULT_PRESET)!;
  const bucketStarts = presetStarts(preset, now);
  return {
    key: preset.value,
    startMs: bucketStarts[0],
    endMs: now,
    granularity: preset.granularity,
    description: preset.description,
    bucketStarts,
    endsToday: true,
    fromDate: isoDay(bucketStarts[0]),
    toDate: isoDay(now),
  };
}

/** Index of the bucket a time falls in, or -1 when it is outside the window. */
export function bucketIndex(range: Pick<ResolvedRange, "bucketStarts" | "startMs" | "endMs">, at: number): number {
  if (at < range.startMs || at > range.endMs) return -1;
  const starts = range.bucketStarts;
  let index = starts.length - 1;
  while (index > 0 && starts[index] > at) index -= 1;
  return index;
}
