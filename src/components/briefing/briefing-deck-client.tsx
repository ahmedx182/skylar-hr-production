"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { BriefingCard } from "@/components/briefing/briefing-card";
import { BriefingHero } from "@/components/briefing/briefing-hero";
import type { BriefingCard as BriefingCardModel } from "@/features/briefing/types";
import { cn } from "@/lib/utils/cn";
import type { AuthSession } from "@/types/auth";

type BriefingTodayResponse = {
  cards: BriefingCardModel[];
  hasHiddenCards: boolean;
};

function indexBadgeClass(tone: BriefingCardModel["tone"]) {
  if (tone === "risk") return "bg-risk text-paper";
  if (tone === "attention") return "bg-attention text-ink";
  if (tone === "success") return "bg-success/20 text-success";
  return "bg-paper/[0.10] text-paper-2";
}

export function BriefingDeckClient({
  session,
  initialCards,
  initialHasHiddenCards,
}: {
  session: AuthSession;
  initialCards: BriefingCardModel[];
  initialHasHiddenCards: boolean;
}) {
  const [cards, setCards] = useState(initialCards);
  const [hasHiddenCards, setHasHiddenCards] = useState(initialHasHiddenCards);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pendingCardId, setPendingCardId] = useState<string | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [error, setError] = useState("");
  const activeCard = useMemo(() => cards[activeIndex] ?? cards[0] ?? initialCards[0], [activeIndex, cards, initialCards]);
  const nextCard = cards[activeIndex + 1];
  const inFlightRef = useRef(0);
  const advanceTimerRef = useRef<number | null>(null);
  const activeCardIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (activeIndex >= cards.length) {
      setActiveIndex(Math.max(cards.length - 1, 0));
    }
  }, [activeIndex, cards.length]);

  activeCardIdRef.current = activeCard?.id;

  useEffect(
    () => () => {
      if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
    },
    [],
  );

  // Advances optimistically so the next card is clickable as soon as the animation ends;
  // the server write runs in the background and is rolled back on failure.
  function updateCard(cardId: string, action: "next" | "not_now") {
    if (isAdvancing) return;
    setError("");
    const removedIndex = cards.findIndex((card) => card.id === cardId);
    const removedCard = cards[removedIndex];
    // The last card waits for the server, which replaces it with the "all clear" card.
    const optimistic = removedIndex >= 0 && cards.length > 1;

    if (optimistic) {
      const removeCard = () => {
        advanceTimerRef.current = null;
        setCards((current) => current.filter((card) => card.id !== cardId));
        setIsAdvancing(false);
      };
      if (action === "next") {
        setIsAdvancing(true);
        advanceTimerRef.current = window.setTimeout(removeCard, 420);
      } else {
        removeCard();
      }
    } else {
      setPendingCardId(cardId);
    }

    inFlightRef.current += 1;
    void (async () => {
      try {
        const response = await fetch("/api/briefing/today", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId, action }),
        });

        const payload = (await response.json().catch(() => null)) as (Partial<BriefingTodayResponse> & { error?: { message?: string } }) | null;
        if (!response.ok || !payload || !payload.cards || typeof payload.hasHiddenCards !== "boolean") {
          throw new Error(
            payload && "error" in payload && payload.error?.message
              ? payload.error.message
              : "Skylar could not update today's deck.",
          );
        }

        setHasHiddenCards(payload.hasHiddenCards);
        // Only the last outstanding response reflects every action the user took.
        if (inFlightRef.current === 1) {
          const serverCards = payload.cards;
          const keepIndex = serverCards.findIndex((card) => card.id === activeCardIdRef.current);
          setCards(serverCards);
          setActiveIndex(keepIndex >= 0 ? keepIndex : 0);
        }
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Skylar could not update today's deck.");
        if (optimistic && removedCard) {
          setCards((current) => {
            if (current.some((card) => card.id === cardId)) return current;
            const next = [...current];
            next.splice(Math.min(removedIndex, next.length), 0, removedCard);
            return next;
          });
        }
      } finally {
        inFlightRef.current -= 1;
        setPendingCardId((current) => (current === cardId ? null : current));
      }
    })();
  }

  function resetDeck() {
    setPendingCardId("reset");
    setError("");

    void (async () => {
      try {
        const response = await fetch("/api/briefing/today", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reset" }),
        });
        const payload = (await response.json().catch(() => null)) as (Partial<BriefingTodayResponse> & { error?: { message?: string } }) | null;
        if (!response.ok || !payload || !payload.cards || typeof payload.hasHiddenCards !== "boolean") {
          throw new Error(payload?.error?.message ?? "Skylar could not restore today's briefing.");
        }
        setCards(payload.cards);
        setHasHiddenCards(payload.hasHiddenCards);
        setActiveIndex(0);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Skylar could not restore today's briefing.");
      } finally {
        setPendingCardId(null);
      }
    })();
  }

  return (
    <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
      <section className="grid min-w-0 content-start gap-4">
        {activeCard && (
          <div className="relative pb-6">
            {!isAdvancing && cards.length > 1 && (
              <>
                <div
                  className="pointer-events-none absolute inset-x-5 -top-3 bottom-8 z-0 translate-x-3 -rotate-[0.6deg] rounded-2xl border border-paper/70 border-t-4 border-t-success bg-paper/90 shadow-[0_16px_35px_rgba(0,0,0,0.16)]"
                  aria-hidden="true"
                />
                {cards.length > 2 && (
                  <div
                    className="pointer-events-none absolute inset-x-2.5 -top-6 bottom-10 z-0 -translate-x-3 rotate-[0.7deg] rounded-2xl border border-paper/80 border-t-4 border-t-attention bg-paper shadow-[0_20px_45px_rgba(0,0,0,0.2)]"
                    aria-hidden="true"
                  />
                )}
              </>
            )}
            {isAdvancing && nextCard && (
              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 skylar-card-rise" aria-hidden="true">
                <BriefingCard card={nextCard} position={activeIndex + 2} total={cards.length} />
              </div>
            )}
            <div className={cn("relative", isAdvancing ? "z-0 skylar-card-next" : "z-10")}>
              <BriefingCard
                card={activeCard}
                position={activeIndex + 1}
                total={cards.length}
                isPending={isAdvancing || pendingCardId === activeCard.id}
                onAction={updateCard}
              />
            </div>
          </div>
        )}
        {hasHiddenCards && activeCard?.id === "system:clear" && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-paper/[0.045] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.05)]">
            <p className="text-sm text-paper-3">Want to go through today&apos;s cards again?</p>
            <button
              type="button"
              disabled={pendingCardId === "reset"}
              onClick={resetDeck}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-paper/[0.08] px-4 text-sm font-semibold text-paper transition-colors hover:bg-paper hover:text-ink disabled:cursor-wait disabled:opacity-60"
            >
              <RotateCcw
                className={cn("size-4", pendingCardId === "reset" && "animate-spin [animation-direction:reverse]")}
                aria-hidden="true"
              />
              {pendingCardId === "reset" ? "Restoring..." : "Restore today's cards"}
            </button>
          </div>
        )}
        {error && <p className="border-l-2 border-risk bg-risk/10 px-4 py-3 text-sm leading-6 text-risk">{error}</p>}

        <BriefingHero />
      </section>

      <aside className="grid min-w-0 content-start gap-4 border-t border-paper/10 pt-4 xl:sticky xl:top-[72px] xl:max-h-[calc(100dvh-88px)] xl:overflow-y-auto xl:overscroll-contain xl:border-l xl:border-t-0 xl:pl-4 xl:pr-1 xl:pt-3">
        <div>
          <p className="text-sm font-semibold text-paper">What&apos;s ahead</p>
          <div className="mt-4 grid gap-1">
            {cards.map((card, index) => {
              const isActive = activeCard?.id === card.id && activeIndex === index;
              return (
              <button
                key={`${card.id}-${index}`}
                type="button"
                aria-current={isActive ? "true" : undefined}
                onClick={() => {
                  setError("");
                  setIsAdvancing(false);
                  setActiveIndex(index);
                }}
                className={cn(
                  "grid grid-cols-[32px_minmax(0,1fr)] gap-3 rounded-2xl px-2 py-4 text-left transition-colors hover:bg-paper/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper",
                  isActive && "bg-paper/[0.06]",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-full bg-paper/[0.08] font-mono text-xs text-paper-3",
                    isActive && "bg-paper text-ink",
                  )}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "inline-flex max-w-full rounded-full px-2.5 py-1 font-mono text-[10px] uppercase leading-none",
                      indexBadgeClass(card.tone),
                    )}
                  >
                    {card.eyebrow}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm leading-5 text-paper">
                    {card.title}
                  </p>
                </div>
              </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl bg-paper/[0.06] px-4 py-4">
          <p className="text-sm font-semibold text-paper">Why this matters</p>
          <div className="mt-4 grid gap-3 text-sm leading-6 text-paper-2">
            <p>{activeCard?.body ?? "Today's people work is clear."}</p>
            {activeCard?.detail && (
              <p className="border-t border-paper/10 pt-3 font-mono text-xs text-paper-3">
                {activeCard.detail}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-paper/[0.06] px-4 py-4">
          <p className="text-sm font-semibold text-paper">After the conversation</p>
          <div className="mt-4 grid gap-3 text-sm leading-6 text-paper-2">
            <p>Save a short note with what was discussed and what happens next.</p>
            <p className="text-paper-3">Skylar will bring the follow-up back when it is due.</p>
          </div>
        </div>

        <div className="rounded-xl bg-paper px-4 py-4 text-ink shadow-[0_14px_34px_rgba(0,0,0,0.16)]">
          <p className="font-mono text-xs uppercase text-ink/45">Company</p>
          <p className="mt-2 truncate text-sm font-semibold">{session.companyId}</p>
          <p className="mt-3 text-xs leading-5 text-ink/60">
            {cards.length} thoughtful prompts prepared for today.
          </p>
        </div>
      </aside>
    </div>
  );
}
