import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireSession: vi.fn(),
  isHrAdvisorEmail: vi.fn(),
  listHrAdvisorEmails: vi.fn(),
  batchSet: vi.fn(),
  commit: vi.fn(),
  send: vi.fn(),
  env: {} as Record<string, unknown>,
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }), redirect: vi.fn() }));
vi.mock("@/server/auth/require-session", () => ({ requireSession: () => m.requireSession(), requirePageSession: () => m.requireSession() }));
vi.mock("@/server/auth/hr-advisor-email", () => ({
  HR_ADVISORS: "hr_advisors",
  isHrAdvisorEmail: (...a: unknown[]) => m.isHrAdvisorEmail(...a),
  listHrAdvisorEmails: () => m.listHrAdvisorEmails(),
}));
vi.mock("@/lib/firebase/admin", () => ({
  adminDb: () => ({
    collection: (name: string) => ({ doc: (id?: string) => ({ name, id }) }),
    batch: () => ({ set: m.batchSet, commit: m.commit }),
  }),
}));
vi.mock("firebase-admin/firestore", () => ({ FieldValue: { serverTimestamp: () => "TS" } }));
vi.mock("@/lib/env/server", () => ({ getServerEnv: () => m.env }));
vi.mock("resend", () => ({ Resend: class { emails = { send: (...a: unknown[]) => m.send(...a) }; } }));

import { POST as grantRoute } from "@/app/api/platform/hr-advisors/route";
import { applyHrAdvisorAction } from "@/server/platform/hr-advisors";
import { isAdvisor, requireAdvisorPage } from "@/server/auth/advisor-access";
import { sendAdvisorEscalationNotification } from "@/server/email/advisor-escalation-notification";

const superAdmin = { uid: "sa", email: "boss@skylar.app", companyId: "skylar", role: "admin", isPlatformAdmin: true };
const hrAdvisor = { uid: "hr", email: "hr@skylar.app", companyId: "skylar-hr", role: "admin", isHrAdvisor: true };
const manager = { uid: "mgr", email: "m@acme.com", companyId: "acme", role: "admin", isPlatformAdmin: false, isHrAdvisor: false };

const post = (body: unknown, origin = "http://localhost") =>
  new Request("http://localhost/api/platform/hr-advisors", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin, host: "localhost" },
    body: JSON.stringify(body),
  });

describe("who can use the advisor desk", () => {
  it("is open to HR advisors and super admins only", () => {
    expect(isAdvisor(hrAdvisor)).toBe(true);
    expect(isAdvisor(superAdmin)).toBe(true);
    expect(isAdvisor(manager)).toBe(false);
  });

  it("hides the desk page from everyone else", async () => {
    m.requireSession.mockResolvedValue(manager);
    await expect(requireAdvisorPage()).rejects.toThrow("NEXT_NOT_FOUND");
    m.requireSession.mockResolvedValue(hrAdvisor);
    await expect(requireAdvisorPage()).resolves.toBe(hrAdvisor);
  });
});

