import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  applyPlatformAction: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("@/server/auth/require-session", () => ({
  requireSession: () => mocks.requireSession(),
  requirePageSession: () => mocks.requireSession(),
}));
vi.mock("@/server/repositories/platform.repository", () => ({
  applyPlatformAction: (...args: unknown[]) => mocks.applyPlatformAction(...args),
}));

import { POST } from "@/app/api/platform/workspaces/[companyId]/route";

const platformAdmin = { uid: "staff-1", email: "ops@skylar.app", companyId: "skylar", role: "admin", isPlatformAdmin: true };

function post(body: unknown, origin = "http://localhost") {
  return new Request("http://localhost/api/platform/workspaces/acme", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin, host: "localhost" },
    body: JSON.stringify(body),
  });
}

const params = { params: { companyId: "acme" } };

describe("POST /api/platform/workspaces/[companyId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSession.mockResolvedValue(platformAdmin);
    mocks.applyPlatformAction.mockResolvedValue(undefined);
  });

  it("suspends a workspace and records the acting admin and reason", async () => {
    const response = await POST(post({ action: "block", reason: "Chargeback fraud" }), params);

    expect(response.status).toBe(200);
    expect(mocks.applyPlatformAction).toHaveBeenCalledWith({
      companyId: "acme",
      action: "block",
      reason: "Chargeback fraud",
      actor: platformAdmin,
    });
  });

  it("requires a reason to suspend", async () => {
    const response = await POST(post({ action: "block", reason: " " }), params);

    expect(response.status).toBe(400);
    expect(mocks.applyPlatformAction).not.toHaveBeenCalled();
  });

  it("grants paid access without a note", async () => {
    const response = await POST(post({ action: "grant_paid" }), params);

    expect(response.status).toBe(200);
    expect(mocks.applyPlatformAction).toHaveBeenCalledWith(expect.objectContaining({ action: "grant_paid", reason: null }));
  });

  it("forbids workspace admins who are not platform admins", async () => {
    mocks.requireSession.mockResolvedValue({ ...platformAdmin, isPlatformAdmin: false });

    const response = await POST(post({ action: "grant_paid" }), params);

    expect(response.status).toBe(403);
    expect(mocks.applyPlatformAction).not.toHaveBeenCalled();
  });

  it("rejects unknown actions", async () => {
    const response = await POST(post({ action: "delete_everything" }), params);

    expect(response.status).toBe(400);
    expect(mocks.applyPlatformAction).not.toHaveBeenCalled();
  });

  it("rejects cross-origin requests", async () => {
    const response = await POST(post({ action: "grant_paid" }, "https://evil.example"), params);

    expect(response.status).toBe(403);
    expect(mocks.applyPlatformAction).not.toHaveBeenCalled();
  });
});
