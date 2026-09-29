import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  createSessionCookie: vi.fn(),
  findUserById: vi.fn(),
  provisionSignupWorkspace: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({ adminAuth: () => mocks }));
vi.mock("@/server/repositories/user.repository", () => ({
  findUserById: mocks.findUserById,
  provisionSignupWorkspace: mocks.provisionSignupWorkspace,
}));

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
    vi.stubEnv("SIGNUP_ALLOWED_DOMAINS", "example.com");
    mocks.verifyIdToken.mockResolvedValue({
      uid: "u1",
      email: "admin@example.com",
      email_verified: true,
      auth_time: nowSeconds() - 30,
    });
    mocks.createSessionCookie.mockResolvedValue("signed-cookie");
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
  });
});
