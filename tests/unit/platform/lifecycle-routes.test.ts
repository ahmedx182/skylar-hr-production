import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  softDeleteWorkspace: vi.fn(),
  restoreWorkspace: vi.fn(),
  purgeWorkspace: vi.fn(),
  applyPlatformAction: vi.fn(),
  purgeExpiredWorkspaces: vi.fn(),
  purgeExpiredRecords: vi.fn(),
  purgeExpiredUsers: vi.fn(),
  cronSecret: undefined as string | undefined,
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/env/server", () => ({ getServerEnv: () => ({ CRON_SECRET: mocks.cronSecret }) }));
vi.mock("@/server/auth/require-session", () => ({ requireSession: () => mocks.requireSession(), requirePageSession: () => mocks.requireSession() }));
vi.mock("@/server/platform/workspace-lifecycle", () => ({
  softDeleteWorkspace: (...args: unknown[]) => mocks.softDeleteWorkspace(...args),
  restoreWorkspace: (...args: unknown[]) => mocks.restoreWorkspace(...args),
  purgeWorkspace: (...args: unknown[]) => mocks.purgeWorkspace(...args),
  purgeExpiredWorkspaces: () => mocks.purgeExpiredWorkspaces(),
}));
vi.mock("@/server/platform/user-lifecycle", () => ({ purgeExpiredUsers: () => mocks.purgeExpiredUsers() }));
vi.mock("@/server/repositories/recently-deleted.repository", () => ({ purgeExpiredRecords: () => mocks.purgeExpiredRecords() }));
vi.mock("@/server/repositories/platform.repository", () => ({
  applyPlatformAction: (...args: unknown[]) => mocks.applyPlatformAction(...args),
}));

import { GET as cron } from "@/app/api/cron/purge-deleted/route";
import { POST } from "@/app/api/platform/workspaces/[companyId]/route";

const staff = { uid: "staff-1", email: "ops@skylar.app", companyId: "skylar", role: "admin", isPlatformAdmin: true };
const params = { params: { companyId: "acme" } };

function post(body: unknown) {
  return new Request("http://localhost/api/platform/workspaces/acme", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: "http://localhost", host: "localhost" },
    body: JSON.stringify(body),
  });
}

describe("workspace lifecycle actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSession.mockResolvedValue(staff);
    mocks.softDeleteWorkspace.mockResolvedValue({ deleteAfterMs: 123, cancelledSubscription: false });
  });

  it("soft deletes with the typed name and a reason", async () => {
    const response = await POST(post({ action: "delete", confirmName: "Acme", reason: "Requested by customer" }), params);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, deleteAfterMs: 123 });
    expect(mocks.softDeleteWorkspace).toHaveBeenCalledWith({
      companyId: "acme",
      confirmName: "Acme",
      reason: "Requested by customer",
      actor: staff,
    });
  });

  it.each([
    ["no typed name", { action: "delete", reason: "Duplicate account" }],
    ["no reason", { action: "delete", confirmName: "Acme" }],
    ["a one-letter reason", { action: "delete", confirmName: "Acme", reason: "x" }],
    ["no typed name for a permanent delete", { action: "purge" }],
  ])("rejects %s", async (_label, body) => {
    const response = await POST(post(body), params);

    expect(response.status).toBe(400);
    expect(mocks.softDeleteWorkspace).not.toHaveBeenCalled();
    expect(mocks.purgeWorkspace).not.toHaveBeenCalled();
  });

  it("restores a deleted workspace", async () => {
    const response = await POST(post({ action: "restore_workspace", reason: "Customer asked" }), params);

    expect(response.status).toBe(200);
    expect(mocks.restoreWorkspace).toHaveBeenCalledWith({ companyId: "acme", actor: staff, note: "Customer asked" });
  });

  it("purges only with the typed name", async () => {
    const response = await POST(post({ action: "purge", confirmName: "Acme" }), params);

    expect(response.status).toBe(200);
    expect(mocks.purgeWorkspace).toHaveBeenCalledWith({ companyId: "acme", actor: staff, confirmName: "Acme" });
  });

  it("never lets a workspace admin delete, restore or purge", async () => {
    mocks.requireSession.mockResolvedValue({ ...staff, isPlatformAdmin: false });

    for (const body of [
      { action: "delete", confirmName: "Acme", reason: "nope" },
      { action: "restore_workspace" },
      { action: "purge", confirmName: "Acme" },
    ]) {
      expect((await POST(post(body), params)).status).toBe(403);
    }
    expect(mocks.softDeleteWorkspace).not.toHaveBeenCalled();
    expect(mocks.restoreWorkspace).not.toHaveBeenCalled();
    expect(mocks.purgeWorkspace).not.toHaveBeenCalled();
  });

  it("still routes ordinary actions to the existing handler", async () => {
    await POST(post({ action: "end_gift" }), params);

    expect(mocks.applyPlatformAction).toHaveBeenCalledWith(expect.objectContaining({ companyId: "acme", action: "end_gift" }));
  });
});

describe("GET /api/cron/purge-deleted", () => {
  const request = (authorization?: string) =>
    new Request("http://localhost/api/cron/purge-deleted", { headers: authorization ? { authorization } : {} });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cronSecret = "s3cret";
    mocks.purgeExpiredWorkspaces.mockResolvedValue({ checked: 2, due: 1, purged: ["old"], failed: [] });
    mocks.purgeExpiredRecords.mockResolvedValue({ employees: 1, notes: 3, notesRemovedWithEmployees: 4 });
    mocks.purgeExpiredUsers.mockResolvedValue({ due: 2, purged: ["u1", "u2"], failed: [] });
  });

  it("purges expired workspaces, user accounts, and employee files and notes for the scheduler's secret", async () => {
    const response = await cron(request("Bearer s3cret"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      workspaces: { checked: 2, due: 1, purged: ["old"], failed: [] },
      records: { employees: 1, notes: 3, notesRemovedWithEmployees: 4 },
      users: { due: 2, purged: ["u1", "u2"], failed: [] },
    });
  });

  it("refuses a wrong or missing secret", async () => {
    expect((await cron(request("Bearer wrong"))).status).toBe(401);
    expect((await cron(request())).status).toBe(401);
    expect(mocks.purgeExpiredWorkspaces).not.toHaveBeenCalled();
    expect(mocks.purgeExpiredRecords).not.toHaveBeenCalled();
    expect(mocks.purgeExpiredUsers).not.toHaveBeenCalled();
  });

  it("refuses everything when no secret is configured", async () => {
    mocks.cronSecret = undefined;

    expect((await cron(request("Bearer "))).status).toBe(401);
    expect(mocks.purgeExpiredWorkspaces).not.toHaveBeenCalled();
  });
});
