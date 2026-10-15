import type { ListDensity } from "@/features/preferences/layout-preferences";
import { cn } from "@/lib/utils/cn";

const listClasses: Record<ListDensity, string> = {
  comfortable: "grid gap-3",
  compact: "grid gap-1.5",
  grid: "grid gap-3 sm:grid-cols-2 2xl:grid-cols-3",
};

const itemClasses: Record<ListDensity, string> = {
  comfortable:
    "group grid gap-4 rounded-[14px] bg-paper/[0.045] px-4 py-4 text-left shadow-[inset_0_0_0_1px_rgba(244,239,231,0.035),inset_0_1px_0_rgba(244,239,231,0.04)] transition-colors md:grid-cols-[minmax(0,1fr)_170px] md:items-center",
  compact:
    "group grid gap-2 rounded-xl bg-paper/[0.045] px-3 py-2.5 text-left shadow-[inset_0_0_0_1px_rgba(244,239,231,0.035)] transition-colors md:grid-cols-[minmax(0,1fr)_auto] md:items-center",
  grid:
    "group flex flex-col justify-between gap-4 rounded-[14px] bg-paper/[0.045] p-4 text-left shadow-[inset_0_0_0_1px_rgba(244,239,231,0.035),inset_0_1px_0_rgba(244,239,231,0.04)] transition-colors",
};

export function densityListClass(density: ListDensity) {
  return listClasses[density];
}

export function densityItemClass(density: ListDensity) {
  return itemClasses[density];
}

export function DensityItemContent({
  density,
  label,
  meta,
  metaTone = "sun",
  title,
  body,
  action,
}: {
  density: ListDensity;
  label: string;
  meta: string;
  metaTone?: "sun" | "plain";
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  const metaClass =
    metaTone === "sun"
      ? "rounded-full bg-sun/12 px-3 py-1 text-xs font-semibold text-sun"
      : "text-xs font-semibold text-paper-2";

  if (density === "compact") {
    return (
      <>
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 rounded-full bg-paper/[0.10] px-2 py-0.5 font-mono text-[10px] uppercase text-paper-2">
            {label}
          </span>
          <p className="min-w-0 truncate text-sm font-semibold text-paper" title={body}>
            {title}
          </p>
          {meta && (
            <span className={cn("hidden shrink-0 sm:inline", metaTone === "sun" ? "text-xs font-semibold text-sun" : metaClass)}>
              {meta}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">{action}</div>
      </>
    );
  }

  return (
    <>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-paper/[0.10] px-3 py-1 font-mono text-[11px] uppercase text-paper-2 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.05)]">
            {label}
          </span>
          {meta && <span className={metaClass}>{meta}</span>}
        </div>
        <p className="mt-3 font-semibold text-paper">{title}</p>
        <p className={cn("mt-1 text-sm leading-6 text-paper-2", density === "grid" ? "line-clamp-3" : "line-clamp-2")}>
          {body}
        </p>
      </div>
      <div className={cn("flex flex-wrap items-center gap-2", density === "comfortable" && "md:justify-end")}>
        {action}
      </div>
    </>
  );
}
