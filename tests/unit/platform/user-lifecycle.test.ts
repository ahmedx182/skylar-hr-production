import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb, ts } from "../../helpers/fake-firestore";

const mocks = vi.hoisted(() => ({
  DELETE: Symbol("delete"),
  revokeRefreshTokens: vi.fn(),
  deleteUser: vi.fn(),
}));

let db: ReturnType<typeof createFakeDb>;

vi.mock("server-only", () => ({}));
vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: () => ({ serverTimestamp: true }), delete: () => mocks.DELETE },
  Timestamp: { fromMillis: (value: number) => ({ toMillis: () => value }) },
}));
vi.mock("@/lib/firebase/admin", () => ({
  adminDb: () => db,
  adminAuth: () => ({ revokeRefreshTokens: mocks.revokeRefreshTokens, deleteUser: mocks.deleteUser }),
}));
vi.mock("@/server/auth/platform-admin-email", () => ({
  isPlatformAdminEmail: (email: string) => email === "boss@skylar.app",
}));

import { applyUserAction, purgeExpiredUsers } from "@/server/platform/user-lifecycle";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 14, 12);
const staff = { uid: "staff-1", email: "ops@skylar.app" };

function seed() {
  db = createFakeDb(
    {
      users: {
        ana: { companyId: "acme", email: "ana@acme.com", role: "admin", status: "active" },
        ben: { companyId: "acme", email: "ben@acme.com", role: "employee", status: "active" },
        sue: { companyId: "acme", email: "sue@acme.com", role: "employee", status: "disabled", suspendedAt: ts(NOW - DAY), suspendedReason: "Spam" },
        boss: { companyId: "skylar", email: "boss@skylar.app", role: "admin", status: "active" },
        "staff-1": { companyId: "skylar", email: "ops@skylar.app", role: "admin", status: "active" },
      },
    },
    { deleteSentinel: mocks.DELETE },
  );
}

const act = (userId: string, action: Parameters<typeof applyUserAction>[0]["action"], extra: { reason?: string | null; confirmEmail?: string } = {}) =>
  applyUserAction({ userId, action, reason: extra.reason ?? null, confirmEmail: extra.confirmEmail, actor: staff });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.revokeRefreshTokens.mockResolvedValue(undefined);
  mocks.deleteUser.mockResolvedValue(undefined);
  seed();
});

