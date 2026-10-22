import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb } from "../../helpers/fake-firestore";

const mocks = vi.hoisted(() => ({ env: { PLATFORM_ADMIN_EMAILS: "Root@Skylar.app" as string | undefined } }));

let db: ReturnType<typeof createFakeDb>;

vi.mock("server-only", () => ({}));
vi.mock("firebase-admin/firestore", () => ({ FieldValue: { serverTimestamp: () => ({ serverTimestamp: true }) } }));
vi.mock("@/lib/firebase/admin", () => ({ adminDb: () => db }));
vi.mock("@/lib/env/server", () => ({ getServerEnv: () => mocks.env }));

import { isPlatformAdminEmail, listPlatformAdmins } from "@/server/auth/platform-admin-email";
import { applyPlatformAdminAction } from "@/server/platform/platform-admins";

const actor = { uid: "staff-1", email: "ops@skylar.app" };

beforeEach(() => {
  mocks.env = { PLATFORM_ADMIN_EMAILS: "Root@Skylar.app" };
  db = createFakeDb({ platform_admins: { "ops@skylar.app": { email: "ops@skylar.app" } } });
});

describe("isPlatformAdminEmail", () => {
  it("accepts verified env and Firestore admins, case-insensitively", async () => {
    expect(await isPlatformAdminEmail("root@skylar.app", true)).toBe(true);
    expect(await isPlatformAdminEmail(" OPS@skylar.app ", true)).toBe(true);
  });

  it("rejects unverified emails and everyone else", async () => {
    expect(await isPlatformAdminEmail("ops@skylar.app", false)).toBe(false);
    expect(await isPlatformAdminEmail("ana@acme.com", true)).toBe(false);
    expect(await isPlatformAdminEmail(null, true)).toBe(false);
  });

  it("picks up a grant immediately, with no restart", async () => {
    expect(await isPlatformAdminEmail("paolo@skylar.app", true)).toBe(false);
    await applyPlatformAdminAction({ email: "Paolo@Skylar.app", action: "grant", reason: "Co-founder", actor });
    expect(await isPlatformAdminEmail("paolo@skylar.app", true)).toBe(true);
  });

  it("works with no env allowlist at all", async () => {
    mocks.env = { PLATFORM_ADMIN_EMAILS: undefined };
    expect(await isPlatformAdminEmail("ops@skylar.app", true)).toBe(true);
    expect(await isPlatformAdminEmail("root@skylar.app", true)).toBe(false);
  });
});

describe("listPlatformAdmins", () => {
  it("labels where each admin's access comes from", async () => {
    expect(Object.fromEntries(await listPlatformAdmins())).toEqual({ "ops@skylar.app": "console", "root@skylar.app": "env" });
  });

  it("leaves out revoked admins, including env ones", async () => {
    db = createFakeDb({ platform_admins: { "ops@skylar.app": { email: "ops@skylar.app" }, "root@skylar.app": { revoked: true }, "old@skylar.app": { revoked: true } } });
    expect(Object.fromEntries(await listPlatformAdmins())).toEqual({ "ops@skylar.app": "console" });
  });
});

describe("applyPlatformAdminAction", () => {
  it("grants access and records it in the audit log", async () => {
    await applyPlatformAdminAction({ email: "paolo@skylar.app", action: "grant", reason: "Co-founder", actor });

    expect(db.read("platform_admins", "paolo@skylar.app")).toMatchObject({ email: "paolo@skylar.app", grantedBy: "staff-1", reason: "Co-founder" });
    expect(db.all("platform_audit_log")).toEqual([
      expect.objectContaining({ action: "platform_admin_grant", companyName: "paolo@skylar.app", actorEmail: "ops@skylar.app", reason: "Co-founder" }),
    ]);
  });

  it("grants anyone by email, even before they have an account", async () => {
    await applyPlatformAdminAction({ email: "new.hire@elsewhere.io", action: "grant", reason: "Joining ops", actor });
    expect(await isPlatformAdminEmail("new.hire@elsewhere.io", true)).toBe(true);
  });

  it("revokes a console admin immediately", async () => {
    db = createFakeDb({ platform_admins: { "paolo@skylar.app": { email: "paolo@skylar.app" } } });
    await applyPlatformAdminAction({ email: "paolo@skylar.app", action: "revoke", reason: null, actor });

    expect(await isPlatformAdminEmail("paolo@skylar.app", true)).toBe(false);
    expect(db.read("platform_admins", "paolo@skylar.app")).toMatchObject({ revoked: true, revokedBy: "staff-1" });
    expect(db.all("platform_audit_log")).toEqual([expect.objectContaining({ action: "platform_admin_revoke" })]);
  });

  it("revokes an env admin too, and can grant them back", async () => {
    await applyPlatformAdminAction({ email: "root@skylar.app", action: "revoke", reason: "Left", actor });
    expect(await isPlatformAdminEmail("root@skylar.app", true)).toBe(false);

    await applyPlatformAdminAction({ email: "root@skylar.app", action: "grant", reason: "Back", actor });
    expect(await isPlatformAdminEmail("root@skylar.app", true)).toBe(true);
  });

  it("won't add duplicates, remove non-admins, or remove yourself", async () => {
    await expect(applyPlatformAdminAction({ email: "root@skylar.app", action: "grant", reason: "x", actor })).rejects.toThrow(/already/);
    await expect(applyPlatformAdminAction({ email: "ops@skylar.app", action: "grant", reason: "x", actor })).rejects.toThrow(/already/);
    await expect(applyPlatformAdminAction({ email: "ana@acme.com", action: "revoke", reason: null, actor })).rejects.toThrow(/isn't a super admin/);
    await expect(applyPlatformAdminAction({ email: "OPS@skylar.app", action: "revoke", reason: null, actor })).rejects.toThrow(/your own/);

    expect(db.read("platform_admins", "ops@skylar.app")).toBeDefined();
    expect(db.all("platform_audit_log")).toEqual([]);
  });
});
