import "server-only";
import { createHash } from "node:crypto";
import { FieldValue, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import {
  buildEmployeeMemorySummary,
  type EmployeeMemoryLedgerItem,
} from "@/features/briefing/employee-memory-summary";
import {
  buildSkylarConversationTranscript,
  skylarConversationThreadKey,
  type SkylarConversationContext,
  type SkylarConversationMessage,
} from "@/features/briefing/skylar-conversation-transcript";
import { NotFoundError } from "@/lib/errors";
import { adminDb } from "@/lib/firebase/admin";
import type { AuthSession } from "@/types/auth";

const CONVERSATIONS_COLLECTION = "skylar_conversations";
const EMPLOYEES_COLLECTION = "employees";
const LEDGER_COLLECTION = "employee_ledger_entries";
const MAX_STORED_MESSAGES = 40;
const DEFAULT_HISTORY_LIMIT = 12;

function conversationDocId(session: AuthSession, context: SkylarConversationContext): string {
  return `${session.companyId}__${session.uid}__${skylarConversationThreadKey(context)}`;
}

function conversationLedgerDocId(session: AuthSession, context: SkylarConversationContext): string {
  const key = `${session.companyId}:${session.uid}:${skylarConversationThreadKey(context)}`;
  return `conversation_${createHash("sha256").update(key).digest("hex").slice(0, 32)}`;
}

function timestampMs(value: unknown): number {
  if (value && typeof value === "object" && "toMillis" in value) {
    const toMillis = (value as { toMillis?: () => number }).toMillis;
    if (typeof toMillis === "function") return toMillis.call(value);
  }
  return 0;
}

function messageFromData(value: unknown): SkylarConversationMessage | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as { role?: unknown; text?: unknown; createdAt?: unknown; createdAtMs?: unknown };
  if (raw.role !== "user" && raw.role !== "assistant") return null;
  if (typeof raw.text !== "string" || !raw.text.trim()) return null;

  return {
    role: raw.role,
    text: raw.text,
    createdAtMs: timestampMs(raw.createdAt) || (typeof raw.createdAtMs === "number" ? raw.createdAtMs : 0),
  };
}

function conversationLedgerDescription(
  context: SkylarConversationContext,
  messages: SkylarConversationMessage[],
): string {
  const heading = context.cardTitle?.trim()
    ? `Conversation transcript - ${context.cardTitle.trim()}`
    : "Conversation transcript";
  const transcript = buildSkylarConversationTranscript(messages);
  return transcript ? `${heading}\n\n${transcript}` : heading;
}

async function assertEmployeeBelongsToCompany(companyId: string, employeeId: string): Promise<void> {
  const employee = await adminDb().collection(EMPLOYEES_COLLECTION).doc(employeeId).get();
  if (!employee.exists || employee.get("companyId") !== companyId) {
    throw new NotFoundError("Employee not found.");
  }
}

function ledgerItemFromDoc(doc: QueryDocumentSnapshot): EmployeeMemoryLedgerItem {
  const statusDot = doc.get("statusDot");
  return {
    type: String(doc.get("type") ?? "note"),
    description: String(doc.get("description") ?? ""),
    statusDot: statusDot === "amber" || statusDot === "green" || statusDot === "red" ? statusDot : null,
    dateMs: timestampMs(doc.get("date")) || timestampMs(doc.get("createdAt")),
  };
}

async function employeeLedgerSummary(
  companyId: string,
  employeeId: string,
  override: EmployeeMemoryLedgerItem,
  omittedLedgerEntryId: string,
): Promise<string | null> {
  const snapshot = await adminDb()
    .collection(LEDGER_COLLECTION)
    .where("companyId", "==", companyId)
    .where("employeeId", "==", employeeId)
    .get();
  const items = snapshot.docs
    .filter((doc) => doc.id !== omittedLedgerEntryId)
    .map(ledgerItemFromDoc);

  return buildEmployeeMemorySummary([...items, override]);
}

export async function listSkylarConversationMessages(
  session: AuthSession,
  context: SkylarConversationContext,
  limit = DEFAULT_HISTORY_LIMIT,
): Promise<SkylarConversationMessage[]> {
  const doc = await adminDb().collection(CONVERSATIONS_COLLECTION).doc(conversationDocId(session, context)).get();
  const data = doc.data();

  if (!doc.exists || !data || data.companyId !== session.companyId || data.userId !== session.uid) {
    return [];
  }

  const rawMessages = Array.isArray(data.messages) ? data.messages : [];
  return rawMessages
    .map(messageFromData)
    .filter((message): message is SkylarConversationMessage => Boolean(message))
    .sort((a, b) => a.createdAtMs - b.createdAtMs)
    .slice(-limit);
}

export async function appendSkylarConversationTurn(
  session: AuthSession,
  context: SkylarConversationContext,
  userText: string,
  assistantText: string,
): Promise<SkylarConversationMessage[]> {
  if (context.employeeId) {
    await assertEmployeeBelongsToCompany(session.companyId, context.employeeId);
  }

  const existing = await listSkylarConversationMessages(session, context, MAX_STORED_MESSAGES);
  const nowMs = Date.now();
  const conversationId = conversationDocId(session, context);
  const nextTurn: SkylarConversationMessage[] = [
    { role: "user", text: userText, createdAtMs: nowMs },
    { role: "assistant", text: assistantText, createdAtMs: nowMs + 1 },
  ];
  const messages: SkylarConversationMessage[] = [
    ...existing,
    ...nextTurn,
  ].slice(-MAX_STORED_MESSAGES);

  const db = adminDb();
  const batch = db.batch();
  const conversationRef = db.collection(CONVERSATIONS_COLLECTION).doc(conversationId);

  batch.set(
    conversationRef,
    {
      companyId: session.companyId,
      userId: session.uid,
      threadKey: skylarConversationThreadKey(context),
      employeeId: context.employeeId ?? null,
      employeeName: context.employeeName ?? null,
      cardTitle: context.cardTitle ?? null,
      cardBody: context.cardBody ?? null,
      messages,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  if (context.employeeId) {
    const ledgerRef = db.collection(LEDGER_COLLECTION).doc(conversationLedgerDocId(session, context));
    const description = conversationLedgerDescription(context, messages);
    const summary = await employeeLedgerSummary(
      session.companyId,
      context.employeeId,
      {
        type: "conversation",
        description,
        statusDot: "green",
        dateMs: Date.now(),
      },
      ledgerRef.id,
    );
    batch.set(
      ledgerRef,
      {
        companyId: session.companyId,
        employeeId: context.employeeId,
        type: "conversation",
        date: FieldValue.serverTimestamp(),
        description,
        statusDot: "green",
        reference: "TRANSCRIPT",
        conversationId,
        documentId: null,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: session.uid,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: session.uid,
      },
      { merge: true },
    );
    batch.update(db.collection(EMPLOYEES_COLLECTION).doc(context.employeeId), {
      summary: summary ? { text: summary, updatedAt: FieldValue.serverTimestamp() } : null,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  return messages.slice(-DEFAULT_HISTORY_LIMIT);
}