describe("suspend and restore access", () => {
  it("suspends an account, signs them out everywhere, and records who and why", async () => {
    await act("ben", "suspend", { reason: "Shared credentials" });

    expect(db.read("users", "ben")).toMatchObject({ status: "disabled", suspendedReason: "Shared credentials", suspendedBy: "staff-1" });
    expect(mocks.revokeRefreshTokens).toHaveBeenCalledWith("ben");
    expect(db.all("platform_audit_log")).toEqual([
      expect.objectContaining({ action: "user_suspend", companyId: "acme", companyName: "ben@acme.com", actorEmail: "ops@skylar.app", reason: "Shared credentials" }),
    ]);
  });

  it("restores access and clears the suspension details", async () => {
    await act("sue", "unsuspend");

    const user = db.read("users", "sue")!;
    expect(user.status).toBe("active");
    expect(user).not.toHaveProperty("suspendedAt");
    expect(user).not.toHaveProperty("suspendedReason");
    expect(db.all("platform_audit_log")[0]).toMatchObject({ action: "user_unsuspend" });
  });

  it("refuses nonsense transitions", async () => {
    await expect(act("sue", "suspend", { reason: "again" })).rejects.toThrow(/already suspended/);
    await expect(act("ben", "unsuspend")).rejects.toThrow(/isn't suspended/);
  });
});

describe("delete and restore account", () => {
  it("needs the exact email, then disables the account and starts the 30 day clock", async () => {
    await expect(act("ben", "delete", { reason: "Left company", confirmEmail: "wrong@acme.com" })).rejects.toThrow(/doesn't match/);
    expect(db.read("users", "ben")?.status).toBe("active");

    const before = Date.now();
    await act("ben", "delete", { reason: "Left company", confirmEmail: " BEN@acme.com " });

    const user = db.read("users", "ben")!;
    expect(user).toMatchObject({ status: "disabled", deletedBy: "staff-1", deletedReason: "Left company" });
    const deleteAfter = (user.deleteAfter as { toMillis(): number }).toMillis();
    expect(deleteAfter).toBeGreaterThanOrEqual(before + 30 * DAY);
    expect(deleteAfter).toBeLessThan(Date.now() + 30 * DAY + 1000);
    expect(mocks.revokeRefreshTokens).toHaveBeenCalledWith("ben");
    expect(db.all("platform_audit_log")[0]).toMatchObject({ action: "user_delete" });
  });

  it("restores a deleted account to active", async () => {
    await act("ben", "delete", { reason: "Mistake", confirmEmail: "ben@acme.com" });
    await act("ben", "restore");

    const user = db.read("users", "ben")!;
    expect(user.status).toBe("active");
    for (const field of ["deletedAt", "deleteAfter", "deletedBy", "deletedReason"]) expect(user).not.toHaveProperty(field);
  });

  it("keeps an account suspended if it was suspended before it was deleted", async () => {
    await act("sue", "delete", { reason: "Cleanup", confirmEmail: "sue@acme.com" });
    await act("sue", "restore");

    expect(db.read("users", "sue")?.status).toBe("disabled");
  });

  it("won't suspend or delete an account that is already deleted, or restore one that isn't", async () => {
    await act("ben", "delete", { reason: "Gone", confirmEmail: "ben@acme.com" });

    await expect(act("ben", "suspend", { reason: "x y z" })).rejects.toThrow(/deleted/);
    await expect(act("ben", "delete", { reason: "again", confirmEmail: "ben@acme.com" })).rejects.toThrow(/already deleted/);
    await expect(act("ana", "restore")).rejects.toThrow(/isn't deleted/);
  });
});

describe("guards", () => {
  it.each(["suspend", "delete"] as const)("won't let you %s your own account", async (action) => {
    await expect(act("staff-1", action, { reason: "oops", confirmEmail: "ops@skylar.app" })).rejects.toThrow(/own account/);
    expect(db.read("users", "staff-1")?.status).toBe("active");
  });

  it("won't touch another platform admin", async () => {
    await expect(act("boss", "suspend", { reason: "coup" })).rejects.toThrow(/Platform admins/);
    expect(db.read("users", "boss")?.status).toBe("active");
    expect(db.all("platform_audit_log")).toEqual([]);
  });

  it("reports an unknown user", async () => {
    await expect(act("nobody", "suspend", { reason: "none" })).rejects.toThrow(/not found/i);
  });

  it("still succeeds if ending their Firebase sessions fails, since the status already blocks them", async () => {
    mocks.revokeRefreshTokens.mockRejectedValue(new Error("network"));

    await expect(act("ben", "suspend", { reason: "Testing" })).resolves.toBeUndefined();
    expect(db.read("users", "ben")?.status).toBe("disabled");
  });
});

describe("purgeExpiredUsers", () => {
  const deleted = (millisAfter: number) => ({
    companyId: "acme",
    email: "x@acme.com",
    role: "employee",
    status: "disabled",
    deletedAt: ts(NOW - 40 * DAY),
    deleteAfter: ts(millisAfter),
  });

  it("erases due accounts and their Firebase sign-in, leaving everyone else", async () => {
    db = createFakeDb(
      {
        users: {
          due: deleted(NOW - DAY),
          waiting: deleted(NOW + 5 * DAY),
          ana: { companyId: "acme", email: "ana@acme.com", role: "admin", status: "active" },
        },
      },
      { deleteSentinel: mocks.DELETE },
    );

    const result = await purgeExpiredUsers({ now: NOW });

    expect(result).toEqual({ due: 1, purged: ["due"], failed: [] });
    expect(mocks.deleteUser).toHaveBeenCalledTimes(1);
    expect(mocks.deleteUser).toHaveBeenCalledWith("due");
    expect(db.read("users", "due")).toBeUndefined();
    expect(db.read("users", "waiting")).toBeDefined();
    expect(db.read("users", "ana")).toBeDefined();
    expect(db.all("platform_audit_log")).toEqual([expect.objectContaining({ action: "user_purge", userId: "due", actorEmail: "System (30-day purge)" })]);
  });

  it("never erases an account that isn't marked deleted, even with a stray deleteAfter", async () => {
    db = createFakeDb({ users: { stray: { companyId: "acme", email: "s@acme.com", role: "employee", status: "active", deleteAfter: ts(NOW - DAY) } } });

    const result = await purgeExpiredUsers({ now: NOW });

    expect(result.purged).toEqual([]);
    expect(db.read("users", "stray")).toBeDefined();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it("still removes the account when its Firebase sign-in is already gone", async () => {
    db = createFakeDb({ users: { due: deleted(NOW - DAY) } });
    mocks.deleteUser.mockRejectedValue({ code: "auth/user-not-found" });

    const result = await purgeExpiredUsers({ now: NOW });

    expect(result.purged).toEqual(["due"]);
    expect(db.read("users", "due")).toBeUndefined();
  });

  it("keeps the account and reports a failure if Firebase can't delete the sign-in", async () => {
    db = createFakeDb({ users: { due: deleted(NOW - DAY) } });
    mocks.deleteUser.mockRejectedValue({ code: "auth/internal-error" });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await purgeExpiredUsers({ now: NOW });

    expect(result).toEqual({ due: 1, purged: [], failed: ["due"] });
    expect(db.read("users", "due")).toBeDefined();
  });
});
