"use client";

import Link from "next/link";
import { Ban, Crown, RotateCcw, Search, ShieldCheck, ShieldMinus, ShieldPlus, Trash2, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { UserActionDialog, type UserDialogAction } from "@/components/platform/user-action-dialog";
import { WorkspaceStatusBadge } from "@/components/platform/workspace-badges";
import { PLATFORM_WORKSPACES_PATH } from "@/constants/routes";
import { formatDate } from "@/features/platform/format";
import {
  displayName,
  filterUsers,
  roleLabel,
  type DirectoryUser,
  type UserRoleFilter,
  type UserSort,
  type UserStatusFilter,
} from "@/features/platform/users";
import { cn } from "@/lib/utils/cn";

const roleFilters: { value: UserRoleFilter; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "owner", label: "Owners" },
  { value: "admin", label: "Admins" },
  { value: "member", label: "Members" },
];
const statusFilters: { value: UserStatusFilter; label: string }[] = [
  { value: "all", label: "Any status" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "deleted", label: "Deleted" },
];
const sorts: { value: UserSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "name", label: "Name" },
  { value: "workspace", label: "Workspace" },
];

function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return (
    <div className="inline-flex rounded-xl bg-ink/70 p-1" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn("h-8 rounded-lg px-3 text-xs font-semibold transition-colors", value === option.value ? "bg-paper text-ink" : "text-paper-3 hover:text-paper")}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function initials(user: DirectoryUser) {
  const parts = displayName(user).split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "")).toUpperCase();
}

function RoleBadge({ user }: { user: DirectoryUser }) {
  const label = roleLabel(user);
  if (label === "Owner") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sun/15 px-2 py-0.5 text-[11px] font-semibold text-sun">
        <Crown className="size-3" aria-hidden="true" />
        Owner
      </span>
    );
  }
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold", label === "Admin" ? "bg-paper px-2 text-ink" : "bg-paper/[0.08] text-paper-2")}>
      {label}
    </span>
  );
}

function AccountBadge({ user }: { user: DirectoryUser }) {
  if (user.accountState === "deleted") {
    return (
      <div className="grid gap-0.5">
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-paper/[0.1] px-2 py-0.5 text-[11px] font-semibold text-paper-2">
          <Trash2 className="size-3" aria-hidden="true" />
          Deleted
        </span>
        <span className="text-[11px] text-paper-3">{user.daysLeft === 0 ? "Erased today" : `${user.daysLeft} ${user.daysLeft === 1 ? "day" : "days"} left`}</span>
      </div>
    );
  }
  if (user.accountState === "suspended") {
    return (
      <div className="grid gap-0.5">
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-risk/15 px-2 py-0.5 text-[11px] font-semibold text-risk">
          <Ban className="size-3" aria-hidden="true" />
          Suspended
        </span>
        {user.reason && <span className="max-w-[160px] truncate text-[11px] text-paper-3" title={user.reason}>{user.reason}</span>}
      </div>
    );
  }
  return <span className="inline-flex rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-semibold text-success">Active</span>;
}

