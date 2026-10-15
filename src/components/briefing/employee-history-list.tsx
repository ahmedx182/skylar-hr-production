"use client";

import { FileText, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ListDensityToggle } from "@/components/briefing/list-density-toggle";
import { NoteAdvisorChatButton } from "@/components/briefing/note-advisor-chat-button";
import { conversationLedgerSummary } from "@/features/briefing/ledger-display";
import { ledgerStatusLabel } from "@/features/briefing/status-label";
import type { ListDensity } from "@/features/preferences/layout-preferences";
import { cn } from "@/lib/utils/cn";

type HistoryLedgerRecord = {
  id: string;
  type: string;
  description: string;
  statusDot: "amber" | "green" | "red" | null;
  dateMs: number;
  isEscalated?: boolean;
};

type HistoryFilter = "all" | "needs_follow_up" | "resolved" | "high_attention" | "conversation" | "note";

const historyFilters: { value: HistoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "needs_follow_up", label: "Follow-up" },
  { value: "resolved", label: "Resolved" },
  { value: "high_attention", label: "High attention" },
  { value: "conversation", label: "Conversations" },
  { value: "note", label: "Notes" },
];

export function EmployeeHistoryList({
  employeeId,
  employeeName,
  ledger,
  canChat,
  initialDensity,
}: {
  employeeId: string;
  employeeName: string;
  ledger: HistoryLedgerRecord[];
  canChat: boolean;
  initialDensity: ListDensity;
}) {
  const [density, setDensity] = useState(initialDensity);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const filteredLedger = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return ledger.filter((note) => {
      const matchesQuery =
        !normalizedQuery ||
        `${note.type} ${note.description} ${ledgerStatusLabel(note.statusDot, note.isEscalated)}`
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesFilter =
        filter === "all" ||
        (filter === "needs_follow_up" && note.statusDot === "amber") ||
        (filter === "resolved" && note.statusDot === "green") ||
        (filter === "high_attention" && note.statusDot === "red") ||
        (filter === "conversation" && note.type === "conversation") ||
        (filter === "note" && note.type !== "conversation");

      return matchesQuery && matchesFilter;
    });
  }, [filter, ledger, query]);
  const hasActiveFilters = Boolean(query.trim()) || filter !== "all";

  if (!ledger.length) {
    return (
      <div className="rounded-xl bg-paper/[0.06] px-4 py-8 text-center">
        <FileText className="mx-auto size-6 text-paper-3" aria-hidden="true" />
        <p className="mt-3 font-semibold text-paper">No notes saved for this person yet.</p>
        <p className="mt-2 text-sm leading-6 text-paper-3">
          Save the first note when there is context to keep.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-2 rounded-2xl bg-paper/[0.045] p-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <label className="relative block">
          <span className="sr-only">Search employee history</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-paper-3"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notes, transcripts, status..."
            className="h-10 w-full rounded-xl border border-transparent bg-ink/70 pl-10 pr-3 text-sm text-paper outline-none placeholder:text-paper-3 focus:border-paper/20"
          />
        </label>

        <div className="flex flex-wrap items-center gap-1.5">
          <ListDensityToggle value={density} onChange={setDensity} />
          {historyFilters.map((item) => {
            const isActive = filter === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`h-8 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-paper text-ink"
                    : "bg-paper/[0.04] text-paper-3 hover:bg-paper/[0.08] hover:text-paper"
                }`}
              >
                {item.label}
              </button>
            );
          })}
          <span className="ml-auto rounded-lg px-2 font-mono text-[11px] uppercase text-paper-3">
            {filteredLedger.length}/{ledger.length}
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
              className="h-8 rounded-lg px-2.5 text-xs font-semibold text-paper-3 transition-colors hover:bg-paper/[0.08] hover:text-paper"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {filteredLedger.length ? (
        <div
          className={cn(
            "grid",
            density === "compact" ? "gap-1.5" : "gap-3",
            density === "grid" && "sm:grid-cols-2 2xl:grid-cols-3",
          )}
        >
        {filteredLedger.map((note) => {
          const href = `/documents/${note.id}?from=employee&employeeId=${employeeId}`;
          const status = (
            <span className={`w-fit shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${statusBadgeClass(note.statusDot)}`}>
              {ledgerStatusLabel(note.statusDot, note.isEscalated)}
            </span>
          );
          const chat = canChat && (
            <NoteAdvisorChatButton employeeId={employeeId} employeeName={employeeName} note={note.description} />
          );
          const headline =
            note.type === "conversation" ? conversationLedgerSummary(note.description).title : note.description;

          if (density === "compact") {
            return (
              <div
                key={note.id}
                className="grid gap-2 rounded-xl border border-paper/10 bg-paper/[0.045] px-3 py-2 transition-colors hover:bg-paper/[0.075] md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
              >
                <Link href={href} className="flex min-w-0 items-center gap-3">
                  <span className="shrink-0 rounded-full bg-paper px-2 py-0.5 font-mono text-[10px] uppercase text-ink">
                    {note.type}
                  </span>
                  <span className="hidden shrink-0 font-mono text-[11px] uppercase text-paper-3 sm:inline">
                    {formatLedgerDate(note.dateMs)}
                  </span>
                  <span className="min-w-0 truncate text-sm text-paper-2">{headline}</span>
                </Link>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  {status}
                  {chat}
                </div>
              </div>
            );
          }

          if (density === "grid") {
            return (
              <div
                key={note.id}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-paper/10 bg-paper/[0.045] p-4 transition-colors hover:bg-paper/[0.075]"
              >
                <Link href={href} className="grid min-w-0 gap-3">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="w-fit rounded-full bg-paper px-3 py-1 font-mono text-xs uppercase text-ink">
                      {note.type}
                    </span>
                    <span className="font-mono text-xs uppercase text-paper-3">{formatLedgerDate(note.dateMs)}</span>
                  </span>
                  <span className="line-clamp-4 text-sm leading-6 text-paper-2">{headline}</span>
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                  {status}
                  {chat}
                </div>
              </div>
            );
          }

          return (
          <div
            key={note.id}
            className="grid gap-4 rounded-2xl border border-paper/10 bg-paper/[0.045] px-4 py-4 transition-colors hover:bg-paper/[0.075] md:grid-cols-[150px_minmax(0,1fr)_auto] md:items-start"
          >
            <Link href={`/documents/${note.id}?from=employee&employeeId=${employeeId}`} className="grid gap-2">
              <span className="w-fit rounded-full bg-paper px-3 py-1 font-mono text-xs uppercase text-ink">
                {note.type}
              </span>
              <span className="font-mono text-xs uppercase text-paper-3">
                {formatLedgerDate(note.dateMs)}
              </span>
            </Link>
            <Link href={`/documents/${note.id}?from=employee&employeeId=${employeeId}`} className="min-w-0">
              {note.type === "conversation" ? (
                <ConversationHistoryPreview description={note.description} />
              ) : (
                <p className="line-clamp-3 text-sm leading-6 text-paper-2">{note.description}</p>
              )}
            </Link>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <span className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${statusBadgeClass(note.statusDot)}`}>
                {ledgerStatusLabel(note.statusDot, note.isEscalated)}
              </span>
              {chat}
            </div>
          </div>
          );
        })}
        </div>
      ) : (
        <div className="rounded-xl bg-paper/[0.06] px-4 py-8 text-center">
          <p className="font-semibold text-paper">No history matches those filters.</p>
          <p className="mt-2 text-sm leading-6 text-paper-3">
            Try a different word, status, or record type.
          </p>
        </div>
      )}
    </div>
  );
}

function ConversationHistoryPreview({ description }: { description: string }) {
  const summary = conversationLedgerSummary(description);
  const doneItems = [
    summary.asked ? `Skylar prepared guidance for: ${summary.asked}` : "Skylar prepared conversation guidance.",
    summary.goal ? `Goal set: ${summary.goal}` : null,
  ].filter((item): item is string => Boolean(item));
  const nextItems = summary.nextSteps.length > 0
    ? summary.nextSteps
    : ["Open the transcript, run the conversation, then save what was agreed."];

  return (
    <div className="grid gap-3 text-sm leading-6">
      <p className="font-semibold text-paper">{summary.title}</p>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-paper/[0.045] px-3 py-3">
          <p className="font-mono text-[11px] uppercase text-success">Done</p>
          {doneItems.map((item, index) => (
            <p key={item} className="mt-1 line-clamp-1 text-paper-2">
              {index + 1}. {item}
            </p>
          ))}
        </div>

        <div className="rounded-xl bg-attention/10 px-3 py-3">
          <p className="font-mono text-[11px] uppercase text-attention">Next</p>
          {nextItems.map((step, index) => (
            <p key={step} className="mt-1 line-clamp-1 text-paper-2">
              {index + 1}. {step}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function statusBadgeClass(statusDot: "amber" | "green" | "red" | null): string {
  if (statusDot === "red") return "bg-risk/15 text-risk";
  if (statusDot === "green") return "bg-success/15 text-success";
  if (statusDot === "amber") return "bg-attention/15 text-attention";
  return "bg-paper/[0.08] text-paper-2";
}

function formatLedgerDate(dateMs: number): string {
  if (!dateMs) return "No date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(dateMs);
}
