"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  MessageCircleQuestion,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { BRIEFING_PATH } from "@/constants/routes";
import {
  createEmployeeAction,
  createNoteAction,
} from "@/features/briefing/create-actions";
import { companyDisplayName } from "@/lib/company-display-name";
import type { AuthSession } from "@/types/auth";

const totalSteps = 6;

type LiveInFiveProps = {
  session: AuthSession;
};

type Step = 1 | 2 | 3 | 4 | 5 | 6;

type LightFlowDraft = {
  step: Step;
  employeeName: string;
  employeeEmail: string;
  situation: string;
  whatChanged: string;
  nextStep: string;
  employeeId: string;
  createdEmployeeKey: string;
  savedPlanKey: string;
};

const starterPrompts = [
  "He's been late repeatedly",
  "I need to have a hard performance conversation",
  "He asked for time off I'm not sure he's owed",
];

const clarifyingAnswers = ["No, not yet", "Informally - a quick word", "Yes, and it's written down"];

function draftKey(uid: string) {
  return `skylar:light-flow:${uid}`;
}

function restoredStep(value: unknown): Step | null {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1) return null;
  return Math.min(numeric, totalSteps) as Step;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readDraft(uid: string): Partial<LightFlowDraft> | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(draftKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    return {
      ...(restoredStep(parsed.step) ? { step: restoredStep(parsed.step)! } : {}),
      ...(stringValue(parsed.employeeName) !== null ? { employeeName: stringValue(parsed.employeeName)! } : {}),
      ...(stringValue(parsed.employeeEmail) !== null ? { employeeEmail: stringValue(parsed.employeeEmail)! } : {}),
      ...(stringValue(parsed.situation) !== null ? { situation: stringValue(parsed.situation)! } : {}),
      ...(stringValue(parsed.whatChanged) !== null ? { whatChanged: stringValue(parsed.whatChanged)! } : {}),
      ...(stringValue(parsed.nextStep) !== null ? { nextStep: stringValue(parsed.nextStep)! } : {}),
      ...(stringValue(parsed.employeeId) !== null ? { employeeId: stringValue(parsed.employeeId)! } : {}),
      ...(stringValue(parsed.createdEmployeeKey) !== null ? { createdEmployeeKey: stringValue(parsed.createdEmployeeKey)! } : {}),
      ...(stringValue(parsed.savedPlanKey) !== null ? { savedPlanKey: stringValue(parsed.savedPlanKey)! } : {}),
    };
  } catch {
    return null;
  }
}

