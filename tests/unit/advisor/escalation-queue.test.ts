import { describe, expect, it } from "vitest";
import {
  canResolveAdvisorCase,
  toAdvisorQueueItem,
  type AdvisorEscalationRecord,
} from "@/features/advisor/escalation-queue";

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
    relatedLedger: [],
    ...overrides,
  };
}

describe("toAdvisorQueueItem", () => {
  it("maps active escalation records into queue rows", () => {
    expect(toAdvisorQueueItem(escalation())).toEqual({
      id: "case-doc",
      caseId: "CASE-001",
      employeeName: "Employee One",
      question: "What is the safest next step?",
      statusLabel: "With advisor",
      advisorLine: "Skylar Advisor - People advisor",
      responseCommitment: "Reply within 4 business hours",
      isActive: true,
    });
  });

  it("keeps draft cases active in the queue", () => {
    expect(toAdvisorQueueItem(escalation({ status: "draft_response" }))).toMatchObject({
      statusLabel: "Draft saved",
      isActive: true,
    });
  });

  it("marks responded cases as waiting for resolution, not active queue work", () => {
    expect(toAdvisorQueueItem(escalation({ status: "responded" }))).toMatchObject({
      statusLabel: "Responded",
      isActive: false,
    });
  });
});

describe("canResolveAdvisorCase", () => {
  it("requires a responded case with saved response text", () => {
    expect(canResolveAdvisorCase(escalation({ status: "responded", responseText: "Use this wording." }))).toBe(true);
    expect(canResolveAdvisorCase(escalation({ status: "draft_response", responseText: "Use this wording." }))).toBe(false);
    expect(canResolveAdvisorCase(escalation({ status: "responded", responseText: "" }))).toBe(false);
  });
});
