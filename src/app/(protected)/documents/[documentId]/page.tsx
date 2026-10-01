import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, FileText } from "lucide-react";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import { ConversationActionPanel } from "@/components/briefing/conversation-action-panel";
import { EditNoteActions } from "@/components/briefing/edit-note-actions";
import { FormattedLedgerDescription } from "@/components/briefing/formatted-ledger-description";
import { NoteAdvisorChatButton } from "@/components/briefing/note-advisor-chat-button";
import { SectionHero } from "@/components/briefing/section-hero";
import { DOCUMENTS_PATH, NEW_NOTE_PATH } from "@/constants/routes";
import { conversationLedgerSummary } from "@/features/briefing/ledger-display";
import { ledgerStatusLabel } from "@/features/briefing/status-label";
import { NotFoundError } from "@/lib/errors";
import { requirePageSession } from "@/server/auth/require-session";
import { getCompanyLedgerEntry } from "@/server/repositories/briefing-read.repository";

export const metadata: Metadata = { title: "Saved Note" };

export default async function DocumentDetailPage({
  params,
  searchParams,
}: {
  params: { documentId: string };
  searchParams?: { from?: string; employeeId?: string };
}) {
  const session = await requirePageSession();

  let note;
  try {
    note = await getCompanyLedgerEntry(session.companyId, params.documentId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  if (session.role !== "admin" && note.employeeId !== session.linkedEmployeeId) notFound();
  const isConversation = note.type === "conversation";
  const conversationSummary = isConversation ? conversationLedgerSummary(note.description) : null;
  const backHref =
    searchParams?.from === "employee" && searchParams.employeeId
      ? `/people/${searchParams.employeeId}`
      : DOCUMENTS_PATH;
  const backLabel = searchParams?.from === "employee" ? "Back to employee" : "Back to documents";

  return (
    <BriefingRoomFrame session={session} active="Documents">
      <section className="grid content-start gap-4">
        <Link
          href={backHref}
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-paper-3 transition-colors hover:text-paper"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {backLabel}
        </Link>

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
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/10 pb-4">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-ink px-3 py-1.5 font-mono text-xs uppercase text-paper">
                {note.type}
              </span>
              <span className="rounded-full bg-ink/[0.06] px-3 py-1.5 font-mono text-xs uppercase text-ink/55">
                {ledgerStatusLabel(note.statusDot)}
              </span>
            </div>
            {session.role === "admin" && note.employeeId && (
              <EditNoteActions
                noteId={note.id}
                employeeId={note.employeeId}
                description={note.description}
                statusDot={note.statusDot ?? "none"}
              />
            )}
          </div>

          {conversationSummary ? (
            <div className="mt-5 grid gap-5">
              <section className="grid gap-4 rounded-2xl bg-ink/[0.035] px-4 py-4 md:grid-cols-[minmax(0,1fr)_260px] md:px-5">
                <div className="min-w-0">
                  <p className="font-mono text-xs uppercase text-ink/45">Working summary</p>
                  <h2 className="mt-3 text-2xl font-semibold leading-8 text-ink">{conversationSummary.title}</h2>
                  {conversationSummary.goal && (
                    <p className="mt-3 text-base leading-7 text-ink/70">
                      <span className="font-semibold text-ink">Goal:</span> {conversationSummary.goal}
                    </p>
                  )}
                  {conversationSummary.asked && (
                    <p className="mt-2 text-base leading-7 text-ink/65">
                      <span className="font-semibold text-ink">Asked:</span> {conversationSummary.asked}
                    </p>
                  )}
                </div>

                {session.role === "admin" && note.employeeId && note.employeeName && (
                  <div className="grid content-start gap-2 rounded-xl bg-paper/70 p-3 shadow-[inset_0_0_0_1px_rgba(11,11,14,0.06)]">
                    <p className="font-mono text-[11px] uppercase text-ink/45">Next action</p>
                    <NoteAdvisorChatButton employeeId={note.employeeId} employeeName={note.employeeName} note={note.description} variant="light" />
                    <Link
                      href={`${NEW_NOTE_PATH}?employeeId=${note.employeeId}`}
                      className="inline-flex h-9 items-center justify-center rounded-full border border-ink/10 px-3 text-xs font-semibold text-ink/70 transition-colors hover:bg-ink hover:text-paper"
                    >
                      Save follow-up note
                    </Link>
                  </div>
                )}
              </section>

              <ConversationActionPanel summary={conversationSummary} storageKey={note.id} />

              <details className="rounded-2xl bg-ink/[0.045] px-4 py-4 open:pb-5 md:px-5">
                <summary className="cursor-pointer text-sm font-semibold text-ink">Full transcript</summary>
                <div className="mt-5">
                  <FormattedLedgerDescription text={note.description} />
                </div>
              </details>
            </div>
          ) : (
            <div className="mt-6">
              <FormattedLedgerDescription text={note.description} />
            </div>
          )}

        </article>
      </section>
    </BriefingRoomFrame>
  );
}
