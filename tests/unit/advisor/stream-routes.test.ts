import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireSession: vi.fn(),
  getUserLiveCase: vi.fn(),
  getLiveCaseForAdvisor: vi.fn(),
  watchCase: vi.fn(),
  watchLiveCases: vi.fn(),
  watchUserNotices: vi.fn(),
  unsubscribe: vi.fn(),
  live: { value: true },
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("@/server/auth/require-session", () => ({ requireSession: () => m.requireSession(), requirePageSession: () => m.requireSession() }));
vi.mock("@/server/repositories/advisor-live.repository", () => ({
  applyLivePause: (chat: { canSend: boolean; canReopen: boolean }) => (m.live.value ? chat : { ...chat, canSend: false, canReopen: false }),
  getUserLiveCase: (...a: unknown[]) => m.getUserLiveCase(...a),
  getLiveCaseForAdvisor: (...a: unknown[]) => m.getLiveCaseForAdvisor(...a),
  watchCase: (...a: unknown[]) => m.watchCase(...a),
  watchLiveCases: (...a: unknown[]) => m.watchLiveCases(...a),
  watchUserNotices: (...a: unknown[]) => m.watchUserNotices(...a),
}));

import { GET as managerThread } from "@/app/api/briefing/advisor-chat/[escalationId]/stream/route";
import { GET as managerNotices } from "@/app/api/briefing/advisor-notices/route";
import { GET as deskList } from "@/app/api/advisor/stream/route";
import { GET as deskCase } from "@/app/api/advisor/stream/[escalationId]/route";

const advisor = { uid: "adv", email: "a@skylar.app", companyId: "skylar-hr", role: "admin", isHrAdvisor: true };
const manager = { uid: "mgr", email: "m@acme.com", companyId: "acme", role: "admin" };
const employee = { ...manager, role: "employee" };
const ctx = { params: { escalationId: "esc1" } };
const chat = (over = {}) => ({ id: "esc1", phase: "waiting", advisorName: null, canSend: true, canReopen: false, readOnly: false, reopenCount: 0, messages: [{ id: "m1", text: "hi" }], ...over });

/** Reads events until `count` named events have arrived, then ends the stream. */
async function events(response: Response, count: number): Promise<{ event: string; data: unknown }[]> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let text = "";
  const out: { event: string; data: unknown }[] = [];
  while (out.length < count) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value);
    for (const block of text.split("\n\n").slice(0, -1)) {
      const name = /^event: (.+)$/m.exec(block)?.[1];
      const data = /^data: (.+)$/m.exec(block)?.[1];
      if (name && data && !out.some((o) => o.event === name && JSON.stringify(o.data) === data)) out.push({ event: name, data: JSON.parse(data) });
    }
  }
  await reader.cancel();
  return out;
}
const get = (path = "/stream", signal?: AbortSignal) => new Request(`http://localhost${path}`, { signal });

describe("live streams: who may open them", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.live.value = true;
    m.requireSession.mockResolvedValue(manager);
    m.getUserLiveCase.mockResolvedValue(chat());
    m.getLiveCaseForAdvisor.mockResolvedValue({ case: { status: "with_advisor", phase: "waiting", claimedByUid: null, reopenCount: 0 }, messages: [], earlierChat: [] });
    m.watchCase.mockReturnValue(m.unsubscribe);
    m.watchLiveCases.mockReturnValue(m.unsubscribe);
    m.watchUserNotices.mockReturnValue(m.unsubscribe);
  });

  it("refuses a signed-out visitor, an employee, and a customer on the advisor streams, with normal error responses", async () => {
    m.requireSession.mockRejectedValue(Object.assign(new Error("x"), { name: "AuthenticationError" }));
    // requireSession rejecting maps through errorResponse; a non-stream JSON error is what matters here.
    const signedOut = await managerThread(get(), ctx);
    expect(signedOut.headers.get("content-type")).not.toContain("event-stream");

    m.requireSession.mockResolvedValue(employee);
    expect((await managerThread(get(), ctx)).status).toBe(403);
    expect((await managerNotices(get())).status).toBe(403);

    m.requireSession.mockResolvedValue(manager);
    expect((await deskList(get())).status).toBe(403);
    expect((await deskCase(get(), ctx)).status).toBe(403);
    expect(m.watchCase).not.toHaveBeenCalled();
    expect(m.watchLiveCases).not.toHaveBeenCalled();
  });

  it("returns a plain 404, not a stream, when the case isn't theirs", async () => {
    const { NotFoundError } = await import("@/lib/errors");
    m.getUserLiveCase.mockRejectedValue(new NotFoundError("Advisor case not found."));
    const response = await managerThread(get(), ctx);
    expect(response.status).toBe(404);
    expect(m.watchCase).not.toHaveBeenCalled();
  });

  it("lets HR advisors and super admins open the desk streams", async () => {
    m.requireSession.mockResolvedValue(advisor);
    expect((await deskList(get())).headers.get("content-type")).toContain("event-stream");
    expect((await deskCase(get(), ctx)).headers.get("content-type")).toContain("event-stream");
    m.requireSession.mockResolvedValue({ ...manager, isPlatformAdmin: true });
    expect((await deskList(get())).headers.get("content-type")).toContain("event-stream");
  });
});