function RowActions({ user, onAct }: { user: DirectoryUser; onAct: (action: UserDialogAction) => void }) {
  const base = "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors";

  if (user.protectedReason === "self") {
    return (
      <span className="inline-flex cursor-help rounded-full bg-paper/[0.06] px-2.5 py-1 text-[11px] font-semibold text-paper-3" title="This is your account. You can't change your own access.">
        You
      </span>
    );
  }

  if (user.superAdmin) {
    return (
      <div className="flex items-center justify-end gap-1.5">
        <span
          className="inline-flex cursor-help rounded-full bg-paper/[0.06] px-2.5 py-1 text-[11px] font-semibold text-paper-3"
          title="Super admins can't be suspended or deleted. Remove their super admin access first."
        >
          Super admin
        </span>
        <button type="button" onClick={() => onAct("revoke_admin")} aria-label={`Remove super admin from ${user.email}`} title="Remove super admin" className={cn(base, "bg-paper/[0.08] px-2.5 text-paper hover:bg-paper hover:text-ink")}>
          <ShieldMinus className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    );
  }

  if (user.accountState === "deleted") {
    return (
      <button type="button" onClick={() => onAct("restore")} className={cn(base, "bg-success/15 text-success hover:bg-success hover:text-ink")}>
        <Undo2 className="size-3.5" aria-hidden="true" />
        Restore
      </button>
    );
  }
  return (
    <div className="flex items-center justify-end gap-1.5">
      {user.accountState === "active" && (
        <button type="button" onClick={() => onAct("grant_admin")} aria-label={`Make ${user.email} a super admin`} title="Make super admin" className={cn(base, "bg-paper/[0.08] px-2.5 text-paper hover:bg-paper hover:text-ink")}>
          <ShieldPlus className="size-3.5" aria-hidden="true" />
        </button>
      )}
      {user.accountState === "suspended" ? (
        <button type="button" onClick={() => onAct("unsuspend")} className={cn(base, "bg-success/15 text-success hover:bg-success hover:text-ink")}>
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Restore access
        </button>
      ) : (
        <button type="button" onClick={() => onAct("suspend")} className={cn(base, "bg-paper/[0.08] text-paper hover:bg-paper hover:text-ink")}>
          <RotateCcw className="size-3.5 rotate-180" aria-hidden="true" />
          Suspend
        </button>
      )}
      <button type="button" onClick={() => onAct("delete")} aria-label={`Delete ${user.email}`} title="Delete account" className={cn(base, "bg-risk/15 px-2.5 text-risk hover:bg-risk hover:text-paper")}>
        <Trash2 className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

export function UsersTable({ users }: { users: DirectoryUser[] }) {
  const [dialog, setDialog] = useState<{ userId: string; action: UserDialogAction } | null>(null);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<UserRoleFilter>("all");
  const [status, setStatus] = useState<UserStatusFilter>("all");
  const [sort, setSort] = useState<UserSort>("newest");

  const dialogUser = dialog ? users.find((candidate) => candidate.id === dialog.userId) : undefined;
  const visible = useMemo(() => filterUsers(users, { query, role, status, sort }), [query, role, sort, status, users]);

  return (
    <div className="rounded-[20px] bg-ink-2/70 p-4 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.045)]">
      <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <label className="relative block">
          <span className="sr-only">Search users</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-paper-3" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, email, or workspace..."
            className="h-10 w-full rounded-xl border border-paper/[0.06] bg-ink/70 pl-10 pr-3 text-sm text-paper outline-none placeholder:text-paper-3 focus:border-paper/20"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented label="Filter by role" options={roleFilters} value={role} onChange={setRole} />
          <Segmented label="Filter by status" options={statusFilters} value={status} onChange={setStatus} />
          <label className="flex items-center gap-2 text-xs text-paper-3">
            Sort
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as UserSort)}
              className="h-10 rounded-xl border border-paper/[0.06] bg-ink/70 px-3 text-xs font-semibold text-paper outline-none focus:border-paper/20"
            >
              {sorts.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <p className="mt-3 font-mono text-[11px] uppercase text-paper-3">{visible.length} of {users.length} users</p>

      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="text-xs text-paper-3">
              <th className="px-3 py-2 font-medium">User</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Workspace</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Signed up</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((user) => (
              <tr key={user.id} className="border-t border-paper/[0.06] hover:bg-paper/[0.035]">
                <td className="max-w-[300px] px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-paper text-[11px] font-semibold text-ink">{initials(user)}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-paper">{displayName(user)}</span>
                      <span className="block truncate text-xs text-paper-3">{user.email}</span>
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2.5"><RoleBadge user={user} /></td>
                <td className="max-w-[260px] px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {user.workspaceState === "unknown" ? (
                      <span className="text-paper-3">{user.workspaceName}</span>
                    ) : (
                      <Link href={`${PLATFORM_WORKSPACES_PATH}/${user.companyId}`} className="truncate font-medium text-paper underline-offset-2 hover:underline">
                        {user.workspaceName}
                      </Link>
                    )}
                    {(user.workspaceState === "blocked" || user.workspaceState === "deleted") && <WorkspaceStatusBadge status={user.workspaceState} />}
                  </div>
                </td>
                <td className="px-3 py-2.5"><AccountBadge user={user} /></td>
                <td className="whitespace-nowrap px-3 py-2.5 text-paper-3">{formatDate(user.createdAtMs)}</td>
                <td className="px-3 py-2.5 text-right"><RowActions user={user} onAct={(action) => setDialog({ userId: user.id, action })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <div className="rounded-2xl bg-paper/[0.04] px-4 py-8 text-center">
            <p className="font-semibold text-paper">No users match those filters.</p>
            <p className="mt-1 text-sm text-paper-3">Try a different search, role, or status.</p>
          </div>
        )}
      </div>

      {dialogUser && dialog && (
        <UserActionDialog key={`${dialog.userId}-${dialog.action}`} user={dialogUser} action={dialog.action} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}
