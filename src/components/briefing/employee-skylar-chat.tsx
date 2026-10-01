"use client";

import { LoaderCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SkylarMessageText } from "@/components/briefing/skylar-message-text";

type ChatMessage = { role: "user" | "assistant"; text: string };

const MIN_PROMPT_LENGTH = 3;
const FALLBACK_ERROR = "Skylar could not reply. Try again.";

const starterPrompts = [
  "I need help with a situation at work",
  "What are my rights as an employee?",
  "Help me prepare for a difficult conversation",
] as const;

/** Floating assistant for employees: no employee picker, nothing is saved. */
export function EmployeeSkylarChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const prompt = text.trim();
    if (prompt.length < MIN_PROMPT_LENGTH || isLoading) return;

    setDraft("");
    setError("");
    setIsLoading(true);
    setMessages((current) => [...current, { role: "user", text: prompt }, { role: "assistant", text: "" }]);

    try {
      const response = await fetch("/api/briefing/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(payload?.error?.message || FALLBACK_ERROR);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
          const line = event.split("\n").find((entry) => entry.startsWith("data: "));
          if (!line || line.slice(6) === "[DONE]") continue;
          const parsed = JSON.parse(line.slice(6)) as { text?: string; error?: string };
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.text) {
            const chunk = parsed.text;
            setMessages((current) => {
              const last = current[current.length - 1];
              if (last?.role !== "assistant") return current;
              return [...current.slice(0, -1), { ...last, text: last.text + chunk }];
            });
          }
        }

        if (done) break;
      }
    } catch (requestError) {
      setMessages((current) => current.filter((message, index) => !(index === current.length - 1 && !message.text)));
      setDraft((current) => current || prompt);
      setError(requestError instanceof Error ? requestError.message : FALLBACK_ERROR);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="skylar-shimmer fixed bottom-5 right-5 z-30 grid size-12 place-items-center overflow-hidden rounded-2xl bg-ink-2 text-paper shadow-[0_18px_50px_rgba(0,0,0,0.36),inset_0_0_0_1px_rgba(244,239,231,0.055),inset_0_1px_0_rgba(244,239,231,0.08)] transition-transform after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-1/2 after:bg-gradient-to-r after:from-transparent after:via-paper/20 after:to-transparent hover:-translate-y-0.5"
        aria-label="Ask Skylar"
      >
        <span
          aria-hidden="true"
          className="relative z-10 block size-8 bg-[url('/brand/logo.png')] bg-[length:28px_25px] bg-center bg-no-repeat"
        />
      </button>

      {isOpen && (
        <section className="fixed bottom-24 right-5 z-40 flex h-[min(640px,calc(100dvh-7rem))] max-h-[680px] w-[calc(100vw-2.5rem)] max-w-[560px] flex-col overflow-hidden rounded-[20px] border border-paper/[0.08] bg-ink-2 shadow-[0_24px_80px_rgba(0,0,0,0.5)] md:right-6">
          <header className="flex items-start justify-between gap-4 border-b border-paper/[0.055] px-5 py-4">
            <div className="flex gap-3">
              <span
                aria-hidden="true"
                className="block size-10 shrink-0 bg-[url('/brand/logo.png')] bg-[length:34px_31px] bg-center bg-no-repeat"
              />
              <div className="min-w-0">
                <p className="text-base font-semibold text-paper">Skylar assistant</p>
                <p className="mt-1 text-sm leading-5 text-paper-3">Talk it through. Your chat isn&apos;t saved.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-paper/[0.045] text-paper-2 transition-colors hover:bg-paper hover:text-ink"
              aria-label="Close Skylar assistant"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {messages.length === 0 && (
              <>
                <p className="text-sm leading-6 text-paper-2">I&apos;m here to listen and help you think things through.</p>
                <div className="mt-4 grid gap-2">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void send(prompt)}
                      className="border border-paper/[0.08] bg-paper/[0.04] px-4 py-3 text-left text-sm text-paper-2 transition-colors hover:bg-paper hover:text-ink"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="grid gap-4">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={message.role === "user" ? "flex justify-end" : "flex items-end gap-2"}>
                  {message.role === "assistant" && (
                    <span aria-hidden="true" className="mb-1 block size-7 shrink-0 bg-[url('/brand/logo.png')] bg-[length:25px_23px] bg-center bg-no-repeat" />
                  )}
                  <div className={message.role === "user" ? "max-w-[84%] rounded-[14px] rounded-br-sm bg-paper/[0.09] px-4 py-3 text-sm leading-6 text-paper" : "max-w-[92%] rounded-[14px] rounded-bl-sm bg-paper px-5 py-4 text-[15px] leading-6 text-ink"}>
                    {message.text ? (message.role === "assistant" ? <SkylarMessageText text={message.text} /> : message.text) : (isLoading ? "Thinking..." : "")}
                  </div>
                </div>
              ))}
              {error && <p className="border-l-2 border-risk px-3 py-2 text-sm leading-6 text-risk">{error}</p>}
              <div ref={endRef} />
            </div>
          </div>

          <form
            className="border-t border-paper/[0.055] p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void send(draft);
            }}
          >
            <label className="sr-only" htmlFor="employee-skylar-input">
              Message Skylar
            </label>
            <div className="flex items-end gap-2 rounded-xl bg-paper/[0.04] p-2 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.055),inset_0_1px_0_rgba(244,239,231,0.035)]">
              <textarea
                id="employee-skylar-input"
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  if (error) setError("");
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
                  event.preventDefault();
                  void send(draft);
                }}
                rows={2}
                placeholder="Ask Skylar..."
                className="min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 text-paper outline-none placeholder:text-paper-3"
              />
              <button
                type="submit"
                disabled={isLoading || draft.trim().length < MIN_PROMPT_LENGTH}
                className="grid size-11 shrink-0 place-items-center rounded-lg bg-paper text-ink transition-opacity hover:opacity-90 disabled:opacity-45"
                aria-label="Send message"
              >
                {isLoading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
              </button>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
