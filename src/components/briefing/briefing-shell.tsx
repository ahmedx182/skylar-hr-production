import { BriefingCard } from "@/components/briefing/briefing-card";
import { BriefingHero } from "@/components/briefing/briefing-hero";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import type { BriefingCard as BriefingCardModel } from "@/features/briefing/types";
import type { AuthSession } from "@/types/auth";

export function BriefingShell({
  session,
  cards,
}: {
  session: AuthSession;
  cards: BriefingCardModel[];
}) {
  const firstCard = cards[0];

  return (
    <BriefingRoomFrame session={session} active="Today">
      <div className="grid h-full gap-4 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <section className="grid content-start gap-4">
          {firstCard && <BriefingCard card={firstCard} position={1} total={cards.length} />}

          <BriefingHero />
        </section>

        <aside className="grid content-start gap-4 border-t border-paper/10 pt-4 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-3">
          <div>
          <p className="text-sm font-semibold text-paper">What&apos;s ahead</p>
            <div className="mt-4 grid gap-1">
              {cards.map((card, index) => (
                <div
                  key={card.id}
                  className="grid grid-cols-[32px_minmax(0,1fr)] gap-3 rounded-2xl px-2 py-4 text-left transition-colors hover:bg-paper/[0.04]"
                >
                  <span className="grid size-7 place-items-center rounded-full bg-paper/[0.08] font-mono text-xs text-paper-3">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs uppercase text-paper-3">
                      {card.eyebrow}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm leading-5 text-paper">
                      {card.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-paper/[0.06] px-4 py-4">
            <p className="text-sm font-semibold text-paper">Why this matters</p>
            <div className="mt-4 grid gap-3 text-sm leading-6 text-paper-2">
              <p>
                Maya has already heard the concern. Today&apos;s goal is to check whether
                anything has changed and make the expectation feel clear, not punitive.
              </p>
              <p className="border-t border-paper/10 pt-3 font-mono text-xs text-paper-3">
                Suggested record: conversation note + next touchpoint
              </p>
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
    </BriefingRoomFrame>
  );
}
