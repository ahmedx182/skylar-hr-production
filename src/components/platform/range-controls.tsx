"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarRange } from "lucide-react";
import { PLATFORM_PATH } from "@/constants/routes";
import { MAX_CUSTOM_DAYS, PRESET_RANGES, isoDay, type ResolvedRange } from "@/features/platform/range";
import { cn } from "@/lib/utils/cn";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Presets are plain links so the range lives in the URL; Custom reveals a from/to date form that does the same. */
export function RangeControls({ range }: { range: ResolvedRange }) {
  const router = useRouter();
  const isCustom = range.key === "custom";
  const [open, setOpen] = useState(isCustom);
  const [from, setFrom] = useState(range.fromDate);
  const [to, setTo] = useState(range.toDate);
  const [error, setError] = useState("");
  const today = isoDay(Date.now());

  function apply() {
    const fromMs = Date.parse(`${from}T00:00:00Z`);
    const toMs = Date.parse(`${to}T00:00:00Z`);
    if (!from || !to || Number.isNaN(fromMs) || Number.isNaN(toMs)) return setError("Pick both dates.");
    if (fromMs > toMs) return setError("The start date must be on or before the end date.");
    if (to > today || from > today) return setError("Dates can't be in the future.");
    if ((toMs - fromMs) / DAY_MS + 1 > MAX_CUSTOM_DAYS) return setError("Choose a range of two years or less.");
    setError("");
    router.push(`${PLATFORM_PATH}?range=custom&from=${from}&to=${to}`, { scroll: false });
  }

  const tab = "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors";
  const dateInput =
    "h-9 rounded-lg border border-paper/10 bg-ink px-2.5 text-sm text-paper outline-none [color-scheme:dark] focus:border-paper/30";

  return (
    <div className="grid justify-items-start gap-2 sm:justify-items-end">
      <div role="group" aria-label="Time range" className="inline-flex flex-wrap rounded-xl bg-ink-2/80 p-1 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.06)]">
        {PRESET_RANGES.map((preset) => (
          <Link
            key={preset.value}
            href={`${PLATFORM_PATH}?range=${preset.value}`}
            scroll={false}
            onClick={() => setOpen(false)}
            aria-current={preset.value === range.key ? "page" : undefined}
            className={cn(tab, preset.value === range.key ? "bg-paper text-ink" : "text-paper-3 hover:text-paper")}
          >
            {preset.label}
          </Link>
        ))}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className={cn(tab, isCustom ? "bg-paper text-ink" : open ? "bg-paper/[0.1] text-paper" : "text-paper-3 hover:text-paper")}
        >
          <CalendarRange className="size-3.5" aria-hidden="true" />
          Custom
        </button>
      </div>

      {open && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            apply();
          }}
          className="flex flex-wrap items-end gap-2 rounded-xl bg-ink-2/80 p-3 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.06)]"
        >
          <label className="grid gap-1 text-[11px] font-semibold text-paper-3">
            From
            <input type="date" value={from} max={today} onChange={(event) => setFrom(event.target.value)} className={dateInput} />
          </label>
          <label className="grid gap-1 text-[11px] font-semibold text-paper-3">
            To
            <input type="date" value={to} max={today} min={from || undefined} onChange={(event) => setTo(event.target.value)} className={dateInput} />
          </label>
          <button type="submit" className="inline-flex h-9 items-center rounded-lg bg-paper px-4 text-sm font-semibold text-ink transition-opacity hover:opacity-90">
            Apply
          </button>
          <p className={cn("basis-full text-[11px]", error ? "text-risk" : "text-paper-3")}>{error || "Dates are in UTC. Up to two years."}</p>
        </form>
      )}
    </div>
  );
}
