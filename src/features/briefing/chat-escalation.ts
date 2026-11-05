export type ChatEscalationOutcome =
  | { kind: "none" }
  | { kind: "escalated"; reason: string; caseId: string; escalationId?: string }
  | { kind: "offer"; reason: string }
  | { kind: "needs_employee"; reason: string }
  | { kind: "failed"; reason: string };

/** What the chat screen needs to show an escalation card. */
export type EscalationEvent = {
  kind: "escalated" | "needs_employee" | "failed";
  reason: string;
  caseId?: string;
  /** Firestore id of the advisor case, so the chat can open the live thread. */
  escalationId?: string;
};

export function toEscalationEvent(outcome: ChatEscalationOutcome): EscalationEvent | null {
  switch (outcome.kind) {
    case "none":
    case "offer":
      return null;
    case "escalated":
      return { kind: "escalated", reason: outcome.reason, caseId: outcome.caseId, escalationId: outcome.escalationId };
    case "needs_employee":
    case "failed":
      return { kind: outcome.kind, reason: outcome.reason };
  }
}

/**
 * Tells the model what the server actually did with a high-risk message, so it
 * only ever says "escalated" when an escalation really exists.
 */
export function buildEscalationNotice(outcome: ChatEscalationOutcome): string | null {
  switch (outcome.kind) {
    case "none":
      return null;
    case "escalated":
      return `SYSTEM NOTICE: This request matched a high-risk rule (${outcome.reason}). It has been escalated to the advisor queue as case ${outcome.caseId}. Tell the manager plainly that this is a high alert you cannot advise on, that it is now escalated, and what to do while they wait.`;
    case "offer":
      return `SYSTEM NOTICE: This request may need a human HR advisor (${outcome.reason}), but nothing has been escalated. The manager is being shown a "Connect me to an HR advisor" button. If this is not a high alert, answer as usual and mention the button in one short sentence. If it is a high alert, do not advise on it; tell them to use the button.`;
    case "needs_employee":
      return `SYSTEM NOTICE: This request matched a high-risk rule (${outcome.reason}) but no employee is selected, so it has not been escalated. Tell the manager this is a high alert you cannot advise on, and ask them to select the employee so it can be escalated.`;
    case "failed":
      return `SYSTEM NOTICE: This request matched a high-risk rule (${outcome.reason}) but the escalation could not be created. Tell the manager this is a high alert you cannot advise on, that it was NOT escalated, and that they should use "Hold to escalate" on the employee's brief.`;
  }
}
