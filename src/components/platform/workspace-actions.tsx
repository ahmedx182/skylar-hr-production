"use client";

import { Ban, Gift, RotateCcw, ShieldCheck, Trash2, Undo2, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PLATFORM_WORKSPACES_PATH } from "@/constants/routes";
import { DELETION_GRACE_DAYS } from "@/features/platform/lifecycle";
import { cn } from "@/lib/utils/cn";

type Action = "block" | "unblock" | "grant_paid" | "revoke_paid" | "delete" | "restore_workspace" | "purge";

type ActionCopy = {
  title: string;
  body: string;
  confirm: string;
  reasonLabel: string | null;
  reasonRequired: boolean;
  /** The admin must type the workspace name before this runs. */
  needsName?: boolean;
  danger?: boolean;
};

const copy: Record<Action, ActionCopy> = {
  block: {
    title: "Suspend this workspace?",
    body: "Everyone in it is signed out on their next request and can't sign back in until you restore it. No data is deleted.",
    confirm: "Suspend workspace",
    reasonLabel: "Reason (shown in the audit log)",
    reasonRequired: true,
  },
  unblock: {
    title: "Restore access?",
    body: "Members can sign in and use the workspace again immediately.",
    confirm: "Restore access",
    reasonLabel: "Note (optional)",
    reasonRequired: false,
  },
  grant_paid: {
    title: "Grant paid access?",
    body: "The workspace gets unlimited advisor messages without a Stripe subscription. It won't be charged.",
    confirm: "Grant paid access",
    reasonLabel: "Note (optional, e.g. pilot customer until June)",
    reasonRequired: false,
  },
  revoke_paid: {
    title: "Revoke granted access?",
    body: "The workspace returns to its Stripe plan, or to Free if it has no subscription.",
    confirm: "Revoke access",
    reasonLabel: "Note (optional)",
    reasonRequired: false,
  },
  delete: {
    title: "Delete this workspace?",
    body: `Everyone is signed out and billing stops right away, but nothing is erased. You can restore it for ${DELETION_GRACE_DAYS} days; after that everything is permanently removed. A live Stripe subscription is cancelled.`,
    confirm: "Delete workspace",
    reasonLabel: "Reason (shown in the audit log)",
    reasonRequired: true,
    needsName: true,
    danger: true,
  },
  restore_workspace: {
    title: "Restore this workspace?",
    body: "It becomes active again with all its data. A Stripe subscription cancelled at deletion is not revived, so it returns on its free plan.",
    confirm: "Restore workspace",
    reasonLabel: "Note (optional)",
    reasonRequired: false,
  },
  purge: {
    title: "Permanently delete now?",
    body: "This skips the grace period. Every user, employee file, note, conversation and escalation is erased and can't be recovered.",
    confirm: "Delete permanently",
    reasonLabel: null,
    reasonRequired: false,
    needsName: true,
    danger: true,
  },
};

const buttonBase =
  "inline-flex h-8 shrink-0 items-center justify-center rounded-full px-3.5 text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-60";

function ActionRow({
  icon: Icon,
  iconTone,
  title,
  description,
  label,
  buttonClass,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  iconTone: string;
  title: string;
  description: string;
  label: string;
  buttonClass: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", iconTone)}>
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-paper">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-paper-3">{description}</p>
      </div>
      <button type="button" disabled={disabled} onClick={onClick} className={cn(buttonBase, buttonClass)}>
        {label}
      </button>
    </div>
  );
}

