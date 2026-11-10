import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  buildEmployeeFileContext: vi.fn(),
  streamSkylarConversation: vi.fn(),
  listSkylarConversationMessages: vi.fn(),
  appendSkylarConversationTurn: vi.fn(),
  escalateFromChat: vi.fn(),
  findLiveCaseForEmployee: vi.fn(),
  sendUserLiveMessage: vi.fn(),
  liveEnabled: { value: true },
  demoGate: { value: true },
  reserve: vi.fn(),
  release: vi.fn(),
  afterHours: { value: false },
}));

vi.mock("@/lib/env/server", () => ({
  getServerEnv: () => ({ DEMO_DISABLE_PAYMENT_GATE: mocks.demoGate.value, LIVE_ADVISOR_ENABLED: mocks.liveEnabled.value, AI_RATE_LIMIT_MAX_REQUESTS: 1000, AI_RATE_LIMIT_WINDOW_MS: 60_000 }),
}));
vi.mock("@/server/auth/require-session", () => ({ requireSession: mocks.requireSession }));
vi.mock("@/server/ai/employee-context", () => ({ buildEmployeeFileContext: mocks.buildEmployeeFileContext }));
vi.mock("@/server/ai/skylar-conversation", () => ({ streamSkylarConversation: mocks.streamSkylarConversation }));
vi.mock("@/server/repositories/advisor-live.repository", () => ({ findLiveCaseForEmployee: mocks.findLiveCaseForEmployee, sendUserLiveMessage: mocks.sendUserLiveMessage, afterHoursNow: () => mocks.afterHours.value }));
vi.mock("@/server/ai/chat-escalation", () => ({ escalateFromChat: mocks.escalateFromChat }));
vi.mock("@/server/repositories/billing.repository", () => ({ reserveAdvisorMessage: (...a: unknown[]) => mocks.reserve(...a), releaseAdvisorMessage: (...a: unknown[]) => mocks.release(...a) }));
vi.mock("@/server/repositories/skylar-conversation.repository", () => ({
  listSkylarConversationMessages: mocks.listSkylarConversationMessages,
  appendSkylarConversationTurn: mocks.appendSkylarConversationTurn,
  listSkylarConversationPage: vi.fn(),
}));

import { POST } from "@/app/api/briefing/conversation/route";

const admin = { uid: "manager-a", companyId: "tenant-a", role: "admin", email: "m@a.com", displayName: "Manager" };

