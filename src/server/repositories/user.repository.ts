import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { appUserSchema } from "@/schemas/auth.schema";
import type { AppUser } from "@/types/auth";

/** Reads `users/{uid}`. A malformed record throws rather than granting access. */
export async function findUserById(uid: string): Promise<AppUser | null> {
  const snapshot = await adminDb().collection("users").doc(uid).get();
  if (!snapshot.exists) return null;

  return { id: snapshot.id, ...appUserSchema.parse(snapshot.data()) };
}

export async function findActiveUserByEmail(email: string): Promise<AppUser | null> {
  const snapshot = await adminDb()
    .collection("users")
    .where("email", "==", email.trim().toLowerCase())
    .limit(1)
    .get();

  const doc = snapshot.docs[0];
  if (!doc) return null;

  const user = { id: doc.id, ...appUserSchema.parse(doc.data()) };
  return user.status === "active" ? user : null;
}
