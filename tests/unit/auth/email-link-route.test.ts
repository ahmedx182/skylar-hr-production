import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findAccountBlockByEmail: vi.fn(),
  findActiveUserByEmail: vi.fn(),
  findPendingInviteByEmail: vi.fn(),
  generateSignInWithEmailLink: vi.fn(),
  sendSignInEmail: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/server", () => ({ getServerEnv: () => ({ NEXT_PUBLIC_APP_URL: "https://app.example.com" }) }));
vi.mock("@/lib/firebase/admin", () => ({ adminAuth: () => ({ generateSignInWithEmailLink: mocks.generateSignInWithEmailLink }) }));
vi.mock("@/server/repositories/user.repository", () => ({
  findAccountBlockByEmail: mocks.findAccountBlockByEmail,
  findActiveUserByEmail: mocks.findActiveUserByEmail,
}));
vi.mock("@/server/repositories/invite.repository", () => ({ findPendingInviteByEmail: mocks.findPendingInviteByEmail }));
vi.mock("@/server/email/sign-in-link-email", () => ({ sendSignInEmail: mocks.sendSignInEmail }));

import { POST } from "@/app/api/auth/email-link/route";

let counter = 0;
function post(body: Record<string, unknown>) {
  // A fresh address each time keeps the per-email rate limit out of the way.
  counter += 1;
  const email = `person${counter}@acme.com`;
  return {
    email,
    request: new Request("http://localhost/api/auth/email-link", {
      method: "POST",
      headers: { "Content-Type": "application/json", origin: "http://localhost", host: "localhost", "x-forwarded-for": `10.0.0.${counter}` },
      body: JSON.stringify({ email, ...body }),
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findAccountBlockByEmail.mockResolvedValue(null);
  mocks.findActiveUserByEmail.mockResolvedValue({ role: "admin", companyId: "acme" });
  mocks.findPendingInviteByEmail.mockResolvedValue(null);
  mocks.generateSignInWithEmailLink.mockResolvedValue("https://app.example.com/verify?oob=1");
  mocks.sendSignInEmail.mockResolvedValue(true);
});

describe("POST /api/auth/email-link for blocked accounts", () => {
  it.each([
    ["suspended", "account_suspended"],
    ["deleted", "account_deleted"],
  ] as const)("refuses a %s account with a code the browser can act on", async (state, code) => {
    mocks.findAccountBlockByEmail.mockResolvedValue(state);

    const { request } = post({ purpose: "login" });
    const response = await POST(request);

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe(code);
    expect(mocks.generateSignInWithEmailLink).not.toHaveBeenCalled();
    expect(mocks.sendSignInEmail).not.toHaveBeenCalled();
  });

  it("also refuses them when they try to sign up again with the same email", async () => {
    mocks.findAccountBlockByEmail.mockResolvedValue("deleted");

    const { request } = post({ purpose: "signup", companyName: "New Co" });
    const response = await POST(request);

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("account_deleted");
    expect(mocks.sendSignInEmail).not.toHaveBeenCalled();
  });

  it("still sends the link to an active account", async () => {
    const { request, email } = post({ purpose: "login" });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ delivery: "sent" });
    expect(mocks.sendSignInEmail).toHaveBeenCalledWith(expect.objectContaining({ toEmail: email, purpose: "login" }));
  });
});
