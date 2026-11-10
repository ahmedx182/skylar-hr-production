"use client";

import { BellOff, CheckCircle2, LoaderCircle, LogOut, Send, UserCheck, UserRoundCog, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertToasts, type AlertToast } from "@/components/ui/alert-toasts";
import { deskAlerts, deskAttentionCount, type DeskCaseState } from "@/features/advisor/notices";
import { desktopAlertsPermission, desktopNotify, requestDesktopAlerts, setTitleCount } from "@/lib/desktop-notify";
import { useEventStream } from "@/lib/use-event-stream";
import { formatRelative } from "@/features/platform/format";
import {
  canAdvisorReply,
  canClaimCase,
  canTakeOverCase,
} from "@/features/advisor/live-chat";
import type { AdvisorLiveAction, LiveCaseDetail, LiveCaseSummary } from "@/server/repositories/advisor-live.repository";

type Filter = "needs_me" | "mine" | "others" | "closed";
type Detail = LiveCaseDetail;

/** Only used while a live stream is down, so a dropped connection never leaves the desk stale. */
const FALLBACK_LIST_MS = 10_000;
const FALLBACK_DETAIL_MS = 5_000;
const TOAST_MS = 12_000;
const LIST_EVENTS = ["cases"] as const;
const CASE_EVENTS = ["case"] as const;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "needs_me", label: "Waiting" },
  { key: "mine", label: "Mine" },
  { key: "others", label: "Others" },
  { key: "closed", label: "Closed" },
];

async function call<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
  if (!response.ok || !payload) throw new Error(payload?.error?.message ?? "Request failed. Try again.");
  return payload;
}

function isOpen(item: LiveCaseSummary) {
  return item.phase !== "closed";
}

function matches(item: LiveCaseSummary, filter: Filter, uid: string) {
  if (filter === "closed") return !isOpen(item);
  if (!isOpen(item)) return false;
  if (filter === "mine") return item.claimedByUid === uid;
  // Another advisor's chat stays reachable, so it can be taken over at a shift change.
  if (filter === "others") return item.claimedByUid !== null && item.claimedByUid !== uid;
  return item.claimedByUid === null;
}

