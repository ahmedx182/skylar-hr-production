export type ChatEscalationOutcome =
  | { kind: "none" }
  | { kind: "escalated"; reason: string; caseId: string }
  | { kind: "needs_employee"; reason: string }
  | { kind: "failed"; reason: string };

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
    case "needs_employee":
      return `SYSTEM NOTICE: This request matched a high-risk rule (${outcome.reason}) but no employee is selected, so it has not been escalated. Tell the manager this is a high alert you cannot advise on, and ask them to select the employee so it can be escalated.`;
    case "failed":
      return `SYSTEM NOTICE: This request matched a high-risk rule (${outcome.reason}) but the escalation could not be created. Tell the manager this is a high alert you cannot advise on, that it was NOT escalated, and that they should use "Hold to escalate" on the employee's brief.`;
  }
}
