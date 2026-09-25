import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  createSessionCookie: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({ adminAuth: () => mocks }));

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
    mocks.verifyIdToken.mockResolvedValue({
      uid: "u1",
      email_verified: true,
      auth_time: nowSeconds() - 30,
    });
    mocks.createSessionCookie.mockResolvedValue("signed-cookie");
  });

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
      email_verified: true,
      auth_time: nowSeconds() - 10 * 60,
    });

    await expect(createSession("id-token")).rejects.toBeInstanceOf(AuthenticationError);
    expect(mocks.createSessionCookie).not.toHaveBeenCalled();
  });

  it("rejects an unverified email", async () => {
    mocks.verifyIdToken.mockResolvedValue({
      uid: "u1",
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
});
