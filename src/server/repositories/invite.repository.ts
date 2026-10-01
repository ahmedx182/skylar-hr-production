import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { AuthorizationError, ConflictError } from "@/lib/errors";
import { adminDb } from "@/lib/firebase/admin";
import type { AuthSession } from "@/types/auth";

const INVITES_COLLECTION = "invites";
const USERS_COLLECTION = "users";

export type CompanyInvite = {
  id: string;
  companyId: string;
  email: string;
  role: "admin" | "employee";
  linkedEmployeeId: string | null;
  status: "pending" | "accepted";
  createdBy: string;
  createdAtMs: number;
};

function inviteFromData(id: string, data: Record<string, unknown>): CompanyInvite {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    email: String(data.email ?? ""),
    role: data.role === "admin" ? "admin" : "employee",
    linkedEmployeeId: typeof data.linkedEmployeeId === "string" ? data.linkedEmployeeId : null,
    status: data.status === "accepted" ? "accepted" : "pending",
    createdBy: String(data.createdBy ?? ""),
    createdAtMs:
      data.createdAt && typeof data.createdAt === "object" && "toMillis" in data.createdAt
        ? (data.createdAt as { toMillis: () => number }).toMillis()
        : 0,
  };
}

export async function createInvite(
  session: AuthSession,
  email: string,
  role: "admin" | "employee",
  linkedEmployeeId: string | null,
): Promise<CompanyInvite> {
  if (session.role !== "admin") throw new AuthorizationError();

  const db = adminDb();
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await db
    .collection(USERS_COLLECTION)
    .where("email", "==", normalizedEmail)
    .where("companyId", "==", session.companyId)
    .limit(1)
    .get();
  if (!existingUser.empty) {
    throw new ConflictError("This person already has an account in your workspace.");
  }

  const existingInvite = await db
    .collection(INVITES_COLLECTION)
    .where("email", "==", normalizedEmail)
    .where("companyId", "==", session.companyId)
    .where("status", "==", "pending")
    .limit(1)
    .get();
  if (!existingInvite.empty) {
    throw new ConflictError("An invite for this email is already pending.");
  }

  const ref = db.collection(INVITES_COLLECTION).doc();
  const now = FieldValue.serverTimestamp();
  await ref.set({
    companyId: session.companyId,
    email: normalizedEmail,
    role,
    linkedEmployeeId: linkedEmployeeId ?? null,
    status: "pending",
    createdBy: session.uid,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: ref.id,
    companyId: session.companyId,
    email: normalizedEmail,
    role,
    linkedEmployeeId: linkedEmployeeId ?? null,
    status: "pending",
    createdBy: session.uid,
    createdAtMs: Date.now(),
  };
}

export async function findPendingInviteByEmail(email: string): Promise<CompanyInvite | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const snapshot = await adminDb()
    .collection(INVITES_COLLECTION)
    .where("email", "==", normalizedEmail)
    .where("status", "==", "pending")
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  const doc = snapshot.docs[0];
  if (!doc) return null;
  return inviteFromData(doc.id, doc.data() as Record<string, unknown>);
}

export async function acceptInvite(inviteId: string): Promise<void> {
  await adminDb()
    .collection(INVITES_COLLECTION)
    .doc(inviteId)
    .set({ status: "accepted", acceptedAt: FieldValue.serverTimestamp() }, { merge: true });
}

export async function listCompanyPendingInvites(companyId: string): Promise<CompanyInvite[]> {
  const snapshot = await adminDb()
    .collection(INVITES_COLLECTION)
    .where("companyId", "==", companyId)
    .where("status", "==", "pending")
    .get();

  return snapshot.docs.map((doc) => inviteFromData(doc.id, doc.data() as Record<string, unknown>));
}