function post(body: Record<string, unknown>) {
  return POST(new NextRequest("http://localhost:3000/api/briefing/conversation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
}

async function* reply() {
  yield "ok";
}

describe("manager chat context", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.liveEnabled.value = true;
    mocks.demoGate.value = true;
    mocks.afterHours.value = false;
    mocks.reserve.mockResolvedValue({ reserved: true, counter: "free" });
    mocks.release.mockResolvedValue(undefined);
    mocks.requireSession.mockResolvedValue(admin);
    mocks.listSkylarConversationMessages.mockResolvedValue([]);
    mocks.escalateFromChat.mockResolvedValue({ kind: "none" });
    mocks.findLiveCaseForEmployee.mockResolvedValue(null);
    mocks.appendSkylarConversationTurn.mockResolvedValue(undefined);
    mocks.streamSkylarConversation.mockResolvedValue(reply());
  });

  it("loads the selected person's file from the manager's own workspace only", async () => {
    mocks.buildEmployeeFileContext.mockResolvedValue({ name: "topg", file: "Name: topg" });

    await (await post({ prompt: "Review the latest note", employeeId: "e1", employeeName: "spoofed name" })).text();

    expect(mocks.buildEmployeeFileContext).toHaveBeenCalledWith("tenant-a", "e1");
    expect(mocks.streamSkylarConversation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ employeeName: "topg", employeeFile: "Name: topg" }),
    );
  });

  it("refuses another workspace's employee before asking Skylar", async () => {
    mocks.buildEmployeeFileContext.mockResolvedValue(null);

    const response = await post({ prompt: "Review the latest note", employeeId: "other-tenant-employee" });

    expect(response.status).toBe(404);
    expect(mocks.streamSkylarConversation).not.toHaveBeenCalled();
    expect(mocks.appendSkylarConversationTurn).not.toHaveBeenCalled();
  });

  it("never gives an employee's own chat the manager notes", async () => {
    mocks.requireSession.mockResolvedValue({ ...admin, role: "employee" });

    await (await post({ prompt: "I want to talk about my review", employeeId: "e1" })).text();

    expect(mocks.buildEmployeeFileContext).not.toHaveBeenCalled();
    const input = mocks.streamSkylarConversation.mock.calls[0][1];
    expect(input).not.toHaveProperty("employeeFile");
    expect(input).not.toHaveProperty("employeeId");
  });

  it("works without a selected person", async () => {
    await (await post({ prompt: "How do I run a good one-to-one?" })).text();

    expect(mocks.buildEmployeeFileContext).not.toHaveBeenCalled();
    expect(mocks.streamSkylarConversation).toHaveBeenCalled();
  });

  it("moves a newly escalated chat to a person: fixed transfer message, no AI answer", async () => {
    mocks.buildEmployeeFileContext.mockResolvedValue({ name: "topg", file: "Name: topg" });
    mocks.escalateFromChat.mockResolvedValue({ kind: "escalated", reason: "Harassment", caseId: "ADV-1", escalationId: "esc1" });

    const text = await (await post({ prompt: "He keeps harassing a coworker", employeeId: "e1" })).text();

    expect(mocks.streamSkylarConversation).not.toHaveBeenCalled();
    expect(text).toContain("We believe that this issue requires an escalation to one of our Live (Human) HR Advisors");
    expect(text).toContain("It may take up to an hour");
    expect(text).toContain("hold off acting, write down all the facts and dates, keep it confidential");
    expect(text).toContain('"liveCaseId":"esc1"');
    expect(text).toContain('"escalationId":"esc1"');
    expect(mocks.appendSkylarConversationTurn).toHaveBeenCalled();
  });

  it("forwards messages to the HR advisor while a person owns the chat, and the AI stays out", async () => {
    mocks.findLiveCaseForEmployee.mockResolvedValue({ id: "esc1", isOpen: true });

    const text = await (await post({ prompt: "Any update on this?", employeeId: "e1" })).text();

    expect(mocks.sendUserLiveMessage).toHaveBeenCalledWith(admin, "esc1", "Any update on this?");
    expect(mocks.streamSkylarConversation).not.toHaveBeenCalled();
    expect(mocks.escalateFromChat).not.toHaveBeenCalled();
    expect(text).toContain("sent to your HR advisor");
  });

  it("goes back to the assistant once the advisor case is closed", async () => {
    mocks.buildEmployeeFileContext.mockResolvedValue({ name: "topg", file: "Name: topg" });
    mocks.findLiveCaseForEmployee.mockResolvedValue({ id: "esc1", isOpen: false });

    await (await post({ prompt: "What should I document?", employeeId: "e1" })).text();

    expect(mocks.sendUserLiveMessage).not.toHaveBeenCalled();
    expect(mocks.streamSkylarConversation).toHaveBeenCalled();
  });

  it("with the kill switch off, the assistant answers and nothing is forwarded", async () => {
    mocks.liveEnabled.value = false;
    mocks.buildEmployeeFileContext.mockResolvedValue({ name: "topg", file: "Name: topg" });
    mocks.findLiveCaseForEmployee.mockResolvedValue({ id: "esc1", isOpen: true });
    mocks.escalateFromChat.mockResolvedValue({ kind: "escalated", reason: "Harassment", caseId: "ADV-1", escalationId: "esc1" });

    const text = await (await post({ prompt: "He keeps harassing a coworker", employeeId: "e1" })).text();

    expect(mocks.sendUserLiveMessage).not.toHaveBeenCalled();
    expect(mocks.streamSkylarConversation).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ escalationNotice: expect.stringContaining("ADV-1") }));
    expect(text).not.toContain("liveCaseId");
  });

  it("promises the longer wait in the transfer message outside working hours", async () => {
    mocks.afterHours.value = true;
    mocks.buildEmployeeFileContext.mockResolvedValue({ name: "topg", file: "Name: topg" });
    mocks.escalateFromChat.mockResolvedValue({ kind: "escalated", reason: "Harassment", caseId: "ADV-1", escalationId: "esc1" });

    const text = await (await post({ prompt: "He keeps harassing a coworker", employeeId: "e1" })).text();

    expect(text).toContain("may take up to 6 hours to respond");
    expect(text).toContain("You can close the app and we will notify you when your advisor has reviewed");
    expect(text).not.toContain("up to an hour");
  });

  it("counts the message that triggers a transfer, and every message forwarded to a human, against the free limit", async () => {
    mocks.demoGate.value = false;
    mocks.buildEmployeeFileContext.mockResolvedValue({ name: "topg", file: "Name: topg" });
    mocks.escalateFromChat.mockResolvedValue({ kind: "escalated", reason: "Harassment", caseId: "ADV-1", escalationId: "esc1" });
    await (await post({ prompt: "He keeps harassing a coworker", employeeId: "e1" })).text();
    expect(mocks.reserve).toHaveBeenCalledTimes(1);
    expect(mocks.release).not.toHaveBeenCalled();

    mocks.reserve.mockClear();
    mocks.findLiveCaseForEmployee.mockResolvedValue({ id: "esc1", isOpen: true });
    await (await post({ prompt: "Any update?", employeeId: "e1" })).text();
    expect(mocks.reserve).toHaveBeenCalledTimes(1);
    expect(mocks.sendUserLiveMessage).toHaveBeenCalled();
    expect(mocks.release).not.toHaveBeenCalled();
  });

  it("refuses a message to a human when the free messages are used up, and nothing is forwarded", async () => {
    const { PaymentRequiredError } = await import("@/lib/errors");
    mocks.demoGate.value = false;
    mocks.reserve.mockRejectedValue(new PaymentRequiredError("Upgrade to keep chatting."));
    mocks.findLiveCaseForEmployee.mockResolvedValue({ id: "esc1", isOpen: true });

    const response = await post({ prompt: "Any update?", employeeId: "e1" });

    expect(response.status).toBe(402);
    expect(mocks.sendUserLiveMessage).not.toHaveBeenCalled();
  });

  it("gives the free message back if forwarding to the advisor fails", async () => {
    mocks.demoGate.value = false;
    mocks.findLiveCaseForEmployee.mockResolvedValue({ id: "esc1", isOpen: true });
    mocks.sendUserLiveMessage.mockRejectedValue(new Error("write failed"));

    await post({ prompt: "Any update?", employeeId: "e1" });

    expect(mocks.release).toHaveBeenCalledTimes(1);
  });
});
