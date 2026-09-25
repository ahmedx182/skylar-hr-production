import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createSession: vi.fn() }));

vi.mock("@/server/auth/create-session", () => ({ createSession: mocks.createSession }));

import { POST as logout } from "@/app/api/auth/logout/route";
import { POST as createSessionRoute } from "@/app/api/auth/session/route";
import { SESSION_MAX_AGE_MS } from "@/constants/auth";
import { AuthenticationError } from "@/lib/errors";

const ORIGIN = "http://localhost:3000";

function post(path: string, { origin = ORIGIN, body }: { origin?: string | null; body?: unknown } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (origin) headers.origin = origin;
  return new Request(`${ORIGIN}${path}`, {
    method: "POST",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const sessionRequest = (options?: Parameters<typeof post>[1]) =>
  post("/api/auth/session", { body: { idToken: "id-token" }, ...options });

describe("POST /api/auth/session", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.createSession.mockResolvedValue({
      cookie: "signed-cookie",
      maxAgeMs: SESSION_MAX_AGE_MS,
    });
  });

  afterEach(() => vi.unstubAllEnvs());

  it("sets an HttpOnly, SameSite=Lax session cookie", async () => {
    const response = await createSessionRoute(sessionRequest());
    const cookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(200);
    expect(cookie).toContain("__session=signed-cookie");
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toMatch(/Path=\//i);
    expect(cookie).toContain(`Max-Age=${SESSION_MAX_AGE_MS / 1000}`);
  });

  it("marks the cookie Secure in production only", async () => {
    const dev = await createSessionRoute(sessionRequest());
    expect(dev.headers.get("set-cookie")).not.toMatch(/Secure/i);

    vi.stubEnv("NODE_ENV", "production");
    const prod = await createSessionRoute(sessionRequest());
    expect(prod.headers.get("set-cookie")).toMatch(/Secure/i);
  });

  it.each([
    { origin: "https://evil.test", why: "cross-origin" },
    { origin: null, why: "origin-less" },
  ])("rejects a $why request without minting a session", async ({ origin }) => {
    const response = await createSessionRoute(sessionRequest({ origin }));

    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("rejects an invalid body", async () => {
    const response = await createSessionRoute(post("/api/auth/session", { body: {} }));

    expect(response.status).toBe(400);
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("maps an authentication failure to 401 without a cookie", async () => {
    mocks.createSession.mockRejectedValue(new AuthenticationError("Invalid sign-in."));
    const response = await createSessionRoute(sessionRequest());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "unauthenticated", message: "Invalid sign-in." },
    });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("returns a generic 500 for unexpected failures and logs them", async () => {
    mocks.createSession.mockRejectedValue(new Error("private-detail"));
    const response = await createSessionRoute(sessionRequest());

    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("private-detail");
    expect(console.error).toHaveBeenCalledOnce();
  });
});

describe("POST /api/auth/logout", () => {
  it("expires the session cookie", async () => {
    const response = await logout(post("/api/auth/logout"));
    const cookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(200);
    expect(cookie).toMatch(/^__session=;/);
    expect(cookie).toMatch(/Max-Age=0/i);
    expect(cookie).toMatch(/HttpOnly/i);
  });

  it("rejects a cross-origin request", async () => {
    const response = await logout(post("/api/auth/logout", { origin: "https://evil.test" }));

    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
