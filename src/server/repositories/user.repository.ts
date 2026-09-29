import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { TRIAL_DAYS, trialEndsAtFromCreatedAt } from "@/features/billing/subscription-status";
import { adminDb } from "@/lib/firebase/admin";
import { appUserSchema, type AccountSettingsInput } from "@/schemas/auth.schema";
import { NotFoundError } from "@/lib/errors";
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
