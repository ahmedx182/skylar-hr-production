import type { Metadata } from "next";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import { SuperAdminsPanel } from "@/components/platform/super-admins-panel";
import { UsersTable } from "@/components/platform/users-table";
import { daysUntilPurge } from "@/features/platform/lifecycle";
import { accountStateOf, type DirectoryUser, type SuperAdminRow, type WorkspaceState } from "@/features/platform/users";
import { getSession } from "@/server/auth/get-session";
import { requirePlatformAdminPage } from "@/server/auth/platform-admin";
import { listPlatformAdmins, normalizeEmail } from "@/server/auth/platform-admin-email";
import { listPlatformUsers, listWorkspaceRows } from "@/server/repositories/platform.repository";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getSession())?.isPlatformAdmin ? "Users" : "Not found" };
}
export const dynamic = "force-dynamic";

export default async function PlatformUsersPage() {
  const session = await requirePlatformAdminPage();
  const [users, workspaces, platformAdmins] = await Promise.all([listPlatformUsers(), listWorkspaceRows(), listPlatformAdmins()]);
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
    const superAdmin = platformAdmins.get(normalizeEmail(user.email)) ?? null;
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
      // You can't act on yourself, and super admins lose that access before they can be suspended or deleted.
      protectedReason: user.id === session.uid ? "self" : superAdmin ? "super_admin" : null,
      superAdmin,
    };
  });

  const owners = directory.filter((user) => user.isOwner).length;
  const accountEmails = new Set(users.map((user) => normalizeEmail(user.email)));
  const sessionEmail = session.email ? normalizeEmail(session.email) : null;
  const superAdmins: SuperAdminRow[] = Array.from(platformAdmins.keys())
    .sort()
    .map((email) => ({ email, hasAccount: accountEmails.has(email), isYou: email === sessionEmail }));

  return (
    <BriefingRoomFrame session={session} active="Users" mode="platform">
      <section className="grid content-start gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-paper">Users</h1>
          <p className="mt-1 text-sm text-paper-3">
            Everyone who has signed up across Skylar: {directory.length} accounts, {owners} of them workspace owners. The owner is whoever created the workspace.
          </p>
        </div>
        <SuperAdminsPanel admins={superAdmins} />
        <UsersTable users={directory} />
      </section>
    </BriefingRoomFrame>
  );
}
