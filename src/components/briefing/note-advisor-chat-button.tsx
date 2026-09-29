"use client";

import { MessageSquareText } from "lucide-react";

export function NoteAdvisorChatButton({
  employeeId,
  employeeName,
  note,
  variant = "dark",
}: {
  employeeId: string;
  employeeName: string;
  note: string;
  variant?: "dark" | "light";
}) {
  function openAdvisorChat() {
    window.dispatchEvent(
      new CustomEvent("skylar:open", {
        detail: {
          employeeId,
          employeeName,
          cardTitle: `Advisor chat for ${employeeName}`,
          cardBody: note,
          prompt: "Help me prepare the next advisor-style response for this employee note.",
        },
      }),
    );
  }

  return (
    <button
      type="button"
      onClick={openAdvisorChat}
      className={
        variant === "light"
          ? "inline-flex h-9 items-center justify-center gap-2 rounded-full border border-ink/10 px-3 text-xs font-semibold text-ink/70 transition-colors hover:bg-ink hover:text-paper"
          : "inline-flex h-9 items-center justify-center gap-2 rounded-full border border-paper/10 px-3 text-xs font-semibold text-paper-2 transition-colors hover:bg-paper hover:text-ink"
      }
    >
      <MessageSquareText className="size-4" aria-hidden="true" />
      Advisor chat
    </button>
  );
}
