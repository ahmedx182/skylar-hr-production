import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthorizationError } from "@/lib/errors";
const mocks = vi.hoisted(() => ({ findActiveUserByEmail: vi.fn(), findPendingInviteByEmail: vi.fn(), assertWorkspaceEmailAllowed: vi.fn() }));
vi.mock("@/server/repositories/user.repository", () => mocks);
vi.mock("@/server/repositories/invite.repository", () => mocks);
vi.mock("@/server/auth/workspace-domain", () => mocks);
import { POST } from "@/app/api/auth/allowed-email/route";
const request = () => new Request("http://localhost:3000/api/auth/allowed-email", { method: "POST", headers: { origin: "http://localhost:3000", "Content-Type": "application/json" }, body: JSON.stringify({ email: "employee@acme.com" }) });
describe("workspace login preflight", () => {
  beforeEach(() => vi.resetAllMocks());
  it("lets invited employees request their first login link", async () => {
    mocks.findPendingInviteByEmail.mockResolvedValue({ companyId: "tenant-a" });
    const response = await POST(request());
    expect(await response.json()).toEqual({ allowed: true });
    expect(mocks.assertWorkspaceEmailAllowed).toHaveBeenCalledWith("tenant-a", "employee@acme.com");
  });
  it("does not allow uninvited emails merely because they match a domain", async () => {
    expect(await (await POST(request())).json()).toEqual({ allowed: false });
  });
  it("rejects employees excluded by their own tenant's policy", async () => {
    mocks.findActiveUserByEmail.mockResolvedValue({ role: "employee", companyId: "tenant-a" });
    mocks.assertWorkspaceEmailAllowed.mockRejectedValue(new AuthorizationError());
    expect((await POST(request())).status).toBe(403);
  });
});