export function LiveInFive({ session }: LiveInFiveProps) {
  const hasWorkspaceName = Boolean(session.companyName?.trim());
  const firstVisibleStep: Step = hasWorkspaceName ? 2 : 1;
  const visibleTotalSteps = hasWorkspaceName ? totalSteps - 1 : totalSteps;
  const [step, setStep] = useState<Step>(firstVisibleStep);
  const [employeeName, setEmployeeName] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [situation, setSituation] = useState("");
  const [whatChanged, setWhatChanged] = useState("");
  const [nextStep, setNextStep] = useState("Follow up after the conversation and keep the note on the employee record.");
  const [employeeId, setEmployeeId] = useState("");
  const [createdEmployeeKey, setCreatedEmployeeKey] = useState("");
  const [savedPlanKey, setSavedPlanKey] = useState("");
  const [error, setError] = useState("");
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [isPending, startTransition] = useTransition();

  const workspaceName = companyDisplayName(session);
  const workEmail = session.email ?? "Signed in";
  const employeeKey = `${employeeName.trim().toLowerCase()}|${employeeEmail.trim().toLowerCase()}`;
  const visibleStep = hasWorkspaceName ? Math.max(step - 1, 1) : step;
  const progress = `${visibleStep}/${visibleTotalSteps}`;
  const employeeFirstName = employeeName.trim().split(/\s+/)[0] || "the employee";
  const plan = useMemo(
    () => ({
      title: "Address it directly this week, and start a paper trail.",
      body:
        "The first conversation should stay calm and specific: name the pattern, ask what is getting in the way, and agree what changes next.",
      note: [
        `Situation: ${situation}`,
        `Clarifying context: ${whatChanged}`,
        `Recommended next step: ${nextStep}`,
        "Follow-up: ask how the conversation went and prepare a written-warning template if the pattern continues.",
      ].join("\n\n"),
    }),
    [nextStep, situation, whatChanged],
  );
  const planKey = `${employeeId}|${plan.note}`;

  useEffect(() => {
    const draft = readDraft(session.uid);
    if (draft?.step) setStep(hasWorkspaceName && draft.step === 1 ? 2 : draft.step);
    if (!draft?.step && hasWorkspaceName) setStep(2);
    if (draft?.employeeName !== undefined) setEmployeeName(draft.employeeName);
    if (draft?.employeeEmail !== undefined) setEmployeeEmail(draft.employeeEmail);
    if (draft?.situation !== undefined) setSituation(draft.situation);
    if (draft?.whatChanged !== undefined) setWhatChanged(draft.whatChanged);
    if (draft?.nextStep !== undefined) setNextStep(draft.nextStep);
    if (draft?.employeeId !== undefined) setEmployeeId(draft.employeeId);
    if (draft?.createdEmployeeKey !== undefined) setCreatedEmployeeKey(draft.createdEmployeeKey);
    if (draft?.savedPlanKey !== undefined) setSavedPlanKey(draft.savedPlanKey);
    setHasRestoredDraft(true);
  }, [hasWorkspaceName, session.uid]);

  useEffect(() => {
    if (!hasRestoredDraft || typeof window === "undefined") return;

    const draft: LightFlowDraft = {
      step,
      employeeName,
      employeeEmail,
      situation,
      whatChanged,
      nextStep,
      employeeId,
      createdEmployeeKey,
      savedPlanKey,
    };
    window.localStorage.setItem(draftKey(session.uid), JSON.stringify(draft));
  }, [
    createdEmployeeKey,
    employeeEmail,
    employeeId,
    employeeName,
    hasRestoredDraft,
    nextStep,
    savedPlanKey,
    session.uid,
    situation,
    step,
    whatChanged,
  ]);

  function advance() {
    setError("");
    if (step === 2) {
      if (!employeeName.trim() || !employeeEmail.trim()) {
        setError("Add who this is about before continuing.");
        return;
      }
      if (employeeId && createdEmployeeKey === employeeKey) {
        setStep(3);
        return;
      }
      startTransition(async () => {
        try {
          const result = await createEmployeeAction(
            {
              name: employeeName,
              email: employeeEmail,
              jobTitle: "",
              location: "",
              summary: "",
            },
            { revalidateBriefing: false },
          );
          if (!result.ok) {
            setError(result.message);
            return;
          }
          setEmployeeId(result.id ?? "");
          setCreatedEmployeeKey(employeeKey);
          setStep(3);
        } catch {
          setError("Skylar could not create the employee record. Check the connection and try again.");
        }
      });
      return;
    }
    if (step === 3 && situation.trim().length < 8) {
      setError("Tell Skylar what is going on before continuing.");
      return;
    }
    if (step === 4 && (!whatChanged.trim() || !nextStep.trim())) {
      setError("Answer the clarifying question before moving to the plan.");
      return;
    }
    if (step < totalSteps) setStep((current) => (current + 1) as Step);
  }

  function savePlan() {
    if (!employeeId) {
      setError("The employee file is not ready yet. Go back and try again.");
      return;
    }
    if (savedPlanKey === planKey) {
      setError("");
      setStep(6);
      return;
    }
    startTransition(async () => {
      try {
        const result = await createNoteAction(
          {
            employeeId,
            note: plan.note,
            statusDot: "amber",
          },
          { revalidateBriefing: false },
        );
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setSavedPlanKey(planKey);
        setError("");
        setStep(6);
      } catch {
        setError("Skylar could not save the plan. Check the connection and try again.");
      }
    });
  }

  return (
    <section className="mx-auto grid w-full max-w-5xl gap-3">
      <header className="flex flex-wrap items-end justify-between gap-3 pb-1">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-sun">Light flow prototype</p>
          <h1 className="mt-1 text-base font-semibold text-paper md:text-lg">
            Start with a real employee record, then save the first plan.
          </h1>
        </div>
        <p className="font-mono text-sm text-paper-3">{progress}</p>
      </header>

      <div className="h-1 overflow-hidden rounded-full bg-paper/[0.08]" aria-label={`Step ${progress}`}>
        <div
          className="h-full bg-sun transition-[width] duration-300 ease-out"
          style={{ width: `${(visibleStep / visibleTotalSteps) * 100}%` }}
        />
      </div>

      <article className="overflow-hidden rounded-[20px] bg-ink-2 text-paper shadow-[0_24px_70px_rgba(0,0,0,0.28),inset_0_0_0_1px_rgba(244,239,231,0.055),inset_0_1px_0_rgba(244,239,231,0.08)]">
        <div className="flex items-center justify-between border-b border-paper/10 px-5 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <StepIcon step={step} />
            <p className="font-mono text-xs uppercase text-paper-3">{stepLabel(step)}</p>
          </div>
          <p className="font-mono text-xs text-paper-3">{progress}</p>
        </div>

        <div className="grid gap-7 px-5 py-6 md:px-10 md:py-8">
          {!hasWorkspaceName && step === 1 && (
            <StepFrame
              eyebrow="Start here"
              title="Tell us what's going on. We'll help you handle it right."
              body="Your workspace is already set. Skylar keeps the plan, employee record, and follow-up inside that company."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="border-b-2 border-paper/15 pb-3">
                  <p className="text-sm font-semibold text-paper-2">Workspace</p>
                  <p className="mt-4 text-lg font-semibold text-paper">{workspaceName}</p>
                </div>
                <div className="border-b-2 border-paper/15 pb-3">
                  <p className="text-sm font-semibold text-paper-2">Signed in as</p>
                  <p className="mt-4 truncate text-lg font-semibold text-paper">{workEmail}</p>
                </div>
              </div>
            </StepFrame>
          )}

          {step === 2 && (
            <StepFrame
              eyebrow="Who is this about?"
              title="Keep everything on the right person's record."
              body="First name is fine. Skylar will create the record now so the plan and follow-up have somewhere to live."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <TextField label="Employee" value={employeeName} onChange={setEmployeeName} placeholder="Employee name" />
                <TextField label="Work email" value={employeeEmail} onChange={setEmployeeEmail} placeholder="employee@company.com" type="email" />
              </div>
            </StepFrame>
          )}

          {step === 3 && (
            <StepFrame
              eyebrow="First message"
              title={`What's going on with ${employeeFirstName}?`}
              body="Say it in your own words, or start from one of the situations Skylar hears most often."
            >
              <TextareaField label="Describe what's going on" value={situation} onChange={setSituation} placeholder="He's been late repeatedly..." />
              <div className="grid gap-3 md:grid-cols-3">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setSituation(prompt === starterPrompts[0] ? "He's been late repeatedly - five times this month." : prompt)}
                    className="min-h-16 border border-paper/10 px-4 py-3 text-left text-sm text-paper-2 transition-colors hover:border-paper/25 hover:bg-paper/[0.05]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </StepFrame>
          )}

          {step === 4 && (
            <StepFrame
              eyebrow="One question"
              title={`Has anyone talked to ${employeeFirstName} about it yet?`}
              body="Five in a month is a pattern, not an incident. Whether it has already been raised changes the first conversation."
            >
              <div className="rounded-2xl border border-paper/10 bg-paper/[0.04] p-4 text-paper-2">
                <p className="font-mono text-xs uppercase text-paper-3">You said</p>
                <p className="mt-2 text-lg leading-8">&quot;{situation}&quot;</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {clarifyingAnswers.map((answer) => (
                  <button
                    key={answer}
                    type="button"
                  onClick={() => {
                      setWhatChanged(answer);
                      setNextStep("Follow up after the conversation and keep the note on the employee record.");
                    }}
                    className="min-h-14 border border-paper/10 px-4 py-3 text-left text-sm font-semibold text-paper transition-colors hover:border-paper/25 hover:bg-paper/[0.05]"
                  >
                    {answer}
                  </button>
                ))}
              </div>
              <TextareaField label="Or type the answer" value={whatChanged} onChange={setWhatChanged} placeholder="Informally - a quick word" />
            </StepFrame>
          )}

          {step === 5 && (
            <StepFrame eyebrow="Action plan" title={plan.title} body={plan.body}>
              <div className="grid gap-3 border-y border-paper/10 py-5">
                {[
                  ["Recommended approach", "3 min"],
                  ["Conversation script", "Say / don't"],
                  ["Documentation", "2 templates"],
                ].map(([item, meta], index) => (
                  <div key={item} className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-b border-paper/10 py-3 last:border-0">
                    <span className="font-mono text-xs text-paper-3">{index + 1}</span>
                    <p className="font-semibold text-paper">{item}</p>
                    <p className="font-mono text-xs uppercase text-paper-3">{meta}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm leading-6 text-paper-3">
                The plan will be saved to the employee record and can show up in the real briefing queue.
              </p>
            </StepFrame>
          )}

          {step === 6 && (
            <StepFrame
              eyebrow="Saved"
              title="Done. Here's what happens next."
              body={`${employeeFirstName}'s plan is saved to the record, and Skylar now knows when to bring the follow-up back.`}
            >
              <Timeline
                items={[
                  ["1 week", "Skylar asks how the conversation went"],
                  ["2 weeks", "Written-warning template ready if needed"],
                  ["Anytime", "Add your team when you are ready"],
                ]}
              />
            </StepFrame>
          )}

          {error && <p role="alert" className="border-l-2 border-risk px-3 py-2 text-sm font-semibold text-risk">{error}</p>}

          <div className="flex flex-wrap items-center justify-between gap-3">
            {step > firstVisibleStep && step < totalSteps ? (
              <button
                type="button"
                onClick={() => setStep((current) => (current - 1) as Step)}
                className="inline-flex h-12 items-center gap-2 px-1 font-mono text-xs uppercase text-paper-3 transition-colors hover:text-paper"
              >
                <ArrowLeft className="size-4" aria-hidden="true" /> Back
              </button>
            ) : (
              <span />
            )}

            {step < 5 && (
              <button type="button" onClick={advance} disabled={isPending} className="inline-flex h-12 items-center gap-3 bg-paper px-5 font-semibold text-ink transition-opacity hover:opacity-90 disabled:opacity-50">
                {isPending ? "Saving..." : "Continue"}
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            )}
            {step === 5 && (
              <button type="button" onClick={savePlan} disabled={isPending} className="inline-flex h-12 items-center gap-3 bg-paper px-5 font-semibold text-ink transition-opacity hover:opacity-90 disabled:opacity-50">
                {isPending ? "Saving..." : `Save to ${employeeFirstName}'s record`}
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            )}
            {step === 6 && (
              <Link href={BRIEFING_PATH} className="inline-flex h-12 items-center gap-2 bg-paper px-5 font-semibold text-ink transition-opacity hover:opacity-90">
                Back to Briefing
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </article>
    </section>
  );
}

function stepLabel(step: Step) {
  return [
    "Start here",
    "Who is this about",
    "First message",
    "One question",
    "Plan",
    "Saved",
  ][step - 1];
}

function StepIcon({ step }: { step: Step }) {
  const Icon =
    step === 2
      ? UserRound
      : step === 4
        ? MessageCircleQuestion
        : step === 5 || step === 6
          ? FileText
          : CheckCircle2;
  return <Icon className="size-4 text-sun" aria-hidden="true" />;
}

function StepFrame({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-7">
      <div className="max-w-3xl">
        <p className="font-mono text-xs uppercase text-paper-3">{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.02em] text-paper md:text-5xl">{title}</h2>
        <p className="mt-5 max-w-2xl text-base leading-7 text-paper-2 md:text-lg">{body}</p>
      </div>
      {children}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-paper-2">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 border-0 border-b-2 border-paper/15 bg-transparent px-0 text-lg text-paper outline-none placeholder:text-paper-3 focus:border-paper"
      />
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-paper-2">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="resize-y border-0 border-b-2 border-paper/15 bg-transparent px-0 py-2 text-lg leading-7 text-paper outline-none placeholder:text-paper-3 focus:border-paper"
      />
    </label>
  );
}

function Timeline({ items }: { items: [string, string][] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-paper/10">
      {items.map(([date, label]) => (
        <div key={`${date}-${label}`} className="grid min-h-16 grid-cols-[72px_minmax(0,1fr)] items-center gap-3 border-b border-paper/10 px-4 py-3 last:border-0">
          <span className="font-mono text-xs uppercase text-paper-3">{date}</span>
          <span className="text-sm font-semibold leading-6 text-paper">{label}</span>
        </div>
      ))}
    </div>
  );
}
