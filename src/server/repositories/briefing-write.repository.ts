import "server-only";
import { FieldValue, type QueryDocumentSnapshot, type Transaction } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { ConflictError, NotFoundError } from "@/lib/errors";
import {
  buildEmployeeMemorySummary,
  type EmployeeMemoryLedgerItem,
} from "@/features/briefing/employee-memory-summary";
import { classifyLedgerRisk } from "@/features/briefing/risk-classification";
import type {
  CreateEmployeeInput,
  CreateNoteInput,
  UpdateEmployeeInput,
  UpdateNoteInput,
} from "@/schemas/briefing-write.schema";
import type { AuthSession } from "@/types/auth";

const EMPLOYEES_COLLECTION = "employees";
const LEDGER_COLLECTION = "employee_ledger_entries";
const USERS_COLLECTION = "users";
const COMPANIES_COLLECTION = "companies";

function employeeCode(number: number): string {
  return `EMP-${String(number).padStart(3, "0")}`;
}

async function assertUniqueEmployeeEmail(
  companyId: string,
  email: string,
  exceptEmployeeId?: string,
): Promise<void> {
  const snapshot = await adminDb()
    .collection(EMPLOYEES_COLLECTION)
    .where("companyId", "==", companyId)
    .where("email", "==", email)
    .limit(2)
    .get();

  const duplicate = snapshot.docs.find((doc) => doc.id !== exceptEmployeeId);
  if (duplicate) {
    throw new ConflictError("An employee with this work email already exists.");
  }
}

