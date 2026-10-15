import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb, ts } from "../../helpers/fake-firestore";

const mocks = vi.hoisted(() => ({ getUsers: vi.fn() }));
let db: ReturnType<typeof createFakeDb>;

vi.mock("server-only", () => ({}));
vi.mock("firebase-admin/firestore", () => ({ FieldValue: { serverTimestamp: () => ({}), delete: () => ({}) } }));
vi.mock("@/lib/firebase/admin", () => ({ adminDb: () => db, adminAuth: () => ({ getUsers: mocks.getUsers }) }));

import { listPlatformUsers, listWorkspaceUsers } from "@/server/repositories/platform.repository";

const SAVED = Date.UTC(2026, 0, 5);
const FROM_AUTH = "Tue, 10 Feb 2026 09:30:00 GMT";

function seed(extra: Record<string, Record<string, unknown>> = {}) {
  db = createFakeDb({
    users: {
      saved: { companyId: "acme", email: "saved@acme.com", role: "admin", status: "active", createdAt: ts(SAVED) },
      old: { companyId: "acme", email: "old@acme.com", role: "employee", status: "active" },
      ...extra,
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUsers.mockImplementation(async (identifiers: Array<{ uid: string }>) => ({
    users: identifiers.filter(({ uid }) => uid !== "ghost").map(({ uid }) => ({ uid, metadata: { creationTime: FROM_AUTH } })),
    notFound: [],
  }));
});

describe("sign-up date on the users page", () => {
  it("uses the saved date, and only asks Firebase about accounts that have none", async () => {
    seed();

    const users = await listPlatformUsers();

    expect(users.find((user) => user.id === "saved")?.createdAtMs).toBe(SAVED);
    expect(users.find((user) => user.id === "old")?.createdAtMs).toBe(Date.parse(FROM_AUTH));
    expect(mocks.getUsers).toHaveBeenCalledTimes(1);
    expect(mocks.getUsers).toHaveBeenCalledWith([{ uid: "old" }]);
  });

  it("doesn't call Firebase at all when every account already has a date", async () => {
    seed();
    db = createFakeDb({ users: { saved: { companyId: "acme", email: "a@acme.com", role: "admin", status: "active", createdAt: ts(SAVED) } } });

    await listPlatformUsers();

    expect(mocks.getUsers).not.toHaveBeenCalled();
  });

  it("leaves the date unknown for an account Firebase doesn't know", async () => {
    seed({ ghost: { companyId: "acme", email: "ghost@acme.com", role: "employee", status: "active" } });

    const users = await listPlatformUsers();

    expect(users.find((user) => user.id === "ghost")?.createdAtMs).toBeNull();
  });

  it("still lists everyone if the Firebase lookup fails", async () => {
    seed();
    mocks.getUsers.mockRejectedValue(new Error("quota"));

    const users = await listPlatformUsers();

    expect(users).toHaveLength(2);
    expect(users.find((user) => user.id === "old")?.createdAtMs).toBeNull();
    expect(users.find((user) => user.id === "saved")?.createdAtMs).toBe(SAVED);
  });

  it("looks accounts up in batches of 100", async () => {
    const many = Object.fromEntries(
      Array.from({ length: 230 }, (_, index) => [`u${index}`, { companyId: "acme", email: `u${index}@acme.com`, role: "employee", status: "active" }]),
    );
    db = createFakeDb({ users: many });

    const users = await listPlatformUsers();

    expect(mocks.getUsers.mock.calls.map(([batch]) => batch.length)).toEqual([100, 100, 30]);
    expect(users.every((user) => user.createdAtMs === Date.parse(FROM_AUTH))).toBe(true);
  });

  it("applies the same fallback to a workspace's member list", async () => {
    seed();

    const members = await listWorkspaceUsers("acme");

    expect(members.find((member) => member.id === "old")?.createdAtMs).toBe(Date.parse(FROM_AUTH));
    expect(members.find((member) => member.id === "saved")?.createdAtMs).toBe(SAVED);
  });
});
