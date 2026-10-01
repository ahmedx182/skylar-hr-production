import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BriefingShell } from "@/components/briefing/briefing-shell";
import { buildDailyBriefingDeck } from "@/features/briefing/daily-deck";
import { ONBOARDING_PATH } from "@/constants/routes";
import { requirePageSession } from "@/server/auth/require-session";
import { listHiddenBriefingCardIds } from "@/server/repositories/briefing-action.repository";
import {
  listCompanyEmployees,
  listCompanyLedger,
} from "@/server/repositories/briefing-read.repository";

export const metadata: Metadata = { title: "Briefing" };

export default async function BriefingPage() {
  const session = await requirePageSession();
  if (session.role !== "admin") redirect(session.linkedEmployeeId ? `/people/${session.linkedEmployeeId}` : "/settings");
  const [employees, ledger, hiddenCardIds] = await Promise.all([
    listCompanyEmployees(session.companyId),
    listCompanyLedger(session.companyId),
    listHiddenBriefingCardIds(session),
  ]);
  const cards = buildDailyBriefingDeck(session, { employees, ledger }, hiddenCardIds);

  if (session.role === "admin" && employees.length === 0) {
    redirect(ONBOARDING_PATH);
  }

  return <BriefingShell session={session} cards={cards} hasHiddenCards={hiddenCardIds.size > 0} />;
}
