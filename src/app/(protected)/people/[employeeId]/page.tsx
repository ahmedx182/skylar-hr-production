import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCircle2, FileText, MapPin } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import { CopyEmailButton } from "@/components/briefing/copy-email-button";
import { EditEmployeeProfile } from "@/components/briefing/edit-employee-profile";
import { PEOPLE_PATH } from "@/constants/routes";
import { ledgerStatusLabel } from "@/features/briefing/status-label";
import { NotFoundError } from "@/lib/errors";
import { requirePageSession } from "@/server/auth/require-session";
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

  let employee;
  let ledger;
  try {
    [employee, ledger] = await Promise.all([
      getCompanyEmployee(session.companyId, params.employeeId),
      listEmployeeLedger(session.companyId, params.employeeId),
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
  const currentState = ledger[0] ? ledgerStatusLabel(ledger[0].statusDot) : "No notes";
  const canEdit = session.role === "admin";

  return (
    <BriefingRoomFrame session={session} active="People">
      <section className="grid content-start gap-3">
        <div className="rounded-[24px] bg-ink-2 px-5 py-5 text-paper shadow-[0_20px_56px_rgba(0,0,0,0.22),inset_0_0_0_1px_rgba(244,239,231,0.055),inset_0_1px_0_rgba(244,239,231,0.08)] md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={PEOPLE_PATH}
              className="inline-flex items-center gap-2 text-sm font-semibold text-paper-3 hover:text-paper"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to people
            </Link>
            {canEdit && <EditEmployeeProfile employee={employee} />}
          </div>

          <div className="mt-4">
            <div className="flex min-w-0 gap-3.5">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-paper text-lg font-semibold text-ink">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-6">
                  <div className="min-w-0">
                    <p className="font-mono text-xs uppercase text-paper-3">Employee profile</p>
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
                  <ProfileMeta icon={CheckCircle2} label="State" value={currentState} />
                  {!employee.location && <ProfileMeta icon={MapPin} label="Location" value="Missing" />}
                  <ProfileMeta icon={CalendarClock} label="Last updated" value={lastUpdated} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[20px] bg-ink-2/60 p-3 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.035)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-paper">Saved notes</p>
              <p className="mt-1 text-sm text-paper-3">
                Every note attached to {employee.name}&apos;s file.
              </p>
            </div>
          </div>

          <div className="mt-3 grid gap-2">
            {ledger.length ? (
              ledger.map((note) => (
                <Link
                  key={note.id}
                  href={`/documents/${note.id}`}
                  className="grid gap-3 rounded-xl bg-paper/[0.055] px-4 py-3 transition-colors hover:bg-paper/[0.10] md:grid-cols-[86px_minmax(0,1fr)_150px] md:items-center"
                >
                  <span className="w-fit rounded-full bg-paper px-3 py-1 font-mono text-xs uppercase text-ink">
                    {note.type}
                  </span>
                  <p className="text-sm leading-6 text-paper-2">{note.description}</p>
                  <p className="text-sm text-paper-3 md:text-right">
                    {ledgerStatusLabel(note.statusDot)}
                  </p>
                </Link>
              ))
            ) : (
              <div className="rounded-xl bg-paper/[0.06] px-4 py-8 text-center">
                <FileText className="mx-auto size-6 text-paper-3" aria-hidden="true" />
                <p className="mt-3 font-semibold text-paper">No notes saved for this person yet.</p>
                <p className="mt-2 text-sm leading-6 text-paper-3">
                  Use New note and select this employee when there is context to keep.
                </p>
              </div>
            )}
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
