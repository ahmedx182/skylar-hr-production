// Marks one workspace as paid without going through Stripe (e.g. your own internal workspace).
//
//   node --env-file=.env.local scripts/mark-workspace-paid.mjs --list
//   node --env-file=.env.local scripts/mark-workspace-paid.mjs <companyId>
//
// Uses the Firebase credentials in the env file, so it touches whatever project that file points at.
import { initializeApp, cert } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore();
const arg = process.argv[2];

if (!arg) {
  console.error("Usage: mark-workspace-paid.mjs --list | <companyId>");
  process.exit(1);
}

if (arg === "--list") {
  const companies = await db.collection("companies").get();
  for (const company of companies.docs) {
    const subscription = await db.collection("subscriptions").doc(company.id).get();
    console.log(
      company.id,
      "|",
      company.get("name"),
      "|",
      subscription.exists ? subscription.get("status") : company.get("subscriptionStatus") ?? "none",
    );
  }
  process.exit(0);
}

const companyRef = db.collection("companies").doc(arg);
if (!(await companyRef.get()).exists) {
  console.error(`No company with id ${arg}`);
  process.exit(1);
}

const batch = db.batch();
batch.set(
  db.collection("subscriptions").doc(arg),
  { companyId: arg, status: "active", manualOverride: true, updatedAt: FieldValue.serverTimestamp() },
  { merge: true },
);
batch.set(companyRef, { subscriptionStatus: "active", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
await batch.commit();
console.log(`Marked ${arg} as paid (active).`);
