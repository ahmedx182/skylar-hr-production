import { formatBucket, formatBucketEdge, formatCount } from "@/features/platform/format";
import type { Granularity } from "@/features/platform/range";

/** Single-series bar chart, server-rendered with CSS. Each column is a full-height hover target with its own tooltip. */
export function ActivityBarChart({
  title,
  unit,
  rangeLabel,
  granularity,
  endsToday,
  points,
}: {
  title: string;
  unit: string;
  rangeLabel: string;
  granularity: Granularity;
  /** When false the range ended in the past, so the last bar isn't "today". */
  endsToday: boolean;
  points: { startMs: number; value: number }[];
}) {
  const max = Math.max(1, ...points.map((point) => point.value));
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const first = points[0];
  const last = points[points.length - 1];
  const lastLabel = endsToday
    ? granularity === "day" ? "Today" : granularity === "week" ? "This week" : "This month"
    : granularity === "day" ? "Last day" : granularity === "week" ? "Last week" : "Last month";

  return (
    <figure className="rounded-2xl bg-paper/[0.045] p-4 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.05)]">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-paper">{title}</span>
        <span className="text-xs text-paper-3">
          {formatCount(total)} {unit} in {rangeLabel}
        </span>
      </figcaption>

      <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
        <div className="flex h-36 flex-col justify-between text-right font-mono text-[10px] text-paper-3" aria-hidden="true">
          <span>{formatCount(max)}</span>
          <span>0</span>
        </div>
        <div className="relative h-36 border-b border-paper/15">
          <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-paper/[0.07]" aria-hidden="true" />
          <div
            className="flex h-full items-end gap-0.5"
            role="img"
            aria-label={`${title}: ${formatCount(total)} ${unit} in ${rangeLabel}. Busiest ${granularity}: ${formatCount(max)}.`}
          >
            {points.map((point, index) => {
              const heightPct = point.value === 0 ? 0 : Math.max(3, (point.value / max) * 100);
              // Tooltips on the outer columns align to their edge so they stay inside the card.
              const align = index < 3 ? "left-0" : index > points.length - 4 ? "right-0" : "left-1/2 -translate-x-1/2";
              return (
                <div key={point.startMs} className="group relative flex h-full flex-1 items-end">
                  <div className="w-full rounded-t-[4px] bg-sun/85 transition-colors group-hover:bg-sun" style={{ height: `${heightPct}%` }} />
                  <div
                    className={`pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-lg bg-paper px-2.5 py-1.5 text-xs text-ink shadow-[0_10px_30px_rgba(0,0,0,0.35)] group-hover:block ${align}`}
                  >
                    <span className="font-semibold tabular-nums">{formatCount(point.value)}</span> {unit}
                    <span className="block text-[11px] text-ink/60">{formatBucket(point.startMs, granularity)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <span />
        <div className="mt-1.5 flex justify-between font-mono text-[10px] text-paper-3" aria-hidden="true">
          <span>{first ? formatBucketEdge(first.startMs, granularity) : ""}</span>
          <span>{last ? `${lastLabel}: ${formatCount(last.value)}` : ""}</span>
        </div>
      </div>
    </figure>
  );
}
