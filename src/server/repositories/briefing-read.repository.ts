import "server-only";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { NotFoundError } from "@/lib/errors";

const EMPLOYEES_COLLECTION = "employees";
const LEDGER_COLLECTION = "employee_ledger_entries";

export type EmployeeRecord = {
  id: string;
  name: string;
  email: string | null;
  jobTitle: string | null;
  location: string | null;
  summary: string | null;
  updatedAtMs: number;
};

export type LedgerRecord = {
  id: string;
  employeeId: string;
  employeeName: string | null;
  type: string;
  description: string;
  statusDot: "amber" | "green" | "red" | null;
  dateMs: number;
};

type EmployeeData = {
  companyId?: unknown;
  name?: unknown;
  email?: unknown;
  jobTitle?: unknown;
  location?: unknown;
  summary?: unknown;
  updatedAt?: unknown;
  createdAt?: unknown;
};

type LedgerData = {
  companyId?: unknown;
  employeeId?: unknown;
  type?: unknown;
  description?: unknown;
  statusDot?: unknown;
  date?: unknown;
  createdAt?: unknown;
};

function timestampMs(value: unknown): number {
  if (value && typeof value === "object" && "toMillis" in value) {
    const toMillis = (value as { toMillis?: () => number }).toMillis;
    if (typeof toMillis === "function") return toMillis.call(value);
  }
  return 0;
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function summaryText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object" && "text" in value) {
    return optionalString((value as { text?: unknown }).text);
  }
  return null;
}

function employeeFromDoc(doc: QueryDocumentSnapshot): EmployeeRecord {
  const data = doc.data() as EmployeeData;
  return {
    id: doc.id,
    name: optionalString(data.name) ?? "Unnamed employee",
    email: optionalString(data.email),
    jobTitle: optionalString(data.jobTitle),
    location: optionalString(data.location),
    summary: summaryText(data.summary),
    updatedAtMs: timestampMs(data.updatedAt) || timestampMs(data.createdAt),
  };
}

function ledgerFromDoc(doc: QueryDocumentSnapshot, employeeName: string | null): LedgerRecord {
  const data = doc.data() as LedgerData;
  const statusDot = data.statusDot === "amber" || data.statusDot === "green" || data.statusDot === "red"
    ? data.statusDot
    : null;

  return {
    id: doc.id,
    employeeId: optionalString(data.employeeId) ?? "",
    employeeName,
    type: optionalString(data.type) ?? "note",
    description: optionalString(data.description) ?? "No note text saved.",
    statusDot,
    dateMs: timestampMs(data.date) || timestampMs(data.createdAt),
  };
}

export async function getCompanyEmployee(
  companyId: string,
  employeeId: string,
): Promise<EmployeeRecord> {
  const doc = await adminDb().collection(EMPLOYEES_COLLECTION).doc(employeeId).get();
  const data = doc.data() as EmployeeData | undefined;

  if (!doc.exists || !data || data.companyId !== companyId) {
    throw new NotFoundError("Employee not found.");
  }

  return employeeFromDoc(doc as QueryDocumentSnapshot);
}

export async function listCompanyEmployees(companyId: string): Promise<EmployeeRecord[]> {
  const snapshot = await adminDb()
    .collection(EMPLOYEES_COLLECTION)
    .where("companyId", "==", companyId)
    .get();

  return snapshot.docs
    .map(employeeFromDoc)
    .sort((a, b) => b.updatedAtMs - a.updatedAtMs);
}

export async function listEmployeeLedger(
  companyId: string,
  employeeId: string,
): Promise<LedgerRecord[]> {
  const employee = await getCompanyEmployee(companyId, employeeId);
  const ledgerSnapshot = await adminDb()
    .collection(LEDGER_COLLECTION)
    .where("companyId", "==", companyId)
    .where("employeeId", "==", employeeId)
    .get();

  return ledgerSnapshot.docs
    .map((doc) => ledgerFromDoc(doc, employee.name))
    .sort((a, b) => b.dateMs - a.dateMs);
}

export async function listCompanyLedger(companyId: string): Promise<LedgerRecord[]> {
  const [employees, ledgerSnapshot] = await Promise.all([
    listCompanyEmployees(companyId),
    adminDb().collection(LEDGER_COLLECTION).where("companyId", "==", companyId).get(),
  ]);
  const employeeNames = new Map(employees.map((employee) => [employee.id, employee.name]));

  return ledgerSnapshot.docs
    .map((doc) => {
      const employeeId = optionalString((doc.data() as LedgerData).employeeId) ?? "";
      return ledgerFromDoc(doc, employeeNames.get(employeeId) ?? null);
    })
    .sort((a, b) => b.dateMs - a.dateMs);
}

export async function getCompanyLedgerEntry(
  companyId: string,
  ledgerEntryId: string,
): Promise<LedgerRecord> {
  const doc = await adminDb().collection(LEDGER_COLLECTION).doc(ledgerEntryId).get();
  const data = doc.data() as LedgerData | undefined;

  if (!doc.exists || !data || data.companyId !== companyId) {
    throw new NotFoundError("Note not found.");
  }

  const employeeId = optionalString(data.employeeId) ?? "";
  let employeeName: string | null = null;

  if (employeeId) {
    const employeeDoc = await adminDb().collection(EMPLOYEES_COLLECTION).doc(employeeId).get();
    if (employeeDoc.exists && employeeDoc.get("companyId") === companyId) {
      employeeName = optionalString(employeeDoc.get("name"));
    }
  }

  return ledgerFromDoc(doc as QueryDocumentSnapshot, employeeName);
}