export function WorkspaceActions({
  companyId,
  companyName,
  status,
  planOverride,
}: {
  companyId: string;
  companyName: string;
  status: "active" | "blocked" | "deleted";
  planOverride: "paid" | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Action | null>(null);
  const [reason, setReason] = useState("");
  const [typedName, setTypedName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();

  function open(action: Action) {
    setPending(action);
    setReason("");
    setTypedName("");
    setError("");
  }

  async function submit() {
    if (!pending) return;
    const details = copy[pending];
    if (details.reasonRequired && reason.trim().length < 3) {
      setError("Add a short reason so the team knows why.");
      return;
    }
    if (details.needsName && typedName.trim() !== companyName.trim()) {
      setError("Type the workspace name exactly to confirm.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/platform/workspaces/${encodeURIComponent(companyId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: pending,
          reason: reason.trim() || undefined,
          confirmName: details.needsName ? typedName.trim() : undefined,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message ?? "That change could not be saved.");
      const action = pending;
      setPending(null);
      startRefresh(() => (action === "purge" ? router.push(PLATFORM_WORKSPACES_PATH) : router.refresh()));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That change could not be saved.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const busy = isSubmitting || isRefreshing;

  return (
    <div className="rounded-2xl bg-paper/[0.045] p-4 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.05)]">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-paper">Admin actions</p>
        <p className="text-[11px] text-paper-3">Logged with your email</p>
      </div>

      <div className="mt-4 divide-y divide-paper/[0.07]">
        {status === "deleted" ? (
          <>
            <ActionRow
              icon={Undo2}
              iconTone="bg-success/12 text-success"
              title="Restore workspace"
              description="Bring it back with all its data."
              label="Restore"
              buttonClass="bg-success/15 text-success hover:bg-success hover:text-ink"
              disabled={busy}
              onClick={() => open("restore_workspace")}
            />
            <ActionRow
              icon={Trash2}
              iconTone="bg-risk/12 text-risk"
              title="Delete permanently"
              description="Skip the grace period. Can't be undone."
              label="Delete now"
              buttonClass="bg-risk/15 text-risk hover:bg-risk hover:text-paper"
              disabled={busy}
              onClick={() => open("purge")}
            />
          </>
        ) : (
          <>
            {status === "active" ? (
              <ActionRow
                icon={Ban}
                iconTone="bg-risk/12 text-risk"
                title="Suspend workspace"
                description="Block everyone from signing in. Data is kept."
                label="Suspend"
                buttonClass="bg-risk/15 text-risk hover:bg-risk hover:text-paper"
                disabled={busy}
                onClick={() => open("block")}
              />
            ) : (
              <ActionRow
                icon={ShieldCheck}
                iconTone="bg-success/12 text-success"
                title="Restore access"
                description="Let members sign in again."
                label="Restore"
                buttonClass="bg-success/15 text-success hover:bg-success hover:text-ink"
                disabled={busy}
                onClick={() => open("unblock")}
              />
            )}
            {planOverride === "paid" ? (
              <ActionRow
                icon={RotateCcw}
                iconTone="bg-paper/[0.08] text-paper-2"
                title="Paid access granted"
                description="Unlimited messages, no charge."
                label="Revoke"
                buttonClass="bg-paper/[0.08] text-paper hover:bg-paper hover:text-ink"
                disabled={busy}
                onClick={() => open("revoke_paid")}
              />
            ) : (
              <ActionRow
                icon={Gift}
                iconTone="bg-sun/15 text-sun"
                title="Grant paid access"
                description="Unlimited messages without a subscription."
                label="Grant"
                buttonClass="bg-sun/15 text-sun hover:bg-sun hover:text-ink"
                disabled={busy}
                onClick={() => open("grant_paid")}
              />
            )}
            <ActionRow
              icon={Trash2}
              iconTone="bg-risk/12 text-risk"
              title="Delete workspace"
              description={`Restorable for ${DELETION_GRACE_DAYS} days, then removed.`}
              label="Delete"
              buttonClass="bg-risk/15 text-risk hover:bg-risk hover:text-paper"
              disabled={busy}
              onClick={() => open("delete")}
            />
          </>
        )}
      </div>

      {pending && (
        <div role="dialog" aria-label={copy[pending].title} className="mt-4 rounded-xl bg-ink/70 p-4 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.08)]">
          <p className="text-sm font-semibold text-paper">{copy[pending].title}</p>
          <p className="mt-1 text-sm leading-6 text-paper-2">
            <span className="font-semibold text-paper">{companyName}</span>: {copy[pending].body}
          </p>
          {copy[pending].reasonLabel && (
            <label className="mt-3 grid gap-1.5 text-xs font-semibold text-paper-3">
              {copy[pending].reasonLabel}
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                rows={2}
                autoFocus
                className="rounded-lg border border-paper/10 bg-ink px-3 py-2 text-sm font-normal text-paper outline-none placeholder:text-paper-3 focus:border-paper/30"
              />
            </label>
          )}
          {copy[pending].needsName && (
            <label className="mt-3 grid gap-1.5 text-xs font-semibold text-paper-3">
              Type <span className="font-mono text-paper">{companyName}</span> to confirm
              <input
                value={typedName}
                onChange={(event) => setTypedName(event.target.value)}
                autoFocus={!copy[pending].reasonLabel}
                autoComplete="off"
                spellCheck={false}
                className="h-10 rounded-lg border border-paper/10 bg-ink px-3 text-sm font-normal text-paper outline-none focus:border-paper/30"
              />
            </label>
          )}
          {error && <p className="mt-2 text-sm text-risk">{error}</p>}
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setPending(null)}
              className={cn(buttonBase, "text-paper-2 hover:bg-paper/[0.06] hover:text-paper")}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className={cn(buttonBase, pending === "block" || copy[pending].danger ? "bg-risk text-paper hover:opacity-90" : "bg-paper text-ink hover:opacity-90")}
            >
              {busy ? "Saving..." : copy[pending].confirm}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
