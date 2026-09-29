import { BriefingDeckClient } from "@/components/briefing/briefing-deck-client";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import type { BriefingCard as BriefingCardModel } from "@/features/briefing/types";
import type { AuthSession } from "@/types/auth";

export function BriefingShell({
  session,
  cards,
  hasHiddenCards,
}: {
  session: AuthSession;
  cards: BriefingCardModel[];
  hasHiddenCards: boolean;
}) {
  return (
    <BriefingRoomFrame session={session} active="Today">
      <BriefingDeckClient session={session} initialCards={cards} initialHasHiddenCards={hasHiddenCards} />
    </BriefingRoomFrame>
  );
}
