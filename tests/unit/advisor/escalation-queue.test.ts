import { describe, expect, it } from "vitest";
import { casePhaseLabel, isActiveEscalation, sortCases, type AdvisorEscalationRecord } from "@/features/advisor/escalation-queue";
import { friendlyName } from "@/lib/person-name";

function escalation(overrides: Partial<AdvisorEscalationRecord> = {}): AdvisorEscalationRecord {
  return {
    id: "case-doc",
    companyId: "company-1",
    employeeId: "employee-1",
    employeeName: "Employee One",
    caseId: "CASE-001",
    question: "What is the safest next step?",
    escalationReason: "Leave-law risk needs review.",
    status: "with_advisor",
    advisorName: "Skylar Advisor",
    advisorCredentialLine: "People advisor",
    responseCommitment: "Reply within 4 business hours",
    draftResponse: null,
    responseText: null,
    respondedAtMs: null,
    resolvedAtMs: null,
    phase: "waiting",
    afterHours: false,
    claimedByName: null,
    createdAtMs: 1000,
    lastActivityMs: 1000,
    reopenCount: 0,
    relatedLedger: [],
    ...overrides,
  };
}

describe("casePhaseLabel", () => {
  it("says where the chat stands in plain words", () => {
    expect(casePhaseLabel(escalation())).toBe("Waiting for HR");
    expect(casePhaseLabel(escalation({ phase: "connected", claimedByName: "ana" }))).toBe("With Ana");
    expect(casePhaseLabel(escalation({ phase: "connected", claimedByName: null }))).toBe("With an advisor");
    expect(casePhaseLabel(escalation({ phase: "closed" }))).toBe("Closed");
  });
});

describe("isActiveEscalation", () => {
  it("counts a chat as open until HR closes it, including after the advisor has replied", () => {
    expect(isActiveEscalation("with_advisor")).toBe(true);
    expect(isActiveEscalation("draft_response")).toBe(true);
    expect(isActiveEscalation("responded")).toBe(true);
    expect(isActiveEscalation("resolved")).toBe(false);
    expect(isActiveEscalation("closed")).toBe(false);
  });
});

describe("sortCases", () => {
  it("puts open chats first, then the most recently active", () => {
    const list = [
      escalation({ id: "old-closed", phase: "closed", lastActivityMs: 9000 }),
      escalation({ id: "quiet-open", lastActivityMs: 2000 }),
      escalation({ id: "busy-open", phase: "connected", lastActivityMs: 5000 }),
      escalation({ id: "new-closed", phase: "closed", lastActivityMs: 9500 }),
    ];
    expect(sortCases(list).map((item) => item.id)).toEqual(["busy-open", "quiet-open", "new-closed", "old-closed"]);
    expect(list[0].id).toBe("old-closed"); // the input isn't reordered
  });
});

describe("friendlyName", () => {
  it("turns the start of an email into a readable name", () => {
    expect(friendlyName("ana")).toBe("Ana");
    expect(friendlyName("ana.lopez@skylar.app")).toBe("Ana Lopez");
    expect(friendlyName("ahmed_khan")).toBe("Ahmed Khan");
  });

  it("leaves a name someone wrote themselves alone, and has a fallback", () => {
    expect(friendlyName("Dr. Ana de Souza")).toBe("Dr. Ana de Souza");
    expect(friendlyName("  ")).toBe("Skylar advisor");
    expect(friendlyName(null, "an advisor")).toBe("an advisor");
  });
});
