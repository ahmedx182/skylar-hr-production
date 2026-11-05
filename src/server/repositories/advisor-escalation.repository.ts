import "server-only";
import { isSoftDeleted } from "./soft-delete";
import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import { NotFoundError } from "@/lib/errors";
import type { ClassifierConfidence, DetectionSource } from "@/features/advisor/escalation-detection";
import { liveChatPhase, RESPONSE_COMMITMENT } from "@/features/advisor/live-chat";
import { classifyLedgerRisk } from "@/features/briefing/risk-classification";
import { adminDb } from "@/lib/firebase/admin";
import { sendAdvisorEscalationNotification } from "@/server/email/advisor-escalation-notification";
import {
  isActiveEscalation,
  type AdvisorCaseLedgerItem,
  AdvisorEscalationRecord,
} from "@/features/advisor/escalation-queue";
import { afterHoursNow, seedLiveThread } from "./advisor-live.repository";
import type { AuthSession } from "@/types/auth";

const ESCALATIONS_COLLECTION = "advisor_escalations";
const LEDGER_COLLECTION = "employee_ledger_entries";
const EMPLOYEES_COLLECTION = "employees";

type EscalationStatus = AdvisorEscalationRecord["status"];

type EscalationOptions = {
  /** What the user wrote in chat. It becomes the case's question and opens the live thread. */
  openingMessage?: string;
  /** Why the chat was transferred, when it wasn't the note's own risk rule. */
  reason?: string;
  detection?: { source: DetectionSource; confidence: ClassifierConfidence | null };
};

function caseIdForLedger(ledgerEntryId: string): string {
  return `ADV-${ledgerEntryId.slice(0, 8).toUpperCase()}`;
}

function timestampMs(value: unknown): number | null {
  if (value && typeof value === "object" && "toMillis" in value) {
    const toMillis = (value as { toMillis?: () => number }).toMillis;
    if (typeof toMillis === "function") return toMillis.call(value);
  }
  return null;
}

function escalationStatus(value: unknown): EscalationStatus {
  if (value === "draft_response" || value === "responded" || value === "resolved" || value === "closed") {
    return value;
  }
  return "with_advisor";
}

function ledgerStatusDot(value: unknown): AdvisorCaseLedgerItem["statusDot"] {
  return value === "amber" || value === "green" || value === "red" ? value : null;
}

function escalationFromData(
  id: string,
  data: DocumentData,
  relatedLedger: AdvisorCaseLedgerItem[] = [],
  afterHours = false,
): AdvisorEscalationRecord {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    employeeId: String(data.employeeId ?? ""),
    employeeName: String(data.employeeName ?? "Employee"),
    caseId: String(data.caseId ?? id),
    question: String(data.question ?? ""),
    escalationReason: String(data.escalationReason ?? "High-risk HR question needs advisor review."),
    status: escalationStatus(data.status),
    advisorName: String(data.advisorName ?? "Skylar advisor"),
    advisorCredentialLine: String(data.advisorCredentialLine ?? "Skylar advisor"),
    responseCommitment: String(data.responseCommitment ?? RESPONSE_COMMITMENT),
    draftResponse: typeof data.draftResponse === "string" ? data.draftResponse : null,
    responseText: typeof data.responseText === "string" ? data.responseText : null,
    respondedAtMs: timestampMs(data.respondedAt),
    resolvedAtMs: timestampMs(data.resolvedAt),
    afterHours,
    phase: liveChatPhase(escalationStatus(data.status), typeof data.claimedByUid === "string" ? data.claimedByUid : null),
    claimedByName: typeof data.claimedByName === "string" ? data.claimedByName : null,
    createdAtMs: timestampMs(data.createdAt),
    lastActivityMs: timestampMs(data.lastMessageAt) ?? timestampMs(data.updatedAt),
    reopenCount: typeof data.reopenCount === "number" ? data.reopenCount : 0,
    relatedLedger,
  };
}

async function listRelatedLedger(
  companyId: string,
  employeeId: string,
): Promise<AdvisorCaseLedgerItem[]> {
  if (!employeeId) return [];

  const snapshot = await adminDb()
    .collection(LEDGER_COLLECTION)
    .where("companyId", "==", companyId)
    .where("employeeId", "==", employeeId)
    .get();

  return snapshot.docs
    .filter((doc) => !isSoftDeleted(doc))
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: String(data.type ?? "note"),
        description: String(data.description ?? "No note text saved."),
        statusDot: ledgerStatusDot(data.statusDot),
        dateMs: timestampMs(data.date) ?? timestampMs(data.createdAt) ?? 0,
      };
    })
    .sort((a, b) => b.dateMs - a.dateMs)
    .slice(0, 5);
}

/** A deleted employee's cases are hidden with the file, and come back if it is restored. */
async function softDeletedEmployeeIds(companyId: string): Promise<Set<string>> {
  const snapshot = await adminDb().collection(EMPLOYEES_COLLECTION).where("companyId", "==", companyId).get();
  return new Set(snapshot.docs.filter((doc) => isSoftDeleted(doc)).map((doc) => doc.id));
}

export async function listCompanyAdvisorEscalations(
  companyId: string,
): Promise<AdvisorEscalationRecord[]> {
  const [snapshot, hidden, afterHours] = await Promise.all([
    adminDb().collection(ESCALATIONS_COLLECTION).where("companyId", "==", companyId).get(),
    softDeletedEmployeeIds(companyId),
    afterHoursNow(),
  ]);

  return snapshot.docs
    .filter((doc) => !hidden.has(String(doc.get("employeeId") ?? "")))
    .sort((a, b) => (timestampMs(b.get("createdAt")) ?? 0) - (timestampMs(a.get("createdAt")) ?? 0))
    .map((doc) => escalationFromData(doc.id, doc.data(), [], afterHours));
}

