import { describe, expect, it } from "vitest";
import { MAX_CUSTOM_DAYS, bucketIndex, resolveRange } from "@/features/platform/range";

const DAY = 24 * 60 * 60 * 1000;
// Wed 14 Oct 2026, 15:30 UTC
const NOW = Date.UTC(2026, 9, 14, 15, 30);

describe("preset ranges", () => {
  it("falls back to 30 days for anything unknown", () => {
    expect(resolveRange({}, NOW).key).toBe("30d");
    expect(resolveRange({ range: "forever" }, NOW).key).toBe("30d");
    expect(resolveRange({ range: ["7d", "90d"] }, NOW).key).toBe("30d");
    expect(resolveRange({ range: "90d" }, NOW).key).toBe("90d");
  });

  it("builds one bucket per day for 7 and 30 days, ending today", () => {
    const week = resolveRange({ range: "7d" }, NOW);
    expect(week.bucketStarts).toHaveLength(7);
    expect(week.bucketStarts[6]).toBe(Date.UTC(2026, 9, 14));
    expect(week.startMs).toBe(Date.UTC(2026, 9, 8));
    expect(week.endMs).toBe(NOW);
    expect(resolveRange({ range: "30d" }, NOW).bucketStarts).toHaveLength(30);
  });

  it("builds 13 weekly buckets for 90 days and 12 calendar months for a year", () => {
    expect(resolveRange({ range: "90d" }, NOW).bucketStarts).toHaveLength(13);
    const year = resolveRange({ range: "12m" }, NOW);
    expect(year.bucketStarts).toHaveLength(12);
    expect(year.bucketStarts[11]).toBe(Date.UTC(2026, 9, 1));
    expect(year.bucketStarts[0]).toBe(Date.UTC(2025, 10, 1));
  });

  it("places times in the right bucket and ignores anything outside the window", () => {
    const range = resolveRange({ range: "7d" }, NOW);
    expect(bucketIndex(range, NOW)).toBe(6);
    expect(bucketIndex(range, Date.UTC(2026, 9, 8, 0, 0))).toBe(0);
    expect(bucketIndex(range, Date.UTC(2026, 9, 11, 23, 59))).toBe(3);
    expect(bucketIndex(range, Date.UTC(2026, 9, 7, 23, 59))).toBe(-1);
    expect(bucketIndex(range, NOW + DAY)).toBe(-1);
  });
});

describe("custom ranges", () => {
  const custom = (from: string, to: string) => resolveRange({ range: "custom", from, to }, NOW);

  it("covers the whole of both end dates, in daily buckets for short spans", () => {
    const range = custom("2026-10-01", "2026-10-05");
    expect(range.key).toBe("custom");
    expect(range.granularity).toBe("day");
    expect(range.bucketStarts).toHaveLength(5);
    expect(range.startMs).toBe(Date.UTC(2026, 9, 1));
    expect(range.endMs).toBe(Date.UTC(2026, 9, 5, 23, 59, 59, 999));
    expect(bucketIndex(range, Date.UTC(2026, 9, 5, 23, 0))).toBe(4);
    expect(bucketIndex(range, Date.UTC(2026, 9, 6, 0, 0))).toBe(-1);
    expect(range.endsToday).toBe(false);
  });

  it("switches to weekly buckets past 45 days and monthly past 150", () => {
    expect(custom("2026-07-01", "2026-09-30").granularity).toBe("week");
    const long = custom("2026-01-15", "2026-10-10");
    expect(long.granularity).toBe("month");
    expect(long.bucketStarts[0]).toBe(Date.UTC(2026, 0, 1));
    expect(long.bucketStarts).toHaveLength(10);
    expect(bucketIndex(long, Date.UTC(2026, 0, 10))).toBe(-1);
    expect(bucketIndex(long, Date.UTC(2026, 0, 20))).toBe(0);
  });

  it("clamps an end date in the future to now", () => {
    const range = custom("2026-10-10", "2026-12-31");
    expect(range.endMs).toBe(NOW);
    expect(range.toDate).toBe("2026-10-14");
    expect(range.endsToday).toBe(true);
  });

  it.each([
    ["a start after the end", "2026-10-10", "2026-10-01"],
    ["a start in the future", "2026-11-01", "2026-11-05"],
    ["an impossible date", "2026-02-31", "2026-03-05"],
    ["garbage", "yesterday", "today"],
    ["more than two years", "2024-01-01", "2026-10-01"],
  ])("falls back to the default for %s", (_label, from, to) => {
    expect(custom(from, to).key).toBe("30d");
  });

  it("allows exactly the maximum span", () => {
    expect(MAX_CUSTOM_DAYS).toBe(731);
    expect(custom("2024-10-14", "2026-10-14").key).toBe("custom");
  });

  it("needs both dates", () => {
    expect(resolveRange({ range: "custom", from: "2026-10-01" }, NOW).key).toBe("30d");
    expect(resolveRange({ from: "2026-10-01", to: "2026-10-05" }, NOW).key).toBe("30d");
  });
});
