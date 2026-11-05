import { describe, expect, it } from "vitest";
import {
  defaultAdvisorHours,
  describeHours,
  hoursProblem,
  isValidTimeZone,
  isWithinWorkingHours,
  normalizeHours,
  type AdvisorHours,
} from "@/features/advisor/hours";

const at = (iso: string) => new Date(iso).getTime();
const ny = defaultAdvisorHours("America/New_York");

describe("working hours", () => {
  it("defaults to Monday to Friday, 9 to 5", () => {
    expect(ny).toEqual({ timeZone: "America/New_York", startHour: 9, endHour: 17, workDays: [1, 2, 3, 4, 5] });
  });

  it("is open on a weekday between 9 and 5 and closed at night and at the weekend", () => {
    expect(isWithinWorkingHours(at("2026-11-04T15:00:00Z"), ny)).toBe(true); // Wed 10:00 EST
    expect(isWithinWorkingHours(at("2026-11-04T14:00:00Z"), ny)).toBe(true); // Wed 09:00 EST, the first minute
    expect(isWithinWorkingHours(at("2026-11-04T21:59:00Z"), ny)).toBe(true); // Wed 16:59
    expect(isWithinWorkingHours(at("2026-11-04T22:00:00Z"), ny)).toBe(false); // Wed 17:00, closed
    expect(isWithinWorkingHours(at("2026-11-04T13:59:00Z"), ny)).toBe(false); // Wed 08:59
    expect(isWithinWorkingHours(at("2026-11-07T15:00:00Z"), ny)).toBe(false); // Saturday
    expect(isWithinWorkingHours(at("2026-11-08T15:00:00Z"), ny)).toBe(false); // Sunday
  });

  it("follows the hours that were set", () => {
    const early: AdvisorHours = { ...ny, startHour: 7, endHour: 15 };
    expect(isWithinWorkingHours(at("2026-11-04T12:30:00Z"), early)).toBe(true); // 07:30
    expect(isWithinWorkingHours(at("2026-11-04T20:30:00Z"), early)).toBe(false); // 15:30
    expect(isWithinWorkingHours(at("2026-11-04T12:30:00Z"), ny)).toBe(false);
  });

  it("follows the days that were set, for example including Saturday", () => {
    const sixDays: AdvisorHours = { ...ny, workDays: [1, 2, 3, 4, 5, 6] };
    expect(isWithinWorkingHours(at("2026-11-07T15:00:00Z"), sixDays)).toBe(true);
    expect(isWithinWorkingHours(at("2026-11-08T15:00:00Z"), sixDays)).toBe(false);
    expect(isWithinWorkingHours(at("2026-11-04T15:00:00Z"), { ...ny, workDays: [6, 0] })).toBe(false);
  });

  it("can run until midnight", () => {
    const late: AdvisorHours = { ...ny, startHour: 12, endHour: 24 };
    expect(isWithinWorkingHours(at("2026-11-05T04:30:00Z"), late)).toBe(true); // Wed 23:30 EST
    expect(isWithinWorkingHours(at("2026-11-05T05:00:00Z"), late)).toBe(false); // Thu 00:00
  });

  it("follows the time zone, including a change of daylight saving", () => {
    const london = defaultAdvisorHours("Europe/London");
    expect(isWithinWorkingHours(at("2026-11-04T09:00:00Z"), london)).toBe(true);
    expect(isWithinWorkingHours(at("2026-11-04T09:00:00Z"), ny)).toBe(false);
    // US clocks went back on Sunday 2026-11-01: Friday 9am was EDT (UTC-4), Monday 9am is EST (UTC-5).
    expect(isWithinWorkingHours(at("2026-10-30T13:00:00Z"), ny)).toBe(true);
    expect(isWithinWorkingHours(at("2026-11-02T14:00:00Z"), ny)).toBe(true);
    expect(isWithinWorkingHours(at("2026-11-02T13:00:00Z"), ny)).toBe(false);
  });

  it("says closed rather than failing when the time zone is unusable", () => {
    expect(isWithinWorkingHours(at("2026-11-04T15:00:00Z"), { ...ny, timeZone: "Not/AZone" })).toBe(false);
  });
});

describe("checking hours before they are saved", () => {
  it("accepts good hours", () => {
    expect(hoursProblem(ny)).toBeNull();
    expect(hoursProblem({ ...ny, startHour: 0, endHour: 24, workDays: [0, 1, 2, 3, 4, 5, 6] })).toBeNull();
  });

  it.each([
    [{ timeZone: "Mars/Olympus" }, "time zone"],
    [{ startHour: -1 }, "start hour"],
    [{ startHour: 24 }, "start hour"],
    [{ endHour: 0 }, "end hour"],
    [{ endHour: 25 }, "end hour"],
    [{ startHour: 17, endHour: 9 }, "end after they start"],
    [{ startHour: 9, endHour: 9 }, "end after they start"],
    [{ workDays: [] }, "at least one"],
    [{ workDays: [1, 1] }, "each chosen once"],
    [{ workDays: [7] }, "days of the week"],
    [{ startHour: 9.5 }, "start hour"],
  ])("rejects %j", (change, message) => {
    expect(hoursProblem({ ...ny, ...change })).toContain(message);
  });

  it("recognises real time zones only", () => {
    expect(isValidTimeZone("Asia/Karachi")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("")).toBe(false);
    expect(isValidTimeZone("nope")).toBe(false);
    expect(isValidTimeZone(42)).toBe(false);
  });
});

describe("stored hours", () => {
  it("fall back to the defaults when missing or damaged, so a bad record never blocks a transfer", () => {
    expect(normalizeHours(undefined)).toEqual(ny);
    expect(normalizeHours("nope")).toEqual(ny);
    expect(normalizeHours({ timeZone: "Asia/Karachi", startHour: 17, endHour: 9, workDays: [1] })).toEqual(ny);
    expect(normalizeHours({ timeZone: "Asia/Karachi", startHour: 8, endHour: 16, workDays: [] }, "Asia/Karachi").timeZone).toBe("Asia/Karachi");
  });

  it("keep good values and sort the days", () => {
    expect(normalizeHours({ timeZone: "Asia/Karachi", startHour: 10, endHour: 18, workDays: [5, 1, 3] })).toEqual({ timeZone: "Asia/Karachi", startHour: 10, endHour: 18, workDays: [1, 3, 5] });
  });

  it("use a valid fallback time zone for the defaults", () => {
    expect(normalizeHours(null, "Europe/Berlin").timeZone).toBe("Europe/Berlin");
    expect(normalizeHours(null, "garbage").timeZone).toBe("America/New_York");
  });
});

describe("describeHours", () => {
  it("reads naturally", () => {
    expect(describeHours(ny)).toBe("Mon–Fri, 09:00–17:00 America/New_York");
    expect(describeHours({ ...ny, workDays: [1, 3, 5], endHour: 24 })).toBe("Mon, Wed, Fri, 09:00–24:00 America/New_York");
    expect(describeHours({ ...ny, workDays: [0, 1, 2, 3, 4, 5, 6] })).toBe("Sun–Sat, 09:00–17:00 America/New_York");
  });
});
