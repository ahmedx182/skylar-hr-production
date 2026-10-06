import { beforeEach, describe, expect, it, vi } from "vitest";
import { emailMatchesDomains, workspaceDomainsSchema } from "@/schemas/workspace-domain.schema";

const mocks = vi.hoisted(() => ({ get: vi.fn(), doc: vi.fn(), collection: vi.fn() }));
vi.mock("@/lib/firebase/admin", () => ({ adminDb: () => mocks }));
import { assertWorkspaceEmailAllowed } from "@/server/auth/workspace-domain";

describe("workspace domain restrictions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.collection.mockReturnValue(mocks);
    mocks.doc.mockReturnValue(mocks);
    mocks.get.mockImplementation(() => Promise.resolve({ exists: true, get: () => ["acme.com"] }));
  });
  it("normalizes and deduplicates domains", () => {
    expect(workspaceDomainsSchema.parse([" Acme.COM ", "acme.com"])).toEqual(["acme.com"]);
  });
  it.each(["https://acme.com", "@acme.com", "*.acme.com", "acme", "a..com"])("rejects invalid domain %s", domain => {
    expect(workspaceDomainsSchema.safeParse([domain]).success).toBe(false);
  });
  it("permits only exact domains, without automatic subdomain access", () => {
    expect(emailMatchesDomains("Employee@ACME.COM", ["acme.com"])).toBe(true);
    expect(emailMatchesDomains("employee@other.com", ["acme.com"])).toBe(false);
    expect(emailMatchesDomains("employee@sub.acme.com", ["acme.com"])).toBe(false);
  });
  it("supports explicitly unrestricted and legacy workspaces", () => {
    expect(emailMatchesDomains("employee@anywhere.com", [])).toBe(true);
  });
  it("reads the target tenant policy and rejects other domains", async () => {
    await expect(assertWorkspaceEmailAllowed("tenant-a", "employee@other.com")).rejects.toThrow("not allowed");
    expect(mocks.doc).toHaveBeenCalledWith("tenant-a");
  });
  it("allows employees in a configured domain", async () => {
    await expect(assertWorkspaceEmailAllowed("tenant-a", "employee@acme.com")).resolves.toBeUndefined();
  });
  it("fails closed for a missing workspace", async () => {
    mocks.get.mockResolvedValue({ exists: false });
    await expect(assertWorkspaceEmailAllowed("missing", "employee@acme.com")).rejects.toThrow("not found");
  });
});
