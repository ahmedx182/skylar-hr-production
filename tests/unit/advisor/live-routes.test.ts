import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  applyAdvisorLiveAction: vi.fn(),
  getLiveCaseForAdvisor: vi.fn(),
  listLiveCases: vi.fn(),
  getUserLiveCase: vi.fn(),
  sendUserLiveMessage: vi.fn(),
  reopenUserLiveCase: vi.fn(),
  reserve: vi.fn(),
  release: vi.fn(),
  allowReopen: { value: false },
  demoGate: { value: false },
  liveEnabled: { value: true },
}));

vi.mock("@/lib/env/server", () => ({ getServerEnv: () => ({ LIVE_ADVISOR_ENABLED: mocks.liveEnabled.value, ADVISOR_ALLOW_REOPEN: mocks.allowReopen.value, DEMO_DISABLE_PAYMENT_GATE: mocks.demoGate.value }) }));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("@/server/auth/require-session", () => ({
  requireSession: () => mocks.requireSession(),
  requirePageSession: () => mocks.requireSession(),
}));
vi.mock("@/server/repositories/billing.repository", () => ({ reserveAdvisorMessage: (...a: unknown[]) => mocks.reserve(...a), releaseAdvisorMessage: (...a: unknown[]) => mocks.release(...a) }));
vi.mock("@/server/repositories/advisor-live.repository", () => ({
  applyLivePause: (chat: { canSend: boolean; canReopen: boolean }) => (mocks.liveEnabled.value ? chat : { ...chat, canSend: false, canReopen: false }),
  applyAdvisorLiveAction: (...a: unknown[]) => mocks.applyAdvisorLiveAction(...a),
  getLiveCaseForAdvisor: (...a: unknown[]) => mocks.getLiveCaseForAdvisor(...a),
  listLiveCases: (...a: unknown[]) => mocks.listLiveCases(...a),
  getUserLiveCase: (...a: unknown[]) => mocks.getUserLiveCase(...a),
  sendUserLiveMessage: (...a: unknown[]) => mocks.sendUserLiveMessage(...a),
  reopenUserLiveCase: (...a: unknown[]) => mocks.reopenUserLiveCase(...a),
}));

import { GET as listQueue } from "@/app/api/advisor/live/route";
import { POST as advisorAction } from "@/app/api/advisor/live/[escalationId]/route";
import { GET as userGet, POST as userPost } from "@/app/api/briefing/advisor-chat/[escalationId]/route";

const advisor = { uid: "adv1", email: "adv@skylar.app", companyId: "skylar", role: "admin", isPlatformAdmin: true };
const hrAdvisor = { uid: "hr1", email: "hr@skylar.app", companyId: "skylar-hr", role: "admin", isHrAdvisor: true };
const manager = { uid: "mgr1", email: "m@acme.com", companyId: "acme", role: "admin", isPlatformAdmin: false };
const employee = { ...manager, role: "employee" };
const ctx = { params: { escalationId: "esc1" } };

function post(body: unknown, origin = "http://localhost") {
  return new Request("http://localhost/api/x", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin, host: "localhost" },
    body: JSON.stringify(body),
  });
}

describe("advisor console routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSession.mockResolvedValue(advisor);
    mocks.listLiveCases.mockResolvedValue([]);
    mocks.getLiveCaseForAdvisor.mockResolvedValue({ case: {}, messages: [] });
  });

  it("lists the queue for Skylar staff only", async () => {
    expect((await listQueue()).status).toBe(200);
    mocks.requireSession.mockResolvedValue(manager);
    expect((await listQueue()).status).toBe(403);
  });

  it("lets an HR advisor (not a super admin) work the queue", async () => {
    mocks.requireSession.mockResolvedValue(hrAdvisor);
    expect((await listQueue()).status).toBe(200);
    expect((await advisorAction(post({ action: "claim" }), ctx)).status).toBe(200);
    expect(mocks.applyAdvisorLiveAction).toHaveBeenCalledWith(hrAdvisor, "esc1", "claim", undefined);
  });

  it("runs an advisor action as the signed-in advisor", async () => {
    const response = await advisorAction(post({ action: "reply", text: "Hello" }), ctx);
    expect(response.status).toBe(200);
    expect(mocks.applyAdvisorLiveAction).toHaveBeenCalledWith(advisor, "esc1", "reply", "Hello");
  });

  it("rejects unknown actions, customers and cross-origin calls", async () => {
    expect((await advisorAction(post({ action: "delete" }), ctx)).status).toBe(400);
    expect((await advisorAction(post({ action: "claim" }, "https://evil.example"), ctx)).status).toBe(403);
    mocks.requireSession.mockResolvedValue(manager);
    expect((await advisorAction(post({ action: "claim" }), ctx)).status).toBe(403);
    expect(mocks.applyAdvisorLiveAction).not.toHaveBeenCalled();
  });
});

