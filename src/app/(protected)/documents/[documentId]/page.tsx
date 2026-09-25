import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, FileText } from "lucide-react";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import { SectionHero } from "@/components/briefing/section-hero";
import { ledgerStatusLabel } from "@/features/briefing/status-label";
import { NotFoundError } from "@/lib/errors";
import { requirePageSession } from "@/server/auth/require-session";
import { getCompanyLedgerEntry } from "@/server/repositories/briefing-read.repository";

export const metadata: Metadata = { title: "Saved Note" };

export default async function DocumentDetailPage({
  params,
}: {
  params: { documentId: string };
}) {
  const session = await requirePageSession();

  let note;
  try {
    note = await getCompanyLedgerEntry(session.companyId, params.documentId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return (
    <BriefingRoomFrame session={session} active="Documents">
      <section className="grid content-start gap-4">
        <SectionHero
          eyebrow="Saved note"
          title={note.employeeName ?? "Employee record"}
          body="This note is saved in the company ledger and attached to the employee file."
          icon={FileText}
          action={
            note.employeeId ? (
            <Link
              href={`/people/${note.employeeId}`}
              className="inline-flex items-center gap-2 rounded-full bg-paper px-4 py-2 text-sm font-semibold text-ink transition-opacity hover:opacity-90"
            >
              Open employee profile
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            ) : null
          }
        />

        <article className="rounded-[24px] bg-paper px-5 py-6 text-ink md:px-7 md:py-7">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-ink px-3 py-1.5 font-mono text-xs uppercase text-paper">
              {note.type}
            </span>
            <span className="rounded-full bg-ink/[0.06] px-3 py-1.5 font-mono text-xs uppercase text-ink/55">
              {ledgerStatusLabel(note.statusDot)}
            </span>
          </div>
          <p className="mt-6 whitespace-pre-wrap text-lg leading-8 text-ink/75">{note.description}</p>
        </article>
      </section>
    </BriefingRoomFrame>
  );
}
