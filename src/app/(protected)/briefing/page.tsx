import type { Metadata } from "next";
import { BriefingShell } from "@/components/briefing/briefing-shell";
import { getStarterBriefingDeck } from "@/features/briefing/starter-deck";
import { requirePageSession } from "@/server/auth/require-session";
import {
  listCompanyEmployees,
  listCompanyLedger,
} from "@/server/repositories/briefing-read.repository";

export const metadata: Metadata = { title: "Briefing" };

export default async function BriefingPage() {
  const session = await requirePageSession();
  const [employees, ledger] = await Promise.all([
    listCompanyEmployees(session.companyId),
    listCompanyLedger(session.companyId),
  ]);
  const cards = getStarterBriefingDeck(session, { employees, ledger });

  return <BriefingShell session={session} cards={cards} />;
}
