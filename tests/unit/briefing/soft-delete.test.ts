import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb, ts } from "../../helpers/fake-firestore";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 14, 12);
const gone = { deletedAt: ts(NOW - 40 * DAY), deleteAfter: ts(NOW - 10 * DAY), deletedBy: "u1" };
const recent = { deletedAt: ts(NOW - 2 * DAY), deleteAfter: ts(NOW + 28 * DAY), deletedBy: "u1" };

let db: ReturnType<typeof createFakeDb>;

vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => ({ adminDb: () => db }));

import { getCompanyEmployee, getCompanyLedgerEntry, listCompanyEmployees, listCompanyLedger, listEmployeeLedger } from "@/server/repositories/briefing-read.repository";
import { listRecentlyDeleted, purgeExpiredRecords } from "@/server/repositories/recently-deleted.repository";

function seed() {
  db = createFakeDb({
    employees: {
      ana: { companyId: "acme", name: "Ana Active", email: "ana@acme.com" },
      dan: { companyId: "acme", name: "Dan Deleted", email: "dan@acme.com", ...recent },
      old: { companyId: "acme", name: "Old Expired", email: "old@acme.com", ...gone },
      other: { companyId: "globex", name: "Other Co", email: "o@globex.com" },
    },
    employee_ledger_entries: {
      n1: { companyId: "acme", employeeId: "ana", type: "note", description: "Kept note" },
      n2: { companyId: "acme", employeeId: "ana", type: "note", description: "Deleted note", ...recent },
      n3: { companyId: "acme", employeeId: "dan", type: "note", description: "Dan's note" },
      n4: { companyId: "acme", employeeId: "old", type: "conversation", description: "Old chat" },
      n5: { companyId: "acme", employeeId: "old", type: "note", description: "Old note, deleted earlier", ...gone },
      n6: { companyId: "acme", employeeId: "ana", type: "note", description: "Expired note", ...gone },
      n7: { companyId: "globex", employeeId: "other", type: "note", description: "Other workspace" },
    },
  });
}

describe("soft-deleted records are hidden everywhere they are read", () => {
  beforeEach(seed);

  it("lists only live employees", async () => {
    const names = (await listCompanyEmployees("acme")).map((employee) => employee.name);
    expect(names).toEqual(["Ana Active"]);
  });

  it("refuses to open a deleted employee", async () => {
    await expect(getCompanyEmployee("acme", "dan")).rejects.toThrow(/not found/i);
    await expect(listEmployeeLedger("acme", "dan")).rejects.toThrow(/not found/i);
    await expect(getCompanyEmployee("acme", "ana")).resolves.toMatchObject({ name: "Ana Active" });
  });

  it("hides deleted notes and the notes of deleted employees from the ledger", async () => {
    const ids = (await listCompanyLedger("acme")).map((entry) => entry.id);
    expect(ids).toEqual(["n1"]);
  });

  it("hides a deleted note from the employee's history", async () => {
    expect((await listEmployeeLedger("acme", "ana")).map((entry) => entry.id)).toEqual(["n1"]);
  });

  it("refuses to open a deleted note, or a note whose employee is deleted", async () => {
    await expect(getCompanyLedgerEntry("acme", "n2")).rejects.toThrow(/not found/i);
    await expect(getCompanyLedgerEntry("acme", "n3")).rejects.toThrow(/not found/i);
    await expect(getCompanyLedgerEntry("acme", "n1")).resolves.toMatchObject({ description: "Kept note" });
  });
});

describe("listRecentlyDeleted", () => {
  beforeEach(seed);

  it("lists deleted employees with the notes that will come back, and notes deleted on their own", async () => {
    const result = await listRecentlyDeleted("acme");

    expect(result.employees.map((employee) => [employee.id, employee.noteCount])).toEqual(
      expect.arrayContaining([
        ["dan", 1],
        ["old", 1],
      ]),
    );
    // n2 (live employee) and n6 are listed; n3 belongs to a deleted employee, so it returns with Dan instead.
    expect(result.notes.map((note) => note.id).sort()).toEqual(["n2", "n6"]);
    expect(result.notes.find((note) => note.id === "n2")).toMatchObject({ employeeName: "Ana Active", deleteAfterMs: NOW + 28 * DAY });
  });

  it("never lists another workspace's records", async () => {
    const result = await listRecentlyDeleted("globex");
    expect(result.employees).toEqual([]);
    expect(result.notes).toEqual([]);
  });

  it("returns the newest deletion first", async () => {
    const { employees } = await listRecentlyDeleted("acme");
    expect(employees[0].id).toBe("dan");
  });
});

describe("purgeExpiredRecords", () => {
  beforeEach(seed);

  it("erases expired employees with all their notes, and expired notes, and nothing else", async () => {
    const result = await purgeExpiredRecords({ now: NOW });

    expect(result).toEqual({ employees: 1, notes: 2, notesRemovedWithEmployees: 2 });
    expect(db.ids("employees")).toEqual(["ana", "dan", "other"]);
    // old's notes (n4, n5) and the expired note n6 are gone; everything else stays.
    expect(db.ids("employee_ledger_entries")).toEqual(["n1", "n2", "n3", "n7"]);
  });

  it("keeps items still inside their 30 days", async () => {
    await purgeExpiredRecords({ now: NOW - 20 * DAY });

    expect(db.ids("employees")).toContain("dan");
    expect(db.ids("employee_ledger_entries")).toContain("n2");
  });

  it("never erases a record that isn't marked deleted, even with a stray deleteAfter", async () => {
    db = createFakeDb({
      employees: { stray: { companyId: "acme", name: "Stray", deleteAfter: ts(NOW - DAY) } },
      employee_ledger_entries: { s1: { companyId: "acme", employeeId: "stray", type: "note", description: "x" } },
    });

    await purgeExpiredRecords({ now: NOW });

    expect(db.ids("employees")).toEqual(["stray"]);
    expect(db.ids("employee_ledger_entries")).toEqual(["s1"]);
  });

  it("does not touch another workspace's notes that share an employee id", async () => {
    db = createFakeDb({
      employees: { dup: { companyId: "acme", name: "Dup", ...gone } },
      employee_ledger_entries: {
        mine: { companyId: "acme", employeeId: "dup", type: "note", description: "mine" },
        theirs: { companyId: "globex", employeeId: "dup", type: "note", description: "theirs" },
      },
    });

    await purgeExpiredRecords({ now: NOW });

    expect(db.ids("employee_ledger_entries")).toEqual(["theirs"]);
  });
});
