import "server-only";
import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { classifyLedgerRisk } from "@/features/briefing/risk-classification";
import { adminDb } from "@/lib/firebase/admin";
import { sendAdvisorEscalationNotification } from "@/server/email/advisor-escalation-notification";
import type {
  AdvisorCaseLedgerItem,
  AdvisorEscalationRecord,
} from "@/features/advisor/escalation-queue";
import type { AuthSession } from "@/types/auth";

const ESCALATIONS_COLLECTION = "advisor_escalations";
const LEDGER_COLLECTION = "employee_ledger_entries";
const EMPLOYEES_COLLECTION = "employees";

type EscalationStatus = AdvisorEscalationRecord["status"];

type AdvisorMutationInput = {
  action: "save_draft" | "mark_responded" | "resolve";
  responseText?: string;
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
    responseCommitment: String(data.responseCommitment ?? "Reply within 4 business hours"),
    draftResponse: typeof data.draftResponse === "string" ? data.draftResponse : null,
    responseText: typeof data.responseText === "string" ? data.responseText : null,
    respondedAtMs: timestampMs(data.respondedAt),
    resolvedAtMs: timestampMs(data.resolvedAt),
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

export async function listCompanyAdvisorEscalations(
  companyId: string,
): Promise<AdvisorEscalationRecord[]> {
  const snapshot = await adminDb()
    .collection(ESCALATIONS_COLLECTION)
    .where("companyId", "==", companyId)
    .get();

  return snapshot.docs.map((doc) => escalationFromData(doc.id, doc.data()));
}

export async function createAdvisorEscalationFromLedger(
  session: AuthSession,
  ledgerEntryId: string,
): Promise<AdvisorEscalationRecord> {
  const db = adminDb();
  const ledgerRef = db.collection(LEDGER_COLLECTION).doc(ledgerEntryId);
  const ledgerSnapshot = await ledgerRef.get();
  const ledgerData = ledgerSnapshot.data();

  if (!ledgerSnapshot.exists || !ledgerData || ledgerData.companyId !== session.companyId) {
    throw new NotFoundError("Note not found.");
  }

  const employeeId = String(ledgerData.employeeId ?? "");
  const employeeRef = db.collection(EMPLOYEES_COLLECTION).doc(employeeId);
  const employeeSnapshot = await employeeRef.get();
  const employeeData = employeeSnapshot.data();

  if (!employeeSnapshot.exists || !employeeData || employeeData.companyId !== session.companyId) {
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
    typeof ledgerData.riskReason === "string" && ledgerData.riskReason.trim()
      ? ledgerData.riskReason
      : risk.reason ?? "High-risk HR note needs advisor review before the manager acts.";
  const caseId = caseIdForLedger(ledgerEntryId);
  const employeeName = String(employeeData.name ?? "Employee");
  const now = FieldValue.serverTimestamp();

  await escalationRef.set({
    companyId: session.companyId,
    employeeId,
    employeeName,
    caseId,
    question: `Review this employee record before next action: ${description}`,
    escalationReason: riskReason,
    status: "with_advisor",
    advisorName: "Skylar advisor",
    advisorCredentialLine: "People advisor",
    responseCommitment: "Reply within 4 business hours",
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
    question: `Review this employee record before next action: ${description}`,
    escalationReason: riskReason,
    responseCommitment: "Reply within 4 business hours",
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
  return escalationFromData(doc.id, data, relatedLedger);
}

export async function updateAdvisorEscalation(
  session: AuthSession,
  escalationId: string,
  input: AdvisorMutationInput,
): Promise<AdvisorEscalationRecord> {
  const db = adminDb();
  const escalationRef = db.collection(ESCALATIONS_COLLECTION).doc(escalationId);
  const escalationSnapshot = await escalationRef.get();
  const data = escalationSnapshot.data();

  if (!escalationSnapshot.exists || !data || data.companyId !== session.companyId) {
    throw new NotFoundError("Advisor escalation not found.");
  }

  const current = escalationFromData(escalationSnapshot.id, data);
  const responseText = input.responseText?.trim() ?? "";
  const now = FieldValue.serverTimestamp();
  const update: Record<string, unknown> = {
    updatedAt: now,
    updatedBy: session.uid,
  };

  if (input.action === "save_draft") {
    update.status = "draft_response";
    update.draftResponse = responseText;
  }

  if (input.action === "mark_responded") {
    if (!responseText) throw new ConflictError("Add a response before marking the case responded.");
    update.status = "responded";
    update.draftResponse = responseText;
    update.responseText = responseText;
    update.respondedAt = now;
  }

  if (input.action === "resolve") {
    if (current.status !== "responded" || !current.responseText?.trim()) {
      throw new ConflictError("Respond to the case before resolving it.");
    }
    update.status = "resolved";
    update.resolvedAt = now;
  }

  const employeeRef = db.collection(EMPLOYEES_COLLECTION).doc(current.employeeId);
  const employeeSnapshot = await employeeRef.get();
  if (!employeeSnapshot.exists || employeeSnapshot.get("companyId") !== session.companyId) {
    throw new NotFoundError("Employee not found.");
  }

  const batch = db.batch();
  batch.update(escalationRef, update);

  if (input.action === "mark_responded" || input.action === "resolve") {
    const ledgerRef = db.collection(LEDGER_COLLECTION).doc();
    const description =
      input.action === "resolve"
        ? `Advisor case ${current.caseId} resolved.`
        : `Advisor response for ${current.caseId}: ${responseText}`;
    batch.set(ledgerRef, {
      companyId: session.companyId,
      employeeId: current.employeeId,
      type: input.action === "resolve" ? "advisor_resolution" : "advisor_response",
      date: now,
      description,
      statusDot: input.action === "resolve" ? "green" : "red",
      reference: current.caseId,
      conversationId: null,
      documentId: null,
      advisorEscalationId: escalationId,
      createdAt: now,
      createdBy: session.uid,
    });
    batch.update(employeeRef, {
      summary: { text: description, updatedAt: now },
      updatedAt: now,
    });
  }

  await batch.commit();
  return getCompanyAdvisorEscalation(session.companyId, escalationId);
}

export type EscalationAnalytics = {
  total: number;
  open: number;
  responded: number;
  resolved: number;
};

/** Cases still waiting on the advisor (with advisor or draft saved). Returns 0 if the lookup fails. */
export async function countOpenEscalations(companyId: string): Promise<number> {
  try {
    const snapshot = await adminDb()
      .collection(ESCALATIONS_COLLECTION)
      .where("companyId", "==", companyId)
      .select("status")
      .get();

    return snapshot.docs.filter((doc) => {
      const status = escalationStatus(doc.get("status"));
      return status === "with_advisor" || status === "draft_response";
    }).length;
  } catch (error) {
    console.error("Could not count open escalations", error);
    return 0;
  }
}

export async function getEscalationAnalytics(companyId: string): Promise<EscalationAnalytics> {
  const snapshot = await adminDb()
    .collection(ESCALATIONS_COLLECTION)
    .where("companyId", "==", companyId)
    .get();

  let open = 0;
  let responded = 0;
  let resolved = 0;

  for (const doc of snapshot.docs) {
    const status = escalationStatus(doc.get("status"));
    if (status === "with_advisor" || status === "draft_response") open++;
    else if (status === "responded") responded++;
    else if (status === "resolved" || status === "closed") resolved++;
  }

  return { total: snapshot.size, open, responded, resolved };
}
