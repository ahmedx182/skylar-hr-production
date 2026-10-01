import { describe, expect, it } from "vitest";
import { formatBadgeCount } from "@/features/briefing/badge-count";

describe("formatBadgeCount", () => {
  it("hides the badge when there is nothing to show", () => {
    expect(formatBadgeCount(0)).toBeNull();
    expect(formatBadgeCount(undefined)).toBeNull();
    expect(formatBadgeCount(-3)).toBeNull();
  });

  it("shows small counts as they are", () => {
    expect(formatBadgeCount(1)).toBe("1");
    expect(formatBadgeCount(9)).toBe("9");
  });

  it("caps large counts so the badge stays small", () => {
    expect(formatBadgeCount(10)).toBe("9+");
    expect(formatBadgeCount(250)).toBe("9+");
  });
});
