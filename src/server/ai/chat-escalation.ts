import { decideFromClassifier, decideFromRules, REQUESTED_ADVISOR_REASON } from "@/features/advisor/escalation-detection";
import type { ChatEscalationOutcome } from "@/features/briefing/chat-escalation";
import type { SkylarConversationMessage } from "@/features/briefing/skylar-conversation-transcript";
import { classifyEscalation } from "@/server/ai/escalation-classifier";
import { createAdvisorEscalationFromLedger } from "@/server/repositories/advisor-escalation.repository";
import { shouldReopenInsteadOfNew } from "@/features/advisor/live-chat";
import { findLiveCaseForEmployee, reopenUserLiveCase, sendUserLiveMessage } from "@/server/repositories/advisor-live.repository";
import { releaseEscalation, reserveEscalation } from "@/server/repositories/billing.repository";
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
  input: { prompt: string; employeeId?: string; history?: SkylarConversationMessage[]; liveEnabled?: boolean; allowReopen?: boolean; enforceAllowance?: boolean },
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

    // A manager's own request for a person is capped by the plan's allowance. A high-risk matter the system detected is
    // always transferred, and still counted, so the allowance can never hold back a harassment or legal concern.
    const reservation = await reserveEscalation(session, { enforce: Boolean(input.enforceAllowance) && isRequest });
    if (!reservation.allowed) return { kind: "allowance_used", reason, limit: reservation.limit, plan: reservation.plan === "paid" ? "paid" : "free" };

    const escalation = await createAdvisorEscalationFromLedger(session, note.ledgerEntryId, {
      openingMessage: input.prompt,
      reason: isRequest ? REQUESTED_ADVISOR_REASON : reason,
      detection: { source: decision.source, confidence: decision.confidence ?? null },
    }).catch(async (error: unknown) => {
      // No case exists, so the allowance isn't spent.
      await releaseEscalation(session, reservation.counter).catch((releaseError: unknown) => console.error("Could not release escalation allowance", releaseError));
      throw error;
    });

    return { kind: "escalated", reason, caseId: escalation.caseId, escalationId: escalation.id };
  } catch (error) {
    console.error("Chat escalation failed", error);
    return { kind: "failed", reason };
  }
}
