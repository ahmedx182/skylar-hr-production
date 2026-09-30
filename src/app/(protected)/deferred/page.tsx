import type { Metadata } from "next";
import { IndexAccessPage } from "@/components/briefing/index-access-page";
import { buildDailyBriefingDeck } from "@/features/briefing/daily-deck";
import { buildDeferredIndexItems } from "@/features/briefing/deferred-items";
import { requirePageSession } from "@/server/auth/require-session";
import { listDeferredBriefingCardActions } from "@/server/repositories/briefing-action.repository";
import {
  listCompanyEmployees,
  listCompanyLedger,
} from "@/server/repositories/briefing-read.repository";

export const metadata: Metadata = { title: "Deferred" };

export default async function DeferredPage() {
  const session = await requirePageSession();
  const [employees, ledger, deferredActions] = await Promise.all([
    listCompanyEmployees(session.companyId),
    listCompanyLedger(session.companyId),
    listDeferredBriefingCardActions(session),
  ]);
  const cards = buildDailyBriefingDeck(session, { employees, ledger });
  const items = buildDeferredIndexItems(cards, deferredActions);

  return <IndexAccessPage session={session} active="Deferred" items={items} />;
}
