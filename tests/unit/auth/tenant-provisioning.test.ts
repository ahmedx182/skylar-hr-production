import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession } from "@/types/auth";

const mocks = vi.hoisted(() => ({
  collection: vi.fn(), runTransaction: vi.fn(), transactionGet: vi.fn(), set: vi.fn(), batch: vi.fn(), commit: vi.fn(),
  getUserByEmail: vi.fn(), delete: vi.fn(),
}));
vi.mock("@/lib/firebase/admin", () => ({ adminDb: () => mocks, adminAuth: () => mocks }));

import { provisionSignupWorkspace, provisionInvitedUser, updateAccountSettings } from "@/server/repositories/user.repository";
import { cancelInvite, createInvite } from "@/server/repositories/invite.repository";
import { createEmployeeRecord } from "@/server/repositories/briefing-write.repository";

const session: AuthSession = { uid: "owner", email: "owner@acme.com", companyId: "tenant-a", role: "admin" };
const snapshot = (id: string, data?: Record<string, unknown>) => ({
  id, exists: !!data, data: () => data, get: (key: string) => data?.[key],
});

describe("tenant account provisioning", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    const query = { where: vi.fn(), limit: vi.fn(), get: async () => ({ docs: [], empty: true }) };
    query.where.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    mocks.collection.mockImplementation((collection: string) => ({
      doc: (id = "new-record") => ({ id, collection, get: async () => snapshot(id, { companyId: "tenant-a" }), set: mocks.set, delete: mocks.delete }),
      where: () => query,
    }));
    mocks.runTransaction.mockImplementation(callback => callback({ get: mocks.transactionGet, set: mocks.set }));
    mocks.transactionGet.mockImplementation((ref: { id: string; collection: string }) => Promise.resolve(
      ref.collection === "companies" ? snapshot(ref.id, { nextEmployeeNumber: 1 }) : snapshot(ref.id),
    ));
    mocks.getUserByEmail.mockResolvedValue({ uid: "employee-uid" });
    mocks.batch.mockReturnValue({ set: mocks.set, commit: mocks.commit });
  });

  it("starts a new workspace without an email-domain restriction", async () => {
    const user = await provisionSignupWorkspace({ uid: "owner", email: "owner@acme.com", companyName: "Acme" });
    expect(user.role).toBe("admin");
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ collection: "companies" }), expect.objectContaining({ createdBy: "owner" }));
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ collection: "companies" }), expect.not.objectContaining({ allowedEmailDomains: expect.anything() }));
  });

  it("refuses to overwrite an existing account through invitation acceptance", async () => {
    mocks.transactionGet.mockResolvedValue(snapshot("employee-uid", { companyId: "tenant-b", email: "employee@acme.com", role: "employee", status: "active" }));
    await expect(provisionInvitedUser({ uid: "employee-uid", email: "employee@acme.com", companyId: "tenant-a", role: "employee", linkedEmployeeId: null })).rejects.toThrow("another workspace");
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("refuses to move another tenant's account when adding an employee", async () => {
    mocks.transactionGet.mockResolvedValue(snapshot("employee-uid", { companyId: "tenant-b", status: "active" }));
    await expect(createEmployeeRecord(session, { name: "Employee", email: "employee@acme.com" })).rejects.toThrow("another workspace");
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("creates the employee and workspace account in the same transaction", async () => {
    await createEmployeeRecord(session, { name: "Employee", email: "employee@acme.com" });
    expect(mocks.runTransaction).toHaveBeenCalledTimes(1);
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ collection: "employees" }), expect.objectContaining({ companyId: "tenant-a", email: "employee@acme.com" }));
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ collection: "users" }), expect.objectContaining({ companyId: "tenant-a", role: "employee" }), { merge: true });
  });

  it("saves workspace changes only to the admin's workspace", async () => {
    await updateAccountSettings(session, { companyName: "Acme Ltd" });
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ collection: "companies", id: "tenant-a" }), expect.objectContaining({ name: "Acme Ltd" }), { merge: true });
  });

  it("does not let employees change workspace settings", async () => {
    await updateAccountSettings({ ...session, role: "employee" }, { companyName: "Acme" });
    expect(mocks.set.mock.calls.some(([ref]) => ref.collection === "companies")).toBe(false);
  });

  it("rejects another tenant's employee link on invitations", async () => {
    const doc = { get: async () => snapshot("foreign", { companyId: "tenant-b" }) };
    mocks.collection.mockReturnValue({ doc: () => doc });
    await expect(createInvite(session, "person@acme.com", "employee", "foreign")).rejects.toThrow("not in your workspace");
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("rejects invitations sent by employees", async () => {
    await expect(createInvite({ ...session, role: "employee" }, "person@acme.com", "employee", null)).rejects.toThrow("Not allowed");
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("cancels a pending invite in the admin's own workspace", async () => {
    const doc = { get: async () => snapshot("invite-1", { companyId: "tenant-a", status: "pending" }), delete: mocks.delete };
    mocks.collection.mockReturnValue({ doc: () => doc });
    await cancelInvite(session, "invite-1");
    expect(mocks.delete).toHaveBeenCalledTimes(1);
  });

  it("refuses to cancel another tenant's invite", async () => {
    const doc = { get: async () => snapshot("invite-1", { companyId: "tenant-b", status: "pending" }), delete: mocks.delete };
    mocks.collection.mockReturnValue({ doc: () => doc });
    await expect(cancelInvite(session, "invite-1")).rejects.toThrow("Invite not found");
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("refuses to cancel an invite that was already accepted", async () => {
    const doc = { get: async () => snapshot("invite-1", { companyId: "tenant-a", status: "accepted" }), delete: mocks.delete };
    mocks.collection.mockReturnValue({ doc: () => doc });
    await expect(cancelInvite(session, "invite-1")).rejects.toThrow("no longer pending");
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("refuses to let employees cancel invites", async () => {
    await expect(cancelInvite({ ...session, role: "employee" }, "invite-1")).rejects.toThrow("Not allowed");
    expect(mocks.delete).not.toHaveBeenCalled();
  });
});
