import "server-only";
import { FieldValue, Timestamp, type DocumentData } from "firebase-admin/firestore";
import type Stripe from "stripe";
import {
  billingPlanForState,
  freeMessagesRemaining,
  FREE_MESSAGE_LIMIT,
  normalizeBillingStatus,
  type BillingStatus,
  type CompanyBillingState,
} from "@/features/billing/subscription-status";
import { FREE_PACKAGE_ID } from "@/features/pricing/package";
import { NotFoundError, PaymentRequiredError } from "@/lib/errors";
import { adminDb } from "@/lib/firebase/admin";
import type { AuthSession } from "@/types/auth";
import { getFreeMessageLimit } from "./pricing.repository";

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

function stateFromData(companyId: string, data: DocumentData, freeMessageLimit = FREE_MESSAGE_LIMIT): CompanyBillingState {
  const status = normalizeBillingStatus(data.status);
  const trialEndsAtMs = timestampMs(data.trialEndsAt);
  const freeMessagesUsed =
    typeof data.freeMessagesUsed === "number" && data.freeMessagesUsed > 0 ? data.freeMessagesUsed : 0;
  const planOverride = data.planOverride === "paid" ? "paid" : null;
  return {
    companyId,
    status,
    plan: billingPlanForState(status, trialEndsAtMs, Date.now(), planOverride),
    planOverride,
    planOverrideNote: typeof data.planOverrideNote === "string" ? data.planOverrideNote : null,
    freeMessagesUsed,
    freeMessageLimit,
    freeMessagesRemaining: freeMessagesRemaining(freeMessagesUsed, freeMessageLimit),
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
  const [subscriptionSnapshot, freeLimit] = await Promise.all([subscriptionRef.get(), getFreeMessageLimit()]);
  if (subscriptionSnapshot.exists) {
    return stateFromData(session.companyId, subscriptionSnapshot.data() ?? {}, freeLimit);
  }

  const companyRef = db.collection(COMPANIES_COLLECTION).doc(session.companyId);
  const companySnapshot = await companyRef.get();
  if (!companySnapshot.exists) throw new NotFoundError("Company not found.");

  const initialData = {
    companyId: session.companyId,
    status: "free" satisfies BillingStatus,
    freeMessagesUsed: 0,
    trialEndsAt: null,
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
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await batch.commit();

  return stateFromData(session.companyId, initialData, freeLimit);
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
    ...(subscription.metadata.packageId ? { packageId: subscription.metadata.packageId } : {}),
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

export async function markCheckoutCompleted(
  sessionId: string,
  subscriptionId?: string | null,
  companyId?: string | null,
) {
  let ref: FirebaseFirestore.DocumentReference | undefined;
  if (companyId) {
    ref = adminDb().collection(SUBSCRIPTIONS_COLLECTION).doc(companyId);
  } else {
    const snapshot = await adminDb()
      .collection(SUBSCRIPTIONS_COLLECTION)
      .where("stripeCheckoutSessionId", "==", sessionId)
      .limit(1)
      .get();
    ref = snapshot.docs[0]?.ref;
  }
  if (!ref) return;

  await ref.set(
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

/**
 * Counts one advisor message against the workspace's free allowance. Paid workspaces pass
 * through untouched; a free workspace past the Free package's allowance is refused with a 402.
 * The counter is bumped inside a transaction so concurrent sends can't overshoot the limit.
 */
export async function reserveAdvisorMessage(
  session: Pick<AuthSession, "companyId">,
): Promise<{ reserved: boolean }> {
  const db = adminDb();
  const subscriptionRef = db.collection(SUBSCRIPTIONS_COLLECTION).doc(session.companyId);

  const freePackageRef = db.collection("pricing_packages").doc(FREE_PACKAGE_ID);

  return db.runTransaction(async (transaction) => {
    const [snapshot, freePackage] = await Promise.all([transaction.get(subscriptionRef), transaction.get(freePackageRef)]);
    const configuredLimit = freePackage.exists ? freePackage.get("advisorMessageLimit") : null;
    const limit = typeof configuredLimit === "number" ? configuredLimit : FREE_MESSAGE_LIMIT;
    const data = snapshot.exists ? (snapshot.data() ?? {}) : {};
    const state = stateFromData(session.companyId, snapshot.exists ? data : { status: "free" }, limit);
    if (state.plan === "paid") return { reserved: false };

    if (state.freeMessagesUsed >= limit) {
      throw new PaymentRequiredError(
        `You've used all ${limit} free advisor messages. Upgrade in Billing to keep chatting.`,
      );
    }

    transaction.set(
      subscriptionRef,
      {
        companyId: session.companyId,
        ...(snapshot.exists ? {} : { status: "free" }),
        freeMessagesUsed: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return { reserved: true };
  });
}

/** Gives back a free message that was reserved but never answered. */
export async function releaseAdvisorMessage(session: Pick<AuthSession, "companyId">): Promise<void> {
  await adminDb()
    .collection(SUBSCRIPTIONS_COLLECTION)
    .doc(session.companyId)
    .set({ freeMessagesUsed: FieldValue.increment(-1) }, { merge: true });
}
