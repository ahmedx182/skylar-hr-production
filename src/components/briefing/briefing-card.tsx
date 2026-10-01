"use client";

import { useRef, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FileText,
  FilePlus2,
  LoaderCircle,
  MessageSquareText,
  ShieldAlert,
  UserPlus,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PrepareConversationButton } from "@/components/briefing/prepare-conversation-button";
import { StatusDot } from "@/components/briefing/status-dot";
import { DOCUMENTS_PATH, NEW_NOTE_PATH, NEW_PERSON_PATH, PEOPLE_PATH } from "@/constants/routes";
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
  isPending = false,
  onAction,
}: {
  card: BriefingCardModel;
  position: number;
  total: number;
  isPending?: boolean;
  onAction?: (cardId: string, action: "next" | "not_now") => void;
}) {
  const router = useRouter();
  const isClearCard = card.id === "system:clear";
  const subjectName = card.subject ?? "them";
  const [isProfileHolding, setIsProfileHolding] = useState(false);
  const profileHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openEmployeeProfile() {
    if (!card.employeeId) return;
    router.push(`${PEOPLE_PATH}/${card.employeeId}`);
  }

  function clearProfileHold() {
    if (profileHoldTimerRef.current) {
      clearTimeout(profileHoldTimerRef.current);
      profileHoldTimerRef.current = null;
    }
    setIsProfileHolding(false);
  }

  function startProfileHold() {
    if (!card.employeeId) return;
    clearProfileHold();
    setIsProfileHolding(true);
    profileHoldTimerRef.current = setTimeout(() => {
      profileHoldTimerRef.current = null;
      setIsProfileHolding(false);
      openEmployeeProfile();
    }, 650);
  }

  const profileHoldProps = card.employeeId
    ? {
        onPointerDown: startProfileHold,
        onPointerUp: clearProfileHold,
        onPointerCancel: clearProfileHold,
        onPointerLeave: clearProfileHold,
        onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openEmployeeProfile();
          }
        },
      }
    : {};

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl border border-ink/10 border-l-4 bg-paper text-ink shadow-[0_30px_90px_rgba(0,0,0,0.30)]",
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

      <div className="grid gap-5 px-5 py-5 md:px-7 md:py-6 2xl:px-9">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              {card.subject && (
                <button
                  type="button"
                  {...profileHoldProps}
                  className="relative inline-flex min-h-8 items-center gap-2 overflow-hidden rounded-full bg-ink/[0.05] px-3 font-mono text-xs text-ink/65 transition-colors hover:bg-ink/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25"
                  aria-label={`Hold to open ${card.subject}'s employee file`}
                  title="Hold to open employee file"
                >
                  <span
                    className={cn(
                      "absolute inset-y-0 left-0 w-0 bg-ink/10 transition-[width] duration-[650ms] ease-linear",
                      isProfileHolding && "w-full",
                    )}
                    aria-hidden="true"
                  />
                  <UserRound className="size-3.5" aria-hidden="true" />
                  <span className="relative z-10">{card.subject}</span>
                </button>
              )}
              {card.dueLabel && (
                <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-ink/[0.05] px-3 font-mono text-xs text-ink/65">
                  <CalendarClock className="size-3.5" aria-hidden="true" />
                  {card.dueLabel}
                </span>
              )}
            </div>

            <p className="mt-5 font-mono text-xs uppercase text-ink/45">Today&apos;s focus</p>
            <h2 className="mt-2 max-w-3xl text-3xl font-semibold leading-tight md:text-[2.35rem]">
              {card.title}
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-ink/68 md:text-[1.05rem] md:leading-8">
              {card.body}
            </p>
          </div>

          {!isClearCard && (
            <aside className="self-start rounded-xl bg-ink/[0.04] p-4">
              <button
                type="button"
                {...profileHoldProps}
                disabled={!card.employeeId}
                className="relative flex w-full items-center gap-3 overflow-hidden rounded-xl text-left transition-colors enabled:hover:bg-ink/[0.035] enabled:focus-visible:outline-none enabled:focus-visible:ring-2 enabled:focus-visible:ring-ink/25 disabled:cursor-default"
                aria-label={`Hold to open ${(card.subject ?? "employee")}'s file`}
                title={card.employeeId ? "Hold to open employee file" : undefined}
              >
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 w-0 bg-ink/[0.05] transition-[width] duration-[650ms] ease-linear",
                    isProfileHolding && "w-full",
                  )}
                  aria-hidden="true"
                />
                <span className="grid size-11 place-items-center rounded-full bg-ink text-base font-semibold text-paper">
                  {card.subject?.slice(0, 1) ?? "E"}
                </span>
                <div className="relative z-10 min-w-0">
                  <p className="truncate text-base font-semibold">{card.subject ?? "Employee"}</p>
                  <p className="mt-1 truncate text-sm text-ink/55">
                    {card.subjectRole ?? "Employee record"}
                  </p>
                </div>
              </button>

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
          )}
        </section>

        {!isClearCard && (
          <section className="rounded-2xl bg-ink/[0.04] p-4">
            <p className="font-mono text-xs uppercase text-ink/45">Conversation guide</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {(card.guide ?? guideSteps.map((step) => ({ ...step, body: step.body.replace("Maya", subjectName) }))).map((step, index) => (
                <div key={step.label} className="grid grid-cols-[32px_minmax(0,1fr)] gap-3">
                  <span className="grid size-8 place-items-center rounded-full bg-paper font-mono text-xs font-semibold text-ink shadow-[inset_0_0_0_1px_rgba(11,11,14,0.08)]">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{step.title}</p>
                    <p className="mt-1 text-sm leading-5 text-ink/65">
                      {step.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!isClearCard && <section className="flex min-w-0 flex-col gap-4 rounded-2xl bg-ink/[0.04] p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase text-ink/45">Keep in mind</p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm leading-5 text-ink/70">
              <p className="inline-flex max-w-[280px] items-start gap-2 rounded-full bg-paper/65 px-3 py-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                This is a check-in, not a confrontation.
              </p>
              <p className="inline-flex max-w-[320px] items-start gap-2 rounded-full bg-paper/65 px-3 py-2">
                <MessageSquareText className="mt-0.5 size-4 shrink-0 text-attention" aria-hidden="true" />
                Save only the agreed next step afterward.
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-3 xl:justify-end">
            {card.actions.map((action) => {
              if (action.kind === "next") return null;

              if (action.kind === "prepare") {
                return <PrepareConversationButton key={action.kind} card={card} />;
              }

              if (action.kind === "not_now") {
                const actionKind = action.kind;
                return (
                  <button
                    key={actionKind}
                    type="button"
                    disabled={isPending}
                    onClick={() => onAction?.(card.id, actionKind)}
                    aria-label={isPending ? "Saving card" : action.label}
                    className="h-12 px-3 text-sm text-ink/50 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 disabled:opacity-40"
                  >
                    <span>{isPending ? "Saving..." : action.label}</span>
                  </button>
                );
              }

              if (action.kind === "escalate") {
                return (
                  <HoldToEscalateButton
                    key={action.kind}
                    card={card}
                    disabled={isPending}
                    label={action.label}
                  />
                );
              }

              if (action.kind === "open_file" && card.ledgerEntryId) {
                const fileHref = card.employeeId
                  ? `${DOCUMENTS_PATH}/${card.ledgerEntryId}?from=employee&employeeId=${card.employeeId}`
                  : `${DOCUMENTS_PATH}/${card.ledgerEntryId}`;
                return (
                  <Link
                    key={action.kind}
                    href={fileHref}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-ink/15 px-4 text-sm font-medium text-ink transition-colors hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 sm:min-w-32"
                  >
                    <FileText className="size-4" aria-hidden="true" />
                    <span>{action.label}</span>
                  </Link>
                );
              }

              if (action.kind === "open_profile" && card.employeeId) {
                return (
                  <Link
                    key={action.kind}
                    href={`${PEOPLE_PATH}/${card.employeeId}`}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-ink/15 px-4 text-sm font-medium text-ink transition-colors hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 sm:min-w-32"
                  >
                    <UserRound className="size-4" aria-hidden="true" />
                    <span>{action.label}</span>
                  </Link>
                );
              }

              return (
                <Button
                  key={action.kind}
                  variant="secondary"
                  className="gap-2 border-ink/15 text-ink hover:bg-ink/[0.04] sm:min-w-32"
                >
                  <span>{action.label}</span>
                </Button>
              );
            })}
          </div>
        </section>}

        {isClearCard && card.detail && (
          <section className="grid gap-5 rounded-2xl bg-ink/[0.04] p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div>
              <p className="font-mono text-xs uppercase text-ink/45">Briefing status</p>
              <p className="mt-3 text-sm leading-6 text-ink/65">{card.detail}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {card.actions.map((action) => {
                if (action.kind === "add_note") {
                  return (
                    <Link
                      key={action.kind}
                      href={NEW_NOTE_PATH}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 sm:min-w-32"
                    >
                      <FilePlus2 className="size-4" aria-hidden="true" />
                      <span>{action.label}</span>
                    </Link>
                  );
                }

                if (action.kind === "add_person") {
                  return (
                    <Link
                      key={action.kind}
                      href={NEW_PERSON_PATH}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-ink/15 px-4 text-sm font-medium text-ink transition-colors hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 sm:min-w-32"
                    >
                      <UserPlus className="size-4" aria-hidden="true" />
                      <span>{action.label}</span>
                    </Link>
                  );
                }

                return null;
              })}
            </div>
          </section>
        )}
      </div>
      {card.actions.some((action) => action.kind === "next") && (
        <Button
          variant="secondary"
          disabled={isPending}
          onClick={() => onAction?.(card.id, "next")}
          aria-label={isPending ? "Saving card" : "Next card"}
          title="Next card"
          className="group absolute right-4 top-1/2 z-20 grid size-12 -translate-y-1/2 place-items-center rounded-full border-ink/15 bg-paper text-ink shadow-[0_8px_24px_rgba(0,0,0,0.16)] transition-[background-color,color,transform] hover:-translate-y-1/2 hover:bg-ink hover:text-paper focus-visible:-translate-y-1/2 disabled:opacity-60"
        >
          {isPending ? (
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowRight
              className="size-5 transition-transform duration-200 group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 motion-reduce:transition-none"
              aria-hidden="true"
            />
          )}
        </Button>
      )}
    </article>
  );
}

function HoldToEscalateButton({
  card,
  disabled,
  label,
}: {
  card: BriefingCardModel;
  disabled?: boolean;
  label: string;
}) {
  const [status, setStatus] = useState<"idle" | "holding" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearHold() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setStatus((current) => (current === "holding" ? "idle" : current));
  }

  async function escalate() {
    if (!card.ledgerEntryId || status === "sending" || status === "sent") return;

    setStatus("sending");
    setMessage("");

    try {
      const response = await fetch("/api/advisor/escalations", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ledgerEntryId: card.ledgerEntryId }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { escalation?: { caseId?: string }; error?: { message?: string } }
        | null;

      if (!response.ok || !payload?.escalation) {
        throw new Error(payload?.error?.message ?? "Skylar could not send this to the advisor.");
      }

      setStatus("sent");
      setMessage(payload.escalation.caseId ? `Sent as ${payload.escalation.caseId}.` : "Sent to advisor.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Skylar could not send this to the advisor.");
    }
  }

  function startHold() {
    if (disabled || !card.ledgerEntryId || status === "sending" || status === "sent") return;
    if (timerRef.current) return;
    setStatus("holding");
    setMessage("");
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void escalate();
    }, 900);
  }

  const buttonLabel =
    status === "sent"
      ? "Advisor notified"
      : status === "sending"
        ? "Sending..."
        : status === "holding"
          ? "Keep holding..."
          : label;

  return (
    <div className="grid gap-1">
      <button
        type="button"
        disabled={disabled || !card.ledgerEntryId || status === "sending" || status === "sent"}
        onPointerDown={startHold}
        onPointerUp={clearHold}
        onPointerCancel={clearHold}
        onPointerLeave={clearHold}
        onKeyDown={(event) => {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            startHold();
          }
        }}
        onKeyUp={(event) => {
          if (event.key === " " || event.key === "Enter") clearHold();
        }}
        title="Hold Space or Enter for 0.9 s to escalate"
        aria-label={buttonLabel}
        className={cn(
          "group relative h-12 overflow-hidden rounded-full border border-risk/30 bg-risk/10 px-4 text-sm font-semibold text-risk transition-colors hover:bg-risk/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-risk/30 disabled:cursor-not-allowed disabled:opacity-60",
          status === "sent" && "border-success/25 bg-success/10 text-success",
        )}
      >
        <span
          className={cn(
            "absolute inset-y-0 left-0 w-0 bg-risk/15 transition-[width] duration-[900ms] ease-linear",
            status === "holding" && "w-full",
          )}
          aria-hidden="true"
        />
        <span className="relative z-10 inline-flex items-center gap-2">
          {status === "sending" ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ShieldAlert className="size-4" aria-hidden="true" />
          )}
          {buttonLabel}
        </span>
      </button>
      {message && (
        <p
          className={cn(
            "px-2 text-xs leading-5",
            status === "error" ? "text-risk" : "text-ink/55",
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
