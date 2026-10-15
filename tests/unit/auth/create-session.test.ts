import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  createSessionCookie: vi.fn(),
  findUserById: vi.fn(),
  provisionSignupWorkspace: vi.fn(),
  provisionInvitedUser: vi.fn(),
  findPendingInviteByEmail: vi.fn(),
  acceptInvite: vi.fn(),
  findCompanySummaryById: vi.fn(),
  isPlatformAdminEmail: vi.fn(),
  assertWorkspaceEmailAllowed: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({ adminAuth: () => mocks }));
vi.mock("@/server/repositories/user.repository", () => ({
  findCompanySummaryById: mocks.findCompanySummaryById,
  findUserById: mocks.findUserById,
  provisionSignupWorkspace: mocks.provisionSignupWorkspace,
  provisionInvitedUser: mocks.provisionInvitedUser,
}));
vi.mock("@/server/repositories/invite.repository", () => ({
  findPendingInviteByEmail: mocks.findPendingInviteByEmail,
  acceptInvite: mocks.acceptInvite,
}));

vi.mock("@/server/auth/platform-admin-email", () => ({ isPlatformAdminEmail: mocks.isPlatformAdminEmail }));
vi.mock("@/server/auth/workspace-domain", () => ({ assertWorkspaceEmailAllowed: mocks.assertWorkspaceEmailAllowed }));

import { SESSION_MAX_AGE_MS } from "@/constants/auth";
import { AuthenticationError } from "@/lib/errors";
import { createSession } from "@/server/auth/create-session";

const nowSeconds = () => Math.floor(Date.now() / 1000);
const firebaseAuthError = Object.assign(new Error("bad token"), {
  code: "auth/argument-error",
});

