"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { UserMinus, UserPlus } from "lucide-react";

export type HrAdvisorRow = { email: string; hasAccount: boolean };

async function postChange(body: { action: "grant" | "revoke"; email: string; reason?: string }) {
  const response = await fetch("/api/platform/hr-advisors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
  if (!response.ok) throw new Error(payload?.error?.message ?? "That change could not be saved.");
}

/** HR advisors receive escalated chats by email and answer them from the advisor desk. */
export function HrAdvisorsPanel({ advisors }: { advisors: HrAdvisorRow[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isRefreshing, startRefresh] = useTransition();
  const busy = pending !== null || isRefreshing;

  async function run(key: string, body: Parameters<typeof postChange>[0], onDone?: () => void) {
    setPending(key);
    setError("");
    try {
      await postChange(body);
      onDone?.();
      startRefresh(() => router.refresh());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That change could not be saved.");
    } finally {
      setPending(null);
    }
  }

  function grant() {
    if (!email.trim().includes("@")) return setError("Enter the email they will sign in with.");
    void run("grant", { action: "grant", email: email.trim() }, () => setEmail(""));
  }

  return (
    <div className="rounded-[20px] bg-ink-2/70 p-4 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.045)]">
      <div className="grid gap-1">
        <h2 className="text-base font-semibold text-paper">HR advisors</h2>
        <p className="text-sm text-paper-3">
          Escalated chats are emailed to every HR advisor, and they reply from the Advisor desk. They sign in with the email you add here; they can&apos;t see the platform console.
        </p>
      </div>

      {advisors.length === 0 ? (
        <p className="mt-3 text-sm text-paper-3">No HR advisors yet. Escalations are only emailed to the team address until you add one.</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {advisors.map((advisor) => (
            <li key={advisor.email} className="inline-flex h-9 items-center gap-2 rounded-full bg-paper/[0.06] pl-3 pr-1 text-sm">
              <span className="font-medium text-paper">{advisor.email}</span>
              {!advisor.hasAccount && (
                <span className="text-[11px] font-semibold text-paper-3" title="They haven't signed in yet. Access applies once they do.">
                  Not signed in yet
                </span>
              )}
              {confirming === advisor.email ? (
                <span className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void run(advisor.email, { action: "revoke", email: advisor.email }, () => setConfirming(null))}
                    className="inline-flex h-7 items-center rounded-full bg-risk px-3 text-xs font-semibold text-paper transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
                  >
                    {pending === advisor.email ? "Removing..." : "Remove"}
                  </button>
                  <button type="button" disabled={busy} onClick={() => setConfirming(null)} className="inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold text-paper-2 hover:text-paper disabled:opacity-60">
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirming(advisor.email)}
                  aria-label={`Remove HR advisor ${advisor.email}`}
                  title="Remove HR advisor"
                  className="inline-flex size-7 items-center justify-center rounded-full text-paper-2 transition-colors hover:bg-paper hover:text-ink disabled:opacity-60"
                >
                  <UserMinus className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          grant();
        }}
      >
        <label className="grid gap-1.5 text-xs font-semibold text-paper-3">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="advisor@skylar.com"
            autoComplete="off"
            spellCheck={false}
            maxLength={320}
            className="h-10 rounded-xl border border-paper/[0.06] bg-ink/70 px-3 text-sm text-paper outline-none placeholder:text-paper-3 focus:border-paper/20"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-10 items-center justify-center gap-1.5 self-end rounded-full bg-paper px-4 text-xs font-semibold text-ink transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
        >
          <UserPlus className="size-3.5" aria-hidden="true" />
          {pending === "grant" ? "Adding..." : "Add HR advisor"}
        </button>
      </form>

      {error && <p role="alert" className="mt-3 text-sm text-risk">{error}</p>}
    </div>
  );
}
