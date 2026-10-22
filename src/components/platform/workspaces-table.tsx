"use client";

import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { WorkspacePlanBadge, WorkspaceStatusBadge } from "@/components/platform/workspace-badges";
import { PLATFORM_WORKSPACES_PATH } from "@/constants/routes";
import { formatCount, formatDate, formatRelative } from "@/features/platform/format";
import { cn } from "@/lib/utils/cn";
import type { WorkspaceRow } from "@/server/repositories/platform.repository";

type StatusFilter = "all" | "active" | "blocked" | "deleted";
type PlanFilter = "all" | "paid" | "granted" | "free";
type SortKey = "newest" | "activity" | "users" | "records";

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "blocked", label: "Suspended" },
  { value: "deleted", label: "Deleted" },
];

const planFilters: { value: PlanFilter; label: string }[] = [
  { value: "all", label: "Any plan" },
  { value: "paid", label: "Paid" },
  { value: "granted", label: "Gifted" },
  { value: "free", label: "Free" },
];

const sorts: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "activity", label: "Last active" },
  { value: "users", label: "Most users" },
  { value: "records", label: "Most records" },
];

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-xl bg-ink/70 p-1" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-8 rounded-lg px-3 text-xs font-semibold transition-colors",
            value === option.value ? "bg-paper text-ink" : "text-paper-3 hover:text-paper",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function WorkspacesTable({ rows }: { rows: WorkspaceRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [plan, setPlan] = useState<PlanFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      // Deleted workspaces only appear when asked for, so they never crowd the working list.
      .filter((row) => (status === "all" ? row.status !== "deleted" : row.status === status))
      .filter((row) => {
        if (plan === "all") return true;
        if (plan === "granted") return row.planOverride === "paid" || row.giftActive;
        if (plan === "paid") return row.plan === "paid";
        return row.plan === "free";
      })
      .filter((row) => !q || `${row.name} ${row.ownerEmail ?? ""} ${row.id}`.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sort === "activity") return (b.lastActivityMs ?? 0) - (a.lastActivityMs ?? 0);
        if (sort === "users") return b.userCount - a.userCount;
        if (sort === "records") return b.recordCount - a.recordCount;
        return (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0);
      });
  }, [plan, query, rows, sort, status]);

  return (
    <div className="rounded-[20px] bg-ink-2/70 p-4 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.045)]">
      <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <label className="relative block">
          <span className="sr-only">Search workspaces</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-paper-3" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by workspace name, owner email, or ID..."
            className="h-10 w-full rounded-xl border border-paper/[0.06] bg-ink/70 pl-10 pr-3 text-sm text-paper outline-none placeholder:text-paper-3 focus:border-paper/20"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented label="Filter by status" options={statusFilters} value={status} onChange={setStatus} />
          <Segmented label="Filter by plan" options={planFilters} value={plan} onChange={setPlan} />
          <label className="flex items-center gap-2 text-xs text-paper-3">
            Sort
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="h-10 rounded-xl border border-paper/[0.06] bg-ink/70 px-3 text-xs font-semibold text-paper outline-none focus:border-paper/20"
            >
              {sorts.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <p className="mt-3 font-mono text-[11px] uppercase text-paper-3">
        {visible.length} of {rows.length} workspaces
      </p>

      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="text-xs text-paper-3">
              <th className="px-3 py-2 font-medium">Workspace</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Plan</th>
              <th className="px-3 py-2 text-right font-medium">Users</th>
              <th className="px-3 py-2 text-right font-medium">Employees</th>
              <th className="px-3 py-2 text-right font-medium">Records</th>
              <th className="px-3 py-2 text-right font-medium">Open cases</th>
              <th className="px-3 py-2 font-medium">Last active</th>
              <th className="px-3 py-2 font-medium">Created</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id} className="group border-t border-paper/[0.06] hover:bg-paper/[0.035]">
                <td className="max-w-[260px] px-3 py-2.5">
                  <Link href={`${PLATFORM_WORKSPACES_PATH}/${row.id}`} className="block min-w-0">
                    <span className="block truncate font-semibold text-paper">{row.name}</span>
                    <span className="block truncate text-xs text-paper-3">{row.ownerEmail ?? "Owner unknown"}</span>
                  </Link>
                </td>
                <td className="px-3 py-2.5"><WorkspaceStatusBadge status={row.status} /></td>
                <td className="px-3 py-2.5"><WorkspacePlanBadge row={row} /></td>
                <td className="px-3 py-2.5 text-right tabular-nums text-paper-2">{formatCount(row.userCount)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-paper-2">{formatCount(row.employeeRecordCount)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-paper-2">{formatCount(row.recordCount)}</td>
                <td className={cn("px-3 py-2.5 text-right tabular-nums", row.openEscalations > 0 ? "font-semibold text-risk" : "text-paper-2")}>
                  {formatCount(row.openEscalations)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-paper-2">{formatRelative(row.lastActivityMs)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-paper-3">{formatDate(row.createdAtMs)}</td>
                <td className="px-3 py-2.5 text-right">
                  <Link
                    href={`${PLATFORM_WORKSPACES_PATH}/${row.id}`}
                    aria-label={`Manage ${row.name}`}
                    className="inline-flex items-center gap-1 rounded-full bg-paper/[0.06] px-3 py-1.5 text-xs font-semibold text-paper-2 transition-colors hover:bg-paper hover:text-ink"
                  >
                    Manage
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <div className="rounded-2xl bg-paper/[0.04] px-4 py-8 text-center">
            <p className="font-semibold text-paper">No workspaces match those filters.</p>
            <p className="mt-1 text-sm text-paper-3">Try a different search, status, or plan.</p>
          </div>
        )}
      </div>
    </div>
  );
}
