import type { Metadata } from "next";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import { CreateRecordPage } from "@/components/briefing/create-record-page";
import { requirePageSession } from "@/server/auth/require-session";
import { listCompanyEmployees } from "@/server/repositories/briefing-read.repository";

export const metadata: Metadata = { title: "New Note" };

export default async function NewNotePage({
  searchParams,
}: {
  searchParams?: { employeeId?: string };
}) {
  const session = await requirePageSession();
  const employees = await listCompanyEmployees(session.companyId);

  return (
    <BriefingRoomFrame session={session} active="Documents">
      <CreateRecordPage
        mode="note"
        role={session.role}
        initialEmployeeId={searchParams?.employeeId}
        employees={employees.map((employee) => ({
          id: employee.id,
          name: employee.name,
          detail: [employee.employeeCode, employee.jobTitle ?? employee.location].filter(Boolean).join(" · ") || "Employee file",
        }))}
      />
    </BriefingRoomFrame>
  );
}
