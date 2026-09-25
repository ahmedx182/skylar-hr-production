import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FileText,
  MessageSquareText,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/briefing/status-dot";
import { cn } from "@/lib/utils/cn";
import type { BriefingCard as BriefingCardModel } from "@/features/briefing/types";

const accentClass = {
  attention: "border-l-attention",
  success: "border-l-success",
  risk: "border-l-risk",
  neutral: "border-l-paper-3",
} as const;

const guideSteps = [
  {
    label: "Open",
    title: "Start gently",
    body: "Ask how things have been since you last spoke.",
  },
  {
    label: "Listen",
    title: "Look for context",
    body: "Give Maya room to share what changed.",
  },
  {
    label: "Close",
    title: "Agree one next step",
    body: "End with a clear expectation and follow-up date.",
  },
];

export function BriefingCard({
  card,
  position,
  total,
}: {
  card: BriefingCardModel;
  position: number;
  total: number;
}) {
  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border border-ink/10 border-l-4 bg-paper text-ink shadow-[0_30px_90px_rgba(0,0,0,0.30)]",
        accentClass[card.tone],
      )}
    >
      <header className="flex items-center justify-between gap-4 border-b border-ink/10 px-5 py-4 md:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <StatusDot tone={card.tone} />
          <p className="truncate font-mono text-xs uppercase text-ink/55">{card.eyebrow}</p>
        </div>
        <p className="shrink-0 font-mono text-xs text-ink/45">
          {position}/{total}
        </p>
      </header>

      <div className="grid gap-7 px-5 py-6 md:px-7 md:py-7 2xl:px-9">
        <section className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              {card.subject && (
                <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-ink/[0.05] px-3 font-mono text-xs text-ink/65">
                  <UserRound className="size-3.5" aria-hidden="true" />
                  {card.subject}
                </span>
              )}
              {card.dueLabel && (
                <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-ink/[0.05] px-3 font-mono text-xs text-ink/65">
                  <CalendarClock className="size-3.5" aria-hidden="true" />
                  {card.dueLabel}
                </span>
              )}
            </div>

            <p className="mt-7 font-mono text-xs uppercase text-ink/45">Today&apos;s focus</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight md:text-[2.6rem]">
              {card.title}
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-7 text-ink/68 md:text-lg md:leading-8">
              {card.body}
            </p>
          </div>

          <aside className="self-start rounded-xl bg-ink/[0.04] p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-ink text-base font-semibold text-paper">
                {card.subject?.slice(0, 1) ?? "E"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{card.subject ?? "Employee"}</p>
                <p className="mt-1 truncate text-sm text-ink/55">
                  {card.subjectRole ?? "Employee record"}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 divide-x divide-ink/10 rounded-lg bg-paper/70 px-3 py-3 text-sm">
              <div className="pr-3">
                <p className="font-mono text-[11px] uppercase text-ink/45">Status</p>
                <p className="mt-1 font-semibold text-attention">Follow-up</p>
              </div>
              <div className="px-3">
                <p className="font-mono text-[11px] uppercase text-ink/45">Due</p>
                <p className="mt-1 font-semibold">{card.dueLabel ?? "Open"}</p>
              </div>
              <div className="pl-3">
                <p className="font-mono text-[11px] uppercase text-ink/45">Tone</p>
                <p className="mt-1 font-semibold">Calm</p>
              </div>
            </div>

            {card.detail && (
              <p className="mt-4 flex items-start gap-2 font-mono text-xs leading-5 text-ink/50">
                <FileText className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{card.detail}</span>
              </p>
            )}
          </aside>
        </section>

        <section className="rounded-2xl bg-ink/[0.04] p-5">
          <p className="font-mono text-xs uppercase text-ink/45">Conversation guide</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {guideSteps.map((step, index) => (
              <div key={step.label} className="grid grid-cols-[32px_minmax(0,1fr)] gap-3">
                <span className="grid size-8 place-items-center rounded-full bg-paper font-mono text-xs font-semibold text-ink shadow-[inset_0_0_0_1px_rgba(11,11,14,0.08)]">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="mt-1 text-sm leading-6 text-ink/65">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 rounded-2xl bg-ink/[0.04] p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <p className="font-mono text-xs uppercase text-ink/45">Keep in mind</p>
            <div className="mt-3 grid gap-2 text-sm leading-6 text-ink/70">
              <p className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                This is a check-in, not a confrontation.
              </p>
              <p className="flex items-start gap-2">
                <MessageSquareText className="mt-0.5 size-4 shrink-0 text-attention" aria-hidden="true" />
                Save only the agreed next step afterward.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row md:flex-col 2xl:flex-row">
            {card.actions.map((action, index) => (
              <Button
                key={action.label}
                variant={index === 0 ? "primary" : "secondary"}
                className={cn(
                  "gap-2 sm:min-w-40",
                  index === 0
                    ? "bg-ink text-paper hover:bg-ink-2"
                    : "border-ink/15 text-ink hover:bg-ink/[0.04]",
                )}
              >
                <span>{action.label}</span>
                {index === 0 && <ArrowRight className="size-4" aria-hidden="true" />}
              </Button>
            ))}
          </div>
        </section>
      </div>
    </article>
  );
}
