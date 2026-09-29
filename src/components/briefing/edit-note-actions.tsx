"use client";

import { Pencil, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteNoteAction, updateNoteAction } from "@/features/briefing/create-actions";

type NoteStatus = "amber" | "green" | "red" | "none";

export function EditNoteActions({
  noteId,
  employeeId,
  description,
  statusDot,
}: {
  noteId: string;
  employeeId: string;
  description: string;
  statusDot: NoteStatus;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(description);
  const [status, setStatus] = useState<NoteStatus>(statusDot);
  const [error, setError] = useState("");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function save() {
    setError("");
    startTransition(async () => {
      const result = await updateNoteAction({ ledgerEntryId: noteId, note: draft, statusDot: status });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setIsEditing(false);
      router.refresh();
    });
  }

  function remove() {
    setError("");
    startTransition(async () => {
      const result = await deleteNoteAction(noteId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push(`/people/${employeeId}`);
      router.refresh();
    });
  }

  if (isEditing) {
    return (
      <div className="grid gap-3 border-t border-ink/10 pt-5">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={isPending}
          rows={6}
          className="w-full resize-y border-b-2 border-ink/15 bg-transparent px-0 py-2 text-lg leading-8 text-ink outline-none placeholder:text-ink/35 focus:border-ink"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-ink/65">
            State
            <select value={status} onChange={(event) => setStatus(event.target.value as NoteStatus)} disabled={isPending} className="h-10 rounded-lg border border-ink/10 bg-transparent px-2 text-ink">
              <option value="amber">Needs follow-up</option>
              <option value="green">Resolved</option>
              <option value="red">Needs review</option>
              <option value="none">No marker</option>
            </select>
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setIsEditing(false)} disabled={isPending} className="inline-flex h-10 items-center gap-2 px-3 text-sm font-semibold text-ink/60 hover:text-ink">
              <X className="size-4" aria-hidden="true" /> Cancel
            </button>
            <button type="button" onClick={save} disabled={isPending} className="inline-flex h-10 items-center gap-2 bg-ink px-4 text-sm font-semibold text-paper disabled:opacity-50">
              <Save className="size-4" aria-hidden="true" /> {isPending ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
        {error && <p role="alert" className="text-sm font-semibold text-risk">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button type="button" onClick={() => setIsEditing(true)} className="inline-flex h-9 items-center gap-2 rounded-full border border-ink/10 bg-ink/[0.035] px-3 text-xs font-semibold text-ink/70 transition-colors hover:bg-ink hover:text-paper">
        <Pencil className="size-4" aria-hidden="true" /> Edit note
      </button>
      <button type="button" onClick={() => setIsConfirmingDelete(true)} disabled={isPending} className="inline-flex h-9 items-center gap-2 rounded-full border border-risk/15 bg-risk/[0.06] px-3 text-xs font-semibold text-risk transition-colors hover:bg-risk hover:text-paper disabled:opacity-50">
        <Trash2 className="size-4" aria-hidden="true" /> Delete note
      </button>
      {error && <p role="alert" className="basis-full text-sm font-semibold text-risk">{error}</p>}
      {isConfirmingDelete && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/70 px-4">
          <div role="alertdialog" aria-modal="true" aria-labelledby="delete-note-title" className="w-full max-w-sm rounded-2xl bg-paper px-5 py-5 text-ink shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <p id="delete-note-title" className="text-lg font-semibold">Delete this note?</p>
            <p className="mt-2 text-sm leading-6 text-ink/60">
              This removes the saved ledger entry from the employee history. This cannot be undone.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
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
                onClick={remove}
                disabled={isPending}
                className="inline-flex h-10 items-center justify-center rounded-full bg-risk px-4 text-sm font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? "Deleting..." : "Delete note"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
