import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarClock, FileText } from "lucide-react";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import { DocumentsListClient } from "@/components/briefing/documents-list-client";
import { SectionHero } from "@/components/briefing/section-hero";
import { ledgerStatusLabel } from "@/features/briefing/status-label";
import { requirePageSession } from "@/server/auth/require-session";
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
        />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <DocumentsListClient
            items={ledger.map((entry) => ({
              id: entry.id,
              label: entry.type,
              title: entry.employeeName ?? "Employee record",
              body: entry.description,
              meta: ledgerStatusLabel(entry.statusDot, session.role === "admin" && entry.isEscalated),
              href: `/documents/${entry.id}`,
            }))}
          />

          <aside className="grid min-h-[320px] place-items-center rounded-[24px] bg-paper/[0.06] p-4">
            <div className="w-full max-w-[260px]">
              <p className="text-sm font-semibold text-paper">How this works</p>
              <p className="mt-3 text-sm leading-6 text-paper-2">
                Search by employee, record type, status, or note text. Skylar keeps the filtered list tied to the same ledger records.
              </p>
              <div className="mt-5 rounded-xl bg-ink px-4 py-4">
                <p className="flex items-start gap-2 text-sm leading-6 text-paper-2">
                  <CalendarClock className="mt-0.5 size-4 shrink-0 text-attention" aria-hidden="true" />
                  Conversation records and notes stay searchable here.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </BriefingRoomFrame>
  );
}
