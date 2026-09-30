"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  RefreshCcw,
  Save,
  Search,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { PEOPLE_PATH } from "@/constants/routes";
import {
  canMarkAdvisorResponded,
  canResolveAdvisorCase,
  canSaveAdvisorDraft,
  toAdvisorQueueItem,
  type AdvisorEscalationRecord,
  type AdvisorQueueItem,
} from "@/features/advisor/escalation-queue";

type QueueResponse = {
  escalations: AdvisorEscalationRecord[];
};

type AdvisorStatusFilter = "all" | AdvisorEscalationRecord["status"];

const statusFilters: { value: AdvisorStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "with_advisor", label: "With advisor" },
  { value: "draft_response", label: "Drafts" },
  { value: "responded", label: "Responded" },
  { value: "resolved", label: "Resolved" },
];

export function AdvisorQueueClient() {
  const [records, setRecords] = useState<AdvisorEscalationRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdvisorStatusFilter>("all");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const items = useMemo(() => records.map(toAdvisorQueueItem), [records]);
  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return records.filter((record) => {
      const matchesStatus = statusFilter === "all" || record.status === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        `${record.caseId} ${record.employeeName} ${record.question} ${record.escalationReason} ${record.advisorName}`
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesStatus && matchesQuery;
    });
  }, [query, records, statusFilter]);
  const filteredItems = useMemo(() => filteredRecords.map(toAdvisorQueueItem), [filteredRecords]);
  const selectedRecord = filteredRecords.find((record) => record.id === selectedId) ?? filteredRecords[0] ?? null;
  const activeCount = items.filter((item) => item.isActive).length;

  useEffect(() => {
    if (selectedRecord && selectedRecord.id !== selectedId) {
      setSelectedId(selectedRecord.id);
    }
  }, [selectedId, selectedRecord]);

  function replaceRecord(nextRecord: AdvisorEscalationRecord) {
    setRecords((current) => current.map((record) => (record.id === nextRecord.id ? nextRecord : record)));
    setSelectedId(nextRecord.id);
  }

  async function openCase(caseId: string) {
    setSelectedId(caseId);
    setDetailError("");
    setLoadingDetailId(caseId);

    try {
      const response = await fetch(`/api/advisor/escalations/${caseId}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => null)) as
        | { escalation?: AdvisorEscalationRecord; error?: { message?: string } }
        | null;

      if (!response.ok || !payload?.escalation) {
        throw new Error(payload?.error?.message ?? "Skylar could not load this advisor case.");
      }

      replaceRecord(payload.escalation);
    } catch (requestError) {
      setDetailError(
        requestError instanceof Error
          ? requestError.message
          : "Skylar could not load this advisor case.",
      );
    } finally {
      setLoadingDetailId(null);
    }
  }

  function loadQueue() {
    setError("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/advisor/escalations", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const payload = (await response.json().catch(() => null)) as
          | (Partial<QueueResponse> & { error?: { message?: string } })
          | null;

        if (!response.ok || !payload || !Array.isArray(payload.escalations)) {
          throw new Error(payload?.error?.message ?? "Skylar could not load advisor escalations.");
        }

        const escalations = payload.escalations;
        setRecords(escalations);
        setSelectedId((current) => escalations.some((record) => record.id === current) ? current : escalations[0]?.id ?? null);
        setHasLoaded(true);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Skylar could not load advisor escalations.",
        );
        setHasLoaded(true);
      }
    });
  }

  useEffect(() => {
    loadQueue();
  }, []);

  return (
    <section className="grid content-start gap-4">
      <div className="overflow-hidden rounded-[24px] bg-ink-2/75 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.055)]">
        <div className="grid gap-5 border-b border-paper/10 px-5 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:px-7">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-risk">Advisor queue</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-paper md:text-5xl">
              High-risk cases waiting for human review.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-paper-2">
              Escalations appear here after a manager sends a risk card to Skylar. This first
              queue is for visibility and triage.
            </p>
          </div>
          <button
            type="button"
            onClick={loadQueue}
            disabled={isPending}
            className="inline-flex h-11 items-center justify-center gap-2 border border-paper/15 px-4 font-mono text-xs uppercase text-paper-2 transition-colors hover:bg-paper/[0.06] disabled:opacity-50"
          >
            <RefreshCcw className={isPending ? "size-4 animate-spin" : "size-4"} aria-hidden="true" />
            Refresh
          </button>
        </div>

        <div className="grid items-start gap-4 p-5 md:p-7 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="grid content-start gap-3">
            {hasLoaded && items.length > 0 && (
              <div className="rounded-2xl bg-paper/[0.045] p-2 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.045)]">
                <label className="relative block">
                  <span className="sr-only">Search advisor cases</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-paper-3" aria-hidden="true" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search cases..."
                    className="h-10 w-full rounded-xl border border-transparent bg-ink/70 pl-10 pr-3 text-sm text-paper outline-none placeholder:text-paper-3 focus:border-paper/20"
                  />
                </label>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {statusFilters.map((filter) => {
                    const isActive = statusFilter === filter.value;
                    return (
                      <button
                        key={filter.value}
                        type="button"
                        onClick={() => setStatusFilter(filter.value)}
                        className={`h-8 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
                          isActive
                            ? "bg-paper text-ink"
                            : "bg-paper/[0.04] text-paper-3 hover:bg-paper/[0.08] hover:text-paper"
                        }`}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                  <span className="ml-auto rounded-lg px-2 font-mono text-[11px] uppercase text-paper-3">
                    {filteredItems.length}/{items.length}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="border-l-2 border-risk bg-risk/10 px-4 py-3 text-sm text-risk">
                {error}
              </p>
            )}

            {!hasLoaded && <QueueSkeleton />}

            {hasLoaded && !items.length && !error && (
              <div className="grid min-h-[260px] place-items-center rounded-2xl bg-paper/[0.055] px-5 py-10 text-center">
                <div className="max-w-sm">
                  <ShieldAlert className="mx-auto size-9 text-paper-3" aria-hidden="true" />
                  <p className="mt-4 font-semibold text-paper">No escalations are waiting.</p>
                  <p className="mt-2 text-sm leading-6 text-paper-3">
                    When a high-risk situation is sent to an advisor, it will appear here.
                  </p>
                </div>
              </div>
            )}

            {hasLoaded && items.length > 0 && filteredItems.length === 0 && (
              <div className="rounded-2xl bg-paper/[0.055] px-5 py-8 text-center">
                <p className="font-semibold text-paper">No cases match those filters.</p>
                <p className="mt-2 text-sm leading-6 text-paper-3">Try another employee, case id, or status.</p>
              </div>
            )}

            {filteredItems.map((item) => (
              <QueueCase
                key={item.id}
                item={item}
                isSelected={selectedRecord?.id === item.id}
                onSelect={() => void openCase(item.id)}
              />
            ))}
          </div>

          <aside className="grid content-start gap-4">
            <div className="grid gap-4 rounded-2xl bg-paper/[0.055] p-4 md:grid-cols-[minmax(0,1fr)_280px] md:items-center">
              <div>
                <p className="font-mono text-xs uppercase text-paper-3">Queue status</p>
                <p className="mt-2 text-3xl font-semibold text-paper">{activeCount}</p>
                <p className="mt-1 text-sm leading-6 text-paper-2">
                  {activeCount === 1 ? "case is with an advisor" : "cases are with advisors"}
                </p>
              </div>
              <p className="flex items-start gap-2 rounded-xl bg-ink px-4 py-4 text-sm leading-6 text-paper-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-risk" aria-hidden="true" />
                New escalations notify the configured Skylar team email. Advisor responses are saved
                to the employee ledger.
              </p>
            </div>

            {detailError && (
              <p role="alert" className="border-l-2 border-risk bg-risk/10 px-3 py-2 text-sm text-risk">
                {detailError}
              </p>
            )}

            {selectedRecord && (
              <CaseDetail
                record={selectedRecord}
                isLoading={loadingDetailId === selectedRecord.id}
                onUpdated={replaceRecord}
              />
            )}

            {hasLoaded && items.length > 0 && filteredItems.length === 0 && (
              <div className="grid min-h-[360px] place-items-center rounded-2xl bg-ink px-5 py-8 text-center shadow-[inset_0_0_0_1px_rgba(244,239,231,0.055)]">
                <div className="max-w-sm">
                  <Search className="mx-auto size-8 text-paper-3" aria-hidden="true" />
                  <p className="mt-4 font-semibold text-paper">No case selected.</p>
                  <p className="mt-2 text-sm leading-6 text-paper-3">
                    Clear the search or choose another status to review a matching escalation.
                  </p>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}

function QueueCase({
  item,
  isSelected,
  onSelect,
}: {
  item: AdvisorQueueItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`grid gap-3 rounded-2xl border px-4 py-4 text-left transition-colors ${
        isSelected ? "border-risk/60 bg-risk/10" : "border-paper/10 bg-paper/[0.045] hover:bg-paper/[0.07]"
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-risk px-3 py-1 font-mono text-[11px] uppercase text-paper">
            {item.caseId}
          </span>
          <span className="bg-paper/[0.10] px-3 py-1 font-mono text-[11px] uppercase text-paper-2">
            {item.statusLabel}
          </span>
        </div>
        <p className="mt-3 text-base font-semibold text-paper">{item.employeeName}</p>
        <p className="mt-2 line-clamp-4 text-sm leading-6 text-paper-2">{item.question}</p>
      </div>
    </button>
  );
}

function CaseDetail({
  record,
  isLoading,
  onUpdated,
}: {
  record: AdvisorEscalationRecord;
  isLoading: boolean;
  onUpdated: (record: AdvisorEscalationRecord) => void;
}) {
  const [responseText, setResponseText] = useState(record.draftResponse ?? record.responseText ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  useEffect(() => {
    setResponseText(record.draftResponse ?? record.responseText ?? "");
    setMessage("");
    setError("");
  }, [record.id, record.draftResponse, record.responseText]);

  async function mutate(action: "save_draft" | "mark_responded" | "resolve") {
    setPendingAction(action);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/advisor/escalations/${record.id}`, {
        method: "PATCH",
        cache: "no-store",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, responseText }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { escalation?: AdvisorEscalationRecord; error?: { message?: string } }
        | null;

      if (!response.ok || !payload?.escalation) {
        throw new Error(payload?.error?.message ?? "Skylar could not update this advisor case.");
      }

      onUpdated(payload.escalation);
      setMessage(
        action === "resolve"
          ? "Case resolved and saved to the ledger."
          : action === "mark_responded"
            ? "Advisor response saved to the ledger."
            : "Draft saved.",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Skylar could not update this advisor case.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  const hasResponse = Boolean(responseText.trim());
  const canDraft = canSaveAdvisorDraft(record.status);
  const canRespond = canMarkAdvisorResponded(record) && hasResponse;
  const canResolve = canResolveAdvisorCase(record);

  return (
    <div className="grid gap-4 rounded-2xl bg-ink px-5 py-5 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.055)]">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div>
          <p className="font-mono text-[11px] uppercase text-risk">{record.caseId}</p>
          <h2 className="mt-2 text-2xl font-semibold text-paper">{record.employeeName}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-paper-2">{record.question}</p>
          {record.employeeId && (
            <Link
              href={`${PEOPLE_PATH}/${record.employeeId}`}
              className="mt-4 inline-flex h-9 w-fit items-center justify-center gap-2 rounded-full bg-paper px-3 text-xs font-semibold text-ink transition-opacity hover:opacity-90"
            >
              <UserRound className="size-4" aria-hidden="true" />
              Open employee file
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )}
        </div>
        <span className="w-fit rounded-full bg-paper/[0.08] px-3 py-1 font-mono text-[11px] uppercase text-paper-2">
          {record.status.replace(/_/g, " ")}
        </span>
        {isLoading && <p className="mt-2 font-mono text-[11px] uppercase text-paper-3">Loading case context...</p>}
      </div>

      <div className="grid gap-3 rounded-2xl bg-paper/[0.045] p-4 text-sm leading-6 md:grid-cols-3">
        <DetailRow label="Reason" value={record.escalationReason} />
        <DetailRow label="Advisor" value={`${record.advisorName} - ${record.advisorCredentialLine}`} />
        <DetailRow label="Commitment" value={record.responseCommitment} />
      </div>

      <label className="grid gap-2">
        <span className="font-mono text-[11px] uppercase text-paper-3">Advisor response</span>
        <textarea
          value={responseText}
          onChange={(event) => setResponseText(event.target.value)}
          rows={5}
          disabled={record.status === "resolved" || record.status === "closed"}
          className="w-full resize-none border border-paper/10 bg-paper/[0.04] px-3 py-3 text-sm leading-6 text-paper outline-none transition-colors placeholder:text-paper-3 focus:border-paper/30 disabled:opacity-60"
          placeholder="Write the advisor response for this case."
        />
      </label>

      {record.relatedLedger.length > 0 && (
        <div>
          <p className="font-mono text-[11px] uppercase text-paper-3">Related ledger</p>
          <div className="mt-2 grid gap-2">
            {record.relatedLedger.map((entry) => (
              <Link
                key={entry.id}
                href={`/documents/${entry.id}?from=employee&employeeId=${record.employeeId}`}
                className="group grid gap-1 rounded-xl bg-paper/[0.04] px-3 py-2 text-xs leading-5 text-paper-2 transition-colors hover:bg-paper/[0.08] hover:text-paper"
              >
                <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase text-paper-3 group-hover:text-paper-2">
                  <FileText className="size-3.5" aria-hidden="true" />
                  {entry.type.replace(/_/g, " ")}
                </span>
                <span className="line-clamp-2">{entry.description}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {error && <p className="border-l-2 border-risk bg-risk/10 px-3 py-2 text-sm text-risk">{error}</p>}
      {message && (
        <p className="border-l-2 border-success bg-success/10 px-3 py-2 text-sm text-success">{message}</p>
      )}

      <div className="grid gap-2 md:grid-cols-3">
        <button
          type="button"
          onClick={() => mutate("save_draft")}
          disabled={!canDraft || pendingAction !== null}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-paper/[0.08] px-3 font-mono text-[11px] uppercase text-paper transition-colors hover:bg-paper/[0.12] disabled:opacity-45"
        >
          <Save className="size-4" aria-hidden="true" />
          {pendingAction === "save_draft" ? "Saving..." : "Save draft"}
        </button>
        <button
          type="button"
          onClick={() => mutate("mark_responded")}
          disabled={!canRespond || pendingAction !== null}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-risk px-3 font-mono text-[11px] uppercase text-paper transition-colors hover:bg-risk/90 disabled:opacity-45"
        >
          <ShieldAlert className="size-4" aria-hidden="true" />
          {pendingAction === "mark_responded" ? "Saving..." : "Mark responded"}
        </button>
        <button
          type="button"
          onClick={() => mutate("resolve")}
          disabled={!canResolve || pendingAction !== null}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-success px-3 font-mono text-[11px] uppercase text-ink transition-colors hover:bg-success/90 disabled:opacity-45"
        >
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {pendingAction === "resolve" ? "Resolving..." : "Resolve case"}
        </button>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase text-paper-3">{label}</p>
      <p className="mt-1 text-paper-2">{value}</p>
    </div>
  );
}

function QueueSkeleton() {
  return (
    <div className="grid gap-3" aria-label="Loading advisor escalations">
      {[0, 1].map((item) => (
        <div key={item} className="h-36 animate-pulse bg-paper/[0.055]" />
      ))}
    </div>
  );
}
