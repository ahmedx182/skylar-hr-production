import { friendlyName } from "@/lib/person-name";
import type { LiveChatPhase } from "./live-chat";

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
  /** Where the live chat stands: waiting for an advisor, with one, or closed. */
  phase: LiveChatPhase;
  /** Outside working hours the wait is up to 6 hours instead of 1. */
  afterHours: boolean;
  claimedByName: string | null;
  createdAtMs: number | null;
  lastActivityMs: number | null;
  reopenCount: number;
  relatedLedger: AdvisorCaseLedgerItem[];
};

export type AdvisorCaseLedgerItem = {
  id: string;
  type: string;
  description: string;
  statusDot: "amber" | "green" | "red" | null;
  dateMs: number;
};

/**
 * A case is open until HR resolves or closes it. "responded" counts: it means the advisor has replied,
 * and the conversation carries on from there.
 */
export function isActiveEscalation(status: AdvisorEscalationRecord["status"]): boolean {
  return status !== "resolved" && status !== "closed";
}

/** One short phrase for where a case stands, from the manager's point of view. */
export function casePhaseLabel(record: Pick<AdvisorEscalationRecord, "phase" | "claimedByName">): string {
  if (record.phase === "closed") return "Closed";
  if (record.phase === "connected") return `With ${friendlyName(record.claimedByName, "an advisor")}`;
  return "Waiting for HR";
}

/** Open cases first, then the most recently active. */
export function sortCases(records: AdvisorEscalationRecord[]): AdvisorEscalationRecord[] {
  const rank = (record: AdvisorEscalationRecord) => (record.phase === "closed" ? 1 : 0);
  return [...records].sort((a, b) => rank(a) - rank(b) || (b.lastActivityMs ?? b.createdAtMs ?? 0) - (a.lastActivityMs ?? a.createdAtMs ?? 0));
}
