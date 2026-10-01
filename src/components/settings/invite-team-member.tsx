"use client";
import { useRef, useState, useTransition } from "react";
import { Loader2, Mail, SendHorizonal } from "lucide-react";
import { createInviteAction, type InviteState } from "@/features/auth/invite-actions";
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
      <form ref={formRef} action={action} className="grid gap-3">
        <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
          <div>
            <label htmlFor="invite-email" className="sr-only">Email address</label>
            <input
              id="invite-email"
              name="email"
              type="email"
              required
              placeholder="colleague@company.com"
              disabled={isPending}
              className="w-full rounded-xl border border-paper/10 bg-ink px-4 py-2.5 text-sm text-paper placeholder:text-paper-3 focus:outline-none focus:ring-2 focus:ring-paper/20 disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="invite-role" className="sr-only">Role</label>
            <select
              id="invite-role"
              name="role"
              defaultValue="employee"
              disabled={isPending}
              className="w-full rounded-xl border border-paper/10 bg-ink px-4 py-2.5 text-sm text-paper focus:outline-none focus:ring-2 focus:ring-paper/20 disabled:opacity-50"
            >
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-paper/[0.08] px-4 text-sm font-semibold text-paper transition-colors hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <SendHorizonal className="size-4" aria-hidden="true" />
            )}
            {isPending ? "Sending…" : "Invite"}
          </button>
        </div>

        {state && (
          <p
            role="status"
            className={`text-sm ${state.ok ? "text-success" : "text-risk"}`}
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
              <li
                key={invite.id}
                className="flex items-center gap-3 rounded-xl bg-ink/50 px-4 py-2.5"
              >
                <Mail className="size-4 shrink-0 text-paper-3" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-sm text-paper">{invite.email}</span>
                <span className="shrink-0 rounded-full border border-paper/10 px-2 py-0.5 font-mono text-xs capitalize text-paper-3">
                  {invite.role}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
