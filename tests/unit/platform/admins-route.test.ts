import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireSession: vi.fn(), applyPlatformAdminAction: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("@/server/auth/require-session", () => ({ requireSession: () => mocks.requireSession(), requirePageSession: () => mocks.requireSession() }));
vi.mock("@/server/platform/platform-admins", () => ({ applyPlatformAdminAction: (...args: unknown[]) => mocks.applyPlatformAdminAction(...args) }));

import { POST } from "@/app/api/platform/admins/route";

const staff = { uid: "staff-1", email: "ops@skylar.app", companyId: "skylar", role: "admin", isPlatformAdmin: true };

function post(body: unknown, origin = "http://localhost") {
  return new Request("http://localhost/api/platform/admins", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin, host: "localhost" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/platform/admins", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSession.mockResolvedValue(staff);
    mocks.applyPlatformAdminAction.mockResolvedValue(undefined);
  });

  it("grants with a reason", async () => {
    const response = await POST(post({ action: "grant", email: "paolo@skylar.app", reason: "Co-founder" }));

    expect(response.status).toBe(200);
    expect(mocks.applyPlatformAdminAction).toHaveBeenCalledWith({ email: "paolo@skylar.app", action: "grant", reason: "Co-founder", actor: staff });
  });

  it("revokes without a reason", async () => {
    const response = await POST(post({ action: "revoke", email: "paolo@skylar.app" }));

    expect(response.status).toBe(200);
    expect(mocks.applyPlatformAdminAction).toHaveBeenCalledWith({ email: "paolo@skylar.app", action: "revoke", reason: null, actor: staff });
  });

  it("rejects a grant with no reason or a bad email", async () => {
    expect((await POST(post({ action: "grant", email: "paolo@skylar.app" }))).status).toBe(400);
    expect((await POST(post({ action: "grant", email: "nope", reason: "Co-founder" }))).status).toBe(400);
    expect(mocks.applyPlatformAdminAction).not.toHaveBeenCalled();
  });

  it("forbids anyone who isn't a super admin", async () => {
    mocks.requireSession.mockResolvedValue({ ...staff, isPlatformAdmin: false });
    expect((await POST(post({ action: "grant", email: "me@acme.com", reason: "Please" }))).status).toBe(403);
    expect(mocks.applyPlatformAdminAction).not.toHaveBeenCalled();
  });

  it("rejects cross-origin requests", async () => {
    expect((await POST(post({ action: "revoke", email: "paolo@skylar.app" }, "https://evil.example"))).status).toBe(403);
  });
});
