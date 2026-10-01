import { describe, expect, it } from "vitest";
import { buildEscalationNotice } from "@/features/briefing/chat-escalation";

describe("buildEscalationNotice", () => {
  it("adds nothing when the message is not high risk", () => {
    expect(buildEscalationNotice({ kind: "none" })).toBeNull();
  });

  it("tells the bot the case was escalated, with its id and reason", () => {
    const notice = buildEscalationNotice({ kind: "escalated", reason: "Potential harassment concern.", caseId: "CASE-1" });

    expect(notice).toContain("CASE-1");
    expect(notice).toContain("Potential harassment concern.");
    expect(notice).toMatch(/escalated/i);
  });

  it("asks the manager to choose an employee when none is selected", () => {
    const notice = buildEscalationNotice({ kind: "needs_employee", reason: "Potential safety concern." });

    expect(notice).toMatch(/select|choose/i);
    expect(notice).toMatch(/has not been escalated/i);
  });

  it("does not claim an escalation when creating it failed", () => {
    const notice = buildEscalationNotice({ kind: "failed", reason: "Potential discrimination concern." });

    expect(notice).toMatch(/could not|failed/i);
    expect(notice).toMatch(/Hold to escalate/);
  });
});