export async function createAdvisorEscalationFromLedger(
  session: AuthSession,
  ledgerEntryId: string,
  options: EscalationOptions = {},
): Promise<AdvisorEscalationRecord> {
  const db = adminDb();
  const ledgerRef = db.collection(LEDGER_COLLECTION).doc(ledgerEntryId);
  const ledgerSnapshot = await ledgerRef.get();
  const ledgerData = ledgerSnapshot.data();

  if (!ledgerSnapshot.exists || !ledgerData || ledgerData.companyId !== session.companyId || isSoftDeleted(ledgerSnapshot)) {
    throw new NotFoundError("Note not found.");
  }

  const employeeId = String(ledgerData.employeeId ?? "");
  const employeeRef = db.collection(EMPLOYEES_COLLECTION).doc(employeeId);
  const employeeSnapshot = await employeeRef.get();
  const employeeData = employeeSnapshot.data();

  if (!employeeSnapshot.exists || !employeeData || employeeData.companyId !== session.companyId || isSoftDeleted(employeeSnapshot)) {
    throw new NotFoundError("Employee not found.");
  }

  const escalationRef = db.collection(ESCALATIONS_COLLECTION).doc(`ledger_${ledgerEntryId}`);
  const existing = await escalationRef.get();
  if (existing.exists) {
    return getCompanyAdvisorEscalation(session.companyId, escalationRef.id);
  }

  const description = String(ledgerData.description ?? "High-risk employee note needs review.");
  const risk = classifyLedgerRisk(description);
  const riskReason =
    options.reason ??
    (typeof ledgerData.riskReason === "string" && ledgerData.riskReason.trim()
      ? ledgerData.riskReason
      : risk.reason ?? "High-risk HR note needs advisor review before the manager acts.");
  const question = options.openingMessage?.trim() || `Review this employee record before next action: ${description}`;
  const caseId = caseIdForLedger(ledgerEntryId);
  const employeeName = String(employeeData.name ?? "Employee");
  const now = FieldValue.serverTimestamp();

  await escalationRef.set({
    companyId: session.companyId,
    employeeId,
    employeeName,
    caseId,
    question,
    escalationReason: riskReason,
    detectionSource: options.detection?.source ?? "manual",
    detectionConfidence: options.detection?.confidence ?? null,
    status: "with_advisor",
    advisorName: "Skylar advisor",
    advisorCredentialLine: "People advisor",
    responseCommitment: RESPONSE_COMMITMENT,
    draftResponse: null,
    responseText: null,
    sourceLedgerEntryId: ledgerEntryId,
    advisorNotificationStatus: "pending",
    advisorNotificationMessageId: null,
    advisorNotificationError: null,
    createdAt: now,
    createdBy: session.uid,
    updatedAt: now,
    updatedBy: session.uid,
  });

  // The case stands without its opening messages, so this must not stop the advisors being told.
  await seedLiveThread(
    escalationRef.id,
    options.openingMessage ? { text: options.openingMessage, authorName: session.displayName ?? null, authorUid: session.uid } : undefined,
  ).catch((error: unknown) => console.error("Could not open the live thread", error));

  await ledgerRef.set(
    {
      advisorEscalationId: escalationRef.id,
      advisorEscalatedAt: now,
      updatedAt: now,
      updatedBy: session.uid,
    },
    { merge: true },
  );

  const notification = await sendAdvisorEscalationNotification({
    caseId,
    employeeName,
    question,
    escalationReason: riskReason,
    responseCommitment: RESPONSE_COMMITMENT,
  });

  await escalationRef.set(
    {
      advisorNotificationStatus: notification.status,
      advisorNotificationMessageId: notification.status === "sent" ? notification.messageId : null,
      advisorNotificationError: notification.status === "sent" ? null : notification.reason,
      advisorNotificationUpdatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: session.uid,
    },
    { merge: true },
  );

  return getCompanyAdvisorEscalation(session.companyId, escalationRef.id);
}

export async function getCompanyAdvisorEscalation(
  companyId: string,
  escalationId: string,
): Promise<AdvisorEscalationRecord> {
  const doc = await adminDb().collection(ESCALATIONS_COLLECTION).doc(escalationId).get();
  const data = doc.data();

  if (!doc.exists || !data || data.companyId !== companyId) {
    throw new NotFoundError("Advisor escalation not found.");
  }

  const employeeId = String(data.employeeId ?? "");
  const relatedLedger = await listRelatedLedger(companyId, employeeId);
  return escalationFromData(doc.id, data, relatedLedger, await afterHoursNow());
}

/** Chats that are not closed yet, whether waiting for HR or in conversation with them. Returns 0 if the lookup fails. */
export async function countOpenEscalations(companyId: string): Promise<number> {
  try {
    const [snapshot, hidden] = await Promise.all([
      adminDb().collection(ESCALATIONS_COLLECTION).where("companyId", "==", companyId).select("status", "employeeId").get(),
      softDeletedEmployeeIds(companyId),
    ]);

    return snapshot.docs.filter((doc) => {
      if (hidden.has(String(doc.get("employeeId") ?? ""))) return false;
      return isActiveEscalation(escalationStatus(doc.get("status")));
    }).length;
  } catch (error) {
    console.error("Could not count open escalations", error);
    return 0;
  }
}
