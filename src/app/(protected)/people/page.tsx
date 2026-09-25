import type { Metadata } from "next";
import { IndexAccessPage } from "@/components/briefing/index-access-page";
import { requirePageSession } from "@/server/auth/require-session";
import { listCompanyEmployees } from "@/server/repositories/briefing-read.repository";

export const metadata: Metadata = { title: "People" };

export default async function PeoplePage() {
  const session = await requirePageSession();
  const employees = await listCompanyEmployees(session.companyId);

  return (
    <IndexAccessPage
      session={session}
      active="People"
      items={employees.map((employee) => ({
        label: employee.summary ? "Open" : "File",
        title: employee.name,
        body: employee.summary ?? "No summary has been saved for this employee yet.",
        meta: [employee.jobTitle, employee.email].filter(Boolean).join(" · ") || "Employee file",
        href: `/people/${employee.id}`,
        actionLabel: "Open profile",
      }))}
    />
  );
}
