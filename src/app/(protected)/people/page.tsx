import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarClock, UserRound } from "lucide-react";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import { RecentlyDeletedLink } from "@/components/briefing/recently-deleted-link";
import { PeopleListClient } from "@/components/briefing/people-list-client";
import { SectionHero } from "@/components/briefing/section-hero";
import { requirePageSession } from "@/server/auth/require-session";
import { getLayoutPreferences } from "@/server/preferences/layout-preferences";
import { listCompanyEmployees } from "@/server/repositories/briefing-read.repository";

export const metadata: Metadata = { title: "People" };

export default async function PeoplePage() {
  const session = await requirePageSession();
  if (session.role !== "admin") redirect(session.linkedEmployeeId ? `/people/${session.linkedEmployeeId}` : "/settings");
  const employees = await listCompanyEmployees(session.companyId);

  return (
    <BriefingRoomFrame session={session} active="People">
      <section className="grid content-start gap-4">
        <SectionHero
          eyebrow="Employee notes"
          title="Every person gets a clean, chronological story."
          body="Use People when you need context outside the daily flow: open items, recent notes, next touchpoint, and saved conversations."
          icon={UserRound}
          action={<RecentlyDeletedLink />}
        />

        <p className="flex items-start gap-2 rounded-xl bg-paper/[0.06] px-4 py-3 text-sm leading-6 text-paper-2">
          <CalendarClock className="mt-1 size-4 shrink-0 text-attention" aria-hidden="true" />
          Search by name, email, role, or summary. Employee files stay attached to notes and conversations.
        </p>

        <PeopleListClient
          initialDensity={getLayoutPreferences().listDensity}
          items={employees.map((employee) => ({
            id: employee.id,
            name: employee.name,
            jobTitle: employee.jobTitle,
            employeeCode: employee.employeeCode,
            email: employee.email,
            location: employee.location,
            summary: employee.summary,
            updatedAtMs: employee.updatedAtMs,
            href: `/people/${employee.id}`,
          }))}
        />
      </section>
    </BriefingRoomFrame>
  );
}
