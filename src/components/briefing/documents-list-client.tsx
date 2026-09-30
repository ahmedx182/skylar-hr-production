"use client";

import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export type DocumentListItem = {
  id: string;
  label: string;
  title: string;
  body: string;
  meta: string;
  href: string;
};

const typeFilters = ["all", "conversation", "note"] as const;
type TypeFilter = (typeof typeFilters)[number];

const typeFilterLabels: Record<TypeFilter, string> = {
  all: "All",
  conversation: "Conversations",
  note: "Notes",
};

export function DocumentsListClient({ items }: { items: DocumentListItem[] }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const statusOptions = useMemo(
    () => ["all", ...Array.from(new Set(items.map((item) => item.meta).filter(Boolean))).sort()],
    [items],
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesType = typeFilter === "all" || item.label.toLowerCase() === typeFilter;
      const matchesStatus = statusFilter === "all" || item.meta === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        `${item.label} ${item.title} ${item.body} ${item.meta}`.toLowerCase().includes(normalizedQuery);

      return matchesType && matchesStatus && matchesQuery;
    });
  }, [items, query, statusFilter, typeFilter]);
  const hasActiveFilters = Boolean(query.trim()) || typeFilter !== "all" || statusFilter !== "all";

  return (
    <div className="rounded-[20px] bg-ink-2/70 p-4 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.045)]">
      <div>
        <p className="text-sm font-semibold text-paper">Recently filed records</p>
        <p className="mt-1 text-sm text-paper-3">Live ledger entries saved from employee notes and conversations.</p>
      </div>

      <div className="mt-4 rounded-2xl bg-paper/[0.045] p-2 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.045)]">
        <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <label className="relative block">
            <span className="sr-only">Search documents</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-paper-3" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search records..."
              className="h-10 w-full rounded-xl border border-transparent bg-ink/70 pl-10 pr-3 text-sm text-paper outline-none placeholder:text-paper-3 focus:border-paper/20"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-ink/70 p-1" role="group" aria-label="Filter documents by type">
              {typeFilters.map((filter) => {
                const isActive = typeFilter === filter;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setTypeFilter(filter)}
                    className={`h-8 rounded-lg px-3 text-xs font-semibold transition-colors ${
                      isActive ? "bg-paper text-ink" : "text-paper-3 hover:text-paper"
                    }`}
                  >
                    {typeFilterLabels[filter]}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-1.5" aria-label="Filter documents by status">
              {statusOptions.map((status) => {
                const isActive = statusFilter === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`h-8 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
                      isActive
                        ? "bg-sun/15 text-sun"
                        : "bg-paper/[0.04] text-paper-3 hover:bg-paper/[0.08] hover:text-paper"
                    }`}
                  >
                    {status === "all" ? "Any status" : status}
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
                  setTypeFilter("all");
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
                  <span className="rounded-full bg-sun/12 px-3 py-1 text-xs font-semibold text-sun">
                    {item.meta}
                  </span>
                </div>
                <p className="mt-3 font-semibold text-paper">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-paper-2">{item.body}</p>
              </div>
              <div className="flex items-center justify-start md:justify-end">
                <span className="inline-flex items-center gap-2 rounded-full bg-paper/[0.08] px-3 py-2 text-xs font-semibold text-paper-2 transition-colors group-hover:bg-paper group-hover:text-ink">
                  Open record
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl bg-paper/[0.06] px-4 py-8 text-center">
            <p className="font-semibold text-paper">No records match those filters.</p>
            <p className="mt-2 text-sm leading-6 text-paper-3">Try another employee, type, or status.</p>
          </div>
        )}
      </div>
    </div>
  );
}
