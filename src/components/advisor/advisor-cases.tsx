"use client";

import { ArrowLeft, ChevronDown, FileText, MessagesSquare, Search, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LiveAdvisorThread } from "@/components/briefing/live-advisor-thread";
import { PEOPLE_PATH } from "@/constants/routes";
import { casePhaseLabel, sortCases, type AdvisorEscalationRecord } from "@/features/advisor/escalation-queue";
import { waitingNote, type LiveChatPhase } from "@/features/advisor/live-chat";
import { formatRelative } from "@/features/platform/format";
import { friendlyName } from "@/lib/person-name";
import { cn } from "@/lib/utils/cn";

type Tab = "open" | "closed";

const TABS: { key: Tab; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "closed", label: "Closed" },
];

/** More than this and a search box earns its space. */
const SEARCH_THRESHOLD = 8;

const dotClass: Record<LiveChatPhase, string> = {
  waiting: "bg-attention",
  connected: "bg-success",
  closed: "bg-paper-3",
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  const payload = (await response.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
  if (!response.ok || !payload) throw new Error(payload?.error?.message ?? "Skylar could not load your advisor chats.");
  return payload;
}

/** What is going on, in one sentence, so nobody has to read a status code. */
function statusLine(record: AdvisorEscalationRecord): string {
  if (record.phase === "connected") return `${friendlyName(record.claimedByName, "An advisor")} from Skylar HR is handling this.`;
  if (record.phase === "waiting") return waitingNote(record.afterHours);
  return "HR closed this chat. Start a new chat if you need more help.";
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AdvisorCases() {
  const [records, setRecords] = useState<AdvisorEscalationRecord[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState<Tab>("open");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdvisorEscalationRecord | null>(null);
  /** On a phone the list and the conversation take turns. */
  const [showDetail, setShowDetail] = useState(false);
  const autoSelected = useRef(false);
  const router = useRouter();
  const articleRef = useRef<HTMLElement>(null);
  const lastOpenCount = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const { escalations } = await getJson<{ escalations: AdvisorEscalationRecord[] }>("/api/advisor/escalations");
      setRecords(sortCases(escalations));
      setLoadError("");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Skylar could not load your advisor chats.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // A stable function: the conversation calls it when its chat opens or closes.
  const refreshList = useCallback(() => void load(), [load]);

  // The list refreshes when an advisor acts (the notification stream announces it) and when the tab is revisited.
  useEffect(() => {
    let timer: number | undefined;
    const soon = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void load(), 400);
    };
    const onVisible = () => document.visibilityState === "visible" && soon();
    window.addEventListener("skylar:unread", soon);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("skylar:unread", soon);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const counts = useMemo(() => {
    const all = records ?? [];
    return { open: all.filter((item) => item.phase !== "closed").length, closed: all.filter((item) => item.phase === "closed").length };
  }, [records]);

  // Start on the first open chat (or the first closed one if that is all there is), once.
  useEffect(() => {
    if (!records || autoSelected.current || records.length === 0) return;
    autoSelected.current = true;
    const first = records.find((item) => item.phase !== "closed") ?? records[0];
    setTab(first.phase === "closed" ? "closed" : "open");
    setSelectedId(first.id);
  }, [records]);

  const visible = useMemo(() => {
    const wanted = (records ?? []).filter((item) => (tab === "open" ? item.phase !== "closed" : item.phase === "closed"));
    const needle = query.trim().toLowerCase();
    return needle ? wanted.filter((item) => `${item.employeeName} ${item.caseId} ${item.escalationReason}`.toLowerCase().includes(needle)) : wanted;
  }, [records, tab, query]);

  const selected = records?.find((item) => item.id === selectedId) ?? null;

  // The list follows the chat you are reading: when HR closes it (or you reopen it), its tab comes with it.
  const selectedPhase = selected?.phase;
  useEffect(() => {
    if (selectedPhase) setTab(selectedPhase === "closed" ? "closed" : "open");
  }, [selectedPhase]);

  // The count in the sidebar is drawn by the server, so it is refreshed when the number of open chats changes.
  useEffect(() => {
    if (records === null) return;
    if (lastOpenCount.current !== null && lastOpenCount.current !== counts.open) router.refresh();
    lastOpenCount.current = counts.open;
  }, [records, counts.open, router]);

  // The reason, commitment and related notes load with the case you are looking at.
  useEffect(() => {
    setDetail(null);
    if (!selectedId) return;
    let cancelled = false;
    getJson<{ escalation: AdvisorEscalationRecord }>(`/api/advisor/escalations/${selectedId}`)
      .then(({ escalation }) => !cancelled && setDetail(escalation))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const choose = (id: string) => {
    setSelectedId(id);
    setShowDetail(true);
    // On a phone the menu sits above the page, so bring the conversation to the top of the screen.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      window.setTimeout(() => articleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    }
  };

  const backToList = () => {
    setShowDetail(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showSearch = (records?.length ?? 0) > SEARCH_THRESHOLD;

  return (
    <section className="grid min-w-0 grid-cols-1 content-start gap-4">
      <header className={cn("flex flex-wrap items-end justify-between gap-3", showDetail && "max-lg:hidden")}>
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.01em] text-paper">Advisor</h1>
          <p className="mt-1 text-sm text-paper-3">Your chats with Skylar&apos;s HR advisors, for the situations an AI shouldn&apos;t handle alone.</p>
        </div>
        {records !== null && records.length > 0 && (
          <div role="tablist" aria-label="Chat status" className="inline-flex gap-1 rounded-xl bg-paper/[0.05] p-1">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={cn("h-8 rounded-lg px-3 text-xs font-semibold transition-colors", tab === key ? "bg-paper text-ink" : "text-paper-3 hover:text-paper")}
              >
                {label} <span className="tabular-nums opacity-60">{counts[key]}</span>
              </button>
            ))}
          </div>
        )}
      </header>

      {loadError && (
        <p role="alert" className="rounded-xl bg-risk/10 px-4 py-3 text-sm text-risk">
          {loadError}
        </p>
      )}

      {records === null && !loadError && <Skeleton />}

      {records !== null && records.length === 0 && <EmptyState />}

      {records !== null && records.length > 0 && (
        <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className={cn("grid min-w-0 content-start gap-2", showDetail && "max-lg:hidden")}>
            {showSearch && (
              <label className="relative block">
                <span className="sr-only">Search chats</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-paper-3" aria-hidden="true" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name or case"
                  className="h-10 w-full rounded-xl bg-paper/[0.05] pl-9 pr-3 text-sm text-paper outline-none placeholder:text-paper-3 focus-visible:ring-2 focus-visible:ring-paper/30"
                />
              </label>
            )}
            {visible.length === 0 ? (
              <p className="rounded-xl bg-paper/[0.04] px-4 py-8 text-center text-sm text-paper-3">
                {query ? "No chats match that search." : tab === "open" ? "No open chats. They appear here when Skylar moves one to HR." : "No closed chats yet."}
              </p>
            ) : (
              <ul className="grid gap-1">
                {visible.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => choose(item.id)}
                      aria-current={item.id === selectedId ? "true" : undefined}
                      className={cn(
                        "grid w-full gap-1 rounded-xl px-3 py-2.5 text-left transition-colors",
                        item.id === selectedId ? "bg-paper/[0.1]" : "hover:bg-paper/[0.05]",
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-paper">{item.employeeName}</span>
                        <span className="shrink-0 text-[11px] text-paper-3">{formatRelative(item.lastActivityMs ?? item.createdAtMs)}</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-paper-2">
                        <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", dotClass[item.phase])} />
                        {casePhaseLabel(item)}
                        {item.reopenCount > 0 && <span className="text-paper-3">· Reopened</span>}
                      </span>
                      <span className="line-clamp-1 text-xs text-paper-3">{item.escalationReason}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <main className={cn("min-w-0", !showDetail && "max-lg:hidden")}>
            {selected ? (
              <article ref={articleRef} className="grid grid-cols-1 h-[calc(100dvh-13rem)] max-lg:h-[calc(100dvh-5.5rem)] min-h-[480px] grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl bg-ink-2/70 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.05)]">
                <header className="flex items-center gap-3 border-b border-paper/[0.06] px-4 py-3">
                  <button
                    type="button"
                    onClick={backToList}
                    aria-label="Back to all chats"
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-paper-2 transition-colors hover:bg-paper/[0.08] hover:text-paper lg:hidden"
                  >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                  </button>
                  <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-xl bg-paper/[0.08] text-xs font-semibold text-paper-2">
                    {initials(selected.employeeName) || <UserRound className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-semibold text-paper">{selected.employeeName}</h2>
                    <p className="truncate text-xs text-paper-3">
                      {selected.caseId} · opened {formatRelative(selected.createdAtMs).toLowerCase()}
                    </p>
                  </div>
                  {selected.employeeId && (
                    <Link
                      href={`${PEOPLE_PATH}/${selected.employeeId}`}
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-paper/[0.08] px-3 text-xs font-semibold text-paper transition-colors hover:bg-paper/[0.14]"
                    >
                      <UserRound className="size-3.5" aria-hidden="true" />
                      <span className="hidden sm:inline">Employee file</span>
                      <span className="sm:hidden">File</span>
                    </Link>
                  )}
                </header>

                <p
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-xs",
                    selected.phase === "waiting" && "bg-attention/10 text-attention",
                    selected.phase === "connected" && "bg-success/10 text-success",
                    selected.phase === "closed" && "bg-paper/[0.04] text-paper-3",
                  )}
                >
                  <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", dotClass[selected.phase])} />
                  {statusLine(selected)}
                </p>

                <div className="min-h-0">
                  <LiveAdvisorThread key={selected.id} escalationId={selected.id} variant="page" onOpenChange={refreshList} />
                </div>

                <details className="group relative border-t border-paper/[0.06]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-xs font-semibold text-paper-2 transition-colors hover:text-paper [&::-webkit-details-marker]:hidden">
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5" aria-hidden="true" />
                      Why this was flagged
                    </span>
                    <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  {/* A sheet over the conversation, not a block that squeezes it. */}
                  <div className="absolute inset-x-0 bottom-full z-10 grid max-h-[min(22rem,50dvh)] gap-3 overflow-y-auto rounded-t-2xl border-t border-paper/[0.08] bg-ink-2 px-4 pb-4 pt-4 text-sm leading-6 shadow-[0_-18px_40px_rgba(0,0,0,0.35)]">
                    <p className="text-paper-2">{(detail ?? selected).escalationReason}</p>
                    <p className="text-xs text-paper-3">{(detail ?? selected).responseCommitment}.</p>
                    {detail && detail.relatedLedger.length > 0 && (
                      <ul className="grid gap-1.5">
                        <li className="text-[11px] font-semibold uppercase tracking-wide text-paper-3">Related notes on file</li>
                        {detail.relatedLedger.map((entry) => (
                          <li key={entry.id}>
                            <Link
                              href={`/documents/${entry.id}?from=employee&employeeId=${selected.employeeId}`}
                              className="flex items-start gap-2 rounded-lg bg-paper/[0.04] px-3 py-2 text-xs leading-5 text-paper-2 transition-colors hover:bg-paper/[0.08] hover:text-paper"
                            >
                              <FileText className="mt-0.5 size-3.5 shrink-0 text-paper-3" aria-hidden="true" />
                              <span className="line-clamp-2">{entry.description}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </details>
              </article>
            ) : (
              <div className="grid min-h-[320px] place-items-center rounded-2xl bg-paper/[0.03] px-6 text-center">
                <div className="grid justify-items-center gap-2">
                  <MessagesSquare className="size-7 text-paper-3" aria-hidden="true" />
                  <p className="text-sm text-paper-3">Choose a chat to read it.</p>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto grid max-w-md justify-items-center gap-3 rounded-2xl bg-paper/[0.03] px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-paper/[0.07]">
        <ShieldCheck className="size-6 text-paper-2" aria-hidden="true" />
      </span>
      <h2 className="text-lg font-semibold text-paper">No HR chats yet</h2>
      <p className="text-sm leading-6 text-paper-3">
        When a conversation touches harassment, discrimination, leave, termination or similar, Skylar hands it to a real HR advisor instead of answering itself. That chat appears here, and you&apos;ll be notified when the advisor replies.
      </p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-[320px_minmax(0,1fr)]" aria-label="Loading advisor chats">
      <div className="grid gap-1">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-[72px] animate-pulse rounded-xl bg-paper/[0.05]" />
        ))}
      </div>
      <div className="h-[420px] animate-pulse rounded-2xl bg-paper/[0.04]" />
    </div>
  );
}