describe("user live chat routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSession.mockResolvedValue(manager);
    mocks.liveEnabled.value = true;
    mocks.getUserLiveCase.mockResolvedValue({ id: "esc1" });
    mocks.sendUserLiveMessage.mockReset().mockResolvedValue(undefined);
    mocks.allowReopen.value = false;
    mocks.demoGate.value = false;
    mocks.reserve.mockResolvedValue({ reserved: true, counter: "free" });
    mocks.release.mockResolvedValue(undefined);
  });

  it("lets a manager read and send, and counts the message against the free allowance", async () => {
    expect((await userGet(new Request("http://localhost/api/x"), ctx)).status).toBe(200);
    expect((await userPost(post({ action: "send", text: "Thanks" }), ctx)).status).toBe(200);
    expect(mocks.reserve).toHaveBeenCalledWith(manager);
    expect(mocks.sendUserLiveMessage).toHaveBeenCalledWith(manager, "esc1", "Thanks");
    expect(mocks.release).not.toHaveBeenCalled();
  });

  it("stops a message once the free allowance is used up, and never delivers it", async () => {
    const { PaymentRequiredError } = await import("@/lib/errors");
    mocks.reserve.mockRejectedValue(new PaymentRequiredError("You've used all 5 free advisor messages."));
    expect((await userPost(post({ action: "send", text: "Anyone there?" }), ctx)).status).toBe(402);
    expect(mocks.sendUserLiveMessage).not.toHaveBeenCalled();
  });

  it("gives the message back if it couldn't be delivered", async () => {
    mocks.sendUserLiveMessage.mockRejectedValue(new Error("write failed"));
    expect((await userPost(post({ action: "send", text: "Hello" }), ctx)).status).toBeGreaterThanOrEqual(500);
    expect(mocks.release).toHaveBeenCalledWith(manager, "free");
  });

  it("doesn't count messages when the payment gate is switched off for a demo", async () => {
    mocks.demoGate.value = true;
    expect((await userPost(post({ action: "send", text: "Hello" }), ctx)).status).toBe(200);
    expect(mocks.reserve).not.toHaveBeenCalled();
  });

  it("does not let a manager reopen a closed chat: they start a new one", async () => {
    const response = await userPost(post({ action: "reopen" }), ctx);
    expect(response.status).toBe(409);
    expect((await response.json()).error.message).toContain("Start a new chat");
    expect(mocks.reopenUserLiveCase).not.toHaveBeenCalled();
  });

  it("can allow reopening when it is switched on", async () => {
    mocks.allowReopen.value = true;
    expect((await userPost(post({ action: "reopen" }), ctx)).status).toBe(200);
    expect(mocks.reopenUserLiveCase).toHaveBeenCalledWith(manager, "esc1");
  });

  it("pauses writing and reopening when live chat is switched off", async () => {
    mocks.liveEnabled.value = false;
    mocks.getUserLiveCase.mockResolvedValue({ id: "esc1", canSend: true, canReopen: true });
    expect((await userPost(post({ action: "send", text: "Hello" }), ctx)).status).toBe(409);
    expect((await userPost(post({ action: "reopen" }), ctx)).status).toBe(409);
    expect(mocks.sendUserLiveMessage).not.toHaveBeenCalled();
    const body = await (await userGet(new Request("http://localhost/api/x"), ctx)).json();
    expect(body.chat).toMatchObject({ canSend: false, canReopen: false });
  });

  it("rejects an over-long message rather than cutting it off", async () => {
    expect((await userPost(post({ action: "send", text: "x".repeat(2001) }), ctx)).status).toBe(400);
    mocks.requireSession.mockResolvedValue(advisor);
    expect((await advisorAction(post({ action: "reply", text: "x".repeat(2001) }), ctx)).status).toBe(400);
  });

  it("refuses employees, bad actions and cross-origin calls", async () => {
    expect((await userPost(post({ action: "bogus" }), ctx)).status).toBe(400);
    expect((await userPost(post({ action: "reopen" }, "https://evil.example"), ctx)).status).toBe(403);
    mocks.requireSession.mockResolvedValue(employee);
    expect((await userPost(post({ action: "reopen" }), ctx)).status).toBe(403);
    expect(mocks.reopenUserLiveCase).not.toHaveBeenCalled();
  });
});
