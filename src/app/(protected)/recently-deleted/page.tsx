import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import { RecentlyDeletedList } from "@/components/briefing/recently-deleted-list";
import { SectionHero } from "@/components/briefing/section-hero";
import { BRIEFING_PATH } from "@/constants/routes";
import { formatRelative } from "@/features/platform/format";
import { daysUntilPurge } from "@/features/platform/lifecycle";
import { requirePageSession } from "@/server/auth/require-session";
import { listRecentlyDeleted } from "@/server/repositories/recently-deleted.repository";

export const metadata: Metadata = { title: "Recently deleted" };
export const dynamic = "force-dynamic";

export default async function RecentlyDeletedPage() {
  const session = await requirePageSession();
  if (session.role !== "admin") redirect(BRIEFING_PATH);
  const { employees, notes } = await listRecentlyDeleted(session.companyId);

  return (
    <BriefingRoomFrame session={session} active="Recently deleted">
      <section className="grid content-start gap-4">
        <SectionHero
          eyebrow="Recently deleted"
          title="Deleted by mistake? Bring it back."
          body="Employee files and notes stay here for 30 days after you delete them. After that they are permanently removed."
          icon={Trash2}
        />
        <RecentlyDeletedList
          employees={employees.map((employee) => ({
            id: employee.id,
            name: employee.name,
            detail: [employee.jobTitle, employee.email].filter(Boolean).join(" | ") || "Employee file",
            deletedLabel: formatRelative(employee.deletedAtMs).toLowerCase(),
            daysLeft: daysUntilPurge(employee.deleteAfterMs) ?? 0,
            noteCount: employee.noteCount,
          }))}
          notes={notes.map((note) => ({
            id: note.id,
            employeeName: note.employeeName,
            type: note.type,
            snippet: note.description,
            deletedLabel: formatRelative(note.deletedAtMs).toLowerCase(),
            daysLeft: daysUntilPurge(note.deleteAfterMs) ?? 0,
          }))}
        />
      </section>
    </BriefingRoomFrame>
  );
}
