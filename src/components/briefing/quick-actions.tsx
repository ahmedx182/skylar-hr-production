"use client";

import { FilePlus2, Lock, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import type { FormEvent, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { DOCUMENTS_PATH, PEOPLE_PATH } from "@/constants/routes";
import {
  createEmployeeAction,
  createNoteAction,
  type CreateActionState,
} from "@/features/briefing/create-actions";
import type { Role } from "@/types/auth";

const actions = [
  {
    id: "note",
    label: "New note",
    description: "Save context",
    icon: FilePlus2,
  },
  {
    id: "person",
    label: "New person",
    description: "Create file",
    icon: UserPlus,
  },
] as const;

type ActionId = (typeof actions)[number]["id"];
type NoteStatusDot = "amber" | "green" | "red" | "none";
type EmployeeOption = { id: string; name: string; detail: string };

function noteStatusDot(value: FormDataEntryValue | null): NoteStatusDot {
  return value === "green" || value === "red" || value === "none" ? value : "amber";
}

export function QuickActions({ role, employees }: { role: Role; employees: EmployeeOption[] }) {
  const [activeAction, setActiveAction] = useState<ActionId | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const canCreate = role === "admin";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div>
      <p className="text-xs font-semibold uppercase text-paper-3">Create</p>
      <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-1">
        {actions.map((action) => {
          const Icon = canCreate ? action.icon : Lock;

          return (
            <button
              key={action.id}
              type="button"
              disabled={!canCreate}
              onClick={() => setActiveAction(action.id)}
              className="group rounded-2xl bg-paper/[0.06] px-3 py-3 text-left transition-colors hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:bg-paper/[0.04] disabled:opacity-70"
            >
              <span className="grid size-8 place-items-center rounded-xl bg-ink/20 text-paper-2 group-hover:bg-ink group-hover:text-paper">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="mt-3 block truncate text-sm font-semibold">{action.label}</span>
              <span className="mt-0.5 block truncate text-xs text-paper-3 group-hover:text-ink/55">
                {canCreate ? action.description : "Admin only"}
              </span>
            </button>
          );
        })}
      </div>

      {activeAction &&
        isMounted &&
        createPortal(
          <QuickCreateDialog
            mode={activeAction}
            employees={employees}
            onClose={() => setActiveAction(null)}
          />,
          document.body,
        )}
    </div>
  );
}

function QuickCreateDialog({
  mode,
  employees,
  onClose,
}: {
  mode: ActionId;
  employees: EmployeeOption[];
  onClose: () => void;
}) {
  const [state, setState] = useState<CreateActionState | null>(null);
  const [isPending, startTransition] = useTransition();
  const isPerson = mode === "person";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        const result = isPerson
          ? await createEmployeeAction({
              name: String(formData.get("name") ?? ""),
              email: String(formData.get("email") ?? ""),
              jobTitle: String(formData.get("jobTitle") ?? ""),
              location: String(formData.get("location") ?? ""),
              summary: String(formData.get("summary") ?? ""),
            })
          : await createNoteAction({
              employeeId: String(formData.get("employeeId") ?? ""),
              note: String(formData.get("note") ?? ""),
              statusDot: noteStatusDot(formData.get("statusDot")),
            });

        if (!result) {
          setState({ ok: false, message: "Skylar could not save this yet. Try again." });
          return;
        }

        setState(result);
        if (result.ok) form.reset();
      } catch {
        setState({ ok: false, message: "Skylar could not save this yet. Try again." });
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/52 px-4 py-6">
      <section className="flex max-h-[calc(100dvh-3rem)] w-full max-w-[560px] flex-col overflow-hidden rounded-[26px] bg-ink-2 shadow-[0_28px_90px_rgba(0,0,0,0.56),inset_0_0_0_1px_rgba(244,239,231,0.055),inset_0_1px_0_rgba(244,239,231,0.08)]">
        <header className="flex items-start justify-between gap-4 border-b border-paper/[0.055] px-5 py-5">
          <div>
            <p className="font-mono text-xs uppercase text-sun">{isPerson ? "New person" : "New note"}</p>
            <h2 className="mt-2 text-2xl font-semibold text-paper">
              {isPerson ? "Add someone to Skylar." : "Save a useful note."}
            </h2>
            <p className="mt-2 text-sm leading-6 text-paper-2">
              {isPerson
                ? "Create the employee file, work email, and login access in one step."
                : "Choose a person, capture the useful context, and keep it attached to their file."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-paper/[0.045] text-paper-2 transition-colors hover:bg-paper hover:text-ink"
            aria-label="Close create dialog"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={submit} className="grid gap-4 overflow-y-auto px-5 py-5">
          {isPerson ? (
            <PersonFields disabled={isPending} />
          ) : (
            <NoteFields disabled={isPending} employees={employees} />
          )}

          {state && (
            <div
              role={state.ok ? "status" : "alert"}
            className={state.ok ? "rounded-2xl bg-success/10 px-4 py-3 text-sm text-success" : "rounded-2xl bg-risk/10 px-4 py-3 text-sm text-risk"}
            >
              <p className="font-semibold">{state.message}</p>
              {state.ok && (
                <Link
                  href={isPerson ? PEOPLE_PATH : DOCUMENTS_PATH}
                  onClick={onClose}
                  className="mt-2 inline-flex text-paper underline underline-offset-4"
                >
                  View {isPerson ? "People" : "Documents"}
                </Link>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="h-12 rounded-xl bg-paper px-4 font-semibold text-ink transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
          >
            {isPending ? "Saving..." : isPerson ? "Create person" : "Save note"}
          </button>
        </form>
      </section>
    </div>
  );
}

function PersonFields({ disabled }: { disabled: boolean }) {
  return (
    <>
      <CreateInput name="name" label="Employee name" placeholder="Maya Chen" disabled={disabled} required />
      <CreateInput
        name="email"
        label="Work email"
        placeholder="maya@company.com"
        type="email"
        disabled={disabled}
        required
      />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-paper-2">
          Role
          <select
            name="jobTitle"
            defaultValue=""
            disabled={disabled}
            className="h-11 rounded-xl border border-paper/[0.055] bg-paper/[0.04] px-3 text-paper outline-none shadow-[inset_0_1px_0_rgba(244,239,231,0.035)] transition-colors focus:border-paper/18 disabled:opacity-50"
          >
            <option value="" disabled>
              Select role
            </option>
            <option value="Customer Success Lead">Customer Success Lead</option>
            <option value="Operations Manager">Operations Manager</option>
            <option value="Product Designer">Product Designer</option>
            <option value="Sales Manager">Sales Manager</option>
            <option value="People Operations">People Operations</option>
            <option value="Other">Other</option>
          </select>
        </label>
        <CreateInput name="location" label="Location" placeholder="Remote, Lahore, Austin..." disabled={disabled} />
      </div>
      <CreateTextarea
        name="summary"
        label="Opening summary"
        placeholder="Short context that should live on the file."
        disabled={disabled}
      />
    </>
  );
}

function NoteFields({
  disabled,
  employees,
}: {
  disabled: boolean;
  employees: EmployeeOption[];
}) {
  const [query, setQuery] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const filteredEmployees = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return employees.slice(0, 8);
    return employees.filter((employee) =>
      `${employee.name} ${employee.detail}`.toLowerCase().includes(normalized),
    );
  }, [employees, query]);
  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId);
  const showResults = isSearching && employees.length > 0;

  return (
    <>
      <input type="hidden" name="employeeId" value={selectedEmployeeId} />
      <div className="grid gap-2">
        <label htmlFor="employee-search" className="text-sm font-semibold text-paper-2">
          Employee
        </label>
        <input
          id="employee-search"
          type="search"
          value={query}
          onFocus={() => setIsSearching(true)}
          onBlur={() => setIsSearching(false)}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedEmployeeId("");
            setIsSearching(true);
          }}
          placeholder="Search employees..."
          disabled={disabled || employees.length === 0}
          className="h-11 rounded-xl border border-paper/[0.055] bg-paper/[0.04] px-3 text-paper outline-none shadow-[inset_0_1px_0_rgba(244,239,231,0.035)] transition-colors placeholder:text-paper-3 focus:border-paper/18 disabled:opacity-50"
        />
        {showResults && (
          <div className="max-h-40 overflow-y-auto rounded-xl border border-paper/10 bg-ink p-1 shadow-[0_18px_45px_rgba(0,0,0,0.36)]">
            {filteredEmployees.length ? (
              filteredEmployees.map((employee) => (
                <button
                  key={employee.id}
                  type="button"
                  disabled={disabled}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setSelectedEmployeeId(employee.id);
                    setQuery(employee.name);
                    setIsSearching(false);
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-paper-2 hover:bg-paper hover:text-ink"
                >
                  <span className="block font-semibold">{employee.name}</span>
                  <span className="mt-0.5 block text-xs opacity-65">{employee.detail}</span>
                </button>
              ))
            ) : (
              <p className="px-3 py-3 text-sm text-paper-3">No employees match that search.</p>
            )}
          </div>
        )}
        {!employees.length && (
          <p className="text-xs text-paper-3">Create a person before saving a note.</p>
        )}
        {selectedEmployee && (
          <p className="text-xs text-paper-3">
            Note will be saved to {selectedEmployee.name}&apos;s employee ledger.
          </p>
        )}
      </div>
      <label className="grid gap-2 text-sm font-semibold text-paper-2">
        Follow-up state
        <select
          name="statusDot"
          defaultValue="amber"
          disabled={disabled}
          className="h-11 rounded-xl border border-paper/[0.055] bg-paper/[0.04] px-3 text-paper outline-none shadow-[inset_0_1px_0_rgba(244,239,231,0.035)] transition-colors focus:border-paper/18 disabled:opacity-50"
        >
          <option value="amber">Needs follow-up</option>
          <option value="green">Resolved</option>
          <option value="red">Needs review</option>
          <option value="none">No marker</option>
        </select>
      </label>
      <CreateTextarea
        name="note"
        label="Note"
        placeholder="What happened, what was agreed, and the next small step."
        disabled={disabled}
        required
      />
    </>
  );
}

function CreateInput({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-paper-2">
      {label}
      <input
        {...props}
        className="h-11 rounded-xl border border-paper/[0.055] bg-paper/[0.04] px-3 text-paper outline-none shadow-[inset_0_1px_0_rgba(244,239,231,0.035)] transition-colors placeholder:text-paper-3 focus:border-paper/18 disabled:opacity-50"
      />
    </label>
  );
}

function CreateTextarea({
  label,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-paper-2">
      {label}
      <textarea
        {...props}
        rows={4}
        className="min-h-28 resize-y rounded-xl border border-paper/[0.055] bg-paper/[0.04] px-3 py-3 text-paper outline-none shadow-[inset_0_1px_0_rgba(244,239,231,0.035)] transition-colors placeholder:text-paper-3 focus:border-paper/18 disabled:opacity-50"
      />
    </label>
  );
}
