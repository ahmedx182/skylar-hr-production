import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  buildEmployeeFileContext: vi.fn(),
  streamSkylarConversation: vi.fn(),
  listSkylarConversationMessages: vi.fn(),
  appendSkylarConversationTurn: vi.fn(),
  escalateFromChat: vi.fn(),
}));

vi.mock("@/lib/env/server", () => ({
  getServerEnv: () => ({ DEMO_DISABLE_PAYMENT_GATE: true, AI_RATE_LIMIT_MAX_REQUESTS: 1000, AI_RATE_LIMIT_WINDOW_MS: 60_000 }),
}));
vi.mock("@/server/auth/require-session", () => ({ requireSession: mocks.requireSession }));
vi.mock("@/server/ai/employee-context", () => ({ buildEmployeeFileContext: mocks.buildEmployeeFileContext }));
vi.mock("@/server/ai/skylar-conversation", () => ({ streamSkylarConversation: mocks.streamSkylarConversation }));
vi.mock("@/server/ai/chat-escalation", () => ({ escalateFromChat: mocks.escalateFromChat }));
vi.mock("@/server/repositories/billing.repository", () => ({ reserveAdvisorMessage: vi.fn(), releaseAdvisorMessage: vi.fn() }));
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
    mocks.requireSession.mockResolvedValue(admin);
    mocks.listSkylarConversationMessages.mockResolvedValue([]);
    mocks.escalateFromChat.mockResolvedValue({ kind: "none" });
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
});
