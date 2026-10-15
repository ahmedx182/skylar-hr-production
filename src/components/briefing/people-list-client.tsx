"use client";

import { ArrowRight, Mail, MapPin, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ListDensityToggle } from "@/components/briefing/list-density-toggle";
import type { ListDensity } from "@/features/preferences/layout-preferences";
import { cn } from "@/lib/utils/cn";

export type PeopleListItem = {
  id: string;
  name: string;
  jobTitle: string | null;
  employeeCode: string | null;
  email: string | null;
  location: string | null;
  summary: string | null;
  updatedAtMs: number;
  href: string;
};

type SummaryFilter = "all" | "with_summary" | "no_summary";

const summaryFilters: { value: SummaryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "with_summary", label: "Has summary" },
  { value: "no_summary", label: "No summary" },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

function formatUpdated(ms: number) {
  if (!ms) return null;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(ms);
}

function Avatar({ name, size }: { name: string; size: "sm" | "md" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-paper font-semibold text-ink",
        size === "sm" ? "size-7 text-[11px]" : "size-11 text-sm",
      )}
    >
      {initials(name)}
    </span>
  );
}

function OpenPill() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-paper/[0.08] px-3 py-1.5 text-xs font-semibold text-paper-2 transition-colors group-hover:bg-paper group-hover:text-ink">
      Open
      <ArrowRight className="size-3.5" aria-hidden="true" />
    </span>
  );
}

function ContactLine({ item }: { item: PeopleListItem }) {
  if (!item.email && !item.location) return null;
  return (
    <p className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-paper-3">
      {item.email && (
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <Mail className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{item.email}</span>
        </span>
      )}
      {item.location && (
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          {item.location}
        </span>
      )}
    </p>
  );
}

function roleLine(item: PeopleListItem) {
  return [item.jobTitle, item.employeeCode].filter(Boolean).join(" · ") || "Employee";
}

function PersonCard({ item, density }: { item: PeopleListItem; density: ListDensity }) {
  const updated = formatUpdated(item.updatedAtMs);

  if (density === "compact") {
    return (
      <Link
        href={item.href}
        className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-paper/[0.045] px-3 py-2 transition-colors hover:bg-paper/[0.075]"
      >
        <Avatar name={item.name} size="sm" />
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-sm font-semibold text-paper">{item.name}</span>
          <span className="hidden truncate text-xs text-paper-3 sm:inline">{roleLine(item)}</span>
        </span>
        <span className="flex items-center gap-3">
          {item.email && <span className="hidden max-w-56 truncate text-xs text-paper-3 lg:inline">{item.email}</span>}
          <ArrowRight className="size-4 text-paper-3 transition-colors group-hover:text-paper" aria-hidden="true" />
        </span>
      </Link>
    );
  }

  const summary = item.summary ? (
    <p className={cn("text-sm leading-6 text-paper-2", density === "grid" ? "line-clamp-3" : "line-clamp-2")}>
      {item.summary}
    </p>
  ) : (
    <p className="text-sm italic leading-6 text-paper-3">No summary saved yet.</p>
  );

  if (density === "grid") {
    return (
      <Link
        href={item.href}
        className="group flex flex-col gap-4 rounded-2xl bg-paper/[0.045] p-4 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.035)] transition-colors hover:bg-paper/[0.075]"
      >
        <span className="flex items-center gap-3">
          <Avatar name={item.name} size="md" />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-paper">{item.name}</span>
            <span className="block truncate text-xs text-paper-3">{roleLine(item)}</span>
          </span>
        </span>
        <span className="flex-1">{summary}</span>
        <span className="grid gap-3 border-t border-paper/[0.08] pt-3">
          <ContactLine item={item} />
          <span className="flex items-center justify-between gap-2">
            <span className="text-xs text-paper-3">{updated ? `Updated ${updated}` : ""}</span>
            <OpenPill />
          </span>
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      className="group grid gap-4 rounded-2xl bg-paper/[0.045] p-4 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.035)] transition-colors hover:bg-paper/[0.075] md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
    >
      <span className="flex min-w-0 gap-4">
        <Avatar name={item.name} size="md" />
        <span className="grid min-w-0 flex-1 gap-1.5">
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <span className="truncate font-semibold text-paper">{item.name}</span>
            <span className="truncate text-xs text-paper-3">{roleLine(item)}</span>
          </span>
          {summary}
          <ContactLine item={item} />
        </span>
      </span>
      <span className="flex items-center gap-3 md:flex-col md:items-end">
        {updated && <span className="text-xs text-paper-3">Updated {updated}</span>}
        <OpenPill />
      </span>
    </Link>
  );
}

export function PeopleListClient({
  items,
  initialDensity,
}: {
  items: PeopleListItem[];
  initialDensity: ListDensity;
}) {
  const [density, setDensity] = useState(initialDensity);
  const [query, setQuery] = useState("");
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>("all");

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSummary =
        summaryFilter === "all" ||
        (summaryFilter === "with_summary" && Boolean(item.summary)) ||
        (summaryFilter === "no_summary" && !item.summary);
      const matchesQuery =
        !normalizedQuery ||
        [item.name, item.jobTitle, item.employeeCode, item.email, item.location, item.summary]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesSummary && matchesQuery;
    });
  }, [items, query, summaryFilter]);
  const hasActiveFilters = Boolean(query.trim()) || summaryFilter !== "all";

  return (
    <div className="rounded-[20px] bg-ink-2/70 p-4 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.045)]">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm font-semibold text-paper">Employees</p>
        <span className="font-mono text-[11px] uppercase text-paper-3">
          {filteredItems.length} of {items.length}
        </span>
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <label className="relative block">
          <span className="sr-only">Search people</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-paper-3" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, role, email, or summary..."
            className="h-10 w-full rounded-xl border border-paper/[0.06] bg-ink/70 pl-10 pr-3 text-sm text-paper outline-none placeholder:text-paper-3 focus:border-paper/20"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-ink/70 p-1" role="group" aria-label="Filter people">
            {summaryFilters.map((filter) => {
              const isActive = summaryFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setSummaryFilter(filter.value)}
                  className={cn(
                    "h-8 rounded-lg px-3 text-xs font-semibold transition-colors",
                    isActive ? "bg-paper text-ink" : "text-paper-3 hover:text-paper",
                  )}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSummaryFilter("all");
              }}
              className="h-8 rounded-lg px-2.5 text-xs font-semibold text-paper-3 transition-colors hover:bg-paper/[0.08] hover:text-paper"
            >
              Clear
            </button>
          )}
          <ListDensityToggle value={density} onChange={setDensity} />
        </div>
      </div>

      <div
        className={cn(
          "mt-4 grid",
          density === "compact" ? "gap-1.5" : "gap-3",
          density === "grid" && "sm:grid-cols-2 2xl:grid-cols-3",
        )}
      >
        {filteredItems.length ? (
          filteredItems.map((item) => <PersonCard key={item.id} item={item} density={density} />)
        ) : (
          <div className="rounded-2xl bg-paper/[0.06] px-4 py-8 text-center sm:col-span-full">
            <p className="font-semibold text-paper">No people match that search.</p>
            <p className="mt-2 text-sm leading-6 text-paper-3">Try another name, role, email, or summary filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
