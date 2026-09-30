import type { IndexAccessItem } from "@/components/briefing/index-access-page";
import type { DeferredBriefingCardAction } from "@/server/repositories/briefing-action.repository";
import type { BriefingCard } from "./types";

function deferredLabel(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return "Returns later";
  return `Returns ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date)}`;
}

function cardHref(card: BriefingCard): string {
  if (card.ledgerEntryId) return `/documents/${card.ledgerEntryId}`;
  if (card.employeeId) return `/people/${card.employeeId}`;
  return "/briefing";
}

export function buildDeferredIndexItems(
  cards: BriefingCard[],
  deferredActions: DeferredBriefingCardAction[],
): IndexAccessItem[] {
  const cardsById = new Map(cards.map((card) => [card.id, card]));

  return deferredActions.flatMap((action) => {
    const card = cardsById.get(action.cardId);
    if (!card || card.id === "system:clear") return [];

    return [
      {
        label: card.tone === "risk" ? "High attention" : "Deferred",
        title: card.title,
        body: card.body,
        meta: deferredLabel(action.deferredUntilDateKey),
        cardId: action.cardId,
        href: cardHref(card),
        actionLabel: card.ledgerEntryId ? "Open record" : card.employeeId ? "Open profile" : "Open briefing",
      },
    ];
  });
}
