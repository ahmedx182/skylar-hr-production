import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ requireSession: vi.fn(), saveAdvisorSettings: vi.fn(), getAdvisorSettings: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("@/server/auth/require-session", () => ({ requireSession: () => m.requireSession(), requirePageSession: () => m.requireSession() }));
vi.mock("@/server/repositories/platform-settings.repository", () => ({
  getAdvisorSettings: (...a: unknown[]) => m.getAdvisorSettings(...a),
  saveAdvisorSettings: (...a: unknown[]) => m.saveAdvisorSettings(...a),
}));

import { GET, POST } from "@/app/api/platform/advisor-settings/route";

const boss = { uid: "boss", email: "boss@skylar.app", companyId: "skylar", role: "admin", isPlatformAdmin: true };
const advisor = { uid: "hr", email: "hr@skylar.app", companyId: "skylar-hr", role: "admin", isHrAdvisor: true };
const manager = { uid: "m", email: "m@acme.com", companyId: "acme", role: "admin" };
const settings = { hours: { timeZone: "Europe/London", startHour: 8, endHour: 18, workDays: [1, 2, 3] }, freeTrialDays: 30 };

const body = { timeZone: "Europe/London", startHour: 8, endHour: 18, workDays: [1, 2, 3], freeTrialDays: 30 };
const post = (data: unknown, origin = "http://localhost") =>
  new Request("http://localhost/api/platform/advisor-settings", { method: "POST", headers: { "Content-Type": "application/json", origin, host: "localhost" }, body: JSON.stringify(data) });

describe("advisor settings API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.requireSession.mockResolvedValue(boss);
    m.getAdvisorSettings.mockResolvedValue(settings);
    m.saveAdvisorSettings.mockResolvedValue(settings);
  });

  it("lets a super admin read and save the settings", async () => {
    const read = await GET();
    expect(read.status).toBe(200);
    expect(await read.json()).toMatchObject({ settings, withinHoursNow: expect.any(Boolean) });

    const saved = await POST(post(body));
    expect(saved.status).toBe(200);
    expect(m.saveAdvisorSettings).toHaveBeenCalledWith({ hours: { timeZone: "Europe/London", startHour: 8, endHour: 18, workDays: [1, 2, 3] }, freeTrialDays: 30 }, boss);
  });

  it("is for super admins only: HR advisors, managers, signed-out and cross-origin are refused", async () => {
    for (const who of [advisor, manager]) {
      m.requireSession.mockResolvedValue(who);
      expect((await GET()).status).toBe(403);
      expect((await POST(post(body))).status).toBe(403);
    }
    m.requireSession.mockResolvedValue(boss);
    expect((await POST(post(body, "https://evil.example"))).status).toBe(403);
    expect(m.saveAdvisorSettings).not.toHaveBeenCalled();
  });

  it("rejects malformed bodies before saving anything", async () => {
    for (const bad of [{}, { ...body, startHour: "8" }, { ...body, workDays: "all" }, { ...body, freeTrialDays: 1.5 }, { ...body, timeZone: "" }, { ...body, workDays: [1, 2, 3, 4, 5, 6, 0, 1] }]) {
      expect((await POST(post(bad))).status).toBe(400);
    }
    expect(m.saveAdvisorSettings).not.toHaveBeenCalled();
  });

  it("returns the repository's reason when the values themselves are wrong", async () => {
    const { ValidationError } = await import("@/lib/errors");
    m.saveAdvisorSettings.mockRejectedValue(new ValidationError("Working hours must end after they start."));
    const response = await POST(post({ ...body, startHour: 18, endHour: 8 }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toContain("end after they start");
  });
});
