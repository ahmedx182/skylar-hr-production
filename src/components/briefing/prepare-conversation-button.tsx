"use client";

import type { BriefingCard } from "@/features/briefing/types";

export function PrepareConversationButton({ card }: { card: BriefingCard }) {
  function openAssistant() {
    window.dispatchEvent(
      new CustomEvent("skylar:open", {
        detail: {
          employeeId: card.employeeId,
          employeeName: card.subject,
          cardTitle: card.title,
          cardBody: card.body,
          prompt: "Help me prepare this conversation.",
        },
      }),
    );
  }

  return (
    <button
      type="button"
      onClick={openAssistant}
      aria-label="Open Skylar Assistant"
      title="Open Skylar Assistant"
      className="skylar-shimmer relative inline-flex h-[52px] min-w-0 items-center justify-center gap-2 overflow-hidden rounded-md bg-ink-2 px-4 font-semibold text-paper shadow-[0_8px_24px_rgba(0,0,0,0.16)] transition-colors after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-1/2 after:bg-gradient-to-r after:from-transparent after:via-paper/20 after:to-transparent hover:bg-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
    >
      <span
        aria-hidden="true"
        className="relative z-10 block size-6 shrink-0 bg-[url('/brand/logo.png')] bg-[length:24px_22px] bg-center bg-no-repeat"
      />
      <span className="relative z-10">Assistant</span>
    </button>
  );
}
