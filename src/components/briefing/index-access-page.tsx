import { Archive, ArrowRight, CalendarClock, FileText, UserRound } from "lucide-react";
import Link from "next/link";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import type { IndexSection } from "@/components/briefing/briefing-index-nav";
import { SectionHero } from "@/components/briefing/section-hero";
import type { AuthSession } from "@/types/auth";

type PageKey = Exclude<IndexSection, "Today">;
export type IndexAccessItem = {
  label: string;
  title: string;
  body: string;
  meta: string;
  href?: string;
  actionLabel?: string;
};

const pageContent: Record<
  PageKey,
  {
    eyebrow: string;
    title: string;
    body: string;
    primary: string;
    secondary: string;
    icon: typeof Archive;
    empty: string;
  }
> = {
  Deferred: {
    eyebrow: "For later",
    title: "Paused items, ready when the timing is better.",
    body: "Deferred work should feel remembered, not forgotten. When an item becomes important again, it returns to the daily briefing.",
    primary: "Nothing urgent is waiting.",
    secondary: "Items you skip for today will appear here with the reason and return date.",
    icon: Archive,
    empty: "No deferred items are saved for this company yet.",
  },
  People: {
    eyebrow: "Employee notes",
    title: "Every person gets a clean, chronological story.",
    body: "Use People when you need context outside the daily flow: open items, recent notes, next touchpoint, and saved conversations.",
    primary: "Recent employee files",
    secondary: "Live employee records from your company workspace.",
    icon: UserRound,
    empty: "No employee files have been created yet. Use New person to add one.",
  },
  Documents: {
    eyebrow: "Saved history",
    title: "Documents stay attached to the moment they support.",
    body: "This is not a separate vault. Records belong with employee history so the why, when, and outcome stay together.",
    primary: "Recently filed records",
    secondary: "Live ledger entries saved from employee notes and conversations.",
    icon: FileText,
    empty: "No saved notes are in the ledger yet. Use New note to add one.",
  },
};

export function IndexAccessPage({
  session,
  active,
  items,
}: {
  session: AuthSession;
  active: PageKey;
  items: IndexAccessItem[];
}) {
  const content = pageContent[active];

  return (
    <BriefingRoomFrame session={session} active={active}>
      <section className="grid content-start gap-4">
        <SectionHero
          eyebrow={content.eyebrow}
          title={content.title}
          body={content.body}
          icon={content.icon}
        />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[20px] bg-ink-2/70 p-4 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.045)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-paper">{content.primary}</p>
                <p className="mt-1 text-sm text-paper-3">{content.secondary}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {items.length ? (
                items.map((item) => {
                  const className =
                    "group grid gap-4 rounded-[14px] bg-paper/[0.045] px-4 py-4 text-left shadow-[inset_0_0_0_1px_rgba(244,239,231,0.035),inset_0_1px_0_rgba(244,239,231,0.04)] transition-colors md:grid-cols-[minmax(0,1fr)_170px] md:items-center";
                  const contentNode = (
                    <>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-paper/[0.10] px-3 py-1 font-mono text-[11px] uppercase text-paper-2 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.05)]">
                            {item.label}
                          </span>
                          <span className="rounded-full bg-sun/12 px-3 py-1 text-xs font-semibold text-sun">
                            {item.meta}
                          </span>
                        </div>
                        <p className="mt-3 font-semibold text-paper">{item.title}</p>
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-paper-2">{item.body}</p>
                      </div>
                      <div className="flex items-center justify-start md:justify-end">
                        {item.href && (
                          <span className="inline-flex items-center gap-2 rounded-full bg-paper/[0.08] px-3 py-2 text-xs font-semibold text-paper-2 transition-colors group-hover:bg-paper group-hover:text-ink">
                            {item.actionLabel ?? "Open"}
                            <ArrowRight className="size-3.5" aria-hidden="true" />
                          </span>
                        )}
                      </div>
                    </>
                  );

                  return item.href ? (
                    <Link
                      key={`${item.href}-${item.label}-${item.title}-${item.meta}`}
                      href={item.href}
                      className={`${className} hover:bg-paper/[0.075]`}
                    >
                      {contentNode}
                    </Link>
                  ) : (
                    <div
                      key={`${item.label}-${item.title}-${item.meta}`}
                      className={className}
                    >
                      {contentNode}
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl bg-paper/[0.06] px-4 py-8 text-center">
                  <p className="font-semibold text-paper">{content.empty}</p>
                  <p className="mt-2 text-sm leading-6 text-paper-3">
                    People appear in People. Notes appear in Documents and can return to the briefing.
                  </p>
                </div>
              )}
            </div>
          </div>

          <aside className="grid min-h-[320px] place-items-center rounded-[24px] bg-paper/[0.06] p-4">
            <div className="w-full max-w-[260px]">
              <p className="text-sm font-semibold text-paper">How this works</p>
              <p className="mt-3 text-sm leading-6 text-paper-2">
                Skylar keeps the daily briefing focused. These sections exist for direct
                access when you already know what you need.
              </p>
              <div className="mt-5 rounded-xl bg-ink px-4 py-4">
                <p className="flex items-start gap-2 text-sm leading-6 text-paper-2">
                  <CalendarClock className="mt-0.5 size-4 shrink-0 text-attention" aria-hidden="true" />
                  Skylar brings items back when they need your attention.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </BriefingRoomFrame>
  );
}
