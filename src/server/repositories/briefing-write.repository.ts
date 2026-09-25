import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { NotFoundError } from "@/lib/errors";
import type {
  CreateEmployeeInput,
  CreateNoteInput,
  UpdateEmployeeInput,
} from "@/schemas/briefing-write.schema";
import type { AuthSession } from "@/types/auth";

const EMPLOYEES_COLLECTION = "employees";
const LEDGER_COLLECTION = "employee_ledger_entries";
const USERS_COLLECTION = "users";

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
): Promise<{ id: string }> {
  const now = FieldValue.serverTimestamp();
  const ref = adminDb().collection(EMPLOYEES_COLLECTION).doc();
  const userId = await workspaceUserIdForEmail(input.email, input.name);
  const userRef = adminDb().collection(USERS_COLLECTION).doc(userId);
  const userSnapshot = await userRef.get();

  await ref.set({
    companyId: session.companyId,
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

  return { id: ref.id };
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
  const statusDot = input.statusDot === "none" ? null : input.statusDot;
  const employeeSnapshot = await employeeRef.get();

  if (!employeeSnapshot.exists || employeeSnapshot.get("companyId") !== session.companyId) {
    throw new NotFoundError("Choose an employee before saving the note.");
  }

  const batch = db.batch();
  batch.update(employeeRef, {
    summary: {
      text: input.note,
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
    reference: null,
    conversationId: null,
    documentId: null,
    createdAt: now,
    createdBy: session.uid,
  });

  await batch.commit();
  return { employeeId: input.employeeId, ledgerEntryId: ledgerRef.id };
}
