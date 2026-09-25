import type { Metadata } from "next";
import { IndexAccessPage } from "@/components/briefing/index-access-page";
import { ledgerStatusLabel } from "@/features/briefing/status-label";
import { requirePageSession } from "@/server/auth/require-session";
import { listCompanyLedger } from "@/server/repositories/briefing-read.repository";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const session = await requirePageSession();
  const ledger = await listCompanyLedger(session.companyId);

  return (
    <IndexAccessPage
      session={session}
      active="Documents"
      items={ledger.map((entry) => ({
        label: entry.type,
        title: entry.employeeName ?? "Employee record",
        body: entry.description,
        meta: ledgerStatusLabel(entry.statusDot),
        href: `/documents/${entry.id}`,
        actionLabel: "Open note",
      }))}
    />
  );
}
