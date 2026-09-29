"use client";

import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export type PeopleListItem = {
  id: string;
  label: string;
  title: string;
  body: string;
  meta: string;
  href: string;
};

type StatusFilter = "all" | "open" | "file";

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "file", label: "File" },
];

export function PeopleListClient({ items }: { items: PeopleListItem[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.label.toLowerCase() === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        `${item.label} ${item.title} ${item.body} ${item.meta}`.toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [items, query, statusFilter]);
  const hasActiveFilters = Boolean(query.trim()) || statusFilter !== "all";

  return (
    <div className="rounded-[20px] bg-ink-2/70 p-4 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.045)]">
      <div>
        <div>
          <p className="text-sm font-semibold text-paper">Recent employee files</p>
          <p className="mt-1 text-sm text-paper-3">Live employee records from your company workspace.</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-paper/[0.045] p-2 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.045)]">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <label className="relative block">
            <span className="sr-only">Search people</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-paper-3" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search people..."
              className="h-10 w-full rounded-xl border border-transparent bg-ink/70 pl-10 pr-3 text-sm text-paper outline-none placeholder:text-paper-3 focus:border-paper/20"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-ink/70 p-1" role="group" aria-label="Filter people">
              {statusFilters.map((filter) => {
                const isActive = statusFilter === filter.value;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setStatusFilter(filter.value)}
                    className={`h-8 rounded-lg px-3 text-xs font-semibold transition-colors ${
                      isActive ? "bg-paper text-ink" : "text-paper-3 hover:text-paper"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
            <span className="rounded-lg px-2 font-mono text-[11px] uppercase text-paper-3">
              {filteredItems.length}/{items.length}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("all");
                }}
                className="h-8 rounded-lg px-2.5 text-xs font-semibold text-paper-3 transition-colors hover:bg-paper/[0.08] hover:text-paper"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {filteredItems.length ? (
          filteredItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="group grid gap-4 rounded-[14px] bg-paper/[0.045] px-4 py-4 text-left shadow-[inset_0_0_0_1px_rgba(244,239,231,0.035),inset_0_1px_0_rgba(244,239,231,0.04)] transition-colors hover:bg-paper/[0.075] md:grid-cols-[minmax(0,1fr)_170px] md:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-paper/[0.10] px-3 py-1 font-mono text-[11px] uppercase text-paper-2 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.05)]">
                    {item.label}
                  </span>
                  <span className="text-xs font-semibold text-paper-2">{item.meta}</span>
                </div>
                <p className="mt-3 font-semibold text-paper">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-paper-2">{item.body}</p>
              </div>
              <div className="flex items-center justify-start md:justify-end">
                <span className="inline-flex items-center gap-2 rounded-full bg-paper/[0.08] px-3 py-2 text-xs font-semibold text-paper-2 transition-colors group-hover:bg-paper group-hover:text-ink">
                  Open profile
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl bg-paper/[0.06] px-4 py-8 text-center">
            <p className="font-semibold text-paper">No people match that search.</p>
            <p className="mt-2 text-sm leading-6 text-paper-3">Try another name, email, role, or file status.</p>
          </div>
        )}
      </div>
    </div>
  );
}
