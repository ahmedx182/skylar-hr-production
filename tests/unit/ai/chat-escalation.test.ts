import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAdvisorEscalationFromLedger: vi.fn(),
  createEmployeeNoteRecord: vi.fn(),
  classifyEscalation: vi.fn(),
  findLiveCaseForEmployee: vi.fn(),
  reopenUserLiveCase: vi.fn(),
  sendUserLiveMessage: vi.fn(),
  reserveEscalation: vi.fn(),
  releaseEscalation: vi.fn(),
}));

vi.mock("@/server/repositories/billing.repository", () => ({
  reserveEscalation: mocks.reserveEscalation,
  releaseEscalation: mocks.releaseEscalation,
}));

vi.mock("@/server/repositories/advisor-live.repository", () => ({
  findLiveCaseForEmployee: mocks.findLiveCaseForEmployee,
  reopenUserLiveCase: mocks.reopenUserLiveCase,
  sendUserLiveMessage: mocks.sendUserLiveMessage,
}));

vi.mock("@/server/ai/escalation-classifier", () => ({ classifyEscalation: mocks.classifyEscalation }));

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
    mocks.classifyEscalation.mockResolvedValue(null);
    mocks.findLiveCaseForEmployee.mockResolvedValue(null);
    mocks.reserveEscalation.mockResolvedValue({ allowed: true, counter: "lifetime" });
    mocks.releaseEscalation.mockResolvedValue(undefined);
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
    expect(mocks.createAdvisorEscalationFromLedger).toHaveBeenCalledWith(session, "L1", expect.objectContaining({ openingMessage: riskyPrompt, detection: { source: "strong_rule", confidence: null } }));
    expect(outcome).toMatchObject({ kind: "escalated", caseId: "CASE-9", escalationId: "ledger_L1" });
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

  it("transfers straight away when the manager asks for a person, without calling the classifier", async () => {
    const outcome = await escalateFromChat(session, { prompt: "Connect me to an HR advisor", employeeId: "e1" });

    expect(mocks.classifyEscalation).not.toHaveBeenCalled();
    expect(mocks.createEmployeeNoteRecord).toHaveBeenCalledWith(session, expect.objectContaining({ statusDot: "amber" }));
    expect(outcome.kind).toBe("escalated");
  });

  it("follows the classifier: high transfers, medium offers, low does nothing", async () => {
    const prompt = "He keeps making comments about her accent in front of the team";

    mocks.classifyEscalation.mockResolvedValue({ needsHuman: true, confidence: "high", reason: "Possible harassment." });
    expect((await escalateFromChat(session, { prompt, employeeId: "e1" })).kind).toBe("escalated");
    expect(mocks.createAdvisorEscalationFromLedger.mock.calls[0][2]).toMatchObject({ reason: "Possible harassment.", detection: { source: "classifier", confidence: "high" } });

    mocks.classifyEscalation.mockResolvedValue({ needsHuman: true, confidence: "medium", reason: "Might be." });
    expect(await escalateFromChat(session, { prompt, employeeId: "e1" })).toEqual({ kind: "offer", reason: "Might be." });

    mocks.classifyEscalation.mockResolvedValue({ needsHuman: true, confidence: "low", reason: "Probably not." });
    expect(await escalateFromChat(session, { prompt, employeeId: "e1" })).toEqual({ kind: "none" });
  });

  it("offers an advisor on a weak word only when the classifier is down", async () => {
    const prompt = "Any legal holidays I should plan around?";
    mocks.classifyEscalation.mockResolvedValue(null);
    expect((await escalateFromChat(session, { prompt, employeeId: "e1" })).kind).toBe("offer");

    mocks.classifyEscalation.mockResolvedValue({ needsHuman: false, confidence: "low", reason: "Scheduling." });
    expect((await escalateFromChat(session, { prompt, employeeId: "e1" })).kind).toBe("none");
  });

  it("skips the classifier when live chat is switched off, but strong rules still escalate", async () => {
    expect(await escalateFromChat(session, { prompt: "How do I run a good one-to-one?", employeeId: "e1", liveEnabled: false })).toEqual({ kind: "none" });
    expect(mocks.classifyEscalation).not.toHaveBeenCalled();
    expect((await escalateFromChat(session, { prompt: riskyPrompt, employeeId: "e1", liveEnabled: false })).kind).toBe("escalated");
  });

  it("only when reopening is switched on, continues a case HR closed a day ago instead of opening a second one", async () => {
    mocks.findLiveCaseForEmployee.mockResolvedValue({ id: "esc-old", caseId: "ADV-OLD", isOpen: false, closedAtMs: Date.now() - 24 * 3600_000 });

    const outcome = await escalateFromChat(session, { prompt: riskyPrompt, employeeId: "e1", allowReopen: true });

    expect(mocks.reopenUserLiveCase).toHaveBeenCalledWith(session, "esc-old");
    expect(mocks.sendUserLiveMessage).toHaveBeenCalledWith(session, "esc-old", riskyPrompt);
    expect(mocks.createAdvisorEscalationFromLedger).not.toHaveBeenCalled();
    expect(outcome).toEqual({ kind: "escalated", reason: expect.any(String), caseId: "ADV-OLD", escalationId: "esc-old" });
  });

  it("by default starts a new case even right after HR closed the last one", async () => {
    mocks.findLiveCaseForEmployee.mockResolvedValue({ id: "esc-old", caseId: "ADV-OLD", isOpen: false, closedAtMs: Date.now() - 3600_000 });

    const outcome = await escalateFromChat(session, { prompt: riskyPrompt, employeeId: "e1" });

    expect(mocks.reopenUserLiveCase).not.toHaveBeenCalled();
    expect(mocks.createAdvisorEscalationFromLedger).toHaveBeenCalledTimes(1);
    expect(outcome).toMatchObject({ kind: "escalated", caseId: "CASE-9" });
  });

  it("opens a new case when the last one closed more than a week ago, or is still open", async () => {
    mocks.findLiveCaseForEmployee.mockResolvedValue({ id: "esc-old", caseId: "ADV-OLD", isOpen: false, closedAtMs: Date.now() - 8 * 24 * 3600_000 });
    expect((await escalateFromChat(session, { prompt: riskyPrompt, employeeId: "e1", allowReopen: true })).kind).toBe("escalated");
    expect(mocks.reopenUserLiveCase).not.toHaveBeenCalled();
    expect(mocks.createAdvisorEscalationFromLedger).toHaveBeenCalledTimes(1);

    mocks.findLiveCaseForEmployee.mockResolvedValue({ id: "esc-open", caseId: "ADV-OPEN", isOpen: true, closedAtMs: null });
    await escalateFromChat(session, { prompt: riskyPrompt, employeeId: "e1", allowReopen: true });
    expect(mocks.reopenUserLiveCase).not.toHaveBeenCalled();
  });

  describe("escalation allowance", () => {
    const used = { allowed: false, limit: 1, plan: "free" } as const;

    it("refuses a manager's own request for a person once the allowance is spent", async () => {
      mocks.reserveEscalation.mockResolvedValue(used);
      const outcome = await escalateFromChat(session, { prompt: "I want to talk to an HR advisor", employeeId: "e1", enforceAllowance: true });

      expect(mocks.reserveEscalation).toHaveBeenCalledWith(session, { enforce: true });
      expect(outcome).toEqual({ kind: "allowance_used", reason: expect.any(String), limit: 1, plan: "free" });
      expect(mocks.createAdvisorEscalationFromLedger).not.toHaveBeenCalled();
    });

    it("never holds back a high-risk matter the system detected, but still counts it", async () => {
      const outcome = await escalateFromChat(session, { prompt: riskyPrompt, employeeId: "e1", enforceAllowance: true });

      expect(mocks.reserveEscalation).toHaveBeenCalledWith(session, { enforce: false });
      expect(outcome).toMatchObject({ kind: "escalated" });
    });

    it("gives the allowance back when the case could not be created", async () => {
      mocks.createAdvisorEscalationFromLedger.mockRejectedValue(new Error("boom"));
      const outcome = await escalateFromChat(session, { prompt: riskyPrompt, employeeId: "e1", enforceAllowance: true });

      expect(mocks.releaseEscalation).toHaveBeenCalledWith(session, "lifetime");
      expect(outcome).toMatchObject({ kind: "failed" });
    });
  });
});
