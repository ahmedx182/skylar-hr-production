import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { AuthSession } from "@/types/auth";

const BRIEFING_ACTIONS_COLLECTION = "briefing_card_actions";

export type BriefingCardAction = "next" | "not_now";

export type DeferredBriefingCardAction = {
  cardId: string;
  dateKey: string;
  deferredUntilDateKey: string;
};

type ActionData = {
  action?: unknown;
  cardId?: unknown;
  companyId?: unknown;
  userId?: unknown;
  dateKey?: unknown;
  deferredUntilDateKey?: unknown;
};

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function actionDocId(session: AuthSession, cardId: string, dateKey: string): string {
  return `${session.companyId}_${session.uid}_${dateKey}_${encodeURIComponent(cardId)}`;
}

export function todayKey(now = new Date()): string {
  return dayKey(now);
}

export async function listHiddenBriefingCardIds(
  session: AuthSession,
  now = new Date(),
): Promise<Set<string>> {
  const currentDateKey = todayKey(now);
  const snapshot = await adminDb()
    .collection(BRIEFING_ACTIONS_COLLECTION)
    .where("companyId", "==", session.companyId)
    .where("userId", "==", session.uid)
    .get();

  return new Set(
    snapshot.docs.flatMap((doc) => {
      const data = doc.data() as ActionData;
      const cardId = typeof data.cardId === "string" ? data.cardId : "";
      const action = data.action === "next" || data.action === "not_now" ? data.action : null;
      const dateKey = typeof data.dateKey === "string" ? data.dateKey : "";
      const deferredUntilDateKey =
        typeof data.deferredUntilDateKey === "string" ? data.deferredUntilDateKey : "";

      if (!cardId || !action) return [];
      if (action === "next" && dateKey === currentDateKey) return [cardId];
      if (action === "not_now" && deferredUntilDateKey > currentDateKey) return [cardId];
      return [];
    }),
  );
}

export async function listDeferredBriefingCardActions(
  session: AuthSession,
  now = new Date(),
): Promise<DeferredBriefingCardAction[]> {
  const currentDateKey = todayKey(now);
  const snapshot = await adminDb()
    .collection(BRIEFING_ACTIONS_COLLECTION)
    .where("companyId", "==", session.companyId)
    .where("userId", "==", session.uid)
    .get();

  return snapshot.docs
    .flatMap((doc) => {
      const data = doc.data() as ActionData;
      const cardId = typeof data.cardId === "string" ? data.cardId : "";
      const dateKey = typeof data.dateKey === "string" ? data.dateKey : "";
      const deferredUntilDateKey =
        typeof data.deferredUntilDateKey === "string" ? data.deferredUntilDateKey : "";

      if (data.action !== "not_now" || !cardId || !dateKey || deferredUntilDateKey <= currentDateKey) {
        return [];
      }

      return [{ cardId, dateKey, deferredUntilDateKey }];
    })
    .sort((a, b) => a.deferredUntilDateKey.localeCompare(b.deferredUntilDateKey));
}

export async function saveBriefingCardAction(
  session: AuthSession,
  input: { cardId: string; action: BriefingCardAction },
  now = new Date(),
): Promise<void> {
  const dateKey = todayKey(now);
  const deferredUntilDateKey =
    input.action === "not_now" ? dayKey(addUtcDays(now, 1)) : null;

  await adminDb()
    .collection(BRIEFING_ACTIONS_COLLECTION)
    .doc(actionDocId(session, input.cardId, dateKey))
    .set({
      action: input.action,
      cardId: input.cardId,
      companyId: session.companyId,
      userId: session.uid,
      dateKey,
      deferredUntilDateKey,
      createdAt: FieldValue.serverTimestamp(),
    });
}

export async function resumeDeferredBriefingCard(
  session: AuthSession,
  cardId: string,
): Promise<void> {
  const snapshot = await adminDb()
    .collection(BRIEFING_ACTIONS_COLLECTION)
    .where("companyId", "==", session.companyId)
    .where("userId", "==", session.uid)
    .where("cardId", "==", cardId)
    .where("action", "==", "not_now")
    .get();

  for (let offset = 0; offset < snapshot.docs.length; offset += 450) {
    const batch = adminDb().batch();
    snapshot.docs.slice(offset, offset + 450).forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

export async function resetBriefingCardActions(session: AuthSession): Promise<void> {
  const snapshot = await adminDb()
    .collection(BRIEFING_ACTIONS_COLLECTION)
    .where("companyId", "==", session.companyId)
    .where("userId", "==", session.uid)
    .get();

  for (let offset = 0; offset < snapshot.docs.length; offset += 450) {
    const batch = adminDb().batch();
    snapshot.docs.slice(offset, offset + 450).forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}
