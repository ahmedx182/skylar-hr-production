import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCircle2, FilePlus2, Flag, History, MapPin, ShieldAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import { CopyEmailButton } from "@/components/briefing/copy-email-button";
import { DeleteEmployeeButton } from "@/components/briefing/delete-employee-button";
import { EditEmployeeProfile } from "@/components/briefing/edit-employee-profile";
import { EmployeeHistoryList } from "@/components/briefing/employee-history-list";
import { PrintEmployeeFileButton } from "@/components/briefing/print-employee-file-button";
import { NEW_NOTE_PATH, PEOPLE_PATH } from "@/constants/routes";
import { isActiveEscalation, type AdvisorEscalationRecord } from "@/features/advisor/escalation-queue";
import { employeePriority } from "@/features/briefing/employee-priority";
import { ledgerStatusLabel } from "@/features/briefing/status-label";
import { NotFoundError } from "@/lib/errors";
import { requirePageSession } from "@/server/auth/require-session";
import { listCompanyAdvisorEscalations } from "@/server/repositories/advisor-escalation.repository";
import {
  getCompanyEmployee,
  listEmployeeLedger,
} from "@/server/repositories/briefing-read.repository";

export const metadata: Metadata = { title: "Employee Profile" };

export default async function EmployeeProfilePage({
  params,
}: {
  params: { employeeId: string };
}) {
  const session = await requirePageSession();
  if (session.role !== "admin" && session.linkedEmployeeId !== params.employeeId) {
    redirect(session.linkedEmployeeId ? `/people/${session.linkedEmployeeId}` : "/settings");
  }

  const canEdit = session.role === "admin";
  let employee;
  let ledger;
  let escalations: AdvisorEscalationRecord[] = [];
  try {
    [employee, ledger, escalations] = await Promise.all([
      getCompanyEmployee(session.companyId, params.employeeId),
      listEmployeeLedger(session.companyId, params.employeeId),
      // Escalation details are for admins only; employees never see them on their own file.
      canEdit
        ? listCompanyAdvisorEscalations(session.companyId).then((all) =>
            all.filter((item) => item.employeeId === params.employeeId),
          )
        : Promise.resolve([] as AdvisorEscalationRecord[]),
    ]);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  const initials = employee.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "E";
  const lastUpdated = employee.updatedAtMs
    ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(employee.updatedAtMs)
    : "No activity yet";
  const detailChips = [employee.jobTitle, employee.location].filter(Boolean);
  const openEscalations = escalations.filter((item) => isActiveEscalation(item.status)).length;
  const visibleLedger = canEdit ? ledger : ledger.map((entry) => ({ ...entry, isEscalated: false }));
  const currentState = visibleLedger[0]
    ? ledgerStatusLabel(visibleLedger[0].statusDot, visibleLedger[0].isEscalated)
    : "No notes";
  const currentPriority = employeePriority({
    latestStatusDot: ledger[0]?.statusDot ?? null,
    openEscalations,
  });
  const escalationSummary =
    escalations.length === 0
      ? null
      : openEscalations > 0
        ? `${openEscalations} open of ${escalations.length}`
        : `${escalations.length} resolved`;

  return (
    <BriefingRoomFrame session={session} active="People" quickActionEmployeeId={employee.id}>
      <section className="grid content-start gap-3">
        <div className="rounded-[24px] bg-ink-2 px-5 py-5 text-paper shadow-[0_20px_56px_rgba(0,0,0,0.22),inset_0_0_0_1px_rgba(244,239,231,0.055),inset_0_1px_0_rgba(244,239,231,0.08)] md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {canEdit ? (
              <Link
                href={PEOPLE_PATH}
                className="inline-flex items-center gap-2 text-sm font-semibold text-paper-3 hover:text-paper"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to people
              </Link>
            ) : (
              <span />
            )}
            {canEdit && (
              <div className="flex items-center gap-2 print:hidden">
                <PrintEmployeeFileButton employee={employee} ledger={ledger} />
                <EditEmployeeProfile employee={employee} />
                <DeleteEmployeeButton employeeId={employee.id} employeeName={employee.name} />
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="flex min-w-0 gap-3.5">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-paper text-lg font-semibold text-ink">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-6">
                  <div className="min-w-0">
                    <p className="font-mono text-xs uppercase text-paper-3">
                      {employee.employeeCode ?? "Employee profile"}
                    </p>
                    <h1 className="mt-1.5 text-3xl font-semibold leading-tight md:text-4xl">
                      {employee.name}
                    </h1>
                  </div>
                  {detailChips.length > 0 && (
                    <div className="flex shrink-0 flex-wrap gap-2 md:max-w-[42%] md:justify-end">
                      {detailChips.map((chip) => (
                        <span
                          key={chip}
                          className="rounded-full bg-paper/[0.06] px-3 py-1 text-xs font-semibold text-paper-2"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-4 flex w-fit max-w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-paper/[0.045] px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.04)]">
                  <CopyEmailButton email={employee.email} />
                  <ProfileMeta icon={Flag} label="Priority" value={currentPriority} />
                  <ProfileMeta icon={CheckCircle2} label="State" value={currentState} />
                  {escalationSummary && <ProfileMeta icon={ShieldAlert} label="Escalations" value={escalationSummary} />}
                  <ProfileMeta icon={History} label="History" value={`${ledger.length} ${ledger.length === 1 ? "entry" : "entries"}`} />
                  {!employee.location && <ProfileMeta icon={MapPin} label="Location" value="Missing" />}
                  <ProfileMeta icon={CalendarClock} label="Last updated" value={lastUpdated} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[20px] bg-ink-2/60 p-4 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.035)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-paper">History</p>
              <p className="mt-1 text-sm text-paper-3">
                Saved notes and follow-up state for {employee.name}.
              </p>
            </div>
            {canEdit && (
              <Link
                href={`${NEW_NOTE_PATH}?employeeId=${employee.id}`}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-paper px-4 text-sm font-semibold text-ink transition-opacity hover:opacity-90"
              >
                <FilePlus2 className="size-4" aria-hidden="true" />
                New note
              </Link>
            )}
          </div>

          <div className="mt-4">
            <EmployeeHistoryList
              employeeId={employee.id}
              employeeName={employee.name}
              ledger={visibleLedger}
              canChat={canEdit}
            />
          </div>
        </div>
      </section>
    </BriefingRoomFrame>
  );
}

function ProfileMeta({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <span
      title={label}
      aria-label={`${label}: ${value}`}
      className="inline-flex items-center gap-2 text-sm"
    >
      <Icon className="size-4 shrink-0 text-sun/90" aria-hidden="true" />
      <span className="break-all font-semibold text-paper">{value}</span>
    </span>
  );
}
