import Link from "next/link";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { ADVISOR_PATH } from "@/constants/routes";
import type { EscalationEvent } from "@/features/briefing/chat-escalation";

const copy = {
  escalated: {
    label: "High alert",
    title: "Escalated to advisor",
    detail: null,
    tone: "border-risk/45 bg-risk/10",
    accent: "text-risk",
  },
  needs_employee: {
    label: "High alert",
    title: "Not escalated yet",
    detail: "Select the employee above so this can be escalated.",
    tone: "border-attention/45 bg-attention/10",
    accent: "text-attention",
  },
  failed: {
    label: "High alert",
    title: "Could not escalate",
    detail: "Use Hold to escalate on the employee's brief.",
    tone: "border-risk/45 bg-risk/10",
    accent: "text-risk",
  },
} as const;

/** Shown above the assistant's reply when a message triggered the escalation rules. */
export function EscalationNoticeCard({ event }: { event: EscalationEvent }) {
  const style = copy[event.kind];

  return (
    <div role="status" className={`grid gap-2 rounded-xl border px-4 py-3 text-paper ${style.tone}`}>
      <div className="flex items-center gap-2">
        <ShieldAlert className={`size-4 shrink-0 ${style.accent}`} aria-hidden="true" />
        <p className={`font-mono text-[11px] uppercase ${style.accent}`}>{style.label}</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-sm font-semibold">{style.title}</p>
        {event.caseId && (
          <span className="rounded-full bg-paper/[0.08] px-2.5 py-0.5 font-mono text-[11px] text-paper-2">{event.caseId}</span>
        )}
      </div>
      <p className="text-xs leading-5 text-paper-3">{style.detail ?? event.reason}</p>
      {event.kind === "escalated" && (
        <Link
          href={ADVISOR_PATH}
          className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-paper transition-colors hover:text-paper-2"
        >
          Open Advisor queue
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
