import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarClock, FileText } from "lucide-react";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import { DocumentsListClient } from "@/components/briefing/documents-list-client";
import { RecentlyDeletedLink } from "@/components/briefing/recently-deleted-link";
import { SectionHero } from "@/components/briefing/section-hero";
import { ledgerStatusLabel } from "@/features/briefing/status-label";
import { requirePageSession } from "@/server/auth/require-session";
import { getLayoutPreferences } from "@/server/preferences/layout-preferences";
import { listCompanyLedger, listEmployeeLedger } from "@/server/repositories/briefing-read.repository";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const session = await requirePageSession();
  if (session.role !== "admin" && !session.linkedEmployeeId) redirect("/settings");
  const ledger = session.role === "admin"
    ? await listCompanyLedger(session.companyId)
    : await listEmployeeLedger(session.companyId, session.linkedEmployeeId!);

  return (
    <BriefingRoomFrame session={session} active="Documents">
      <section className="grid content-start gap-4">
        <SectionHero
          eyebrow="Saved history"
          title="Documents stay attached to the moment they support."
          body="This is not a separate vault. Records belong with employee history so the why, when, and outcome stay together."
          icon={FileText}
          action={session.role === "admin" ? <RecentlyDeletedLink /> : undefined}
        />

        <p className="flex items-start gap-2 rounded-xl bg-paper/[0.06] px-4 py-3 text-sm leading-6 text-paper-2">
          <CalendarClock className="mt-1 size-4 shrink-0 text-attention" aria-hidden="true" />
          Search by employee, record type, status, or note text. Conversation records and notes stay searchable here.
        </p>

        <DocumentsListClient
          initialDensity={getLayoutPreferences().listDensity}
          items={ledger.map((entry) => ({
            id: entry.id,
            label: entry.type,
            title: entry.employeeName ?? "Employee record",
            body: entry.description,
            meta: ledgerStatusLabel(entry.statusDot, session.role === "admin" && entry.isEscalated),
            href: `/documents/${entry.id}`,
          }))}
        />
      </section>
    </BriefingRoomFrame>
  );
}
