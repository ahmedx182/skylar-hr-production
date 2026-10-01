"use client";

import { useState } from "react";
import { Shield, User } from "lucide-react";
import {
  updateUserRoleAction,
  type UserRoleState,
} from "@/features/auth/user-role-actions";
import type { AppUser } from "@/types/auth";

export function UserRoleManager({
  users,
  currentUid,
}: {
  users: AppUser[];
  currentUid: string;
}) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-hairline">
            <th className="pb-2 text-left font-mono text-xs uppercase text-paper-3">Name</th>
            <th className="pb-2 text-left font-mono text-xs uppercase text-paper-3">Email</th>
            <th className="pb-2 text-left font-mono text-xs uppercase text-paper-3">Role</th>
            <th className="pb-2 text-right font-mono text-xs uppercase text-paper-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <UserRoleRow key={user.id} user={user} isSelf={user.id === currentUid} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserRoleRow({ user, isSelf }: { user: AppUser; isSelf: boolean }) {
  const [state, setState] = useState<UserRoleState | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function toggle() {
    const next = user.role === "admin" ? "employee" : "admin";
    setIsPending(true);
    setState(null);
    const result = await updateUserRoleAction(user.id, next);
    setState(result);
    setIsPending(false);
  }

  return (
    <tr className="border-b border-hairline/50 last:border-0">
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-paper/[0.07] text-paper-3">
            {user.role === "admin" ? (
              <Shield className="size-3.5" aria-hidden="true" />
            ) : (
              <User className="size-3.5" aria-hidden="true" />
            )}
          </span>
          <span className="font-semibold text-paper">{user.displayName || "—"}</span>
        </div>
      </td>
      <td className="py-3 pr-4 text-paper-3">{user.email}</td>
      <td className="py-3 pr-4">
        <span className="inline-flex items-center rounded-full border border-hairline px-2.5 py-0.5 font-mono text-xs capitalize text-paper-2">
          {user.role}
        </span>
      </td>
      <td className="py-3 text-right">
        {state && (
          <span className={`mr-3 text-xs font-semibold ${state.ok ? "text-success" : "text-risk"}`}>
            {state.message}
          </span>
        )}
        {isSelf ? (
          <span className="text-xs text-paper-3">(you)</span>
        ) : (
          <button
            type="button"
            onClick={toggle}
            disabled={isPending}
            className="rounded-full bg-paper/[0.08] px-3 py-1.5 text-xs font-semibold capitalize text-paper transition-colors hover:bg-paper hover:text-ink disabled:cursor-wait disabled:opacity-60"
          >
            {isPending ? "Saving…" : `Make ${user.role === "admin" ? "employee" : "admin"}`}
          </button>
        )}
      </td>
    </tr>
  );
}
