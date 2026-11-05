/**
 * When Skylar's HR advisors are expected to answer within the hour. It decides whether a manager is told
 * "up to an hour" or "up to 6 hours". A super admin sets it in the Platform console.
 */
export type AdvisorHours = {
  /** An IANA time zone, such as "America/New_York". */
  timeZone: string;
  /** First working hour, 0 to 23 (9 means 9:00). */
  startHour: number;
  /** The hour work stops, 1 to 24 (17 means 17:00), after the start. */
  endHour: number;
  /** Days of the week that are working days: 0 is Sunday, 6 is Saturday. */
  workDays: number[];
};

export const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5];
export const DEFAULT_START_HOUR = 9;
export const DEFAULT_END_HOUR = 17;
export const DEFAULT_TIME_ZONE = "America/New_York";

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function defaultAdvisorHours(timeZone: string = DEFAULT_TIME_ZONE): AdvisorHours {
  return { timeZone, startHour: DEFAULT_START_HOUR, endHour: DEFAULT_END_HOUR, workDays: [...DEFAULT_WORK_DAYS] };
}

export function isValidTimeZone(zone: unknown): zone is string {
  if (typeof zone !== "string" || !zone.trim()) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** Why these hours can't be saved, or null if they are fine. */
export function hoursProblem(hours: AdvisorHours): string | null {
  if (!isValidTimeZone(hours.timeZone)) return "Choose a valid time zone, such as America/New_York.";
  if (!Number.isInteger(hours.startHour) || hours.startHour < 0 || hours.startHour > 23) return "The start hour must be between 0 and 23.";
  if (!Number.isInteger(hours.endHour) || hours.endHour < 1 || hours.endHour > 24) return "The end hour must be between 1 and 24.";
  if (hours.endHour <= hours.startHour) return "Working hours must end after they start.";
  if (hours.workDays.length === 0) return "Choose at least one working day.";
  if (hours.workDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6) || new Set(hours.workDays).size !== hours.workDays.length) {
    return "Working days must be days of the week, each chosen once.";
  }
  return null;
}

/** Stored hours that are missing or damaged fall back to the defaults, so a bad record never blocks a transfer. */
export function normalizeHours(raw: unknown, fallbackTimeZone: string = DEFAULT_TIME_ZONE): AdvisorHours {
  const base = defaultAdvisorHours(isValidTimeZone(fallbackTimeZone) ? fallbackTimeZone : DEFAULT_TIME_ZONE);
  if (!raw || typeof raw !== "object") return base;
  const value = raw as Partial<AdvisorHours>;
  const candidate: AdvisorHours = {
    timeZone: isValidTimeZone(value.timeZone) ? value.timeZone : base.timeZone,
    startHour: typeof value.startHour === "number" ? value.startHour : base.startHour,
    endHour: typeof value.endHour === "number" ? value.endHour : base.endHour,
    workDays: Array.isArray(value.workDays) ? value.workDays.filter((day): day is number => typeof day === "number") : base.workDays,
  };
  return hoursProblem(candidate) === null ? { ...candidate, workDays: [...candidate.workDays].sort((a, b) => a - b) } : base;
}

function zoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(utcMs);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** Whether this moment falls inside working hours. Holidays count as working days. */
export function isWithinWorkingHours(nowMs: number, hours: AdvisorHours): boolean {
  try {
    const local = new Date(nowMs + zoneOffsetMs(nowMs, hours.timeZone));
    if (!hours.workDays.includes(local.getUTCDay())) return false;
    const hourOfDay = local.getUTCHours() + local.getUTCMinutes() / 60;
    return hourOfDay >= hours.startHour && hourOfDay < hours.endHour;
  } catch {
    // An unusable time zone must not break a transfer; promise the longer wait, which is the safe thing to say.
    return false;
  }
}

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

/** "Mon–Fri, 09:00–17:00 America/New_York" */
export function describeHours(hours: AdvisorHours): string {
  const days = [...hours.workDays].sort((a, b) => a - b);
  const consecutive = days.length > 1 && days.every((day, index) => index === 0 || day === days[index - 1] + 1);
  const dayText = consecutive ? `${DAY_LABELS[days[0]]}–${DAY_LABELS[days[days.length - 1]]}` : days.map((day) => DAY_LABELS[day]).join(", ");
  return `${dayText}, ${hourLabel(hours.startHour)}–${hourLabel(hours.endHour)} ${hours.timeZone}`;
}
