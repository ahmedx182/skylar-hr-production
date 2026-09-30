import "server-only";
import { FieldValue, Timestamp, type DocumentData } from "firebase-admin/firestore";
import type Stripe from "stripe";
import {
  billingAccessForState,
  normalizeBillingStatus,
  trialEndsAtFromCreatedAt,
  type BillingStatus,
  type CompanyBillingState,
} from "@/features/billing/subscription-status";
import { NotFoundError } from "@/lib/errors";
import { adminDb } from "@/lib/firebase/admin";
import type { AuthSession } from "@/types/auth";

const COMPANIES_COLLECTION = "companies";
const SUBSCRIPTIONS_COLLECTION = "subscriptions";

function timestampMs(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  if (value && typeof value === "object" && "toMillis" in value) {
    const toMillis = (value as { toMillis?: () => number }).toMillis;
    if (typeof toMillis === "function") return toMillis.call(value);
  }
  return null;
}

function timestampFromSeconds(value: number | null | undefined) {
  return typeof value === "number" ? Timestamp.fromMillis(value * 1000) : null;
}

function stateFromData(companyId: string, data: DocumentData): CompanyBillingState {
  const status = normalizeBillingStatus(data.status);
  const trialEndsAtMs = timestampMs(data.trialEndsAt);
  return {
    companyId,
    status,
    access: billingAccessForState(status, trialEndsAtMs),
    trialEndsAtMs,
    currentPeriodEndMs: timestampMs(data.currentPeriodEnd),
    stripeCustomerId: typeof data.stripeCustomerId === "string" ? data.stripeCustomerId : null,
    stripeSubscriptionId:
      typeof data.stripeSubscriptionId === "string" ? data.stripeSubscriptionId : null,
    checkoutCompletedAtMs: timestampMs(data.checkoutCompletedAt),
  };
}

export async function getOrCreateCompanyBillingState(
  session: Pick<AuthSession, "companyId">,
): Promise<CompanyBillingState> {
  const db = adminDb();
  const subscriptionRef = db.collection(SUBSCRIPTIONS_COLLECTION).doc(session.companyId);
  const subscriptionSnapshot = await subscriptionRef.get();
  if (subscriptionSnapshot.exists) {
    return stateFromData(session.companyId, subscriptionSnapshot.data() ?? {});
  }

  const companyRef = db.collection(COMPANIES_COLLECTION).doc(session.companyId);
  const companySnapshot = await companyRef.get();
  if (!companySnapshot.exists) throw new NotFoundError("Company not found.");

  const createdAtMs = timestampMs(companySnapshot.get("createdAt")) ?? Date.now();
  const trialEndsAt = Timestamp.fromMillis(trialEndsAtFromCreatedAt(createdAtMs));
  const initialData = {
    companyId: session.companyId,
    status: "trialing" satisfies BillingStatus,
    trialEndsAt,
    currentPeriodEnd: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    checkoutCompletedAt: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const batch = db.batch();
  batch.set(subscriptionRef, initialData);
  batch.set(
    companyRef,
    {
      subscriptionStatus: initialData.status,
      trialEndsAt,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await batch.commit();

  return stateFromData(session.companyId, initialData);
}

export async function setStripeCustomerForCompany(
  session: Pick<AuthSession, "companyId">,
  stripeCustomerId: string,
): Promise<void> {
  const db = adminDb();
  const subscriptionRef = db.collection(SUBSCRIPTIONS_COLLECTION).doc(session.companyId);
  const companyRef = db.collection(COMPANIES_COLLECTION).doc(session.companyId);
  const update = {
    stripeCustomerId,
    updatedAt: FieldValue.serverTimestamp(),
  };

  const batch = db.batch();
  batch.set(subscriptionRef, { companyId: session.companyId, ...update }, { merge: true });
  batch.set(companyRef, update, { merge: true });
  await batch.commit();
}

export async function syncStripeSubscription(
  subscription: Stripe.Subscription,
): Promise<void> {
  const companyId = subscription.metadata.companyId;
  if (!companyId) return;

  const stripeCustomerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const status = normalizeBillingStatus(subscription.status);
  const trialEndsAt = timestampFromSeconds(subscription.trial_end);
  const currentPeriodEnd = timestampFromSeconds(
    subscription.items.data[0]?.current_period_end ?? null,
  );
  const db = adminDb();
  const subscriptionRef = db.collection(SUBSCRIPTIONS_COLLECTION).doc(companyId);
  const companyRef = db.collection(COMPANIES_COLLECTION).doc(companyId);
  const update = {
    companyId,
    status,
    trialEndsAt,
    currentPeriodEnd,
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    updatedAt: FieldValue.serverTimestamp(),
  };

  const batch = db.batch();
  batch.set(subscriptionRef, update, { merge: true });
  batch.set(
    companyRef,
    {
      subscriptionStatus: status,
      trialEndsAt,
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await batch.commit();
}

export async function markCheckoutCompleted(sessionId: string, subscriptionId?: string | null) {
  const snapshot = await adminDb()
    .collection(SUBSCRIPTIONS_COLLECTION)
    .where("stripeCheckoutSessionId", "==", sessionId)
    .limit(1)
    .get();
  const doc = snapshot.docs[0];
  if (!doc) return;

  await doc.ref.set(
    {
      stripeSubscriptionId: subscriptionId ?? null,
      checkoutCompletedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function saveCheckoutSessionForCompany(
  session: Pick<AuthSession, "companyId">,
  stripeCheckoutSessionId: string,
): Promise<void> {
  await adminDb()
    .collection(SUBSCRIPTIONS_COLLECTION)
    .doc(session.companyId)
    .set(
      {
        companyId: session.companyId,
        stripeCheckoutSessionId,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}
