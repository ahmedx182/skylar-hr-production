export type UserRoleFilter = "all" | "owner" | "admin" | "member";
export type UserStatusFilter = "all" | "active" | "suspended" | "deleted";
export type AccountState = "active" | "suspended" | "deleted";
export type UserSort = "newest" | "name" | "workspace";
export type WorkspaceState = "active" | "blocked" | "deleted" | "unknown";

/** A user joined with the workspace they belong to. Plain data, safe to pass to the browser. */
export type DirectoryUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: "admin" | "employee";
  /** Sign-in state: deleted accounts are kept for 30 days and can be restored. */
  accountState: AccountState;
  /** Whole days before a deleted account is permanently erased. */
  daysLeft: number | null;
  /** Why it was suspended or deleted. */
  reason: string | null;
  createdAtMs: number | null;
  companyId: string;
  workspaceName: string;
  workspaceState: WorkspaceState;
  /** True for the person who created the workspace. */
  isOwner: boolean;
  /** The only active admin of their workspace, so removing them leaves it unmanaged. */
  isOnlyAdmin: boolean;
  /** Why this account can't be suspended or deleted: it is yours, or it belongs to a super admin. */
  protectedReason: "self" | "super_admin" | null;
  /** Super admin access and where it comes from: PLATFORM_ADMIN_EMAILS ("env") or the console ("console"). */
  superAdmin: "env" | "console" | null;
};

/** One super admin for the console's list. They may not have signed up yet. */
export type SuperAdminRow = {
  email: string;
  hasAccount: boolean;
  isYou: boolean;
};

export function accountStateOf(user: { status: string; deleted: boolean }): AccountState {
  if (user.deleted) return "deleted";
  return user.status === "active" ? "active" : "suspended";
}

export type UserRoleLabel = "Owner" | "Admin" | "Member";

export function roleLabel(user: Pick<DirectoryUser, "isOwner" | "role">): UserRoleLabel {
  if (user.isOwner) return "Owner";
  return user.role === "admin" ? "Admin" : "Member";
}

export function displayName(user: Pick<DirectoryUser, "displayName" | "email">): string {
  return user.displayName?.trim() || user.email.split("@")[0] || user.email;
}

export function filterUsers(
  users: DirectoryUser[],
  options: { query: string; role: UserRoleFilter; status: UserStatusFilter; sort: UserSort },
): DirectoryUser[] {
  const query = options.query.trim().toLowerCase();
  return users
    .filter((user) => options.role === "all" || roleLabel(user).toLowerCase() === options.role)
    // Deleted accounts stay out of the default view and only appear when asked for.
    .filter((user) => (options.status === "all" ? user.accountState !== "deleted" : user.accountState === options.status))
    .filter((user) => !query || `${user.email} ${displayName(user)} ${user.workspaceName}`.toLowerCase().includes(query))
    .sort((a, b) => {
      if (options.sort === "name") return displayName(a).localeCompare(displayName(b));
      if (options.sort === "workspace") return a.workspaceName.localeCompare(b.workspaceName) || displayName(a).localeCompare(displayName(b));
      return (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0);
    });
}
