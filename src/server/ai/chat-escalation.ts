import { decideFromClassifier, decideFromRules, REQUESTED_ADVISOR_REASON } from "@/features/advisor/escalation-detection";
import type { ChatEscalationOutcome } from "@/features/briefing/chat-escalation";
import type { SkylarConversationMessage } from "@/features/briefing/skylar-conversation-transcript";
import { classifyEscalation } from "@/server/ai/escalation-classifier";
import { createAdvisorEscalationFromLedger } from "@/server/repositories/advisor-escalation.repository";
import { shouldReopenInsteadOfNew } from "@/features/advisor/live-chat";
import { findLiveCaseForEmployee, reopenUserLiveCase, sendUserLiveMessage } from "@/server/repositories/advisor-live.repository";
import { createEmployeeNoteRecord } from "@/server/repositories/briefing-write.repository";
import type { AuthSession } from "@/types/auth";

const MAX_NOTE_LENGTH = 1000;

/**
 * Applies the escalation rules to a manager's chat message. A transfer becomes a note and its own
 * advisor case (an employee can have several). Never throws; a failure is reported as an outcome
 * so the assistant cannot claim an escalation that did not happen.
 */
export async function escalateFromChat(
  session: AuthSession,
  input: { prompt: string; employeeId?: string; history?: SkylarConversationMessage[]; liveEnabled?: boolean; allowReopen?: boolean },
): Promise<ChatEscalationOutcome> {
  // With live chat switched off there's nobody to offer, so the classifier isn't worth the wait.
  const classify = async () => (input.liveEnabled === false ? ({ action: "none" } as const) : decideFromClassifier(input.prompt, await classifyEscalation(input.prompt, input.history)));
  const decision = decideFromRules(input.prompt) ?? (await classify());
  if (decision.action === "none") return { kind: "none" };

  const reason = decision.reason;
  if (decision.action === "offer") return { kind: "offer", reason };
  if (!input.employeeId) return { kind: "needs_employee", reason };

  const isRequest = decision.source === "user_request";
  try {
    const note = await createEmployeeNoteRecord(session, {
      employeeId: input.employeeId,
      note: input.prompt.slice(0, MAX_NOTE_LENGTH),
      statusDot: isRequest ? "amber" : "red",
    });
    // Skylar's answer: a manager starts a new chat after one closes. Only when reopening is switched on does the
    // same matter coming back right after HR closed it continue that case.
    const recent = input.allowReopen ? await findLiveCaseForEmployee(session, input.employeeId) : null;
    if (recent && shouldReopenInsteadOfNew(recent)) {
      await reopenUserLiveCase(session, recent.id);
      await sendUserLiveMessage(session, recent.id, input.prompt);
      return { kind: "escalated", reason, caseId: recent.caseId, escalationId: recent.id };
    }

    const escalation = await createAdvisorEscalationFromLedger(session, note.ledgerEntryId, {
      openingMessage: input.prompt,
      reason: isRequest ? REQUESTED_ADVISOR_REASON : reason,
      detection: { source: decision.source, confidence: decision.confidence ?? null },
    });

    return { kind: "escalated", reason, caseId: escalation.caseId, escalationId: escalation.id };
  } catch (error) {
    console.error("Chat escalation failed", error);
    return { kind: "failed", reason };
  }
}
