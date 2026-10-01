import { describe, expect, it } from "vitest";
import { employeePriority } from "@/features/briefing/employee-priority";

describe("employeePriority", () => {
  it("is High whenever the employee has an open escalation", () => {
    expect(employeePriority({ latestStatusDot: "green", openEscalations: 1 })).toBe("High");
    expect(employeePriority({ latestStatusDot: null, openEscalations: 3 })).toBe("High");
  });

  it("is not hidden by a newer ordinary note when a case is open", () => {
    expect(employeePriority({ latestStatusDot: "amber", openEscalations: 2 })).toBe("High");
  });

  it("falls back to the latest note when nothing is escalated", () => {
    expect(employeePriority({ latestStatusDot: "red", openEscalations: 0 })).toBe("High");
    expect(employeePriority({ latestStatusDot: "amber", openEscalations: 0 })).toBe("Follow-up");
    expect(employeePriority({ latestStatusDot: "green", openEscalations: 0 })).toBe("Resolved");
    expect(employeePriority({ latestStatusDot: null, openEscalations: 0 })).toBe("Normal");
  });
});
