"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { restoreEmployeeAction, restoreNoteAction } from "@/features/briefing/create-actions";
import { cn } from "@/lib/utils/cn";

export type DeletedEmployeeItem = {
  id: string;
  name: string;
  detail: string;
  deletedLabel: string;
  daysLeft: number;
  noteCount: number;
};

export type DeletedNoteItem = {
  id: string;
  employeeName: string;
  type: string;
  snippet: string;
  deletedLabel: string;
  daysLeft: number;
};

function DaysLeft({ days }: { days: number }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", days <= 3 ? "bg-risk/15 text-risk" : "bg-paper/[0.08] text-paper-2")}>
      {days === 0 ? "Removed today" : `${days} ${days === 1 ? "day" : "days"} left`}
    </span>
  );
}

function RestoreButton({ onRestore, label }: { onRestore: () => Promise<{ ok: boolean; message: string }>; label: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function restore() {
    setError("");
    startTransition(async () => {
      const result = await onRestore();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={restore}
        disabled={isPending}
        aria-label={label}
        className="inline-flex h-9 items-center gap-2 rounded-full bg-paper/[0.08] px-4 text-xs font-semibold text-paper transition-colors hover:bg-paper hover:text-ink disabled:cursor-wait disabled:opacity-60"
      >
        <RotateCcw className={cn("size-3.5", isPending && "animate-spin [animation-direction:reverse]")} aria-hidden="true" />
        {isPending ? "Restoring..." : "Restore"}
      </button>
      {error && (
        <span role="alert" className="max-w-56 text-right text-[11px] leading-4 text-risk">
          {error}
        </span>
      )}
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="rounded-[20px] bg-ink-2/70 p-4 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.045)]">
      <p className="text-sm font-semibold text-paper">
        {title} <span className="ml-1 font-mono text-xs text-paper-3">{count}</span>
      </p>
      <div className="mt-3 grid gap-2">{children}</div>
    </section>
  );
}

export function RecentlyDeletedList({ employees, notes }: { employees: DeletedEmployeeItem[]; notes: DeletedNoteItem[] }) {
  if (employees.length === 0 && notes.length === 0) {
    return (
      <div className="rounded-[20px] bg-ink-2/70 px-6 py-14 text-center shadow-[inset_0_0_0_1px_rgba(244,239,231,0.045)]">
        <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-paper/[0.06] text-paper-3">
          <Trash2 className="size-5" aria-hidden="true" />
        </span>
        <p className="mt-4 font-semibold text-paper">Nothing has been deleted</p>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-paper-3">
          Employee files and notes you delete show up here for 30 days, so you can bring them back.
        </p>
      </div>
    );
  }

  const row = "grid gap-3 rounded-2xl bg-paper/[0.045] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center";

  return (
    <div className="grid gap-4">
      {employees.length > 0 && (
        <Section title="People" count={employees.length}>
          {employees.map((employee) => (
            <div key={employee.id} className={row}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold text-paper">{employee.name}</p>
                  <DaysLeft days={employee.daysLeft} />
                </div>
                <p className="mt-1 truncate text-sm text-paper-3">{employee.detail}</p>
                <p className="mt-1 text-xs text-paper-3">
                  Deleted {employee.deletedLabel}. Restoring also brings back {employee.noteCount} {employee.noteCount === 1 ? "note" : "notes"}.
                </p>
              </div>
              <RestoreButton label={`Restore ${employee.name}`} onRestore={() => restoreEmployeeAction(employee.id)} />
            </div>
          ))}
        </Section>
      )}

      {notes.length > 0 && (
        <Section title="Notes and conversations" count={notes.length}>
          {notes.map((note) => (
            <div key={note.id} className={row}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-paper/[0.1] px-2 py-0.5 font-mono text-[10px] uppercase text-paper-2">{note.type.replace(/_/g, " ")}</span>
                  <p className="truncate font-semibold text-paper">{note.employeeName}</p>
                  <DaysLeft days={note.daysLeft} />
                </div>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-paper-2">{note.snippet}</p>
                <p className="mt-1 text-xs text-paper-3">Deleted {note.deletedLabel}.</p>
              </div>
              <RestoreButton label={`Restore note for ${note.employeeName}`} onRestore={() => restoreNoteAction(note.id)} />
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}
