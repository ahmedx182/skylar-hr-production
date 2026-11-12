"use client";

import { ChevronDown, MessagesSquare } from "lucide-react";
import { useState } from "react";
import { LiveAdvisorThread } from "@/components/briefing/live-advisor-thread";
import type { LiveChatPhase } from "@/features/advisor/live-chat";
import { cn } from "@/lib/utils/cn";

export type AdvisorChatRow = {
  id: string;
  caseId: string;
  phase: LiveChatPhase;
  advisorName: string | null;
  createdAtMs: number | null;
};

function phaseLabel(chat: AdvisorChatRow): string {
  if (chat.phase === "waiting") return "Waiting for an advisor";
  if (chat.phase === "connected") return chat.advisorName ? `With ${chat.advisorName}` : "With an advisor";
  return "Closed";
}

function dateLabel(ms: number | null): string {
  return ms === null ? "" : new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** The live advisor chats about one person. Any admin of the workspace can read them; only the opener can reply. */
export function EmployeeAdvisorChats({ chats }: { chats: AdvisorChatRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="rounded-[20px] bg-ink-2/60 p-4 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.035)]">
      <div className="flex items-center gap-2">
        <MessagesSquare className="size-4 text-paper-3" aria-hidden="true" />
        <p className="text-sm font-semibold text-paper">Advisor chats</p>
      </div>
      <p className="mt-1 text-sm text-paper-3">Conversations with your HR advisor about this person. Admins can read them; only the manager who opened one can reply.</p>

      <ul className="mt-4 grid gap-2">
        {chats.map((chat) => {
          const isOpen = openId === chat.id;
          return (
            <li key={chat.id} className="rounded-2xl bg-paper/[0.045] shadow-[inset_0_0_0_1px_rgba(244,239,231,0.04)]">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenId(isOpen ? null : chat.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-paper">Case {chat.caseId}</span>
                  <span className="block text-xs text-paper-3">
                    {phaseLabel(chat)}
                    {chat.createdAtMs !== null && ` · ${dateLabel(chat.createdAtMs)}`}
                  </span>
                </span>
                <ChevronDown className={cn("size-4 shrink-0 text-paper-3 transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
              </button>
              {isOpen && (
                <div className="px-3 pb-3">
                  <LiveAdvisorThread escalationId={chat.id} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
