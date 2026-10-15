import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireSession: vi.fn(), applyUserAction: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("@/server/auth/require-session", () => ({ requireSession: () => mocks.requireSession(), requirePageSession: () => mocks.requireSession() }));
vi.mock("@/server/platform/user-lifecycle", () => ({ applyUserAction: (...args: unknown[]) => mocks.applyUserAction(...args) }));

import { POST } from "@/app/api/platform/users/[userId]/route";

const staff = { uid: "staff-1", email: "ops@skylar.app", companyId: "skylar", role: "admin", isPlatformAdmin: true };
const params = { params: { userId: "ben" } };

function post(body: unknown, origin = "http://localhost") {
  return new Request("http://localhost/api/platform/users/ben", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin, host: "localhost" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/platform/users/[userId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSession.mockResolvedValue(staff);
    mocks.applyUserAction.mockResolvedValue(undefined);
  });

  it("suspends with a reason", async () => {
    const response = await POST(post({ action: "suspend", reason: "Shared login" }), params);

    expect(response.status).toBe(200);
    expect(mocks.applyUserAction).toHaveBeenCalledWith({ userId: "ben", action: "suspend", reason: "Shared login", confirmEmail: undefined, actor: staff });
  });

  it("deletes only with a reason and the typed email", async () => {
    const response = await POST(post({ action: "delete", reason: "Left the company", confirmEmail: "ben@acme.com" }), params);

    expect(response.status).toBe(200);
    expect(mocks.applyUserAction).toHaveBeenCalledWith(expect.objectContaining({ action: "delete", confirmEmail: "ben@acme.com", reason: "Left the company" }));
  });

  it.each([
    ["suspend without a reason", { action: "suspend" }],
    ["suspend with a one-letter reason", { action: "suspend", reason: "x" }],
    ["delete without the email", { action: "delete", reason: "Left the company" }],
    ["delete without a reason", { action: "delete", confirmEmail: "ben@acme.com" }],
    ["an unknown action", { action: "ban-forever" }],
  ])("rejects %s", async (_label, body) => {
    expect((await POST(post(body), params)).status).toBe(400);
    expect(mocks.applyUserAction).not.toHaveBeenCalled();
  });

  it("restores access and accounts without needing a reason", async () => {
    expect((await POST(post({ action: "unsuspend" }), params)).status).toBe(200);
    expect((await POST(post({ action: "restore" }), params)).status).toBe(200);
    expect(mocks.applyUserAction).toHaveBeenNthCalledWith(1, expect.objectContaining({ action: "unsuspend", reason: null }));
    expect(mocks.applyUserAction).toHaveBeenNthCalledWith(2, expect.objectContaining({ action: "restore", reason: null }));
  });

  it("is closed to workspace admins and cross-origin requests", async () => {
    mocks.requireSession.mockResolvedValue({ ...staff, isPlatformAdmin: false });
    expect((await POST(post({ action: "suspend", reason: "nope nope" }), params)).status).toBe(403);

    mocks.requireSession.mockResolvedValue(staff);
    expect((await POST(post({ action: "suspend", reason: "nope nope" }, "https://evil.example"), params)).status).toBe(403);
    expect(mocks.applyUserAction).not.toHaveBeenCalled();
  });

  it("passes guard failures back as errors, not successes", async () => {
    const { ConflictError } = await import("@/lib/errors");
    mocks.applyUserAction.mockRejectedValue(new ConflictError("You can't change your own account."));

    const response = await POST(post({ action: "suspend", reason: "myself" }), params);

    expect(response.status).toBe(409);
    expect((await response.json()).error.message).toMatch(/own account/);
  });
});
