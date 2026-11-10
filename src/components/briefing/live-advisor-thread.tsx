"use client";

import { LoaderCircle, MessageSquarePlus, RotateCcw, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { waitingNote, type LiveChatMessage } from "@/features/advisor/live-chat";
import { friendlyName } from "@/lib/person-name";
import { useEventStream } from "@/lib/use-event-stream";
import { cn } from "@/lib/utils/cn";
import type { UserLiveCase } from "@/server/repositories/advisor-live.repository";

/** Only used while the live stream is down, so a dropped connection never leaves the thread stale. */
const FALLBACK_POLL_MS = 15_000;
const EVENTS = ["chat"] as const;

type Chat = UserLiveCase;

async function request(escalationId: string, body?: unknown): Promise<Chat> {
  const response = await fetch(`/api/briefing/advisor-chat/${escalationId}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as { chat?: Chat; error?: { message?: string } } | null;
  if (!response.ok || !payload?.chat) throw new Error(payload?.error?.message ?? "Could not reach your advisor. Try again.");
  return payload.chat;
}

function headline(chat: Chat): string {
  if (chat.phase === "connected") return `Connected with ${friendlyName(chat.advisorName, "a Skylar advisor")}`;
  if (chat.phase === "waiting") return "Waiting for a Skylar advisor";
  return "Chat closed";
}

/** Who wrote a bubble, shown above the first of a run so the advisor is never mistaken for the assistant. */
function authorOf(message: LiveChatMessage): string | null {
  if (message.sender !== "advisor") return null;
  return `${friendlyName(message.authorName, "HR advisor")} · Skylar HR`;
}

type Variant = "panel" | "page";

/**
 * The live conversation with a Skylar HR advisor for one escalated case. New messages arrive over a live stream.
 * `panel` is the compact version inside the chat window; `page` fills the Advisor page.
 */
export function LiveAdvisorThread({
  escalationId,
  variant = "panel",
  compactWhenClosed = false,
  onOpenChange,
}: {
  escalationId: string;
  variant?: Variant;
  /** In the chat window a closed case shrinks to its status and Reopen, so it doesn't take the room from the chat. */
  compactWhenClosed?: boolean;
  /** Tells the parent whether this thread is the one taking messages. */
  onOpenChange?: (isOpen: boolean) => void;
}) {
  const isPage = variant === "page";
  const [chat, setChat] = useState<Chat | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageCount = chat?.messages.length ?? 0;

  const refresh = useCallback(async () => {
    try {
      setChat(await request(escalationId));
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "");
    }
  }, [escalationId]);

  // One live stream carries every change: advisor replies, joins, closing and reopening.
  const connected = useEventStream(`/api/briefing/advisor-chat/${escalationId}/stream`, EVENTS, (_event, data) => {
    setChat(data as Chat);
    setError("");
  });

  // Show something straight away, before the stream has connected.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (connected) return;
    const timer = window.setInterval(() => document.visibilityState === "visible" && void refresh(), FALLBACK_POLL_MS);
    return () => window.clearInterval(timer);
  }, [connected, refresh]);

  // Tells the notifications that this chat is open, and read whenever it is on screen.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("skylar:advisor-thread", { detail: { escalationId, mounted: true } }));
    return () => {
      window.dispatchEvent(new CustomEvent("skylar:advisor-thread", { detail: { escalationId, mounted: false } }));
    };
  }, [escalationId]);

  const phaseNow = chat?.phase;
  useEffect(() => {
    if (!phaseNow) return;
    const markRead = () => {
      if (document.visibilityState === "visible") window.dispatchEvent(new CustomEvent("skylar:advisor-read", { detail: { escalationId } }));
    };
    markRead();
    document.addEventListener("visibilitychange", markRead);
    return () => document.removeEventListener("visibilitychange", markRead);
  }, [escalationId, phaseNow, messageCount]);

  useEffect(() => {
    // Only this list, not the page around it, which may be somewhere else entirely.
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messageCount]);

  // Reported when the phase changes, not when the parent happens to pass a new function.
  const openChange = useRef(onOpenChange);
  openChange.current = onOpenChange;
  useEffect(() => {
    if (phaseNow) openChange.current?.(phaseNow !== "closed");
  }, [phaseNow]);

  // The box grows with what is typed, up to a few lines.
  useEffect(() => {
    const box = inputRef.current;
    if (!box) return;
    box.style.height = "auto";
    box.style.height = `${Math.min(box.scrollHeight, isPage ? 140 : 96)}px`;
  }, [draft, isPage]);

  async function act(body: { action: "send"; text: string } | { action: "reopen" }) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      setChat(await request(escalationId, body));
      if (body.action === "send") setDraft("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!chat) {
    return (
      <div className={cn("grid place-items-center text-xs text-paper-3", isPage ? "min-h-[240px]" : "py-2")}>
        {error || (
          <span className="flex items-center gap-2">
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
            Connecting to your advisor...
          </span>
        )}
      </div>
    );
  }

  const isClosed = chat.phase === "closed";
  const showMessages = !(compactWhenClosed && isClosed) && (chat.messages.length > 0 || (isPage && chat.phase === "waiting"));
  const send = () => {
    if (draft.trim()) void act({ action: "send", text: draft });
  };

  return (
    <div className={cn("grid", isPage ? "h-full min-h-0 grid-cols-1 grid-rows-[minmax(0,1fr)_auto]" : "gap-2 rounded-lg bg-ink/40 p-3")}>
      {!isPage && (
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={cn("size-2 rounded-full", chat.phase === "connected" ? "bg-success" : chat.phase === "waiting" ? "bg-attention" : "bg-paper-3")}
          />
          <p className="text-xs font-semibold text-paper">{headline(chat)}</p>
        </div>
      )}

      {showMessages && (
        <div
          ref={listRef}
          aria-live="polite"
          className={cn("grid content-start overflow-y-auto", isPage ? "min-h-0 gap-1 px-4 py-4 sm:px-5" : "max-h-56 gap-1.5 pr-1")}
        >
          {chat.messages.map((message, index) => {
            if (message.sender === "system") {
              return (
                <p key={message.id} className="py-1.5 text-center text-[11px] text-paper-3">
                  {message.text}
                </p>
              );
            }
            const isMe = message.sender === "user";
            const author = authorOf(message);
            const previous = chat.messages[index - 1];
            const startsRun = !previous || previous.sender !== message.sender;
            return (
              <div key={message.id} className={cn("grid gap-0.5", isMe ? "justify-items-end" : "justify-items-start", startsRun && index > 0 && "mt-2")}>
                {author && startsRun && <p className="px-1 text-[11px] font-semibold text-paper-3">{author}</p>}
                <p
                  className={cn(
                    "max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-6",
                    isMe ? "rounded-br-md bg-paper/[0.1] text-paper" : "rounded-bl-md bg-paper text-ink",
                  )}
                >
                  {message.text}
                </p>
              </div>
            );
          })}
          {isPage && chat.phase === "waiting" && (
            <p className="mx-auto mt-3 max-w-sm text-center text-xs leading-5 text-paper-3">
              {waitingNote(chat.afterHours)} You can add more detail below meanwhile.
            </p>
          )}
        </div>
      )}

      <div className={cn("grid gap-2", isPage && "border-t border-paper/[0.06] p-3 sm:px-4")}>
        {chat.readOnly && (
          <p className="text-xs leading-5 text-paper-3">You&apos;re reading this conversation. Only the manager who opened the case can reply.</p>
        )}
        {error && (
          <p role="alert" className="text-xs text-risk">
            {error}
          </p>
        )}

        {chat.canSend ? (
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  send();
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder={chat.phase === "waiting" ? "Add detail for the advisor" : "Message your advisor"}
              aria-label="Message your advisor"
              className={cn(
                "min-h-10 min-w-0 flex-1 resize-none rounded-xl bg-paper/[0.07] px-3.5 py-2.5 text-sm leading-5 text-paper outline-none transition-shadow placeholder:text-paper-3 focus-visible:ring-2 focus-visible:ring-paper/30",
              )}
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              aria-label="Send message"
              className="grid size-10 shrink-0 place-items-center rounded-xl bg-paper text-ink transition-[opacity,transform] hover:opacity-90 active:scale-[0.96] disabled:opacity-40"
            >
              {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
            </button>
          </form>
        ) : chat.canReopen ? (
          <div className={cn("flex flex-wrap items-center gap-3", isPage && "justify-between rounded-xl bg-paper/[0.05] px-3.5 py-2.5")}>
            {isPage && <p className="text-sm text-paper-2">HR closed this chat. Need more help with this?</p>}
            <button
              type="button"
              onClick={() => void act({ action: "reopen" })}
              disabled={busy}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-paper px-4 text-xs font-semibold text-ink transition-[opacity,transform] hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <RotateCcw className="size-3.5" aria-hidden="true" />}
              {busy ? "Reopening..." : "Reopen this chat"}
            </button>
          </div>
        ) : (
          isClosed &&
          !chat.readOnly &&
          (isPage ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-paper/[0.05] px-3.5 py-2.5">
              <p className="text-sm text-paper-2">HR closed this chat. Need more help with this?</p>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("skylar:open", { detail: { employeeId: chat.employeeId, employeeName: chat.employeeName, startAdvisor: true } }))}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-paper px-4 text-xs font-semibold text-ink transition-[opacity,transform] hover:opacity-90 active:scale-[0.98]"
              >
                <MessageSquarePlus className="size-3.5" aria-hidden="true" />
                Start a new chat
              </button>
            </div>
          ) : (
            <p className="text-xs leading-5 text-paper-3">HR closed this chat. To talk to an advisor again, use “Talk to an HR advisor” below.</p>
          ))
        )}
        {isPage && chat.canSend && <p className="hidden px-1 text-[11px] text-paper-3 sm:block">Enter to send, Shift+Enter for a new line.</p>}
      </div>
    </div>
  );
}