export function AdvisorDesk({ advisorUid }: { advisorUid: string }) {
  const [cases, setCases] = useState<LiveCaseSummary[] | null>(null);
  const [filter, setFilter] = useState<Filter>("needs_me");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<AdvisorLiveAction | null>(null);
  const [error, setError] = useState("");
  const [listError, setListError] = useState("");
  const [toasts, setToasts] = useState<AlertToast[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const previousDesk = useRef<DeskCaseState[] | null>(null);

  const dismissToast = useCallback((id: string) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);

  const focusCase = useCallback((id: string, nextFilter: Filter) => {
    setFilter(nextFilter);
    setSelectedId(id);
    setDetail(null);
    setError("");
  }, []);

  /** Every new desk list, from the stream or a fallback fetch: show it, and alert on what is new. */
  const applyCases = useCallback(
    (next: LiveCaseSummary[]) => {
      setCases(next);
      setListError("");
      const states: DeskCaseState[] = next.map((item) => ({
        id: item.id,
        phase: item.phase,
        claimedByUid: item.claimedByUid,
        lastMessageAtMs: item.lastMessageAtMs,
        lastMessageSender: item.lastMessageSender,
        employeeName: item.employeeName,
        companyName: item.companyName,
      }));
      const alerts = deskAlerts(previousDesk.current, states, advisorUid);
      previousDesk.current = states;
      setTitleCount(deskAttentionCount(states, advisorUid));

      for (const alert of alerts) {
        const nextFilter: Filter = alert.kind === "new_case" ? "needs_me" : "mine";
        desktopNotify(alert.title, alert.body, () => focusCase(alert.id, nextFilter));
        const asked = (() => {
          try {
            return window.localStorage.getItem("skylar:desktop-alerts-asked") === "1";
          } catch {
            return true;
          }
        })();
        setToasts((current) =>
          [
            ...current.filter((toast) => toast.id !== alert.id),
            {
              id: alert.id,
              title: alert.title,
              body: alert.body,
              action: { label: "Open chat", onClick: () => { focusCase(alert.id, nextFilter); dismissToast(alert.id); } },
              secondary:
                !asked && desktopAlertsPermission() === "default"
                  ? {
                      label: "Turn on desktop alerts",
                      onClick: () => {
                        try {
                          window.localStorage.setItem("skylar:desktop-alerts-asked", "1");
                        } catch {
                          // Storage can be blocked.
                        }
                        void requestDesktopAlerts();
                        dismissToast(alert.id);
                      },
                    }
                  : undefined,
            },
          ].slice(-3),
        );
        window.setTimeout(() => dismissToast(alert.id), TOAST_MS);
      }
    },
    [advisorUid, dismissToast, focusCase],
  );

  const loadList = useCallback(async () => {
    try {
      applyCases((await call<{ cases: LiveCaseSummary[] }>("/api/advisor/live")).cases);
    } catch (requestError) {
      setListError(requestError instanceof Error ? requestError.message : "Could not load the queue.");
    }
  }, [applyCases]);

  const loadDetail = useCallback(async (id: string) => {
    try {
      setDetail(await call<Detail>(`/api/advisor/live/${id}`));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "");
    }
  }, []);

  // The queue and the open case arrive over live streams; the fetches below only cover the moment before they
  // connect, and any time a stream is down.
  const listConnected = useEventStream("/api/advisor/stream", LIST_EVENTS, (_event, data) => applyCases(data as LiveCaseSummary[]));
  const detailConnected = useEventStream(selectedId ? `/api/advisor/stream/${selectedId}` : null, CASE_EVENTS, (_event, data) => setDetail(data as Detail));

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (listConnected) return;
    const timer = window.setInterval(() => document.visibilityState === "visible" && void loadList(), FALLBACK_LIST_MS);
    return () => window.clearInterval(timer);
  }, [listConnected, loadList]);

  useEffect(() => {
    if (!selectedId) return;
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    if (!selectedId || detailConnected) return;
    const timer = window.setInterval(() => document.visibilityState === "visible" && void loadDetail(selectedId), FALLBACK_DETAIL_MS);
    return () => window.clearInterval(timer);
  }, [selectedId, detailConnected, loadDetail]);

  // Leaving the desk takes the count off the tab title.
  useEffect(() => () => setTitleCount(0), []);

  const messageCount = detail?.messages.length ?? 0;
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messageCount]);

  async function act(action: AdvisorLiveAction, text?: string) {
    if (!selectedId || busy) return;
    setBusy(action);
    setError("");
    try {
      setDetail(await call<Detail>(`/api/advisor/live/${selectedId}`, { action, text }));
      if (action === "reply") setDraft("");
      // The case they just took is now theirs, so keep it in view.
      if (action === "claim" || action === "take_over") setFilter("mine");
      void loadList();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Something went wrong.");
      // Someone else may have claimed it first; show the current state.
      void loadDetail(selectedId);
    } finally {
      setBusy(null);
    }
  }

  const visible = (cases ?? []).filter((item) => matches(item, filter, advisorUid));
  const counts = Object.fromEntries(FILTERS.map(({ key }) => [key, (cases ?? []).filter((item) => matches(item, key, advisorUid)).length])) as Record<Filter, number>;
  const current = detail?.case;
  const status = current?.status ?? "with_advisor";
  const canClaim = current ? canClaimCase(status, current.claimedByUid, advisorUid) && current.claimedByUid === null : false;
  const canTakeOver = current ? canTakeOverCase(status, current.claimedByUid, advisorUid) : false;
  const canReply = current ? canAdvisorReply(status, current.claimedByUid, advisorUid) : false;
  const mine = current?.claimedByUid === advisorUid;

  return (
    <>
    <AlertToasts toasts={toasts} onDismiss={dismissToast} />
    <div className="grid items-start gap-3 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
      <div className="grid gap-2 rounded-[20px] bg-ink-2/70 p-3 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.045)]">
        <div role="tablist" aria-label="Case filter" className="grid grid-cols-4 gap-1 rounded-xl bg-paper/[0.05] p-1">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={`h-8 rounded-lg text-xs font-semibold transition-colors ${filter === key ? "bg-paper text-ink" : "text-paper-3 hover:text-paper"}`}
            >
              {label} <span className="tabular-nums opacity-70">{cases ? counts[key] : ""}</span>
            </button>
          ))}
        </div>

        {listError && <p role="alert" className="border-l-2 border-risk bg-risk/10 px-3 py-2 text-sm text-risk">{listError}</p>}

        {cases === null ? (
          <div className="grid gap-2" aria-label="Loading cases">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-16 animate-pulse rounded-xl bg-paper/[0.055]" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-paper-3">
            {filter === "needs_me" ? "No chats are waiting." : filter === "mine" ? "You haven't claimed any chats." : filter === "others" ? "No other advisor has a chat open." : "No closed chats yet."}
          </p>
        ) : (
          <ul className="grid max-h-[68dvh] gap-1 overflow-y-auto">
            {visible.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id);
                    setDetail(null);
                    setError("");
                  }}
                  aria-current={selectedId === item.id ? "true" : undefined}
                  className={`grid w-full gap-0.5 rounded-xl px-3 py-2 text-left transition-colors ${selectedId === item.id ? "bg-paper/[0.12]" : "hover:bg-paper/[0.06]"}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5">
                      {item.phase !== "closed" && item.lastMessageSender === "user" && (
                        <span className="size-2 shrink-0 rounded-full bg-attention" title="The manager is waiting for a reply" aria-label="Waiting for a reply" />
                      )}
                      <span className="truncate text-sm font-semibold text-paper">{item.employeeName}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-paper-3">{formatRelative(item.lastMessageAtMs ?? item.createdAtMs ?? Date.now())}</span>
                  </span>
                  <span className="truncate text-xs text-paper-3">
                    {item.companyName} · {item.caseId}
                    {item.claimedByName && item.claimedByUid !== advisorUid ? ` · ${item.claimedByName}` : ""}
                    {item.reopenCount > 0 ? " · reopened" : ""}
                  </span>
                  <span className="line-clamp-1 text-xs text-paper-2">{item.escalationReason}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid min-h-[420px] content-start gap-3 rounded-[20px] bg-ink-2/70 p-4 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.045)] lg:sticky lg:top-4">
        {!selectedId ? (
          <p className="py-16 text-center text-sm text-paper-3">Pick a chat to read it.</p>
        ) : !current ? (
          <div className="h-48 animate-pulse rounded-xl bg-paper/[0.055]" aria-label="Loading chat" />
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase text-risk">{current.caseId}</p>
                <h2 className="truncate text-lg font-semibold text-paper">{current.employeeName}</h2>
                <p className="text-xs text-paper-3">
                  {current.companyName}
                  {current.claimedByName ? ` · with ${current.claimedByName}` : " · unclaimed"}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {canClaim && <ActionButton icon={UserCheck} label="Claim" busy={busy === "claim"} onClick={() => act("claim")} primary />}
                {canTakeOver && <ActionButton icon={UserRoundCog} label="Take over" busy={busy === "take_over"} onClick={() => act("take_over")} />}
                {mine && current.phase !== "closed" && <ActionButton icon={LogOut} label="Release" busy={busy === "release"} onClick={() => act("release")} />}
                {mine && current.phase !== "closed" && <ActionButton icon={CheckCircle2} label="Resolve" busy={busy === "resolve"} onClick={() => act("resolve")} />}
                {mine && current.phase !== "closed" && <ActionButton icon={BellOff} label="False alarm" busy={busy === "resolve_false_alarm"} onClick={() => act("resolve_false_alarm")} />}
                {current.phase === "waiting" && <ActionButton icon={XCircle} label="Close unclaimed" busy={busy === "close_unclaimed"} onClick={() => act("close_unclaimed")} />}
              </div>
            </div>

            {/* The chat already opens with what the manager wrote; only a Hold to escalate case needs this. */}
            {!detail.messages.some((message) => message.text === current.question) && (
              <p className="rounded-xl bg-paper/[0.045] px-3 py-2 text-sm leading-6 text-paper-2">{current.question}</p>
            )}

            <p className="text-xs text-paper-3">{current.escalationReason}</p>

            {detail.earlierChat.length > 0 && (
              <details className="rounded-xl bg-paper/[0.045] px-3 py-2">
                <summary className="cursor-pointer text-xs font-semibold text-paper-2">Earlier chat with Skylar ({detail.earlierChat.length})</summary>
                <div className="mt-2 grid max-h-64 gap-2 overflow-y-auto pr-1">
                  {detail.earlierChat.map((message, index) => (
                    <p key={index} className="whitespace-pre-wrap text-xs leading-5 text-paper-2">
                      <span className="font-semibold text-paper">{message.role === "assistant" ? "Skylar" : "Manager"}: </span>
                      {message.text}
                    </p>
                  ))}
                </div>
              </details>
            )}

            <div ref={listRef} className="grid max-h-[46dvh] gap-1.5 overflow-y-auto pr-1" aria-live="polite">
              {detail.messages.length === 0 && <p className="py-4 text-center text-xs text-paper-3">No messages yet. Claim the case and say hello.</p>}
              {detail.messages.map((message) =>
                message.sender === "system" ? (
                  <p key={message.id} className="text-center text-[11px] text-paper-3">{message.text}</p>
                ) : (
                  <div key={message.id} className={message.sender === "advisor" ? "flex justify-end" : "flex justify-start"}>
                    <p className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-5 ${message.sender === "advisor" ? "bg-paper text-ink" : "bg-paper/[0.09] text-paper"}`}>
                      {message.text}
                    </p>
                  </div>
                ),
              )}
            </div>

            {error && <p role="alert" className="border-l-2 border-risk bg-risk/10 px-3 py-2 text-sm text-risk">{error}</p>}

            <form
              className="flex items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (canReply && draft.trim()) void act("reply", draft);
              }}
            >
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    if (canReply && draft.trim()) void act("reply", draft);
                  }
                }}
                rows={2}
                maxLength={2000}
                disabled={!canReply}
                aria-label="Reply to the user"
                placeholder={canReply ? "Reply to the user" : current.phase === "closed" ? "This chat is closed." : "Claim this chat to reply."}
                className="min-h-11 flex-1 resize-none rounded-xl bg-paper/[0.07] px-3 py-2 text-sm text-paper outline-none placeholder:text-paper-3 focus-visible:ring-2 focus-visible:ring-paper/40 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!canReply || !draft.trim() || busy !== null}
                aria-label="Send reply"
                className="grid size-11 place-items-center rounded-xl bg-paper text-ink transition-opacity active:scale-[0.97] disabled:opacity-40"
              >
                {busy === "reply" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
    </>
  );
}

function ActionButton({
  icon: Icon,
  label,
  busy,
  onClick,
  primary = false,
}: {
  icon: typeof Send;
  label: string;
  busy: boolean;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors active:scale-[0.98] disabled:opacity-50 ${primary ? "bg-paper text-ink hover:opacity-90" : "bg-paper/[0.09] text-paper hover:bg-paper/[0.14]"}`}
    >
      {busy ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <Icon className="size-3.5" aria-hidden="true" />}
      {label}
    </button>
  );
}
