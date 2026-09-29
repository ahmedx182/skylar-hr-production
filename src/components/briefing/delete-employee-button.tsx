"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteEmployeeAction } from "@/features/briefing/create-actions";

export function DeleteEmployeeButton({ employeeId, employeeName }: { employeeId: string; employeeName: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  function removeEmployee() {
    setError("");
    startTransition(async () => {
      const result = await deleteEmployeeAction(employeeId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push("/people");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setIsConfirmingDelete(true)}
        disabled={isPending}
        title="Delete employee file"
        aria-label={`Delete ${employeeName}'s employee file`}
        className="inline-flex size-10 items-center justify-center rounded-full bg-risk/[0.08] text-risk transition-colors hover:bg-risk hover:text-paper disabled:opacity-50"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
      {error && <span role="alert" className="text-xs text-risk">{error}</span>}
      {isConfirmingDelete && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/70 px-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-employee-title"
            className="w-full max-w-md rounded-2xl bg-paper px-5 py-5 text-ink shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
          >
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-risk/[0.08] text-risk">
                <Trash2 className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p id="delete-employee-title" className="text-lg font-semibold">
                  Delete {employeeName}&apos;s file?
                </p>
                <p className="mt-2 text-sm leading-6 text-ink/60">
                  This removes the employee profile and every saved note attached to it. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isPending}
                className="inline-flex h-10 items-center justify-center rounded-full border border-ink/10 px-4 text-sm font-semibold text-ink/65 transition-colors hover:bg-ink/[0.05] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={removeEmployee}
                disabled={isPending}
                className="inline-flex h-10 items-center justify-center rounded-full bg-risk px-4 text-sm font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? "Deleting..." : "Delete file"}
              </button>
            </div>
            {error && <p role="alert" className="mt-4 text-sm font-semibold text-risk">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
