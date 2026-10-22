import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ findActiveUserByEmail: vi.fn(), findAccountBlockByEmail: vi.fn(), findPendingInviteByEmail: vi.fn() }));
vi.mock("@/server/repositories/user.repository", () => mocks);
vi.mock("@/server/repositories/invite.repository", () => mocks);
import { POST } from "@/app/api/auth/allowed-email/route";
const request = () => new Request("http://localhost:3000/api/auth/allowed-email", { method: "POST", headers: { origin: "http://localhost:3000", "Content-Type": "application/json" }, body: JSON.stringify({ email: "employee@acme.com" }) });
describe("workspace login preflight", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.findAccountBlockByEmail.mockResolvedValue(null);
  });
  it("lets invited employees request their first login link", async () => {
    mocks.findPendingInviteByEmail.mockResolvedValue({ companyId: "tenant-a" });
    const response = await POST(request());
    expect(await response.json()).toEqual({ allowed: true });
  });
  it("does not allow uninvited emails merely because they match a domain", async () => {
    expect(await (await POST(request())).json()).toEqual({ allowed: false });
  });
  it.each(["suspended", "deleted"] as const)("says when the account is %s, so the form can show the right page", async (state) => {
    mocks.findAccountBlockByEmail.mockResolvedValue(state);

    expect(await (await POST(request())).json()).toEqual({ allowed: false, accountState: state });
  });

  it("doesn't look for a blocked account when the email belongs to an active one", async () => {
    mocks.findActiveUserByEmail.mockResolvedValue({ role: "admin", companyId: "tenant-a" });

    expect(await (await POST(request())).json()).toEqual({ allowed: true });
    expect(mocks.findAccountBlockByEmail).not.toHaveBeenCalled();
  });

  it("allows an active employee whatever their email domain", async () => {
    mocks.findActiveUserByEmail.mockResolvedValue({ role: "employee", companyId: "tenant-a" });
    expect(await (await POST(request())).json()).toEqual({ allowed: true });
  });
});
