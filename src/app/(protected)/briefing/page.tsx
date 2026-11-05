import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { parseBillingReturn } from "@/components/billing/billing-return-notice";
import { BriefingShell } from "@/components/briefing/briefing-shell";
import { buildDailyBriefingDeck } from "@/features/briefing/daily-deck";
import { SKYLAR_HR_COMPANY_ID } from "@/constants/auth";
import { ADVISOR_DESK_PATH, ONBOARDING_PATH, SETTINGS_PATH } from "@/constants/routes";
import { isAdvisor } from "@/server/auth/advisor-access";
import { requirePageSession } from "@/server/auth/require-session";
import { getOrCreateCompanyBillingState } from "@/server/repositories/billing.repository";
import { listHiddenBriefingCardIds } from "@/server/repositories/briefing-action.repository";
import {
  listCompanyEmployees,
  listCompanyLedger,
} from "@/server/repositories/briefing-read.repository";

export const metadata: Metadata = { title: "Briefing" };

export default async function BriefingPage({
  searchParams,
}: {
  searchParams: { billing?: string | string[] };
}) {
  const session = await requirePageSession();
  if (session.role !== "admin") redirect(session.linkedEmployeeId ? `/people/${session.linkedEmployeeId}` : "/settings");
  // HR advisors in Skylar's own team have no employees to brief on, and shouldn't be sent to set up a workspace.
  // Someone whose advisor role was removed has nothing here, so they go to their account instead of a not-found page.
  if (session.companyId === SKYLAR_HR_COMPANY_ID) redirect(isAdvisor(session) ? ADVISOR_DESK_PATH : SETTINGS_PATH);
  const [employees, ledger, hiddenCardIds] = await Promise.all([
    listCompanyEmployees(session.companyId),
    listCompanyLedger(session.companyId),
    listHiddenBriefingCardIds(session),
  ]);
  const cards = buildDailyBriefingDeck(session, { employees, ledger }, hiddenCardIds);

  if (session.role === "admin" && employees.length === 0) {
    redirect(ONBOARDING_PATH);
  }

  const billingReturn = parseBillingReturn(searchParams.billing);
  const billingNotice = billingReturn
    ? { result: billingReturn, isPaid: (await getOrCreateCompanyBillingState(session)).plan === "paid" }
    : null;

  return (
    <BriefingShell
      session={session}
      cards={cards}
      hasHiddenCards={hiddenCardIds.size > 0}
      billingNotice={billingNotice}
    />
  );
}
