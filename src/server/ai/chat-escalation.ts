import { classifyLedgerRisk } from "@/features/briefing/risk-classification";
import type { ChatEscalationOutcome } from "@/features/briefing/chat-escalation";
import { createAdvisorEscalationFromLedger } from "@/server/repositories/advisor-escalation.repository";
import { createEmployeeNoteRecord } from "@/server/repositories/briefing-write.repository";
import type { AuthSession } from "@/types/auth";

const MAX_NOTE_LENGTH = 1000;

/**
 * Applies the escalation rules to a manager's chat message: a high-risk message
 * about an employee becomes a red note and its own advisor case (an employee can
 * have several open cases). Never throws; a failure is reported as an outcome so
 * the assistant cannot claim an escalation that did not happen.
 */
export async function escalateFromChat(
  session: AuthSession,
  input: { prompt: string; employeeId?: string },
): Promise<ChatEscalationOutcome> {
  const risk = classifyLedgerRisk(input.prompt);
  if (!risk.isHighRisk || !risk.reason) return { kind: "none" };

  const reason = risk.reason;
  if (!input.employeeId) return { kind: "needs_employee", reason };

  try {
    const note = await createEmployeeNoteRecord(session, {
      employeeId: input.employeeId,
      note: input.prompt.slice(0, MAX_NOTE_LENGTH),
      statusDot: "red",
    });
    const escalation = await createAdvisorEscalationFromLedger(session, note.ledgerEntryId);

    return { kind: "escalated", reason, caseId: escalation.caseId };
  } catch (error) {
    console.error("Chat escalation failed", error);
    return { kind: "failed", reason };
  }
}
