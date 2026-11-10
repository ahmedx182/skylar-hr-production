"use client";

import { Check, Clock3, LoaderCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { DAY_LABELS, hoursProblem, isWithinWorkingHours, type AdvisorHours } from "@/features/advisor/hours";
import { MAX_FREE_TRIAL_DAYS } from "@/features/advisor/trial";
import { cn } from "@/lib/utils/cn";

export type AdvisorSettingsValue = { hours: AdvisorHours; freeTrialDays: number };

const START_HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const END_HOURS = Array.from({ length: 24 }, (_, index) => index + 1);
const hourText = (hour: number) => `${String(hour).padStart(2, "0")}:00`;
/** Monday first, as people read a week. */
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const field = "h-10 rounded-xl border border-paper/[0.06] bg-ink/70 px-3 text-sm text-paper outline-none focus:border-paper/20";

/** Working hours decide whether managers are told "up to an hour" or "up to 6 hours". The trial length limits free use. */
export function AdvisorSettingsPanel({ initial }: { initial: AdvisorSettingsValue }) {
  const [hours, setHours] = useState<AdvisorHours>(initial.hours);
  const [trialText, setTrialText] = useState(String(initial.freeTrialDays));
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const zones = useMemo(() => {
    try {
      return (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
    } catch {
      return [];
    }
  }, []);

  const trialDays = Number(trialText);
  const trialValid = trialText.trim() !== "" && Number.isInteger(trialDays) && trialDays >= 0 && trialDays <= MAX_FREE_TRIAL_DAYS;
  const problem = hoursProblem(hours) ?? (trialValid ? null : `The free trial must be a whole number of days from 0 to ${MAX_FREE_TRIAL_DAYS}.`);
  const openNow = problem === null && isWithinWorkingHours(Date.now(), hours);

  const change = (patch: Partial<AdvisorHours>) => {
    setHours((current) => ({ ...current, ...patch }));
    setSaved(false);
  };

  const toggleDay = (day: number) =>
    change({ workDays: hours.workDays.includes(day) ? hours.workDays.filter((item) => item !== day) : [...hours.workDays, day].sort((a, b) => a - b) });

  async function save() {
    if (problem || isSaving) return;
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch("/api/platform/advisor-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...hours, freeTrialDays: trialDays }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message ?? "Those settings could not be saved.");
      // Nothing else on the page shows these values, so the panel keeps its own state and its "Saved" message.
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Those settings could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-[20px] bg-ink-2/70 p-4 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.045)]">
      <div className="grid gap-1">
        <h2 className="text-base font-semibold text-paper">HR advisor hours and free trial</h2>
        <p className="text-sm text-paper-3">
          Inside working hours a manager is told an advisor may take up to an hour; outside them, up to 6 hours. The free trial is how long a new workspace can use Skylar before it must pay.
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-semibold text-paper-3">
          Time zone
          <input
            list="advisor-time-zones"
            value={hours.timeZone}
            onChange={(event) => change({ timeZone: event.target.value })}
            spellCheck={false}
            autoComplete="off"
            placeholder="America/New_York"
            className={field}
          />
          <datalist id="advisor-time-zones">
            {zones.map((zone) => (
              <option key={zone} value={zone} />
            ))}
          </datalist>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1.5 text-xs font-semibold text-paper-3">
            Starts
            <select value={hours.startHour} onChange={(event) => change({ startHour: Number(event.target.value) })} className={field}>
              {START_HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {hourText(hour)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-paper-3">
            Ends
            <select value={hours.endHour} onChange={(event) => change({ endHour: Number(event.target.value) })} className={field}>
              {END_HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {hourText(hour)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-1.5 text-xs font-semibold text-paper-3">
          Working days
          <div role="group" aria-label="Working days" className="flex flex-wrap gap-1.5">
            {DAY_ORDER.map((day) => {
              const on = hours.workDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleDay(day)}
                  className={cn("h-9 min-w-12 rounded-lg px-3 text-xs font-semibold transition-colors", on ? "bg-paper text-ink" : "bg-paper/[0.06] text-paper-3 hover:text-paper")}
                >
                  {DAY_LABELS[day]}
                </button>
              );
            })}
          </div>
        </div>

        <label className="grid gap-1.5 text-xs font-semibold text-paper-3">
          Free trial (days)
          <input
            inputMode="numeric"
            value={trialText}
            onChange={(event) => {
              setTrialText(event.target.value.replace(/[^\d]/g, ""));
              setSaved(false);
            }}
            aria-describedby="trial-help"
            className={cn(field, "max-w-[160px]")}
          />
          <span id="trial-help" className="font-normal text-paper-3">
            Counted from when the workspace was created. 0 means no time limit, only the free message count.
          </span>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={Boolean(problem) || isSaving}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-paper px-4 text-xs font-semibold text-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <Check className="size-3.5" aria-hidden="true" />}
          {isSaving ? "Saving..." : "Save settings"}
        </button>
        <p className="inline-flex items-center gap-1.5 text-xs text-paper-3">
          <Clock3 className="size-3.5" aria-hidden="true" />
          {problem ? null : openNow ? "Right now is inside working hours." : "Right now is outside working hours."}
        </p>
        {saved && (
          <p role="status" className="text-xs font-semibold text-success">
            Saved. It applies to new chats straight away.
          </p>
        )}
      </div>
      {(problem || error) && (
        <p role="alert" className="mt-3 text-sm text-risk">
          {error || problem}
        </p>
      )}
    </div>
  );
}
