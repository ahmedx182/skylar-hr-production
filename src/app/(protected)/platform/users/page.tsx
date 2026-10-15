import type { Metadata } from "next";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import { UsersTable } from "@/components/platform/users-table";
import { daysUntilPurge } from "@/features/platform/lifecycle";
import { accountStateOf, type DirectoryUser, type WorkspaceState } from "@/features/platform/users";
import { getSession } from "@/server/auth/get-session";
import { requirePlatformAdminPage } from "@/server/auth/platform-admin";
import { isPlatformAdminEmail } from "@/server/auth/platform-admin-email";
import { listPlatformUsers, listWorkspaceRows } from "@/server/repositories/platform.repository";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getSession())?.isPlatformAdmin ? "Users" : "Not found" };
}
export const dynamic = "force-dynamic";

export default async function PlatformUsersPage() {
  const session = await requirePlatformAdminPage();
  const [users, workspaces] = await Promise.all([listPlatformUsers(), listWorkspaceRows()]);
  const workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace]));

  const activeAdmins = new Map<string, number>();
  for (const user of users) {
    if (user.role === "admin" && accountStateOf(user) === "active") {
      activeAdmins.set(user.companyId, (activeAdmins.get(user.companyId) ?? 0) + 1);
    }
  }

  const directory: DirectoryUser[] = users.map((user) => {
    const workspace = workspaceById.get(user.companyId);
    const workspaceState: WorkspaceState = workspace ? workspace.status : "unknown";
    const accountState = accountStateOf(user);
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      accountState,
      daysLeft: accountState === "deleted" ? daysUntilPurge(user.deleteAfterMs) : null,
      reason: user.reason,
      createdAtMs: user.createdAtMs,
      companyId: user.companyId,
      workspaceName: workspace?.name ?? "Workspace not found",
      workspaceState,
      isOwner: Boolean(workspace?.ownerUid) && workspace?.ownerUid === user.id,
      isOnlyAdmin: user.role === "admin" && accountState === "active" && (activeAdmins.get(user.companyId) ?? 0) === 1,
      // You can't act on yourself or on other platform admins.
      protectedReason: user.id === session.uid ? "self" : isPlatformAdminEmail(user.email, true) ? "super_admin" : null,
    };
  });

  const owners = directory.filter((user) => user.isOwner).length;

  return (
    <BriefingRoomFrame session={session} active="Users" mode="platform">
      <section className="grid content-start gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-paper">Users</h1>
          <p className="mt-1 text-sm text-paper-3">
            Everyone who has signed up across Skylar: {directory.length} accounts, {owners} of them workspace owners. The owner is whoever created the workspace.
          </p>
        </div>
        <UsersTable users={directory} />
      </section>
    </BriefingRoomFrame>
  );
}
