import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifySessionCookie: vi.fn(),
  findUserById: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: () => ({ verifySessionCookie: mocks.verifySessionCookie }),
}));
vi.mock("@/server/repositories/user.repository", () => ({
  findUserById: mocks.findUserById,
}));

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
      role: "manager",
    });
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
});
