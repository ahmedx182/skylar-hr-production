import type { EmployeeRecord, LedgerRecord } from "@/server/repositories/briefing-read.repository";
import type { AuthSession } from "@/types/auth";
import type { BriefingCard } from "./types";

export function getStarterBriefingDeck(
  session: AuthSession,
  records: { employees: EmployeeRecord[]; ledger: LedgerRecord[] } = { employees: [], ledger: [] },
): BriefingCard[] {
  const latestLedger = records.ledger[0];
  const latestEmployee = records.employees[0];

  if (latestLedger) {
    return [
      {
        id: latestLedger.id,
        eyebrow: latestLedger.statusDot === "green" ? "Recently saved" : "Needs review",
        title: latestLedger.employeeName
          ? `Review the latest note for ${latestLedger.employeeName}.`
          : "Review the latest saved note.",
        body: latestLedger.description,
        detail: "Saved in the employee ledger",
        subject: latestLedger.employeeName ?? "Employee record",
        dueLabel: "Open",
        tone:
          latestLedger.statusDot === "green"
            ? "success"
            : latestLedger.statusDot === "red"
              ? "risk"
              : "attention",
        actions: [
          { label: "Prepare conversation", tone: "attention" },
          { label: "Skip for today" },
        ],
      },
      clearCard(session, records),
    ];
  }

  if (latestEmployee) {
    return [
      {
        id: latestEmployee.id,
        eyebrow: "Employee file",
        title: `Review ${latestEmployee.name}'s file.`,
        body:
          latestEmployee.summary ??
          "This employee file has been created but does not have a saved summary yet.",
        detail: latestEmployee.jobTitle ?? latestEmployee.location ?? "Employee record",
        subject: latestEmployee.name,
        subjectRole: latestEmployee.jobTitle ?? "Employee record",
        dueLabel: "Open",
        tone: "neutral",
        actions: [
          { label: "Open file" },
          { label: "Add note" },
        ],
      },
      clearCard(session, records),
    ];
  }

  return [clearCard(session, records)];
}

function clearCard(
  session: AuthSession,
  records: { employees: EmployeeRecord[]; ledger: LedgerRecord[] },
): BriefingCard {
  return {
    id: "clear",
    eyebrow: "Clear",
    title: "No saved people work is waiting yet.",
    body: "Create an employee file or save a note, and Skylar will bring the real record into this briefing.",
    detail: `${records.employees.length} employee files, ${records.ledger.length} ledger entries`,
    subject: session.companyId,
    dueLabel: "Clear",
    tone: "neutral",
    actions: [{ label: "Finish" }],
  };
}
