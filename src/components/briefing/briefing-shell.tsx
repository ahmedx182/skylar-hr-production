import { BillingReturnNotice, type BillingReturn } from "@/components/billing/billing-return-notice";
import { BriefingDeckClient } from "@/components/briefing/briefing-deck-client";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import type { BriefingCard as BriefingCardModel } from "@/features/briefing/types";
import type { AuthSession } from "@/types/auth";

export function BriefingShell({
  session,
  cards,
  hasHiddenCards,
  billingNotice,
}: {
  session: AuthSession;
  cards: BriefingCardModel[];
  hasHiddenCards: boolean;
  billingNotice?: { result: BillingReturn; isPaid: boolean } | null;
}) {
  return (
    <BriefingRoomFrame session={session} active="Today">
      {billingNotice ? (
        <div className="grid gap-4">
          <BillingReturnNotice result={billingNotice.result} isPaid={billingNotice.isPaid} />
          <BriefingDeckClient session={session} initialCards={cards} initialHasHiddenCards={hasHiddenCards} />
        </div>
      ) : (
        <BriefingDeckClient session={session} initialCards={cards} initialHasHiddenCards={hasHiddenCards} />
      )}
    </BriefingRoomFrame>
  );
}