describe("createSession", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("FIREBASE_PROJECT_ID", "demo-project");
    vi.stubEnv("FIREBASE_CLIENT_EMAIL", "svc@demo-project.iam.gserviceaccount.com");
    vi.stubEnv("FIREBASE_PRIVATE_KEY", "-----BEGIN KEY-----\\nabc\\n-----END KEY-----\\n");
    mocks.verifyIdToken.mockResolvedValue({
      uid: "u1",
      email: "admin@example.com",
      email_verified: true,
      auth_time: nowSeconds() - 30,
    });
    mocks.createSessionCookie.mockResolvedValue("signed-cookie");
    mocks.findPendingInviteByEmail.mockResolvedValue(null);
    mocks.acceptInvite.mockResolvedValue(undefined);
    mocks.findCompanySummaryById.mockResolvedValue({ name: "Acme", status: "active" });
    mocks.isPlatformAdminEmail.mockReturnValue(false);
    mocks.findUserById.mockResolvedValue({
      id: "u1",
      companyId: "company-1",
      email: "admin@example.com",
      role: "admin",
      status: "active",
    });
  });

  afterEach(() => vi.unstubAllEnvs());

  it("exchanges a fresh, verified ID token for a session cookie", async () => {
    await expect(createSession("id-token")).resolves.toEqual({
      cookie: "signed-cookie",
      maxAgeMs: SESSION_MAX_AGE_MS,
    });
    expect(mocks.verifyIdToken).toHaveBeenCalledWith("id-token", true);
    expect(mocks.createSessionCookie).toHaveBeenCalledWith("id-token", {
      expiresIn: SESSION_MAX_AGE_MS,
    });
  });

  it("rejects an invalid ID token", async () => {
    mocks.verifyIdToken.mockRejectedValue(firebaseAuthError);

    await expect(createSession("id-token")).rejects.toBeInstanceOf(AuthenticationError);
    expect(mocks.createSessionCookie).not.toHaveBeenCalled();
  });

  it("rejects an ID token from an old sign-in", async () => {
    mocks.verifyIdToken.mockResolvedValue({
      uid: "u1",
      email: "admin@example.com",
      email_verified: true,
      auth_time: nowSeconds() - 10 * 60,
    });

    await expect(createSession("id-token")).rejects.toBeInstanceOf(AuthenticationError);
    expect(mocks.createSessionCookie).not.toHaveBeenCalled();
  });

  it("rejects an unverified email", async () => {
    mocks.verifyIdToken.mockResolvedValue({
      uid: "u1",
      email: "admin@example.com",
      email_verified: false,
      auth_time: nowSeconds(),
    });

    await expect(createSession("id-token")).rejects.toBeInstanceOf(AuthenticationError);
    expect(mocks.createSessionCookie).not.toHaveBeenCalled();
  });

  it("rethrows infrastructure failures", async () => {
    mocks.verifyIdToken.mockRejectedValue(new Error("network down"));

    await expect(createSession("id-token")).rejects.toThrow("network down");
  });

  it("rejects an unknown user without signup metadata", async () => {
    mocks.findUserById.mockResolvedValue(null);

    await expect(createSession("id-token")).rejects.toThrow("This email has not been added to Skylar.");
    expect(mocks.provisionSignupWorkspace).not.toHaveBeenCalled();
    expect(mocks.createSessionCookie).not.toHaveBeenCalled();
  });

  it("accepts an invited user with no signup metadata when a pending invite exists", async () => {
    mocks.findUserById.mockResolvedValue(null);
    mocks.findPendingInviteByEmail.mockResolvedValue({
      id: "inv-1",
      companyId: "company-invite",
      email: "admin@example.com",
      role: "employee",
      linkedEmployeeId: null,
      status: "pending",
      createdBy: "admin-uid",
      createdAtMs: Date.now(),
    });
    mocks.provisionInvitedUser.mockResolvedValue({
      id: "u1",
      companyId: "company-invite",
      email: "admin@example.com",
      role: "employee",
      status: "active",
    });

    await expect(createSession("id-token")).resolves.toEqual({
      cookie: "signed-cookie",
      maxAgeMs: SESSION_MAX_AGE_MS,
    });
    expect(mocks.provisionInvitedUser).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: "company-invite", role: "employee" }),
    );
    expect(mocks.acceptInvite).toHaveBeenCalledWith("inv-1");
  });

  it("provisions a signup workspace before creating the session cookie", async () => {
    mocks.findUserById.mockResolvedValue(null);
    mocks.provisionSignupWorkspace.mockResolvedValue({
      id: "u1",
      companyId: "company-1",
      email: "admin@example.com",
      role: "admin",
      status: "active",
    });

    await expect(createSession("id-token", { companyName: "Example Company" })).resolves.toEqual({
      cookie: "signed-cookie",
      maxAgeMs: SESSION_MAX_AGE_MS,
    });
    expect(mocks.provisionSignupWorkspace).toHaveBeenCalledWith({
      uid: "u1",
      email: "admin@example.com",
      companyName: "Example Company",
    });
    expect(mocks.provisionSignupWorkspace.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.createSessionCookie.mock.invocationCallOrder[0],
    );
  });

  it("does not let a suspended user reactivate through owner signup", async () => {
    mocks.findUserById.mockResolvedValue({ status: "disabled" });
    await expect(createSession("id-token", { companyName: "Example" })).rejects.toMatchObject({
      code: "account_suspended",
      status: 403,
    });
    expect(mocks.provisionSignupWorkspace).not.toHaveBeenCalled();
    expect(mocks.createSessionCookie).not.toHaveBeenCalled();
  });

  it("tells a deleted account apart from a suspended one", async () => {
    mocks.findUserById.mockResolvedValue({ status: "disabled", deletedAt: { toDate: () => new Date() } });
    await expect(createSession("id-token")).rejects.toMatchObject({ code: "account_deleted", status: 403 });
    expect(mocks.createSessionCookie).not.toHaveBeenCalled();
  });

  it("treats a stray deleted marker as deleted even if the status still says active", async () => {
    mocks.findUserById.mockResolvedValue({ status: "active", deletedAt: { toDate: () => new Date() } });
    await expect(createSession("id-token")).rejects.toMatchObject({ code: "account_deleted" });
  });

  it("keeps an existing member in their workspace when signup metadata is supplied", async () => {
    await createSession("id-token", { companyName: "Other Workspace" });
    expect(mocks.provisionSignupWorkspace).not.toHaveBeenCalled();
  });

  it("allows owner signup from any verified email domain", async () => {
    mocks.findUserById.mockResolvedValue(null);
    mocks.verifyIdToken.mockResolvedValue({ uid: "u1", email: "owner@blocked.com", email_verified: true, auth_time: nowSeconds() });
    await expect(createSession("id-token", { companyName: "Example" })).resolves.toHaveProperty("cookie");
    expect(mocks.provisionSignupWorkspace).toHaveBeenCalled();
  });

  it("enforces the employee's workspace policy before minting a session", async () => {
    mocks.findUserById.mockResolvedValue({ role: "employee", status: "active", companyId: "tenant-a" });
    mocks.assertWorkspaceEmailAllowed.mockRejectedValue(new AuthenticationError("Domain denied"));
    await expect(createSession("id-token")).rejects.toThrow("Domain denied");
    expect(mocks.assertWorkspaceEmailAllowed).toHaveBeenCalledWith("tenant-a", "admin@example.com");
    expect(mocks.createSessionCookie).not.toHaveBeenCalled();
  });

  it("refuses sign-in for a suspended workspace", async () => {
    mocks.findCompanySummaryById.mockResolvedValue({ name: "Acme", status: "blocked" });

    await expect(createSession("id-token")).rejects.toThrow(/suspended/);
    expect(mocks.createSessionCookie).not.toHaveBeenCalled();
  });

  it("lets a platform admin sign in even when their workspace is suspended", async () => {
    mocks.findCompanySummaryById.mockResolvedValue({ name: "Acme", status: "blocked" });
    mocks.isPlatformAdminEmail.mockReturnValue(true);

    await expect(createSession("id-token")).resolves.toMatchObject({ cookie: "signed-cookie" });
  });

  it("refuses an invite into a suspended workspace", async () => {
    mocks.findUserById.mockResolvedValue(null);
    mocks.findPendingInviteByEmail.mockResolvedValue({ id: "inv-1", companyId: "company-2", role: "employee" });
    mocks.findCompanySummaryById.mockResolvedValue({ name: "Other", status: "blocked" });

    await expect(createSession("id-token")).rejects.toThrow(/suspended/);
    expect(mocks.provisionInvitedUser).not.toHaveBeenCalled();
  });
});
