import { describe, expect, it } from "vitest";
import { buildAdvisorEscalationEmail } from "@/features/advisor/escalation-email";

describe("buildAdvisorEscalationEmail", () => {
  it("includes the case, employee, reason, and queue link", () => {
    const email = buildAdvisorEscalationEmail({
      caseId: "ADV-123",
      employeeName: "Ahmed Test",
      question: "Review before final warning.",
      escalationReason: "Potential retaliation concern.",
      responseCommitment: "Reply within 4 business hours",
      advisorUrl: "https://example.com/advisor",
    });

    expect(email.subject).toBe("[Skylar] Advisor escalation ADV-123: Ahmed Test");
    expect(email.text).toContain("Potential retaliation concern.");
    expect(email.text).toContain("https://example.com/advisor");
    expect(email.html).toContain("ADV-123");
    expect(email.html).toContain("Open the advisor queue");
  });

  it("escapes unsafe html in the rendered email", () => {
    const email = buildAdvisorEscalationEmail({
      caseId: "ADV-<1>",
      employeeName: "<script>",
      question: "Use <b>care</b>.",
      escalationReason: "Risk < high.",
      responseCommitment: "Reply soon",
      advisorUrl: "https://example.com/advisor",
    });

    expect(email.html).toContain("ADV-&lt;1&gt;");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain("Use &lt;b&gt;care&lt;/b&gt;.");
    expect(email.html).not.toContain("<script>");
  });
});