async function nextEmployeeCode(transaction: Transaction, companyId: string): Promise<string> {
  const companyRef = adminDb().collection(COMPANIES_COLLECTION).doc(companyId);
  const companySnapshot = await transaction.get(companyRef);
  const rawNext = companySnapshot.exists ? companySnapshot.get("nextEmployeeNumber") : undefined;
  const nextNumber = Number.isInteger(rawNext) && rawNext > 0 ? rawNext : 1;

  transaction.set(
    companyRef,
    {
      nextEmployeeNumber: nextNumber + 1,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return employeeCode(nextNumber);
}

async function workspaceUserIdForEmail(email: string, displayName: string): Promise<string> {
  const auth = adminAuth();
  try {
    return (await auth.getUserByEmail(email)).uid;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === "auth/user-not-found"
    ) {
      return (await auth.createUser({ email, displayName })).uid;
    }
    throw error;
  }
}

export async function createEmployeeRecord(
  session: AuthSession,
  input: CreateEmployeeInput,
): Promise<{ id: string; employeeCode: string }> {
  const now = FieldValue.serverTimestamp();
  const db = adminDb();
  await assertUniqueEmployeeEmail(session.companyId, input.email);
  const ref = db.collection(EMPLOYEES_COLLECTION).doc();
  const userId = await workspaceUserIdForEmail(input.email, input.name);
  const userRef = db.collection(USERS_COLLECTION).doc(userId);
  const userSnapshot = await userRef.get();
  const code = await db.runTransaction(async (transaction) => {
    const nextCode = await nextEmployeeCode(transaction, session.companyId);
    transaction.set(ref, {
      companyId: session.companyId,
      employeeCode: nextCode,
      name: input.name,
      email: input.email,
      jobTitle: input.jobTitle || null,
      location: input.location || null,
      summary: input.summary
        ? {
            text: input.summary,
            updatedAt: now,
          }
        : null,
      createdAt: now,
      updatedAt: now,
      createdBy: session.uid,
    });
    return nextCode;
  });

  if (userSnapshot.exists) {
    await userRef.set(
      {
        companyId: session.companyId,
        email: input.email,
        displayName: input.name,
        status: "active",
      },
      { merge: true },
    );
  } else {
    await userRef.set({
      companyId: session.companyId,
      email: input.email,
      displayName: input.name,
      role: "employee",
      status: "active",
    });
  }

  return { id: ref.id, employeeCode: code };
}

async function upsertWorkspaceUser(session: AuthSession, email: string, displayName: string) {
  const userId = await workspaceUserIdForEmail(email, displayName);
  const userRef = adminDb().collection(USERS_COLLECTION).doc(userId);
  const userSnapshot = await userRef.get();

  if (userSnapshot.exists) {
    await userRef.set(
      {
        companyId: session.companyId,
        email,
        displayName,
        status: "active",
      },
      { merge: true },
    );
    return;
  }

  await userRef.set({
    companyId: session.companyId,
    email,
    displayName,
    role: "employee",
    status: "active",
  });
}

function ledgerItemFromDoc(doc: QueryDocumentSnapshot): EmployeeMemoryLedgerItem {
  const statusDot = doc.get("statusDot");
  return {
    type: String(doc.get("type") ?? "note"),
    description: String(doc.get("description") ?? ""),
    statusDot: statusDot === "amber" || statusDot === "green" || statusDot === "red" ? statusDot : null,
    dateMs: timestampMs(doc.get("date")) || timestampMs(doc.get("createdAt")),
  };
}

async function employeeLedgerSummary(
  companyId: string,
  employeeId: string,
  overrides: EmployeeMemoryLedgerItem[] = [],
  omittedLedgerEntryId?: string,
): Promise<string | null> {
  const snapshot = await adminDb()
    .collection(LEDGER_COLLECTION)
    .where("companyId", "==", companyId)
    .where("employeeId", "==", employeeId)
    .get();
  const items = snapshot.docs
    .filter((doc) => doc.id !== omittedLedgerEntryId)
    .map(ledgerItemFromDoc);

  return buildEmployeeMemorySummary([...items, ...overrides]);
}

export async function updateEmployeeRecord(
  session: AuthSession,
  input: UpdateEmployeeInput,
): Promise<{ id: string }> {
  const now = FieldValue.serverTimestamp();
  const db = adminDb();
  const ref = db.collection(EMPLOYEES_COLLECTION).doc(input.employeeId);
  const snapshot = await ref.get();

  if (!snapshot.exists || snapshot.get("companyId") !== session.companyId) {
    throw new NotFoundError("Employee not found.");
  }
  if (input.email) {
    await assertUniqueEmployeeEmail(session.companyId, input.email, input.employeeId);
  }

  await ref.update({
    name: input.name,
    email: input.email || null,
    jobTitle: input.jobTitle || null,
    location: input.location || null,
    summary: input.summary
      ? {
          text: input.summary,
          updatedAt: now,
        }
      : null,
    updatedAt: now,
    updatedBy: session.uid,
  });

  if (input.email) {
    await upsertWorkspaceUser(session, input.email, input.name);
  }

  return { id: input.employeeId };
}

export async function createEmployeeNoteRecord(
  session: AuthSession,
  input: CreateNoteInput,
): Promise<{ employeeId: string; ledgerEntryId: string }> {
  const now = FieldValue.serverTimestamp();
  const db = adminDb();
  const employeeRef = db.collection(EMPLOYEES_COLLECTION).doc(input.employeeId);
  const ledgerRef = db.collection(LEDGER_COLLECTION).doc();
  const risk = classifyLedgerRisk(input.note);
  const statusDot = risk.isHighRisk ? "red" : input.statusDot === "none" ? null : input.statusDot;
  const summary = await employeeLedgerSummary(session.companyId, input.employeeId, [
    {
      type: "note",
      description: input.note,
      statusDot,
      dateMs: Date.now(),
    },
  ]);
  const employeeSnapshot = await employeeRef.get();

  if (!employeeSnapshot.exists || employeeSnapshot.get("companyId") !== session.companyId) {
    throw new NotFoundError("Choose an employee before saving the note.");
  }

  const batch = db.batch();
  batch.update(employeeRef, {
    summary: {
      text: summary,
      updatedAt: now,
    },
    updatedAt: now,
  });
  batch.set(ledgerRef, {
    companyId: session.companyId,
    employeeId: input.employeeId,
    type: "note",
    date: now,
    description: input.note,
    statusDot,
    riskReason: risk.reason,
    reference: null,
    conversationId: null,
    documentId: null,
    createdAt: now,
    createdBy: session.uid,
  });

  await batch.commit();
  return { employeeId: input.employeeId, ledgerEntryId: ledgerRef.id };
}

export async function updateEmployeeNoteRecord(
  session: AuthSession,
  input: UpdateNoteInput,
): Promise<{ employeeId: string }> {
  const db = adminDb();
  const noteRef = db.collection(LEDGER_COLLECTION).doc(input.ledgerEntryId);
  const noteSnapshot = await noteRef.get();

  if (!noteSnapshot.exists || noteSnapshot.get("companyId") !== session.companyId) {
    throw new NotFoundError("Note not found.");
  }

  const employeeId = String(noteSnapshot.get("employeeId") ?? "");
  const employeeRef = db.collection(EMPLOYEES_COLLECTION).doc(employeeId);
  const employeeSnapshot = await employeeRef.get();

  if (!employeeSnapshot.exists || employeeSnapshot.get("companyId") !== session.companyId) {
    throw new NotFoundError("Employee not found.");
  }

  const now = FieldValue.serverTimestamp();
  const risk = classifyLedgerRisk(input.note);
  const statusDot = risk.isHighRisk ? "red" : input.statusDot === "none" ? null : input.statusDot;
  const summary = await employeeLedgerSummary(
    session.companyId,
    employeeId,
    [
      {
        type: String(noteSnapshot.get("type") ?? "note"),
        description: input.note,
        statusDot,
        dateMs: Date.now(),
      },
    ],
    input.ledgerEntryId,
  );
  const batch = db.batch();
  batch.update(noteRef, {
    description: input.note,
    statusDot,
    riskReason: risk.reason,
    updatedAt: now,
    updatedBy: session.uid,
  });
  batch.update(employeeRef, {
    summary: summary ? { text: summary, updatedAt: now } : null,
    updatedAt: now,
  });
  await batch.commit();

  return { employeeId };
}

export async function deleteEmployeeNoteRecord(
  session: AuthSession,
  ledgerEntryId: string,
): Promise<{ employeeId: string }> {
  const db = adminDb();
  const noteRef = db.collection(LEDGER_COLLECTION).doc(ledgerEntryId);
  const noteSnapshot = await noteRef.get();

  if (!noteSnapshot.exists || noteSnapshot.get("companyId") !== session.companyId) {
    throw new NotFoundError("Note not found.");
  }

  const employeeId = String(noteSnapshot.get("employeeId") ?? "");
  const employeeRef = db.collection(EMPLOYEES_COLLECTION).doc(employeeId);
  const employeeSnapshot = await employeeRef.get();
  if (!employeeSnapshot.exists || employeeSnapshot.get("companyId") !== session.companyId) {
    throw new NotFoundError("Employee not found.");
  }

  const summary = await employeeLedgerSummary(session.companyId, employeeId, [], ledgerEntryId);
  const batch = db.batch();
  batch.delete(noteRef);
  batch.update(employeeRef, {
    summary: summary ? { text: summary, updatedAt: FieldValue.serverTimestamp() } : null,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  return { employeeId };
}

export async function deleteEmployeeRecord(
  session: AuthSession,
  employeeId: string,
): Promise<void> {
  const db = adminDb();
  const employeeRef = db.collection(EMPLOYEES_COLLECTION).doc(employeeId);
  const employeeSnapshot = await employeeRef.get();

  if (!employeeSnapshot.exists || employeeSnapshot.get("companyId") !== session.companyId) {
    throw new NotFoundError("Employee not found.");
  }

  const ledger = await db
    .collection(LEDGER_COLLECTION)
    .where("companyId", "==", session.companyId)
    .where("employeeId", "==", employeeId)
    .get();
  const batch = db.batch();
  batch.delete(employeeRef);
  ledger.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

function timestampMs(value: unknown): number {
  if (value && typeof value === "object" && "toMillis" in value) {
    const toMillis = (value as { toMillis?: () => number }).toMillis;
    if (typeof toMillis === "function") return toMillis.call(value);
  }
  return 0;
}
