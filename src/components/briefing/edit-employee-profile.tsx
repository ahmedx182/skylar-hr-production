"use client";

import { Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import {
  updateEmployeeAction,
  type CreateActionState,
} from "@/features/briefing/create-actions";

type EmployeeProfileDraft = {
  id: string;
  name: string;
  email: string | null;
  jobTitle: string | null;
  location: string | null;
  summary: string | null;
};

export function EditEmployeeProfile({
  employee,
}: {
  employee: EmployeeProfileDraft;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [state, setState] = useState<CreateActionState | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await updateEmployeeAction({
        employeeId: employee.id,
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        jobTitle: String(formData.get("jobTitle") ?? ""),
        location: String(formData.get("location") ?? ""),
        summary: String(formData.get("summary") ?? ""),
      });

      setState(result);
      if (result.ok) {
        router.refresh();
        setIsOpen(false);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setState(null);
          setIsOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-full bg-paper/[0.075] px-3 py-2 text-sm font-semibold text-paper-2 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.05)] hover:bg-paper hover:text-ink"
      >
        <Pencil className="size-4" aria-hidden="true" />
        Edit profile
      </button>

      {isOpen && isMounted && createPortal(
        <div className="fixed inset-0 z-[160] grid place-items-center overflow-y-auto bg-ink/52 px-4 py-6">
          <section className="flex max-h-[calc(100dvh-3rem)] w-full max-w-[560px] flex-col overflow-hidden rounded-[26px] bg-ink-2 shadow-[0_28px_90px_rgba(0,0,0,0.56),inset_0_0_0_1px_rgba(244,239,231,0.055),inset_0_1px_0_rgba(244,239,231,0.08)]">
            <header className="flex items-start justify-between gap-4 border-b border-paper/[0.055] px-5 py-5">
              <div>
                <p className="font-mono text-xs uppercase text-sun">Edit employee</p>
                <h2 className="mt-2 text-2xl font-semibold text-paper">Update profile details.</h2>
                <p className="mt-2 text-sm leading-6 text-paper-2">
                  Keep the employee file, work email, and role context current.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-paper/[0.045] text-paper-2 hover:bg-paper hover:text-ink"
                aria-label="Close edit profile"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </header>

            <form onSubmit={submit} className="grid gap-4 overflow-y-auto px-5 py-5">
              <label className="grid gap-2 text-sm font-semibold text-paper-2">
                Employee name
                <input
                  name="name"
                  defaultValue={employee.name}
                  required
                  disabled={isPending}
                  className="h-11 rounded-xl border border-paper/[0.055] bg-paper/[0.04] px-3 text-paper outline-none shadow-[inset_0_1px_0_rgba(244,239,231,0.035)]"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-paper-2">
                Work email
                <input
                  name="email"
                  type="email"
                  defaultValue={employee.email ?? ""}
                  disabled={isPending}
                  placeholder="name@company.com"
                  className="h-11 rounded-xl border border-paper/[0.055] bg-paper/[0.04] px-3 text-paper outline-none shadow-[inset_0_1px_0_rgba(244,239,231,0.035)] placeholder:text-paper-3"
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-paper-2">
                  Role
                  <select
                    name="jobTitle"
                    defaultValue={employee.jobTitle ?? ""}
                    disabled={isPending}
                    className="h-11 rounded-xl border border-paper/[0.055] bg-paper/[0.04] px-3 text-paper outline-none shadow-[inset_0_1px_0_rgba(244,239,231,0.035)] transition-colors focus:border-paper/18 disabled:opacity-50"
                  >
                    <option value="">Select role</option>
                    <option value="Customer Success Lead">Customer Success Lead</option>
                    <option value="Operations Manager">Operations Manager</option>
                    <option value="Product Designer">Product Designer</option>
                    <option value="Sales Manager">Sales Manager</option>
                    <option value="People Operations">People Operations</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-semibold text-paper-2">
                  Location
                  <input
                    name="location"
                    defaultValue={employee.location ?? ""}
                    disabled={isPending}
                    placeholder="Remote, Lahore..."
                    className="h-11 rounded-xl border border-paper/[0.055] bg-paper/[0.04] px-3 text-paper outline-none shadow-[inset_0_1px_0_rgba(244,239,231,0.035)] placeholder:text-paper-3"
                  />
                </label>
              </div>
              <label className="grid gap-2 text-sm font-semibold text-paper-2">
                Summary
                <textarea
                  name="summary"
                  defaultValue={employee.summary ?? ""}
                  disabled={isPending}
                  rows={3}
                  className="min-h-24 resize-y rounded-xl border border-paper/[0.055] bg-paper/[0.04] px-3 py-3 text-paper outline-none shadow-[inset_0_1px_0_rgba(244,239,231,0.035)]"
                />
              </label>

              {state && !state.ok && (
                <p role="alert" className="text-sm font-semibold text-risk">
                  {state.message}
                </p>
              )}
              <button
                type="submit"
                disabled={isPending}
                className="h-12 rounded-xl bg-paper px-4 font-semibold text-ink transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save profile"}
              </button>
            </form>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
