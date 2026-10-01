import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAdvisorEscalationFromLedger: vi.fn(),
  createEmployeeNoteRecord: vi.fn(),
}));

vi.mock("@/server/repositories/advisor-escalation.repository", () => ({
  createAdvisorEscalationFromLedger: mocks.createAdvisorEscalationFromLedger,
}));
vi.mock("@/server/repositories/briefing-write.repository", () => ({
  createEmployeeNoteRecord: mocks.createEmployeeNoteRecord,
}));

import { escalateFromChat } from "@/server/ai/chat-escalation";
import type { AuthSession } from "@/types/auth";

const session = { uid: "u1", companyId: "c1", role: "admin", email: "a@x.com" } as AuthSession;
const riskyPrompt = "She told me she is being harassed by her lead";

describe("escalateFromChat", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.createEmployeeNoteRecord.mockResolvedValue({ employeeId: "e1", ledgerEntryId: "L1" });
    mocks.createAdvisorEscalationFromLedger.mockResolvedValue({ id: "ledger_L1", caseId: "CASE-9" });
  });

  it("does nothing for a message that is not high risk", async () => {
    const outcome = await escalateFromChat(session, { prompt: "How do I run a good one-on-one?", employeeId: "e1" });

    expect(outcome).toEqual({ kind: "none" });
    expect(mocks.createEmployeeNoteRecord).not.toHaveBeenCalled();
  });

  it("saves a red note and escalates a high-risk message about an employee", async () => {
    const outcome = await escalateFromChat(session, { prompt: riskyPrompt, employeeId: "e1" });

    expect(mocks.createEmployeeNoteRecord).toHaveBeenCalledWith(
      session,
      expect.objectContaining({ employeeId: "e1", note: riskyPrompt, statusDot: "red" }),
    );
    expect(mocks.createAdvisorEscalationFromLedger).toHaveBeenCalledWith(session, "L1");
    expect(outcome).toMatchObject({ kind: "escalated", caseId: "CASE-9" });
  });

  it("asks for an employee instead of escalating when none is selected", async () => {
    const outcome = await escalateFromChat(session, { prompt: riskyPrompt });

    expect(outcome.kind).toBe("needs_employee");
    expect(mocks.createAdvisorEscalationFromLedger).not.toHaveBeenCalled();
  });

  it("opens a new case for every high-risk message, even when one is already open", async () => {
    mocks.createEmployeeNoteRecord
      .mockResolvedValueOnce({ employeeId: "e1", ledgerEntryId: "L1" })
      .mockResolvedValueOnce({ employeeId: "e1", ledgerEntryId: "L2" });
    mocks.createAdvisorEscalationFromLedger
      .mockResolvedValueOnce({ id: "ledger_L1", caseId: "CASE-1" })
      .mockResolvedValueOnce({ id: "ledger_L2", caseId: "CASE-2" });

    const first = await escalateFromChat(session, { prompt: riskyPrompt, employeeId: "e1" });
    const second = await escalateFromChat(session, { prompt: "He also threatened her", employeeId: "e1" });

    expect(first).toMatchObject({ kind: "escalated", caseId: "CASE-1" });
    expect(second).toMatchObject({ kind: "escalated", caseId: "CASE-2" });
    expect(mocks.createAdvisorEscalationFromLedger).toHaveBeenCalledTimes(2);
  });

  it("reports failure rather than claiming an escalation when saving fails", async () => {
    mocks.createEmployeeNoteRecord.mockRejectedValue(new Error("db down"));

    const outcome = await escalateFromChat(session, { prompt: riskyPrompt, employeeId: "e1" });

    expect(outcome.kind).toBe("failed");
  });

  it("trims very long messages to the note length limit", async () => {
    await escalateFromChat(session, { prompt: `harassment ${"x".repeat(1500)}`, employeeId: "e1" });

    const note = mocks.createEmployeeNoteRecord.mock.calls[0][1].note as string;
    expect(note.length).toBeLessThanOrEqual(1000);
  });
});