describe("granting the HR advisor role", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.requireSession.mockResolvedValue(superAdmin);
    m.isHrAdvisorEmail.mockResolvedValue(false);
    m.commit.mockResolvedValue(undefined);
  });

  it("lets a super admin add an advisor by email, lowercased, with an audit entry", async () => {
    expect((await grantRoute(post({ action: "grant", email: "  New.Advisor@Skylar.app ", reason: "Joined HR team" }))).status).toBe(200);
    const writes = m.batchSet.mock.calls.map(([ref, data]) => ({ ref, data }));
    expect(writes[0].ref).toMatchObject({ name: "hr_advisors", id: "new.advisor@skylar.app" });
    expect(writes[0].data).toMatchObject({ email: "new.advisor@skylar.app", revoked: false, grantedBy: "sa" });
    expect(writes[1].ref.name).toBe("platform_audit_log");
    expect(writes[1].data).toMatchObject({ action: "hr_advisor_grant", companyName: "new.advisor@skylar.app", actorUid: "sa" });
  });

  it("revokes without deleting the record, and audits it", async () => {
    m.isHrAdvisorEmail.mockResolvedValue(true);
    expect((await grantRoute(post({ action: "revoke", email: "hr@skylar.app" }))).status).toBe(200);
    expect(m.batchSet.mock.calls[0][1]).toMatchObject({ revoked: true, revokedBy: "sa" });
    expect(m.batchSet.mock.calls[1][1]).toMatchObject({ action: "hr_advisor_revoke" });
  });

  it("refuses a duplicate grant and a revoke of someone who isn't an advisor", async () => {
    m.isHrAdvisorEmail.mockResolvedValue(true);
    await expect(applyHrAdvisorAction({ email: "hr@skylar.app", action: "grant", reason: null, actor: superAdmin })).rejects.toThrow("already an HR advisor");
    m.isHrAdvisorEmail.mockResolvedValue(false);
    await expect(applyHrAdvisorAction({ email: "x@skylar.app", action: "revoke", reason: null, actor: superAdmin })).rejects.toThrow("isn't an HR advisor");
    expect(m.commit).not.toHaveBeenCalled();
  });

  it("is for super admins only: HR advisors, managers, cross-origin and bad emails are rejected", async () => {
    for (const who of [hrAdvisor, manager]) {
      m.requireSession.mockResolvedValue(who);
      expect((await grantRoute(post({ action: "grant", email: "a@b.com" }))).status).toBe(403);
    }
    m.requireSession.mockResolvedValue(superAdmin);
    expect((await grantRoute(post({ action: "grant", email: "a@b.com" }, "https://evil.example"))).status).toBe(403);
    expect((await grantRoute(post({ action: "grant", email: "not-an-email" }))).status).toBe(400);
    expect(m.commit).not.toHaveBeenCalled();
  });
});

describe("emailing HR advisors about an escalation", () => {
  const input = { caseId: "ADV-1", employeeName: "Priya", question: "Harassment", escalationReason: "Potential harassment", responseCommitment: "Reply soon" };

  beforeEach(() => {
    vi.clearAllMocks();
    m.env = { RESEND_API_KEY: "key", RESEND_FROM_EMAIL: "Skylar <hi@skylar.app>", NEXT_PUBLIC_APP_URL: "https://app.skylar.app/", SKYLAR_TEAM_EMAIL: "team@skylar.app" };
    m.listHrAdvisorEmails.mockResolvedValue(["ana@skylar.app", "ben@skylar.app"]);
    m.send.mockResolvedValue({ data: { id: "msg1" } });
  });

  it("goes to every HR advisor plus the team address, once each, with a link to the desk", async () => {
    m.listHrAdvisorEmails.mockResolvedValue(["ana@skylar.app", "team@skylar.app"]);
    expect(await sendAdvisorEscalationNotification(input)).toEqual({ status: "sent", messageId: "msg1" });
    const sent = m.send.mock.calls[0][0];
    expect(sent.to).toEqual(["ana@skylar.app", "team@skylar.app"]);
    expect(sent.text).toContain("https://app.skylar.app/advisor/desk");
    expect(sent.subject).toContain("Advisor escalation ADV-1");
  });

  it("works with advisors only, and flags a reopened chat", async () => {
    m.env.SKYLAR_TEAM_EMAIL = undefined;
    await sendAdvisorEscalationNotification({ ...input, reopened: true });
    const sent = m.send.mock.calls[0][0];
    expect(sent.to).toEqual(["ana@skylar.app", "ben@skylar.app"]);
    expect(sent.subject).toContain("Reopened advisor chat");
  });

  it("is skipped when nobody can be notified, and still sends if the advisor lookup fails", async () => {
    m.env.SKYLAR_TEAM_EMAIL = undefined;
    m.listHrAdvisorEmails.mockResolvedValue([]);
    expect((await sendAdvisorEscalationNotification(input)).status).toBe("skipped");
    m.env.SKYLAR_TEAM_EMAIL = "team@skylar.app";
    m.listHrAdvisorEmails.mockRejectedValue(new Error("firestore down"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect((await sendAdvisorEscalationNotification(input)).status).toBe("sent");
    expect(m.send.mock.calls.at(-1)![0].to).toEqual(["team@skylar.app"]);
  });

  it("reports a failure Resend returns rather than throws", async () => {
    m.send.mockResolvedValue({ data: null, error: { message: "Domain not verified" } });
    expect(await sendAdvisorEscalationNotification(input)).toEqual({ status: "failed", reason: "Domain not verified" });
  });

  it("reports a failed send instead of throwing", async () => {
    m.send.mockRejectedValue(new Error("resend down"));
    expect(await sendAdvisorEscalationNotification(input)).toEqual({ status: "failed", reason: "resend down" });
  });
});
