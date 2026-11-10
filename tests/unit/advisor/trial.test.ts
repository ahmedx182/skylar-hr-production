import { describe, expect, it } from "vitest";
import { DEFAULT_FREE_TRIAL_DAYS, freeTrialFor, isValidTrialDays, normalizeTrialDays } from "@/features/advisor/trial";

const DAY = 86_400_000;
const start = Date.UTC(2026, 10, 1, 12, 0, 0);

describe("free trial", () => {
  it("runs for 14 days by default", () => {
    expect(DEFAULT_FREE_TRIAL_DAYS).toBe(14);
  });

  it("counts the days left, rounding up so the last day still reads as one", () => {
    expect(freeTrialFor(start, 14, start)).toMatchObject({ days: 14, daysLeft: 14, expired: false });
    expect(freeTrialFor(start, 14, start + 5 * DAY)).toMatchObject({ daysLeft: 9, expired: false });
    expect(freeTrialFor(start, 14, start + 13 * DAY + 3_600_000)).toMatchObject({ daysLeft: 1, expired: false });
  });

  it("ends exactly 14 days after the workspace was created", () => {
    const trial = freeTrialFor(start, 14, start + 14 * DAY - 1);
    expect(trial).toMatchObject({ expired: false, endsAtMs: start + 14 * DAY });
    expect(freeTrialFor(start, 14, start + 14 * DAY)).toMatchObject({ expired: true, daysLeft: 0 });
    expect(freeTrialFor(start, 14, start + 40 * DAY)).toMatchObject({ expired: true, daysLeft: 0 });
  });

  it("follows the length that was set", () => {
    expect(freeTrialFor(start, 30, start + 20 * DAY)).toMatchObject({ expired: false, daysLeft: 10 });
    expect(freeTrialFor(start, 3, start + 4 * DAY)).toMatchObject({ expired: true });
  });

  it("has no time limit at 0 days, however old the workspace is", () => {
    expect(freeTrialFor(start, 0, start + 900 * DAY)).toEqual({ days: 0, endsAtMs: null, daysLeft: null, expired: false });
  });

  it("never locks out a workspace whose start date is unknown", () => {
    expect(freeTrialFor(null, 14, start + 900 * DAY)).toEqual({ days: 14, endsAtMs: null, daysLeft: null, expired: false });
  });

  it("accepts whole days from 0 to 365 only, and falls back to 14 for anything else", () => {
    for (const ok of [0, 1, 14, 365]) expect(isValidTrialDays(ok)).toBe(true);
    for (const bad of [-1, 366, 1.5, NaN, "14", null, undefined]) expect(isValidTrialDays(bad)).toBe(false);
    expect(normalizeTrialDays(30)).toBe(30);
    expect(normalizeTrialDays(0)).toBe(0);
    expect(normalizeTrialDays("x")).toBe(14);
    expect(normalizeTrialDays(-5)).toBe(14);
  });
});
