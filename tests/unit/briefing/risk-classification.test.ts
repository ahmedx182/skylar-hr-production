import { describe, expect, it } from "vitest";
import { classifyLedgerRisk } from "@/features/briefing/risk-classification";

describe("classifyLedgerRisk", () => {
  it("flags harassment, retaliation, protected leave, and legal risk language", () => {
    expect(classifyLedgerRisk("Employee reported harassment by a supervisor.")).toMatchObject({
      isHighRisk: true,
      reason: "Potential harassment or hostile-work-environment concern.",
    });
    expect(classifyLedgerRisk("Possible retaliation after a safety complaint.")).toMatchObject({
      isHighRisk: true,
    });
    expect(classifyLedgerRisk("Needs accommodation after medical leave.")).toMatchObject({
      isHighRisk: true,
    });
    expect(classifyLedgerRisk("Employee mentioned unpaid overtime and a lawyer.")).toMatchObject({
      isHighRisk: true,
    });
  });

  it("does not flag ordinary coaching notes", () => {
    expect(classifyLedgerRisk("Follow up next week on attendance expectations.")).toEqual({
      isHighRisk: false,
      reason: null,
    });
  });
});
