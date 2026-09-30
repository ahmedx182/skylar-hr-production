import type { Metadata } from "next";
import { CalendarClock, UserRound } from "lucide-react";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import { PeopleListClient } from "@/components/briefing/people-list-client";
import { SectionHero } from "@/components/briefing/section-hero";
import { requirePageSession } from "@/server/auth/require-session";
import { listCompanyEmployees } from "@/server/repositories/briefing-read.repository";

export const metadata: Metadata = { title: "People" };

export default async function PeoplePage() {
  const session = await requirePageSession();
  const employees = await listCompanyEmployees(session.companyId);

  return (
    <BriefingRoomFrame session={session} active="People">
      <section className="grid content-start gap-4">
        <SectionHero
          eyebrow="Employee notes"
          title="Every person gets a clean, chronological story."
          body="Use People when you need context outside the daily flow: open items, recent notes, next touchpoint, and saved conversations."
          icon={UserRound}
        />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <PeopleListClient
            items={employees.map((employee) => ({
              id: employee.id,
              label: employee.summary ? "Open" : "File",
              title: employee.name,
              body: employee.summary ?? "No summary has been saved for this employee yet.",
              meta: [employee.employeeCode, employee.jobTitle, employee.email].filter(Boolean).join(" · ") || "Employee file",
              href: `/people/${employee.id}`,
            }))}
          />

          <aside className="grid min-h-[320px] place-items-center rounded-[24px] bg-paper/[0.06] p-4">
            <div className="w-full max-w-[260px]">
              <p className="text-sm font-semibold text-paper">How this works</p>
              <p className="mt-3 text-sm leading-6 text-paper-2">
                Search by name, email, role, or summary. Employee files stay attached to notes and conversations.
              </p>
              <div className="mt-5 rounded-xl bg-ink px-4 py-4">
                <p className="flex items-start gap-2 text-sm leading-6 text-paper-2">
                  <CalendarClock className="mt-0.5 size-4 shrink-0 text-attention" aria-hidden="true" />
                  Skylar brings items back when they need attention.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </BriefingRoomFrame>
  );
}
