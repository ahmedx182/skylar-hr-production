import { describe, expect, it } from "vitest";
import { buildDeferredIndexItems } from "@/features/briefing/deferred-items";
import type { BriefingCard } from "@/features/briefing/types";

function card(overrides: Partial<BriefingCard>): BriefingCard {
  return {
    id: "ledger-1",
    eyebrow: "Follow-up",
    title: "Review note.",
    body: "Saved note body.",
    tone: "attention",
    actions: [],
    ...overrides,
  };
}

describe("buildDeferredIndexItems", () => {
  it("maps deferred card actions to index items", () => {
    expect(
      buildDeferredIndexItems(
        [card({ id: "ledger:note-1", ledgerEntryId: "note-1" })],
        [{ cardId: "ledger:note-1", dateKey: "2026-09-29", deferredUntilDateKey: "2026-09-30" }],
      ),
    ).toEqual([
      {
        label: "Deferred",
        title: "Review note.",
        body: "Saved note body.",
        meta: "Returns Sep 30",
        cardId: "ledger:note-1",
        href: "/documents/note-1",
        actionLabel: "Open record",
      },
    ]);
  });

  it("skips stale deferred card ids", () => {
    expect(
      buildDeferredIndexItems(
        [card({ id: "ledger:note-1" })],
        [{ cardId: "missing", dateKey: "2026-09-29", deferredUntilDateKey: "2026-09-30" }],
      ),
    ).toEqual([]);
  });
});
