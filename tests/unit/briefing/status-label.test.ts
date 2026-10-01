import { describe, expect, it } from "vitest";
import { ledgerStatusLabel } from "@/features/briefing/status-label";

describe("ledgerStatusLabel", () => {
  it("keeps the existing labels for records that are not escalated", () => {
    expect(ledgerStatusLabel("red")).toBe("Needs review");
    expect(ledgerStatusLabel("amber")).toBe("Needs follow-up");
    expect(ledgerStatusLabel("green")).toBe("Resolved");
    expect(ledgerStatusLabel(null)).toBe("No marker");
  });

  it("marks an escalated record as escalated whatever its colour", () => {
    expect(ledgerStatusLabel("red", true)).toBe("Escalated to advisor");
    expect(ledgerStatusLabel("amber", true)).toBe("Escalated to advisor");
    expect(ledgerStatusLabel(null, true)).toBe("Escalated to advisor");
  });

  it("treats a missing escalation flag as not escalated", () => {
    expect(ledgerStatusLabel("red", undefined)).toBe("Needs review");
  });
});
