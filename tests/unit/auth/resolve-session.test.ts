import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifySessionCookie: vi.fn(),
  findUserById: vi.fn(),
  findCompanySummaryById: vi.fn(),
  findEmployeeIdByEmail: vi.fn(),
  isPlatformAdminEmail: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: () => ({ verifySessionCookie: mocks.verifySessionCookie }),
}));
vi.mock("@/server/repositories/user.repository", () => ({
  findUserById: mocks.findUserById,
  findCompanySummaryById: mocks.findCompanySummaryById,
  findEmployeeIdByEmail: mocks.findEmployeeIdByEmail,
}));

vi.mock("@/server/auth/platform-admin-email", () => ({ isPlatformAdminEmail: mocks.isPlatformAdminEmail }));

import { resolveSession } from "@/server/auth/resolve-session";

const firebaseAuthError = Object.assign(new Error("expired"), {
  code: "auth/session-cookie-expired",
});
const activeUser = {
  id: "u1",
  companyId: "company-a",
  email: "m@acme.com",
  role: "manager",
  status: "active",
};

describe("resolveSession", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.verifySessionCookie.mockResolvedValue({ uid: "u1", email: "m@acme.com" });
    mocks.findUserById.mockResolvedValue(activeUser);
    mocks.findCompanySummaryById.mockResolvedValue({ name: "Acme", status: "active", deleteAfterMs: null });
    mocks.isPlatformAdminEmail.mockResolvedValue(false);
  });

  it("returns null without a cookie and never calls Firebase", async () => {
    expect(await resolveSession(undefined)).toBeNull();
    expect(mocks.verifySessionCookie).not.toHaveBeenCalled();
  });

  it("verifies the cookie with revocation checking", async () => {
    await resolveSession("cookie");

    expect(mocks.verifySessionCookie).toHaveBeenCalledWith("cookie", true);
  });

  it("resolves company and role from the user record", async () => {
    expect(await resolveSession("cookie")).toEqual({
      uid: "u1",
      email: "m@acme.com",
      companyId: "company-a",
      companyName: "Acme",
      role: "manager",
      linkedEmployeeId: null,
      isPlatformAdmin: false,
      workspaceBlocked: false,
      workspaceDeleteAfterMs: null,
    });
  });

  it("flags a suspended workspace and a platform admin from server-side records", async () => {
    mocks.findCompanySummaryById.mockResolvedValue({ name: "Acme", status: "blocked" });
    mocks.isPlatformAdminEmail.mockResolvedValue(true);
    mocks.verifySessionCookie.mockResolvedValue({ uid: "u1", email: "m@acme.com", email_verified: true });

    expect(await resolveSession("cookie")).toMatchObject({ workspaceBlocked: true, isPlatformAdmin: true });
    expect(mocks.isPlatformAdminEmail).toHaveBeenCalledWith("m@acme.com", true);
  });

  it("flags a soft-deleted workspace as locked and reports when it will be purged", async () => {
    mocks.findCompanySummaryById.mockResolvedValue({ name: "Acme", status: "deleted", deleteAfterMs: 1_700_000_000_000 });

    expect(await resolveSession("cookie")).toMatchObject({ workspaceBlocked: true, workspaceDeleteAfterMs: 1_700_000_000_000 });
  });

  it("links an unlinked employee to the employee file with the same work email", async () => {
    mocks.findUserById.mockResolvedValue({ ...activeUser, role: "employee" });
    mocks.findEmployeeIdByEmail.mockResolvedValue("emp-9");

    expect(await resolveSession("cookie")).toMatchObject({ linkedEmployeeId: "emp-9" });
    expect(mocks.findEmployeeIdByEmail).toHaveBeenCalledWith("company-a", "m@acme.com");
  });

  it("does not look up an employee file for non-employee roles", async () => {
    await resolveSession("cookie");

    expect(mocks.findEmployeeIdByEmail).not.toHaveBeenCalled();
  });

  it("ignores company and role claims carried by the cookie", async () => {
    mocks.verifySessionCookie.mockResolvedValue({
      uid: "u1",
      email: "m@acme.com",
      companyId: "company-b",
      role: "admin",
    });

    expect(await resolveSession("cookie")).toMatchObject({
      companyId: "company-a",
      role: "manager",
    });
  });

  it("uses a null email when the cookie carries none", async () => {
    mocks.verifySessionCookie.mockResolvedValue({ uid: "u1" });

    expect(await resolveSession("cookie")).toMatchObject({ email: null });
  });

  it("returns null for an invalid or expired cookie", async () => {
    mocks.verifySessionCookie.mockRejectedValue(firebaseAuthError);

    expect(await resolveSession("cookie")).toBeNull();
    expect(mocks.findUserById).not.toHaveBeenCalled();
  });

  it("rethrows infrastructure failures instead of reporting a signed-out user", async () => {
    mocks.verifySessionCookie.mockRejectedValue(new Error("network down"));

    await expect(resolveSession("cookie")).rejects.toThrow("network down");
  });

  it("returns null when the user has no application record", async () => {
    mocks.findUserById.mockResolvedValue(null);

    expect(await resolveSession("cookie")).toBeNull();
  });

  it("returns null for a disabled user", async () => {
    mocks.findUserById.mockResolvedValue({ ...activeUser, status: "disabled" });

    expect(await resolveSession("cookie")).toBeNull();
  });

  it("resolves an active employee whatever their email domain", async () => {
    mocks.findUserById.mockResolvedValue({ ...activeUser, role: "employee" });
    expect(await resolveSession("cookie")).not.toBeNull();
  });
});
