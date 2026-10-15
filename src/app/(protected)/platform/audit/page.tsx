import type { Metadata } from "next";
import Link from "next/link";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import { auditActionLabel } from "@/components/platform/audit-label";
import { PLATFORM_PRICING_PATH, PLATFORM_WORKSPACES_PATH } from "@/constants/routes";
import { formatDate, formatRelative } from "@/features/platform/format";
import { getSession } from "@/server/auth/get-session";
import { requirePlatformAdminPage } from "@/server/auth/platform-admin";
import { listPlatformAudit } from "@/server/repositories/platform.repository";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getSession())?.isPlatformAdmin ? "Audit log" : "Not found" };
}
export const dynamic = "force-dynamic";

export default async function PlatformAuditPage() {
  const session = await requirePlatformAdminPage();
  const entries = await listPlatformAudit({ limit: 200 });

  return (
    <BriefingRoomFrame session={session} active="Audit log" mode="platform">
      <section className="grid content-start gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-paper">Audit log</h1>
          <p className="mt-1 text-sm text-paper-3">Every suspension, plan change, package change and deletion made from the platform console.</p>
        </div>

        <div className="overflow-x-auto rounded-[20px] bg-ink-2/70 p-4 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.045)]">
          {entries.length ? (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="text-xs text-paper-3">
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                  <th className="px-3 py-2 font-medium">Workspace</th>
                  <th className="px-3 py-2 font-medium">By</th>
                  <th className="px-3 py-2 font-medium">Reason / note</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-t border-paper/[0.06] align-top">
                    <td className="whitespace-nowrap px-3 py-2.5 text-paper-2" title={formatDate(entry.createdAtMs)}>
                      {formatRelative(entry.createdAtMs)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-medium text-paper">{auditActionLabel(entry.action)}</td>
                    <td className="px-3 py-2.5">
                      {entry.companyId || entry.action.startsWith("package_") ? (
                        <Link
                          href={entry.companyId ? `${PLATFORM_WORKSPACES_PATH}/${entry.companyId}` : PLATFORM_PRICING_PATH}
                          className="text-paper underline-offset-2 hover:underline"
                        >
                          {entry.companyName}
                        </Link>
                      ) : (
                        <span className="text-paper-2">{entry.companyName}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-paper-2">{entry.actorEmail ?? "Unknown"}</td>
                    <td className="max-w-[360px] px-3 py-2.5 text-paper-3">{entry.reason ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-2 py-8 text-center text-sm text-paper-3">No platform actions have been taken yet.</p>
          )}
        </div>
      </section>
    </BriefingRoomFrame>
  );
}
