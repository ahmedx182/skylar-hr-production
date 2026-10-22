"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ShieldMinus, ShieldPlus } from "lucide-react";
import type { SuperAdminRow } from "@/features/platform/users";

async function postAdminChange(body: { action: "grant" | "revoke"; email: string; reason?: string }) {
  const response = await fetch("/api/platform/admins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
  if (!response.ok) throw new Error(payload?.error?.message ?? "That change could not be saved.");
}

/** Lists every super admin, including people who haven't signed up yet, and adds or removes them by email. */
export function SuperAdminsPanel({ admins }: { admins: SuperAdminRow[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isRefreshing, startRefresh] = useTransition();
  const busy = pending !== null || isRefreshing;

  async function run(key: string, body: Parameters<typeof postAdminChange>[0], onDone?: () => void) {
    setPending(key);
    setError("");
    try {
      await postAdminChange(body);
      onDone?.();
      startRefresh(() => router.refresh());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That change could not be saved.");
    } finally {
      setPending(null);
    }
  }

  function grant() {
    if (!email.trim().includes("@")) return setError("Enter the email they sign in with.");
    if (reason.trim().length < 3) return setError("Add a short reason so the team knows why.");
    void run("grant", { action: "grant", email: email.trim(), reason: reason.trim() }, () => {
      setEmail("");
      setReason("");
    });
  }

  const input = "h-10 rounded-xl border border-paper/[0.06] bg-ink/70 px-3 text-sm text-paper outline-none placeholder:text-paper-3 focus:border-paper/20";

  return (
    <div className="rounded-[20px] bg-ink-2/70 p-4 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.045)]">
      <div className="grid gap-1">
        <h2 className="text-base font-semibold text-paper">Super admins</h2>
        <p className="text-sm text-paper-3">
          Super admins see the platform console. Changes apply on their next page load. You can&apos;t remove yourself.
        </p>
      </div>

      <ul className="mt-3 flex flex-wrap gap-2">
        {admins.map((admin) => (
          <li key={admin.email} className="inline-flex h-9 items-center gap-2 rounded-full bg-paper/[0.06] pl-3 pr-1 text-sm">
            <span className="font-medium text-paper">{admin.email}</span>
            {admin.isYou && <span className="text-[11px] font-semibold text-paper-3">You</span>}
            {!admin.hasAccount && <span className="text-[11px] font-semibold text-paper-3" title="They haven't signed up yet. Access applies once they do.">No account yet</span>}
            {admin.isYou ? (
              <span className="w-2" />
            ) : confirming === admin.email ? (
              <span className="inline-flex items-center gap-1">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(admin.email, { action: "revoke", email: admin.email }, () => setConfirming(null))}
                  className="inline-flex h-7 items-center rounded-full bg-risk px-3 text-xs font-semibold text-paper transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
                >
                  {pending === admin.email ? "Removing..." : "Remove"}
                </button>
                <button type="button" disabled={busy} onClick={() => setConfirming(null)} className="inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold text-paper-2 hover:text-paper disabled:opacity-60">
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirming(admin.email)}
                aria-label={`Remove super admin from ${admin.email}`}
                title="Remove super admin"
                className="inline-flex size-7 items-center justify-center rounded-full text-paper-2 transition-colors hover:bg-paper hover:text-ink disabled:opacity-60"
              >
                <ShieldMinus className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>

      <form
        className="mt-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          grant();
        }}
      >
        <label className="grid gap-1.5 text-xs font-semibold text-paper-3">
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" autoComplete="off" spellCheck={false} maxLength={320} className={input} />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-paper-3">
          Reason (shown in the audit log)
          <input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} className={input} />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-10 items-center justify-center gap-1.5 self-end rounded-full bg-paper px-4 text-xs font-semibold text-ink transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
        >
          <ShieldPlus className="size-3.5" aria-hidden="true" />
          {pending === "grant" ? "Adding..." : "Add super admin"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-risk">{error}</p>}
    </div>
  );
}
