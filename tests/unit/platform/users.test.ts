import { describe, expect, it } from "vitest";
import { displayName, filterUsers, roleLabel, type DirectoryUser } from "@/features/platform/users";

const user = (overrides: Partial<DirectoryUser> & { id: string }): DirectoryUser => ({
  email: `${overrides.id}@acme.com`,
  displayName: null,
  role: "employee",
  accountState: "active",
  daysLeft: null,
  reason: null,
  createdAtMs: 1000,
  companyId: "acme",
  workspaceName: "Acme",
  workspaceState: "active",
  isOwner: false,
  isOnlyAdmin: false,
  protectedReason: null,
  superAdmin: null,
  ...overrides,
});

const users = [
  user({ id: "olivia", displayName: "Olivia Owner", role: "admin", isOwner: true, createdAtMs: 100, workspaceName: "Acme" }),
  user({ id: "adam", displayName: "Adam Admin", role: "admin", createdAtMs: 300, workspaceName: "Acme" }),
  user({ id: "mia", role: "employee", createdAtMs: 200, workspaceName: "Globex", companyId: "globex" }),
  user({ id: "dora", displayName: "Dora Disabled", role: "employee", accountState: "suspended", createdAtMs: 400, workspaceName: "Initech" }),
  user({ id: "gus", displayName: "Gus Gone", accountState: "deleted", daysLeft: 12, createdAtMs: 50, workspaceName: "Initech" }),
];
const base = { query: "", role: "all", status: "all", sort: "newest" } as const;
const ids = (list: DirectoryUser[]) => list.map((entry) => entry.id);

describe("user roles", () => {
  it("labels the workspace creator as Owner even though they are also an admin", () => {
    expect(roleLabel(users[0])).toBe("Owner");
    expect(roleLabel(users[1])).toBe("Admin");
    expect(roleLabel(users[2])).toBe("Member");
  });

  it("falls back to the email name when no display name is saved", () => {
    expect(displayName(users[2])).toBe("mia");
    expect(displayName(users[0])).toBe("Olivia Owner");
  });
});

describe("filterUsers", () => {
  it("sorts newest first by default", () => {
    expect(ids(filterUsers(users, base))).toEqual(["dora", "adam", "mia", "olivia"]);
  });

  it("filters by role, keeping owners separate from admins", () => {
    expect(ids(filterUsers(users, { ...base, role: "owner" }))).toEqual(["olivia"]);
    expect(ids(filterUsers(users, { ...base, role: "admin" }))).toEqual(["adam"]);
    expect(ids(filterUsers(users, { ...base, role: "member" })).sort()).toEqual(["dora", "mia"]);
  });

  it("filters by account state", () => {
    expect(ids(filterUsers(users, { ...base, status: "suspended" }))).toEqual(["dora"]);
    expect(ids(filterUsers(users, { ...base, status: "active" }))).toEqual(["adam", "mia", "olivia"]);
  });

  it("hides deleted accounts unless they are asked for", () => {
    expect(ids(filterUsers(users, base))).not.toContain("gus");
    expect(ids(filterUsers(users, { ...base, status: "deleted" }))).toEqual(["gus"]);
  });

  it("searches name, email and workspace, ignoring case", () => {
    expect(ids(filterUsers(users, { ...base, query: "GLOBEX" }))).toEqual(["mia"]);
    expect(ids(filterUsers(users, { ...base, query: "adam@" }))).toEqual(["adam"]);
    expect(ids(filterUsers(users, { ...base, query: "olivia owner" }))).toEqual(["olivia"]);
    expect(filterUsers(users, { ...base, query: "nobody" })).toEqual([]);
  });

  it("sorts by name and by workspace", () => {
    expect(ids(filterUsers(users, { ...base, sort: "name" }))).toEqual(["adam", "dora", "mia", "olivia"]);
    expect(ids(filterUsers(users, { ...base, sort: "workspace" }))).toEqual(["adam", "olivia", "mia", "dora"]);
  });

  it("combines filters and doesn't change the original list", () => {
    const copy = [...users];
    expect(ids(filterUsers(users, { ...base, role: "member", status: "active" }))).toEqual(["mia"]);
    expect(users).toEqual(copy);
  });
});
