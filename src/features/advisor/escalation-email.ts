export type AdvisorEscalationEmailInput = {
  caseId: string;
  employeeName: string;
  question: string;
  escalationReason: string;
  responseCommitment: string;
  advisorUrl: string;
  /** A reopened chat is flagged so advisors know the user is coming back. */
  reopened?: boolean;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildAdvisorEscalationEmail(input: AdvisorEscalationEmailInput) {
  const label = input.reopened ? "Reopened advisor chat" : "Advisor escalation";
  const subject = `[Skylar] ${label} ${input.caseId}: ${input.employeeName}`;
  const text = [
    `${label} ${input.caseId}`,
    "",
    `Employee: ${input.employeeName}`,
    `Reason: ${input.escalationReason}`,
    `Commitment: ${input.responseCommitment}`,
    "",
    input.question,
    "",
    `Open the advisor desk to reply: ${input.advisorUrl}`,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#111111">
      <p style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#ef5a52;margin:0 0 12px">${label}</p>
      <h1 style="font-size:22px;margin:0 0 16px">${escapeHtml(input.caseId)} · ${escapeHtml(input.employeeName)}</h1>
      <p><strong>Reason:</strong> ${escapeHtml(input.escalationReason)}</p>
      <p><strong>Commitment:</strong> ${escapeHtml(input.responseCommitment)}</p>
      <div style="margin:20px 0;padding:16px;border-left:3px solid #ef5a52;background:#f7f4ef">
        ${escapeHtml(input.question)}
      </div>
      <p><a href="${escapeHtml(input.advisorUrl)}" style="color:#111111;font-weight:700">Open the advisor desk</a></p>
    </div>
  `;

  return { subject, text, html };
}

export type LiveReplyAudience = "user" | "advisor";

/** Says only that there is a new message; the conversation itself stays behind the sign-in. */
export function buildLiveReplyEmail(input: { caseId: string; audience: LiveReplyAudience; url: string; kind?: "reply" | "reviewed" }) {
  const from = input.audience === "user" ? "Your HR advisor" : "The manager";
  const reviewed = input.kind === "reviewed";
  const sentence = reviewed ? `Your HR advisor has read advisor case ${input.caseId} and is reviewing it.` : `${from} replied on advisor case ${input.caseId}.`;
  const subject = reviewed ? `[Skylar] Your HR advisor has read case ${input.caseId}` : `[Skylar] ${from} replied on ${input.caseId}`;
  const text = [sentence, "", `Open the chat: ${input.url}`].join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#111111">
      <p>${escapeHtml(sentence)}</p>
      <p><a href="${escapeHtml(input.url)}" style="color:#111111;font-weight:700">Open the chat</a></p>
    </div>
  `;
  return { subject, text, html };
}
