import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { isSoftDeleted } from "./soft-delete";

const EMPLOYEES = "employees";
const LEDGER = "employee_ledger_entries";

export type DeletedEmployee = {
  id: string;
  name: string;
  email: string | null;
  jobTitle: string | null;
  deletedAtMs: number | null;
  deleteAfterMs: number | null;
  /** Notes that come back with the employee. */
  noteCount: number;
};

export type DeletedNote = {
  id: string;
  employeeId: string;
  employeeName: string;
  type: string;
  description: string;
  deletedAtMs: number | null;
  deleteAfterMs: number | null;
};

function ms(value: unknown): number | null {
  return value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function" ? value.toMillis() : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function listRecentlyDeleted(companyId: string): Promise<{ employees: DeletedEmployee[]; notes: DeletedNote[] }> {
  const db = adminDb();
  const [employeeSnapshot, ledgerSnapshot] = await Promise.all([
    db.collection(EMPLOYEES).where("companyId", "==", companyId).get(),
    db.collection(LEDGER).where("companyId", "==", companyId).get(),
  ]);

  const liveNames = new Map<string, string>();
  const deletedEmployeeIds = new Set<string>();
  for (const doc of employeeSnapshot.docs) {
    if (isSoftDeleted(doc)) deletedEmployeeIds.add(doc.id);
    else liveNames.set(doc.id, text(doc.get("name")) ?? "Employee");
  }

  const keptNotes = new Map<string, number>();
  const notes: DeletedNote[] = [];
  for (const doc of ledgerSnapshot.docs) {
    const employeeId = text(doc.get("employeeId")) ?? "";
    if (!isSoftDeleted(doc)) {
      keptNotes.set(employeeId, (keptNotes.get(employeeId) ?? 0) + 1);
      continue;
    }
    // A note deleted on its own is shown here; notes of a deleted employee come back with that employee.
    if (!liveNames.has(employeeId)) continue;
    notes.push({
      id: doc.id,
      employeeId,
      employeeName: liveNames.get(employeeId) ?? "Employee",
      type: text(doc.get("type")) ?? "note",
      description: text(doc.get("description")) ?? "No note text saved.",
      deletedAtMs: ms(doc.get("deletedAt")),
      deleteAfterMs: ms(doc.get("deleteAfter")),
    });
  }

  const employees = employeeSnapshot.docs
    .filter((doc) => deletedEmployeeIds.has(doc.id))
    .map(
      (doc): DeletedEmployee => ({
        id: doc.id,
        name: text(doc.get("name")) ?? "Employee",
        email: text(doc.get("email")),
        jobTitle: text(doc.get("jobTitle")),
        deletedAtMs: ms(doc.get("deletedAt")),
        deleteAfterMs: ms(doc.get("deleteAfter")),
        noteCount: keptNotes.get(doc.id) ?? 0,
      }),
    );

  const newestFirst = <T extends { deletedAtMs: number | null }>(a: T, b: T) => (b.deletedAtMs ?? 0) - (a.deletedAtMs ?? 0);
  return { employees: employees.sort(newestFirst), notes: notes.sort(newestFirst) };
}

/** Permanently removes employees and notes whose 30-day retention has ended. */
export async function purgeExpiredRecords({ now = Date.now(), limit = 200 } = {}) {
  const db = adminDb();
  const cutoff = Timestamp.fromMillis(now);
  const [employees, notes] = await Promise.all([
    db.collection(EMPLOYEES).where("deleteAfter", "<=", cutoff).limit(limit).get(),
    db.collection(LEDGER).where("deleteAfter", "<=", cutoff).limit(limit).get(),
  ]);

  // The query already guarantees this, but nothing is erased unless it is explicitly marked deleted and due.
  const isDue = (doc: { get(field: string): unknown }) => isSoftDeleted(doc) && (ms(doc.get("deleteAfter")) ?? Infinity) <= now;
  const dueEmployees = employees.docs.filter(isDue);
  const dueNotes = notes.docs.filter(isDue);

  const writer = db.bulkWriter();
  let notesRemovedWithEmployees = 0;
  for (const doc of dueNotes) void writer.delete(doc.ref);
  for (const doc of dueEmployees) {
    const companyId = doc.get("companyId");
    if (typeof companyId === "string") {
      const entries = await db.collection(LEDGER).where("companyId", "==", companyId).where("employeeId", "==", doc.id).get();
      notesRemovedWithEmployees += entries.size;
      entries.docs.forEach((entry) => void writer.delete(entry.ref));
    }
    void writer.delete(doc.ref);
  }
  await writer.close();

  return { employees: dueEmployees.length, notes: dueNotes.length, notesRemovedWithEmployees };
}
