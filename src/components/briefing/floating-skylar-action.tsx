"use client";

import { Send, X } from "lucide-react";
import { useState } from "react";

const starterPrompts = [
  "Help me prepare this conversation",
  "What should I save in the note?",
  "Make this sound calmer",
] as const;

export function FloatingSkylarAction() {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="skylar-shimmer fixed bottom-5 right-5 z-30 grid size-12 place-items-center overflow-hidden rounded-2xl bg-ink-2 text-paper shadow-[0_18px_50px_rgba(0,0,0,0.36),inset_0_0_0_1px_rgba(244,239,231,0.055),inset_0_1px_0_rgba(244,239,231,0.08)] transition-transform after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-1/2 after:bg-gradient-to-r after:from-transparent after:via-paper/20 after:to-transparent hover:-translate-y-0.5 md:bottom-5 md:right-5"
        aria-label="Ask Skylar"
      >
        <span
          aria-hidden="true"
          className="relative z-10 block size-8 bg-[url('/brand/logo.png')] bg-[length:28px_25px] bg-center bg-no-repeat"
        />
      </button>

      {isOpen && (
        <section className="fixed bottom-24 right-5 z-40 flex max-h-[calc(100dvh-7rem)] w-[calc(100vw-2.5rem)] max-w-[420px] flex-col overflow-hidden rounded-[24px] bg-ink-2 shadow-[0_24px_80px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(244,239,231,0.055),inset_0_1px_0_rgba(244,239,231,0.08)] md:bottom-24 md:right-6">
          <header className="flex items-start justify-between gap-4 border-b border-paper/[0.055] px-5 py-4">
            <div className="flex gap-3">
              <span
                aria-hidden="true"
                className="block size-10 shrink-0 bg-[url('/brand/logo.png')] bg-[length:34px_31px] bg-center bg-no-repeat"
              />
              <div>
                <p className="text-base font-semibold text-paper">Ask Skylar</p>
                <p className="mt-1 text-sm leading-5 text-paper-3">
                  Draft wording, next steps, or what belongs in the record.
                </p>
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

          <div className="overflow-y-auto px-5 py-5">
            <p className="text-sm leading-6 text-paper-2">
              Use this as a quick scratch space before the connected assistant is wired in.
            </p>
            <div className="mt-4 grid gap-2">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setDraft(prompt)}
                  className="rounded-xl border border-paper/[0.055] bg-paper/[0.04] px-4 py-3 text-left text-sm text-paper-2 shadow-[inset_0_1px_0_rgba(244,239,231,0.035)] transition-colors hover:bg-paper hover:text-ink"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <form
            className="border-t border-paper/[0.055] p-4"
            onSubmit={(event) => {
              event.preventDefault();
              setDraft("");
            }}
          >
            <label className="sr-only" htmlFor="skylar-chat-input">
              Message Skylar
            </label>
            <div className="flex items-end gap-2 rounded-xl bg-paper/[0.04] p-2 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.055),inset_0_1px_0_rgba(244,239,231,0.035)]">
              <textarea
                id="skylar-chat-input"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={2}
                placeholder="Ask Skylar what to say next..."
                className="min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 text-paper outline-none placeholder:text-paper-3"
              />
              <button
                type="submit"
                className="grid size-11 shrink-0 place-items-center rounded-lg bg-paper text-ink transition-opacity hover:opacity-90"
                aria-label="Send message"
              >
                <Send className="size-4" aria-hidden="true" />
              </button>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
