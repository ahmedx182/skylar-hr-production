"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { TriangleAlert } from "lucide-react";
import { DELETION_GRACE_DAYS } from "@/features/platform/lifecycle";
import { displayName, type DirectoryUser } from "@/features/platform/users";
import { cn } from "@/lib/utils/cn";

export type UserDialogAction = "suspend" | "unsuspend" | "delete" | "restore" | "grant_admin" | "revoke_admin";

type Copy = { title: string; body: string; confirm: string; reasonLabel: string; reasonRequired: boolean; needsEmail?: boolean; danger?: boolean };

const copy: Record<UserDialogAction, Copy> = {
  suspend: {
    title: "Suspend this account?",
    body: "They are signed out right away and can't sign in until you restore access. Their workspace and data are untouched.",
    confirm: "Suspend account",
    reasonLabel: "Reason (shown in the audit log)",
    reasonRequired: true,
    danger: true,
  },
  unsuspend: {
    title: "Restore access?",
    body: "They can sign in again immediately.",
    confirm: "Restore access",
    reasonLabel: "Note (optional)",
    reasonRequired: false,
  },
  delete: {
    title: "Delete this account?",
    body: `The account is disabled now and can be restored for ${DELETION_GRACE_DAYS} days. After that the account and its sign-in are permanently erased. Their workspace's notes and employee files are not deleted.`,
    confirm: "Delete account",
    reasonLabel: "Reason (shown in the audit log)",
    reasonRequired: true,
    needsEmail: true,
    danger: true,
  },
  restore: {
    title: "Restore this account?",
    body: "The account is brought back with its previous access.",
    confirm: "Restore account",
    reasonLabel: "Note (optional)",
    reasonRequired: false,
  },
  grant_admin: {
    title: "Make this person a super admin?",
    body: "They get the platform console: every workspace, user, package and billing setting across Skylar. It applies on their next page load.",
    confirm: "Make super admin",
    reasonLabel: "Reason (shown in the audit log)",
    reasonRequired: true,
    danger: true,
  },
  revoke_admin: {
    title: "Remove super admin access?",
    body: "They lose the platform console on their next page load. Their own workspace access is unchanged.",
    confirm: "Remove super admin",
    reasonLabel: "Note (optional)",
    reasonRequired: false,
  },
};

export function UserActionDialog({ user, action, onClose }: { user: DirectoryUser; action: UserDialogAction; onClose: () => void }) {
  const router = useRouter();
  const details = copy[action];
  const [reason, setReason] = useState("");
  const [typedEmail, setTypedEmail] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();
  const busy = isSaving || isRefreshing;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onClose]);

  const warning =
    (action === "suspend" || action === "delete") && (user.isOwner || user.isOnlyAdmin)
      ? user.isOwner
        ? `${displayName(user)} owns ${user.workspaceName}. ${user.isOnlyAdmin ? "They are its only admin, so nobody will be able to manage it." : "Other admins can still manage it."}`
        : `${displayName(user)} is the only admin of ${user.workspaceName}, so nobody will be able to manage it.`
      : null;

  async function submit() {
    if (details.reasonRequired && reason.trim().length < 3) return setError("Add a short reason so the team knows why.");
    if (details.needsEmail && typedEmail.trim().toLowerCase() !== user.email.toLowerCase()) return setError("Type the account's email exactly to confirm.");

    setIsSaving(true);
    setError("");
    try {
      const isAdminChange = action === "grant_admin" || action === "revoke_admin";
      const response = await fetch(isAdminChange ? "/api/platform/admins" : `/api/platform/users/${encodeURIComponent(user.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isAdminChange
            ? { action: action === "grant_admin" ? "grant" : "revoke", email: user.email, reason: reason.trim() || undefined }
            : { action, reason: reason.trim() || undefined, confirmEmail: details.needsEmail ? typedEmail.trim() : undefined },
        ),
      });
      const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message ?? "That change could not be saved.");
      onClose();
      startRefresh(() => router.refresh());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That change could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  const input = "rounded-lg border border-paper/10 bg-ink px-3 text-sm font-normal text-paper outline-none placeholder:text-paper-3 focus:border-paper/30";

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center px-4" role="dialog" aria-modal="true" aria-label={details.title}>
      <button type="button" aria-label="Close" tabIndex={-1} onClick={() => !busy && onClose()} className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-md rounded-[20px] bg-ink-2 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.5)] ring-1 ring-paper/[0.08]">
        <p className="text-base font-semibold text-paper">{details.title}</p>
        <p className="mt-1 text-sm leading-6 text-paper-2">
          <span className="font-semibold text-paper">{user.email}</span>: {details.body}
        </p>

        {warning && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-sun/10 px-3 py-2 text-sm leading-5 text-paper">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-sun" aria-hidden="true" />
            {warning}
          </p>
        )}

        <label className="mt-4 grid gap-1.5 text-xs font-semibold text-paper-3">
          {details.reasonLabel}
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={2} autoFocus className={cn(input, "py-2")} />
        </label>

        {details.needsEmail && (
          <label className="mt-3 grid gap-1.5 text-xs font-semibold text-paper-3">
            Type <span className="font-mono text-paper">{user.email}</span> to confirm
            <input value={typedEmail} onChange={(event) => setTypedEmail(event.target.value)} autoComplete="off" spellCheck={false} className={cn(input, "h-10")} />
          </label>
        )}

        {error && <p className="mt-3 text-sm text-risk">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={onClose} className="inline-flex h-9 items-center rounded-full px-4 text-xs font-semibold text-paper-2 hover:bg-paper/[0.06] hover:text-paper disabled:opacity-60">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className={cn("inline-flex h-9 items-center rounded-full px-4 text-xs font-semibold transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60", details.danger ? "bg-risk text-paper" : "bg-paper text-ink")}
          >
            {busy ? "Saving..." : details.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
