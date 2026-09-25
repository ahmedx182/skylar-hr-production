import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function SectionHero({
  eyebrow,
  title,
  body,
  icon: Icon,
  action,
}: {
  eyebrow: string;
  title: string;
  body: string;
  icon: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-[30px] bg-ink-2 px-5 py-5 text-paper shadow-[0_24px_70px_rgba(0,0,0,0.20),inset_0_0_0_1px_rgba(244,239,231,0.04),inset_0_1px_0_rgba(244,239,231,0.07)] md:px-7 md:py-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(244,239,231,0.12),transparent_30%),radial-gradient(circle_at_18%_88%,rgba(245,173,68,0.12),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-y-6 left-0 w-1 rounded-r-full bg-sun/80" />
      <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-paper/[0.05] text-sun shadow-[inset_0_0_0_1px_rgba(244,239,231,0.04),inset_0_1px_0_rgba(244,239,231,0.06)]">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <p className="font-mono text-xs uppercase text-paper-3">{eyebrow}</p>
          </div>
          <h1 className="mt-5 max-w-4xl text-3xl font-semibold leading-tight text-paper md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-paper-2">{body}</p>
        </div>

        <div className="rounded-[24px] bg-paper/[0.09] px-4 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.14),inset_0_0_0_1px_rgba(244,239,231,0.075),inset_0_1px_0_rgba(244,239,231,0.11)]">
          <p className="font-mono text-xs uppercase text-paper-3">Workspace context</p>
          <p className="mt-2 text-sm leading-6 text-paper-2">
            Keep the record close to the person, the reason, and the next step.
          </p>
          {action && <div className="mt-4">{action}</div>}
        </div>
      </div>
    </div>
  );
}
