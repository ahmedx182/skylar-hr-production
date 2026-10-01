export type AdvisorEscalationRecord = {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  caseId: string;
  question: string;
  escalationReason: string;
  status: "with_advisor" | "draft_response" | "responded" | "resolved" | "closed";
  advisorName: string;
  advisorCredentialLine: string;
  responseCommitment: string;
  draftResponse: string | null;
  responseText: string | null;
  respondedAtMs: number | null;
  resolvedAtMs: number | null;
  relatedLedger: AdvisorCaseLedgerItem[];
};

export type AdvisorCaseLedgerItem = {
  id: string;
  type: string;
  description: string;
  statusDot: "amber" | "green" | "red" | null;
  dateMs: number;
};

export type AdvisorQueueItem = {
  id: string;
  caseId: string;
  employeeName: string;
  question: string;
  statusLabel: string;
  advisorLine: string;
  responseCommitment: string;
  isActive: boolean;
};

/** A case is open while it is with the advisor or has a draft saved. */
export function isActiveEscalation(status: AdvisorEscalationRecord["status"]): boolean {
  return status === "with_advisor" || status === "draft_response";
}

export function advisorStatusLabel(status: AdvisorEscalationRecord["status"]): string {
  if (status === "draft_response") return "Draft saved";
  if (status === "responded") return "Responded";
  if (status === "resolved" || status === "closed") return "Resolved";
  return "With advisor";
}

export function canSaveAdvisorDraft(status: AdvisorEscalationRecord["status"]): boolean {
  return status === "with_advisor" || status === "draft_response" || status === "responded";
}

export function canMarkAdvisorResponded(record: AdvisorEscalationRecord): boolean {
  return (
    record.status === "with_advisor" ||
    record.status === "draft_response" ||
    record.status === "responded"
  );
}

export function canResolveAdvisorCase(record: AdvisorEscalationRecord): boolean {
  return Boolean(record.responseText?.trim()) && record.status === "responded";
}

export function toAdvisorQueueItem(record: AdvisorEscalationRecord): AdvisorQueueItem {
  return {
    id: record.id,
    caseId: record.caseId,
    employeeName: record.employeeName,
    question: record.question,
    statusLabel: advisorStatusLabel(record.status),
    advisorLine: `${record.advisorName} - ${record.advisorCredentialLine}`,
    responseCommitment: record.responseCommitment,
    isActive: record.status === "with_advisor" || record.status === "draft_response",
  };
}
