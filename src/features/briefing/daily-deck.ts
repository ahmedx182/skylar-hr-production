import type { EmployeeRecord, LedgerRecord } from "@/server/repositories/briefing-read.repository";
import type { AuthSession } from "@/types/auth";
import { employeeFileGuide, ledgerGuide } from "./conversation-guide";
import type { BriefingCard, BriefingTone } from "./types";

type BriefingRecords = {
  employees: EmployeeRecord[];
  ledger: LedgerRecord[];
};

const urgencyRank: Record<BriefingTone, number> = {
  risk: 0,
  attention: 1,
  neutral: 2,
  success: 3,
};

function toneForLedger(record: LedgerRecord): BriefingTone {
  if (record.statusDot === "red") return "risk";
  if (record.statusDot === "green") return "success";
  return "attention";
}

function dateLabel(dateMs: number): string {
  if (!dateMs) return "Open";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(dateMs));
}

function conversationCardBody(record: LedgerRecord): string {
  const employeeName = record.employeeName ?? "this employee";
  return `A Skylar conversation transcript was saved for ${employeeName}. Open the record when you need the full context, then decide whether anything needs follow-up.`;
}

function ledgerCard(record: LedgerRecord): BriefingCard {
  const tone = toneForLedger(record);
  const isConversation = record.type === "conversation";
  const actions: BriefingCard["actions"] = [
    { label: "Prepare", kind: "prepare", tone: "attention" },
    { label: isConversation ? "Open transcript" : "Open note", kind: "open_file" },
    { label: "Open profile", kind: "open_profile" },
    ...(tone === "risk" ? [{ label: "Hold to escalate", kind: "escalate" as const, tone: "risk" as const }] : []),
    { label: "Next", kind: "next" },
    { label: "Not now", kind: "not_now" },
  ];

  return {
    id: `ledger:${record.id}`,
    eyebrow: tone === "risk" ? "High attention" : tone === "success" ? "Recently saved" : "Follow-up",
    title: isConversation
      ? record.employeeName
        ? `Review the saved Skylar conversation for ${record.employeeName}.`
        : "Review the saved Skylar conversation."
      : record.employeeName
        ? `Review the latest note for ${record.employeeName}.`
        : "Review the latest saved note.",
    body: isConversation ? conversationCardBody(record) : record.description,
    detail: `${record.type} saved in the employee ledger`,
    subject: record.employeeName ?? "Employee record",
    dueLabel: dateLabel(record.dateMs),
    tone,
    employeeId: record.employeeId || undefined,
    ledgerEntryId: record.id,
    guide: ledgerGuide({ tone, type: record.type, employeeName: record.employeeName }),
    actions,
  };
}

function employeeCard(record: EmployeeRecord): BriefingCard {
  return {
    id: `employee:${record.id}`,
    eyebrow: "Employee file",
    title: `Review ${record.name}'s file.`,
    body:
      record.summary ??
      "This employee file has been created but does not have a saved summary yet.",
    detail: record.jobTitle ?? record.location ?? "Employee record",
    subject: record.name,
    subjectRole: record.jobTitle ?? "Employee record",
    dueLabel: dateLabel(record.updatedAtMs),
    tone: "neutral",
    employeeId: record.id,
    guide: employeeFileGuide(record.name),
    actions: [
      { label: "Prepare", kind: "prepare" },
      { label: "Open profile", kind: "open_profile" },
      { label: "Next", kind: "next" },
      { label: "Not now", kind: "not_now" },
    ],
  };
}

function clearCard(session: AuthSession, records: BriefingRecords): BriefingCard {
  return {
    id: "system:clear",
    eyebrow: "Clear",
    title: "No saved people work is waiting yet.",
    body: "Create an employee file or save a note, and Skylar will bring the real record into this briefing.",
    detail: `${records.employees.length} employee files, ${records.ledger.length} ledger entries`,
    subject: session.companyId,
    dueLabel: "Clear",
    tone: "neutral",
    actions: [
      { label: "New note", kind: "add_note" },
      { label: "New person", kind: "add_person" },
    ],
  };
}

export function buildDailyBriefingDeck(
  session: AuthSession,
  records: BriefingRecords,
  hiddenCardIds: Set<string> = new Set(),
): BriefingCard[] {
  const ledgerCards = records.ledger.map(ledgerCard);
  const employeesWithLedger = new Set(records.ledger.map((record) => record.employeeId).filter(Boolean));
  const employeeCards = records.employees
    .filter((record) => !employeesWithLedger.has(record.id))
    .map(employeeCard);

  const cards = [...ledgerCards, ...employeeCards]
    .filter((card) => !hiddenCardIds.has(card.id))
    .sort((a, b) => {
      const urgency = urgencyRank[a.tone] - urgencyRank[b.tone];
      if (urgency !== 0) return urgency;

      const due = (a.ledgerEntryId ? records.ledger.find((record) => record.id === a.ledgerEntryId)?.dateMs : undefined)
        ?? (a.employeeId ? records.employees.find((record) => record.id === a.employeeId)?.updatedAtMs : undefined)
        ?? 0;
      const nextDue = (b.ledgerEntryId ? records.ledger.find((record) => record.id === b.ledgerEntryId)?.dateMs : undefined)
        ?? (b.employeeId ? records.employees.find((record) => record.id === b.employeeId)?.updatedAtMs : undefined)
        ?? 0;

      return due - nextDue;
    });

  return cards.length > 0 ? [...cards, clearCard(session, records)] : [clearCard(session, records)];
}
