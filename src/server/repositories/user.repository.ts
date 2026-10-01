import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { TRIAL_DAYS, trialEndsAtFromCreatedAt } from "@/features/billing/subscription-status";
import { adminDb } from "@/lib/firebase/admin";
import { appUserSchema, type AccountSettingsInput } from "@/schemas/auth.schema";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import type { AppUser, AuthSession } from "@/types/auth";

const COMPANIES_COLLECTION = "companies";
const USERS_COLLECTION = "users";

/** Reads `users/{uid}`. A malformed record throws rather than granting access. */
export async function findUserById(uid: string): Promise<AppUser | null> {
  const snapshot = await adminDb().collection(USERS_COLLECTION).doc(uid).get();
  if (!snapshot.exists) return null;

  return { id: snapshot.id, ...appUserSchema.parse(snapshot.data()) };
}

export async function findActiveUserByEmail(email: string): Promise<AppUser | null> {
  const snapshot = await adminDb()
    .collection(USERS_COLLECTION)
    .where("email", "==", email.trim().toLowerCase())
    .limit(1)
    .get();

  const doc = snapshot.docs[0];
  if (!doc) return null;

  const user = { id: doc.id, ...appUserSchema.parse(doc.data()) };
  return user.status === "active" ? user : null;
}

/** Employee file whose work email matches a login email, used when a user has no explicit link. */
export async function findEmployeeIdByEmail(companyId: string, email: string): Promise<string | null> {
  const snapshot = await adminDb()
    .collection("employees")
    .where("companyId", "==", companyId)
    .where("email", "==", email.trim().toLowerCase())
    .limit(1)
    .get();

  return snapshot.docs[0]?.id ?? null;
}

export async function findCompanyNameById(companyId: string): Promise<string | null> {
  const snapshot = await adminDb().collection(COMPANIES_COLLECTION).doc(companyId).get();
  if (!snapshot.exists) return null;

  const name = snapshot.get("name");
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

export async function provisionSignupWorkspace({
  uid,
  email,
  companyName,
}: {
  uid: string;
  email: string;
  companyName: string;
}): Promise<AppUser> {
  const db = adminDb();
  const userRef = db.collection(USERS_COLLECTION).doc(uid);
  const userSnapshot = await userRef.get();

  if (userSnapshot.exists) {
    const existingUser = { id: userSnapshot.id, ...appUserSchema.parse(userSnapshot.data()) };
    if (existingUser.status === "active") return existingUser;
  }

  const now = FieldValue.serverTimestamp();
  const trialEndsAt = Timestamp.fromMillis(trialEndsAtFromCreatedAt(Date.now(), TRIAL_DAYS));
  const companyRef = db.collection(COMPANIES_COLLECTION).doc();
  const displayName = email.split("@")[0] || "Admin";
  const user: AppUser = {
    id: uid,
    companyId: companyRef.id,
    email,
    displayName,
    role: "admin",
    status: "active",
  };

  const batch = db.batch();
  batch.set(companyRef, {
    name: companyName,
    subscriptionStatus: "trialing",
    trialEndsAt,
    createdAt: now,
    createdBy: uid,
    onboardingSource: "email_link_signup",
  });
  batch.set(userRef, {
    companyId: companyRef.id,
    email,
    displayName,
    role: "admin",
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
  await batch.commit();

  return user;
}

export async function provisionInvitedUser({
  uid,
  email,
  companyId,
  role,
  linkedEmployeeId,
}: {
  uid: string;
  email: string;
  companyId: string;
  role: "admin" | "employee";
  linkedEmployeeId: string | null;
}): Promise<AppUser> {
  const db = adminDb();
  const userRef = db.collection(USERS_COLLECTION).doc(uid);
  const userSnapshot = await userRef.get();

  if (userSnapshot.exists) {
    const existing = { id: userSnapshot.id, ...appUserSchema.parse(userSnapshot.data()) };
    if (existing.status === "active") return existing;
  }

  const displayName = email.split("@")[0] || "Team member";
  const now = FieldValue.serverTimestamp();
  const userData: Record<string, unknown> = {
    companyId,
    email,
    displayName,
    role,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  if (linkedEmployeeId) userData.linkedEmployeeId = linkedEmployeeId;

  await userRef.set(userData);

  return { id: uid, companyId, email, displayName, role, status: "active", linkedEmployeeId: linkedEmployeeId ?? undefined };
}

export async function listCompanyUsers(companyId: string): Promise<AppUser[]> {
  const snapshot = await adminDb()
    .collection(USERS_COLLECTION)
    .where("companyId", "==", companyId)
    .get();

  return snapshot.docs.flatMap((doc) => {
    try {
      return [{ id: doc.id, ...appUserSchema.parse(doc.data()) }];
    } catch {
      return [];
    }
  });
}

export async function updateUserRole(
  session: AuthSession,
  targetUid: string,
  role: "admin" | "employee",
): Promise<void> {
  if (session.role !== "admin") throw new AuthorizationError();
  if (targetUid === session.uid) throw new Error("You cannot change your own role.");

  const db = adminDb();
  const targetRef = db.collection(USERS_COLLECTION).doc(targetUid);
  const targetSnap = await targetRef.get();
  const targetData = targetSnap.data();

  if (!targetSnap.exists || !targetData || targetData.companyId !== session.companyId) {
    throw new NotFoundError("User not found.");
  }

  await targetRef.set({ role, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

export async function updateAccountSettings(
  session: AuthSession,
  input: AccountSettingsInput,
): Promise<void> {
  const db = adminDb();
  const userRef = db.collection(USERS_COLLECTION).doc(session.uid);
  const companyRef = db.collection(COMPANIES_COLLECTION).doc(session.companyId);
  const [userSnapshot, companySnapshot] = await Promise.all([userRef.get(), companyRef.get()]);
  const user = userSnapshot.data();

  if (!userSnapshot.exists || !user || user.companyId !== session.companyId) {
    throw new NotFoundError("Account not found.");
  }
  if (!companySnapshot.exists) {
    throw new NotFoundError("Workspace not found.");
  }

  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.set(
    userRef,
    {
      displayName: input.displayName?.trim() || FieldValue.delete(),
      updatedAt: now,
    },
    { merge: true },
  );

  if (session.role === "admin") {
    batch.set(
      companyRef,
      {
        name: input.companyName,
        updatedAt: now,
      },
      { merge: true },
    );
  }

  await batch.commit();
}
