"use client";
import { useRef, useState, useTransition } from "react";
import { ChevronDown, Loader2, Mail, SendHorizonal, X } from "lucide-react";
import { cancelInviteAction, createInviteAction, type InviteState } from "@/features/auth/invite-actions";
import type { CompanyInvite } from "@/server/repositories/invite.repository";

type Props = {
  pendingInvites: CompanyInvite[];
};

export function InviteTeamMember({ pendingInvites }: Props) {
  const [state, setState] = useState<InviteState | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function action(formData: FormData) {
    startTransition(async () => {
      const result = await createInviteAction(null, formData);
      setState(result);
      if (result.ok) formRef.current?.reset();
    });
  }

  return (
    <div className="grid gap-5">
      <form ref={formRef} action={action} className="grid min-w-0 gap-4">
        <div className="grid min-w-0 items-end gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
          <div className="min-w-0">
            <label htmlFor="invite-email" className="mb-2 block text-sm font-medium text-paper-2">Work email</label>
            <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-paper-3" aria-hidden="true" />
            <input
              id="invite-email"
              name="email"
              type="email"
              required
              placeholder="colleague@company.com"
              disabled={isPending}
              autoComplete="email"
              className="h-12 w-full min-w-0 rounded-xl border border-paper/10 bg-paper/[0.035] pl-11 pr-4 text-sm text-paper placeholder:text-paper-3 transition-colors focus:border-paper/25 focus:outline-none focus:ring-2 focus:ring-paper/15 disabled:opacity-50"
            />
            </div>
          </div>

          <div className="min-w-0">
            <label htmlFor="invite-role" className="mb-2 block text-sm font-medium text-paper-2">Workspace role</label>
            <div className="relative">
            <select
              id="invite-role"
              name="role"
              defaultValue="employee"
              disabled={isPending}
              className="h-12 w-full min-w-0 appearance-none rounded-xl border border-paper/10 bg-ink pl-4 pr-10 text-sm text-paper transition-colors focus:border-paper/25 focus:outline-none focus:ring-2 focus:ring-paper/15 disabled:opacity-50"
            >
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-paper-3" aria-hidden="true" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-paper px-5 text-sm font-semibold text-ink transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <SendHorizonal className="size-4" aria-hidden="true" />
            )}
            {isPending ? "Sending…" : "Invite"}
          </button>
        </div>
        <p className="text-xs leading-5 text-paper-3">Employees see their own records. Admins can manage the workspace and team.</p>

        {state && (
          <p
            role="status"
            className={`rounded-xl border px-4 py-3 text-sm ${state.ok ? "border-success/20 bg-success/5 text-success" : "border-attention/20 bg-attention/5 text-attention"}`}
          >
            {state.message}
          </p>
        )}
      </form>

      {pendingInvites.length > 0 && (
        <div>
          <p className="mb-2 font-mono text-xs uppercase text-paper-3">Pending invites</p>
          <ul className="grid gap-1.5">
            {pendingInvites.map((invite) => (
              <PendingInviteRow key={invite.id} invite={invite} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PendingInviteRow({ invite }: { invite: CompanyInvite }) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string>();

  async function cancel() {
    setIsCancelling(true);
    setError(undefined);
    const result = await cancelInviteAction(invite.id);
    if (!result.ok) {
      setError(result.message);
      setIsCancelling(false);
    }
  }

  return (
    <li className="flex items-center gap-3 rounded-xl bg-ink/50 px-4 py-2.5">
      <Mail className="size-4 shrink-0 text-paper-3" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-sm text-paper">{invite.email}</span>
      {error && <span className="shrink-0 text-xs text-attention">{error}</span>}
      <span className="shrink-0 rounded-full border border-paper/10 px-2 py-0.5 font-mono text-xs capitalize text-paper-3">
        {invite.role}
      </span>
      <button
        type="button"
        onClick={cancel}
        disabled={isCancelling}
        aria-label={`Cancel invite to ${invite.email}`}
        className="shrink-0 rounded-full p-1.5 text-paper-3 transition-colors hover:bg-attention/10 hover:text-attention disabled:cursor-wait disabled:opacity-60"
      >
        {isCancelling ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <X className="size-3.5" aria-hidden="true" />}
      </button>
    </li>
  );
}