describe("live streams: what they send", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.live.value = true;
    m.requireSession.mockResolvedValue(manager);
    m.getUserLiveCase.mockResolvedValue(chat());
    m.watchCase.mockReturnValue(m.unsubscribe);
    m.watchUserNotices.mockReturnValue(m.unsubscribe);
    m.watchLiveCases.mockReturnValue(m.unsubscribe);
  });

  it("sends the thread straight away, then again only when it changes", async () => {
    let fire: () => void = () => undefined;
    m.watchCase.mockImplementation((_id: string, onChange: () => void) => { fire = onChange; return m.unsubscribe; });
    const response = await managerThread(get(), ctx);
    const pending = events(response, 2);

    await vi.waitFor(() => expect(m.watchCase).toHaveBeenCalled());
    fire(); // nothing changed: no second event
    await new Promise((r) => setTimeout(r, 20));
    m.getUserLiveCase.mockResolvedValue(chat({ phase: "connected", advisorName: "Ana", messages: [{ id: "m1" }, { id: "m2" }] }));
    fire();

    const got = await pending;
    expect(got.map((e) => e.event)).toEqual(["chat", "chat"]);
    expect((got[0].data as { phase: string }).phase).toBe("waiting");
    expect((got[1].data as { phase: string; advisorName: string }).advisorName).toBe("Ana");
    await vi.waitFor(() => expect(m.unsubscribe).toHaveBeenCalledTimes(1));
  });

  it("carries the paused flag when live chat is switched off", async () => {
    m.live.value = false;
    const got = await events(await managerThread(get(), ctx), 1);
    expect(got[0].data).toMatchObject({ canSend: false, canReopen: false });
  });

  it("tells the client when the case is gone and stops listening", async () => {
    let fire: () => void = () => undefined;
    m.watchCase.mockImplementation((_id: string, onChange: () => void) => { fire = onChange; return m.unsubscribe; });
    const pending = events(await managerThread(get(), ctx), 2);
    await vi.waitFor(() => expect(m.watchCase).toHaveBeenCalled());
    m.getUserLiveCase.mockRejectedValue(new Error("gone"));
    fire();
    expect((await pending).map((e) => e.event)).toEqual(["chat", "gone"]);
    await vi.waitFor(() => expect(m.unsubscribe).toHaveBeenCalled());
  });

  it("streams notifications without message text, de-duplicating identical snapshots", async () => {
    let push: (n: unknown[]) => void = () => undefined;
    m.watchUserNotices.mockImplementation((_s: unknown, onChange: (n: unknown[]) => void) => { push = onChange; return m.unsubscribe; });
    const pending = events(await managerNotices(get()), 2);
    await vi.waitFor(() => expect(m.watchUserNotices).toHaveBeenCalled());
    const a = [{ escalationId: "e1", caseId: "ADV-1", employeeName: "Priya", activityAtMs: 1, activityKind: "reply" }];
    push(a);
    push(a); // identical: dropped
    push([{ ...a[0], activityAtMs: 2 }]);
    const got = await pending;
    expect(got.map((e) => e.event)).toEqual(["notices", "notices"]);
    expect(JSON.stringify(got)).not.toMatch(/"text"|"messages"/);
  });

  it("streams the desk queue", async () => {
    let push: (c: unknown[]) => void = () => undefined;
    m.requireSession.mockResolvedValue(advisor);
    m.watchLiveCases.mockImplementation((onChange: (c: unknown[]) => void) => { push = onChange; return m.unsubscribe; });
    const pending = events(await deskList(get()), 1);
    await vi.waitFor(() => expect(m.watchLiveCases).toHaveBeenCalled());
    push([{ id: "c1", status: "with_advisor", phase: "waiting", claimedByUid: null, reopenCount: 0, lastMessageAtMs: 1, lastMessageSender: "user" }]);
    expect((await pending)[0].event).toBe("cases");
  });

  it("a failing listener is reported and closes the stream", async () => {
    let fail: (e: Error) => void = () => undefined;
    m.watchCase.mockImplementation((_id: string, _c: () => void, onError: (e: Error) => void) => { fail = onError; return m.unsubscribe; });
    const pending = events(await managerThread(get(), ctx), 2);
    await vi.waitFor(() => expect(m.watchCase).toHaveBeenCalled());
    fail(new Error("permission denied"));
    expect((await pending).map((e) => e.event)).toEqual(["chat", "fatal"]);
  });
});
