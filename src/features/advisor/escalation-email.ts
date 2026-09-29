export type AdvisorEscalationEmailInput = {
  caseId: string;
  employeeName: string;
  question: string;
  escalationReason: string;
  responseCommitment: string;
  advisorUrl: string;
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
  const subject = `[Skylar] Advisor escalation ${input.caseId}: ${input.employeeName}`;
  const text = [
    `Advisor escalation ${input.caseId}`,
    "",
    `Employee: ${input.employeeName}`,
    `Reason: ${input.escalationReason}`,
    `Commitment: ${input.responseCommitment}`,
    "",
    input.question,
    "",
    `Open the advisor queue: ${input.advisorUrl}`,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#111111">
      <p style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#ef5a52;margin:0 0 12px">Advisor escalation</p>
      <h1 style="font-size:22px;margin:0 0 16px">${escapeHtml(input.caseId)} · ${escapeHtml(input.employeeName)}</h1>
      <p><strong>Reason:</strong> ${escapeHtml(input.escalationReason)}</p>
      <p><strong>Commitment:</strong> ${escapeHtml(input.responseCommitment)}</p>
      <div style="margin:20px 0;padding:16px;border-left:3px solid #ef5a52;background:#f7f4ef">
        ${escapeHtml(input.question)}
      </div>
      <p><a href="${escapeHtml(input.advisorUrl)}" style="color:#111111;font-weight:700">Open the advisor queue</a></p>
    </div>
  `;

  return { subject, text, html };
}
