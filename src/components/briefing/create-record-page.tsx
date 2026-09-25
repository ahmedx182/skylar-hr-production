"use client";

import { ArrowLeft, CheckCircle2, FilePlus2, Lock, UserPlus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { FormEvent, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { PEOPLE_PATH } from "@/constants/routes";
import { SectionHero } from "@/components/briefing/section-hero";
import {
  createEmployeeAction,
  createNoteAction,
  type CreateActionState,
} from "@/features/briefing/create-actions";
import type { Role } from "@/types/auth";

type CreateMode = "note" | "person";
type NoteStatusDot = "amber" | "green" | "red" | "none";
type EmployeeOption = { id: string; name: string; detail: string };

function noteStatusDot(value: FormDataEntryValue | null): NoteStatusDot {
  return value === "green" || value === "red" || value === "none" ? value : "amber";
}

const content = {
  note: {
    eyebrow: "New note",
    title: "Save the context while it is still fresh.",
    body: "Use this when you need to capture a quick people note without starting a full conversation flow.",
    icon: FilePlus2,
    asideTitle: "A good note is short and useful.",
    asideItems: ["What happened", "What was agreed", "When it should return"],
  },
  person: {
    eyebrow: "New person",
    title: "Create a clean employee file.",
    body: "Start with only the details Skylar needs to keep future conversations grounded.",
    icon: UserPlus,
    asideTitle: "Admins add people carefully.",
    asideItems: ["Confirm the name", "Add useful role context", "Keep the summary factual"],
  },
} as const;

export function CreateRecordPage({
  mode,
  role,
  employees = [],
}: {
  mode: CreateMode;
  role: Role;
  employees?: EmployeeOption[];
}) {
  const [state, setState] = useState<CreateActionState | null>(null);
  const [isPending, startTransition] = useTransition();
  const canCreate = role === "admin";
  const page = content[mode];
  const Icon = canCreate ? page.icon : Lock;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate) return;

    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        const result =
          mode === "person"
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
    <section className="grid content-start gap-4">
      <SectionHero
        eyebrow={page.eyebrow}
        title={page.title}
        body={page.body}
        icon={Icon}
        action={
          <Link
            href={PEOPLE_PATH}
            className="inline-flex items-center gap-2 text-sm font-semibold text-paper transition-colors hover:text-sun"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to people
          </Link>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <form
          onSubmit={submit}
          className="rounded-[24px] bg-paper px-5 py-6 text-ink md:px-7 md:py-7"
        >
          {!canCreate && (
            <div className="mb-5 rounded-2xl bg-ink px-4 py-4 text-paper">
              <p className="font-semibold">Admin access required</p>
              <p className="mt-2 text-sm leading-6 text-paper-2">
                You can view Skylar, but creating people records is limited to admins.
              </p>
            </div>
          )}

          <div className="grid gap-4">
            {mode === "person" ? (
              <PersonFields disabled={!canCreate || isPending} />
            ) : (
              <NoteFields disabled={!canCreate || isPending} employees={employees} />
            )}
          </div>

          {state && (
            <p
              role={state.ok ? "status" : "alert"}
              className={state.ok ? "mt-5 text-sm font-semibold text-success" : "mt-5 text-sm font-semibold text-risk"}
            >
              {state.message}
            </p>
          )}

          <button
            type="submit"
            disabled={!canCreate || isPending}
            className="mt-6 h-12 w-full rounded-xl bg-ink px-4 font-semibold text-paper transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40 md:w-auto md:min-w-52"
          >
            {isPending ? "Saving..." : mode === "person" ? "Create person" : "Save note"}
          </button>
        </form>

        <aside className="grid min-h-[420px] place-items-center rounded-[24px] bg-paper/[0.06] p-5">
          <div className="w-full max-w-[320px]">
            <p className="text-sm font-semibold text-paper">{page.asideTitle}</p>
            <div className="mt-5 grid gap-3">
              {page.asideItems.map((item) => (
                <p key={item} className="flex items-start gap-3 text-sm leading-6 text-paper-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                  {item}
                </p>
              ))}
            </div>
            <div className="mt-6 rounded-2xl bg-ink px-4 py-4">
              <p className="font-mono text-xs uppercase text-paper-3">Permission</p>
              <p className="mt-2 text-sm leading-6 text-paper-2">
                Only an admin can create or add employee records. Skylar checks that on the server.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
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
        <label className="grid gap-2 text-sm font-semibold text-ink/65">
          Role
          <select
            name="jobTitle"
            defaultValue=""
            disabled={disabled}
            className="h-12 rounded-xl border border-ink/10 bg-ink/[0.04] px-3 text-ink outline-none disabled:opacity-50"
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
        <label htmlFor="employee-search-page" className="text-sm font-semibold text-ink/65">
          Employee
        </label>
        <input
          id="employee-search-page"
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
          className="h-12 rounded-xl border border-ink/10 bg-ink/[0.04] px-3 text-ink outline-none placeholder:text-ink/35 disabled:opacity-50"
        />
        {showResults && (
          <div className="max-h-44 overflow-y-auto rounded-xl border border-ink/10 bg-paper p-1 shadow-[0_18px_45px_rgba(0,0,0,0.16)]">
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
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink/70 hover:bg-ink hover:text-paper"
                >
                  <span className="block font-semibold">{employee.name}</span>
                  <span className="mt-0.5 block text-xs opacity-65">{employee.detail}</span>
                </button>
              ))
            ) : (
              <p className="px-3 py-3 text-sm text-ink/45">No employees match that search.</p>
            )}
          </div>
        )}
        {!employees.length && (
          <p className="text-xs text-ink/45">Create a person before saving a note.</p>
        )}
        {selectedEmployee && (
          <p className="text-xs text-ink/45">
            Note will be saved to {selectedEmployee.name}&apos;s employee ledger.
          </p>
        )}
      </div>
      <label className="grid gap-2 text-sm font-semibold text-ink/65">
        Follow-up state
        <select
          name="statusDot"
          defaultValue="amber"
          disabled={disabled}
          className="h-12 rounded-xl border border-ink/10 bg-ink/[0.04] px-3 text-ink outline-none disabled:opacity-50"
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
    <label className="grid gap-2 text-sm font-semibold text-ink/65">
      {label}
      <input
        {...props}
        className="h-12 rounded-xl border border-ink/10 bg-ink/[0.04] px-3 text-ink outline-none placeholder:text-ink/35 disabled:opacity-50"
      />
    </label>
  );
}

function CreateTextarea({
  label,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink/65">
      {label}
      <textarea
        {...props}
        rows={6}
        className="min-h-40 resize-y rounded-xl border border-ink/10 bg-ink/[0.04] px-3 py-3 text-ink outline-none placeholder:text-ink/35 disabled:opacity-50"
      />
    </label>
  );
}
