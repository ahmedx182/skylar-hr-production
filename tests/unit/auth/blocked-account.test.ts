import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookie: undefined as string | undefined,
  verifySessionCookie: vi.fn(),
  findUserById: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  getSession: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: () => ({ get: () => (mocks.cookie ? { value: mocks.cookie } : undefined) }) }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: vi.fn() }));
vi.mock("@/lib/firebase/admin", () => ({ adminAuth: () => ({ verifySessionCookie: mocks.verifySessionCookie }) }));
vi.mock("@/server/repositories/user.repository", () => ({ findUserById: mocks.findUserById }));
vi.mock("@/server/auth/get-session", () => ({ getSession: mocks.getSession }));

import { blockedAccountFromCookie } from "@/server/auth/blocked-account";
import { requirePageSession } from "@/server/auth/require-session";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.cookie = "cookie";
  mocks.getSession.mockResolvedValue(null);
  mocks.verifySessionCookie.mockResolvedValue({ uid: "u1" });
});

describe("blockedAccountFromCookie", () => {
  it("reads the cookie without a revocation check, since suspending revokes the session", async () => {
    mocks.findUserById.mockResolvedValue({ status: "disabled" });

    expect(await blockedAccountFromCookie()).toBe("suspended");
    expect(mocks.verifySessionCookie).toHaveBeenCalledWith("cookie", false);
  });

  it("recognises a deleted account", async () => {
    mocks.findUserById.mockResolvedValue({ status: "disabled", deletedAt: {} });
    expect(await blockedAccountFromCookie()).toBe("deleted");
  });

  it.each([
    ["an active account", () => mocks.findUserById.mockResolvedValue({ status: "active" })],
    ["an unknown user", () => mocks.findUserById.mockResolvedValue(null)],
    ["a cookie that fails verification", () => mocks.verifySessionCookie.mockRejectedValue(new Error("expired"))],
    ["a user record that can't be read", () => mocks.findUserById.mockRejectedValue(new Error("bad record"))],
  ])("reports nothing for %s", async (_label, arrange) => {
    arrange();
    expect(await blockedAccountFromCookie()).toBeNull();
  });

  it("reports nothing when there is no cookie, without calling Firebase", async () => {
    mocks.cookie = undefined;

    expect(await blockedAccountFromCookie()).toBeNull();
    expect(mocks.verifySessionCookie).not.toHaveBeenCalled();
  });
});

describe("requirePageSession for someone who was just blocked", () => {
  it("sends a suspended user to the suspended page, not the sign-in form", async () => {
    mocks.findUserById.mockResolvedValue({ status: "disabled" });
    await expect(requirePageSession()).rejects.toThrow("REDIRECT:/account-suspended");
  });

  it("sends a deleted user to the deleted page", async () => {
    mocks.findUserById.mockResolvedValue({ status: "disabled", deletedAt: {} });
    await expect(requirePageSession()).rejects.toThrow("REDIRECT:/account-deleted");
  });

  it("still sends everyone else to sign in", async () => {
    mocks.cookie = undefined;
    await expect(requirePageSession()).rejects.toThrow("REDIRECT:/login");
  });
});
