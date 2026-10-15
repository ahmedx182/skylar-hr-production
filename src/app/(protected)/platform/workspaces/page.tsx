import type { Metadata } from "next";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import { WorkspacesTable } from "@/components/platform/workspaces-table";
import { getSession } from "@/server/auth/get-session";
import { requirePlatformAdminPage } from "@/server/auth/platform-admin";
import { listWorkspaceRows } from "@/server/repositories/platform.repository";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getSession())?.isPlatformAdmin ? "Workspaces" : "Not found" };
}
export const dynamic = "force-dynamic";

export default async function PlatformWorkspacesPage() {
  const session = await requirePlatformAdminPage();
  const rows = await listWorkspaceRows();

  return (
    <BriefingRoomFrame session={session} active="Workspaces" mode="platform">
      <section className="grid content-start gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-paper">Workspaces</h1>
          <p className="mt-1 text-sm text-paper-3">
            Every company on Skylar. Open one to suspend it, restore it, or grant paid access.
          </p>
        </div>
        <WorkspacesTable rows={rows} />
      </section>
    </BriefingRoomFrame>
  );
}
