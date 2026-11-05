import { describe, expect, it } from "vitest";
import { buildAdvisorEscalationEmail, buildLiveReplyEmail } from "@/features/advisor/escalation-email";

describe("buildAdvisorEscalationEmail", () => {
  it("includes the case, employee, reason, and desk link", () => {
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
    expect(email.html).toContain("Open the advisor desk");
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

  it("says the advisor has read the case, in a separate email from a reply", () => {
    const read = buildLiveReplyEmail({ caseId: "ADV-9", audience: "user", url: "https://x.test/advisor", kind: "reviewed" });
    expect(read.subject).toBe("[Skylar] Your HR advisor has read case ADV-9");
    expect(read.text).toContain("has read advisor case ADV-9 and is reviewing it");
    const reply = buildLiveReplyEmail({ caseId: "ADV-9", audience: "user", url: "https://x.test/advisor" });
    expect(reply.subject).toBe("[Skylar] Your HR advisor replied on ADV-9");
    expect(reply.text).not.toContain("read advisor case");
    expect(read.html).not.toContain("replied");
  });
});
