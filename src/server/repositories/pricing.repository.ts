import "server-only";
import { FieldValue, type DocumentData, type DocumentSnapshot } from "firebase-admin/firestore";
import { getServerEnv } from "@/lib/env/server";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { adminDb } from "@/lib/firebase/admin";
import {
  DEFAULT_PACKAGES,
  FREE_PACKAGE_ID,
  isFreePackage,
  type PricingPackage,
  type PricingPackageInput,
} from "@/features/pricing/package";
import { FREE_MESSAGE_LIMIT } from "@/features/billing/subscription-status";
import type { AuthSession } from "@/types/auth";

export const PACKAGES_COLLECTION = "pricing_packages";
export const AUDIT_COLLECTION = "platform_audit_log";

export type PackageAuditAction = "package_create" | "package_update" | "package_archive" | "package_restore";

function ms(value: unknown): number | null {
  return value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function"
    ? value.toMillis()
    : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function packageFromDoc(doc: DocumentSnapshot): PricingPackage {
  const data: DocumentData = doc.data() ?? {};
  return {
    id: doc.id,
    name: text(data.name) ?? "Untitled package",
    description: typeof data.description === "string" ? data.description : "",
    priceCents: typeof data.priceCents === "number" ? data.priceCents : 0,
    interval: data.interval === "year" ? "year" : "month",
    features: Array.isArray(data.features) ? data.features.filter((item): item is string => typeof item === "string") : [],
    advisorMessageLimit: typeof data.advisorMessageLimit === "number" ? data.advisorMessageLimit : null,
    highlighted: data.highlighted === true,
    badge: text(data.badge),
    published: data.published !== false,
    archived: data.archived === true,
    sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
    stripeProductId: text(data.stripeProductId),
    stripePriceId: text(data.stripePriceId),
    createdAtMs: ms(data.createdAt),
    updatedAtMs: ms(data.updatedAt),
  };
}

function bySortOrder(a: PricingPackage, b: PricingPackage) {
  return a.sortOrder - b.sortOrder || a.priceCents - b.priceCents || a.name.localeCompare(b.name);
}

/** Creates the Free and Professional packages the first time pricing is read. Safe to race. */
async function seedDefaultsIfEmpty(): Promise<void> {
  const db = adminDb();
  const existing = await db.collection(PACKAGES_COLLECTION).limit(1).get();
  if (!existing.empty) return;

  const legacyPriceId = getServerEnv().STRIPE_PRICE_ID ?? null;
  await Promise.all(
    DEFAULT_PACKAGES.map(async (pkg) => {
      const { id, ...fields } = pkg;
      try {
        await db.collection(PACKAGES_COLLECTION).doc(id).create({
          ...fields,
          archived: false,
          stripeProductId: null,
          // Keeps checkout working for deployments that already configured a single Stripe price.
          stripePriceId: id === "professional" ? legacyPriceId : null,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (error) {
        const code = (error as { code?: number | string }).code;
        if (code !== 6 && code !== "already-exists") throw error;
      }
    }),
  );
}

export async function listPackages({ includeArchived = false } = {}): Promise<PricingPackage[]> {
  await seedDefaultsIfEmpty();
  const snapshot = await adminDb().collection(PACKAGES_COLLECTION).get();
  return snapshot.docs
    .map(packageFromDoc)
    .filter((pkg) => includeArchived || !pkg.archived)
    .sort(bySortOrder);
}

/** Packages shown on the landing page and in the upgrade list. */
export async function listPublishedPackages(): Promise<PricingPackage[]> {
  return (await listPackages()).filter((pkg) => pkg.published);
}

export async function getPackage(id: string): Promise<PricingPackage | null> {
  const snapshot = await adminDb().collection(PACKAGES_COLLECTION).doc(id).get();
  return snapshot.exists ? packageFromDoc(snapshot) : null;
}

/** The Free package's allowance, falling back to the built-in default if it was never configured. */
export async function getFreeMessageLimit(): Promise<number> {
  const snapshot = await adminDb().collection(PACKAGES_COLLECTION).doc(FREE_PACKAGE_ID).get();
  const limit = snapshot.exists ? snapshot.get("advisorMessageLimit") : null;
  return typeof limit === "number" ? limit : FREE_MESSAGE_LIMIT;
}

function auditEntry({
  action,
  pkg,
  actor,
  detail,
}: {
  action: PackageAuditAction;
  pkg: Pick<PricingPackage, "id" | "name">;
  actor: Pick<AuthSession, "uid" | "email">;
  detail: string | null;
}) {
  return {
    action,
    kind: "package",
    companyId: null,
    packageId: pkg.id,
    companyName: pkg.name,
    actorUid: actor.uid,
    actorEmail: actor.email,
    reason: detail,
    createdAt: FieldValue.serverTimestamp(),
  };
}

function describePriceChange(before: PricingPackage, after: PricingPackageInput): string | null {
  const changes: string[] = [];
  if (before.priceCents !== after.priceCents) changes.push(`price ${before.priceCents / 100} to ${after.priceCents / 100} USD`);
  if (before.interval !== after.interval) changes.push(`billing ${before.interval}ly to ${after.interval}ly`);
  if (before.published !== after.published) changes.push(after.published ? "published" : "unpublished");
  if (before.advisorMessageLimit !== after.advisorMessageLimit && isFreePackage(before)) {
    changes.push(`free messages ${before.advisorMessageLimit ?? "none"} to ${after.advisorMessageLimit ?? "none"}`);
  }
  return changes.length ? changes.join(", ") : null;
}

export async function createPackage(input: PricingPackageInput, actor: Pick<AuthSession, "uid" | "email">): Promise<PricingPackage> {
  await seedDefaultsIfEmpty();
  const db = adminDb();
  const ref = db.collection(PACKAGES_COLLECTION).doc();
  const batch = db.batch();
  batch.set(ref, {
    ...input,
    archived: false,
    stripeProductId: null,
    stripePriceId: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.set(
    db.collection(AUDIT_COLLECTION).doc(),
    auditEntry({
      action: "package_create",
      pkg: { id: ref.id, name: input.name },
      actor,
      detail: `${input.priceCents / 100} USD per ${input.interval}`,
    }),
  );
  await batch.commit();
  return packageFromDoc(await ref.get());
}

export async function updatePackage(
  id: string,
  input: PricingPackageInput,
  actor: Pick<AuthSession, "uid" | "email">,
): Promise<PricingPackage> {
  const db = adminDb();
  const ref = db.collection(PACKAGES_COLLECTION).doc(id);
  const before = await ref.get();
  if (!before.exists) throw new NotFoundError("Package not found.");
  const previous = packageFromDoc(before);
  if (isFreePackage(previous) && input.priceCents !== 0) throw new ConflictError("The Free package must stay free.");

  const batch = db.batch();
  batch.set(ref, { ...input, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  batch.set(
    db.collection(AUDIT_COLLECTION).doc(),
    auditEntry({ action: "package_update", pkg: { id, name: input.name }, actor, detail: describePriceChange(previous, input) }),
  );
  await batch.commit();
  return packageFromDoc(await ref.get());
}

export async function setPackageArchived(
  id: string,
  archived: boolean,
  actor: Pick<AuthSession, "uid" | "email">,
): Promise<PricingPackage> {
  if (archived && id === FREE_PACKAGE_ID) throw new ConflictError("The Free package can't be archived.");
  const db = adminDb();
  const ref = db.collection(PACKAGES_COLLECTION).doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new NotFoundError("Package not found.");
  const pkg = packageFromDoc(snapshot);

  const batch = db.batch();
  batch.set(ref, { archived, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  batch.set(
    db.collection(AUDIT_COLLECTION).doc(),
    auditEntry({
      action: archived ? "package_archive" : "package_restore",
      pkg,
      actor,
      detail: archived ? "Hidden from new customers. Existing subscribers keep their plan." : null,
    }),
  );
  await batch.commit();
  return packageFromDoc(await ref.get());
}

export async function attachStripeIds(id: string, ids: { stripeProductId: string; stripePriceId: string }): Promise<void> {
  await adminDb().collection(PACKAGES_COLLECTION).doc(id).set({ ...ids, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}
