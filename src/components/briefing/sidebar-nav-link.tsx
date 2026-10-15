import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { RailTooltip } from "@/components/briefing/rail-tooltip";
import { cn } from "@/lib/utils/cn";

export function SidebarNavLink({
  href,
  icon: Icon,
  label,
  isActive,
  badge,
  badgeLabel,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  badge?: string | null;
  badgeLabel?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative grid grid-cols-[28px_minmax(0,1fr)] items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
        "lg:group-data-[collapsed=true]/shell:size-10 lg:group-data-[collapsed=true]/shell:grid-cols-1 lg:group-data-[collapsed=true]/shell:place-items-center lg:group-data-[collapsed=true]/shell:justify-self-center lg:group-data-[collapsed=true]/shell:p-0",
        "hover:bg-paper/[0.06]",
        isActive && "bg-paper text-ink hover:bg-paper",
      )}
    >
      <span className={cn("relative grid size-7 place-items-center rounded-lg text-paper-2", isActive && "bg-ink text-paper")}>
        <Icon className="size-4" aria-hidden="true" />
        {badge && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 hidden size-2 rounded-full bg-risk lg:group-data-[collapsed=true]/shell:block"
          />
        )}
      </span>
      <span
        className={cn(
          "flex min-w-0 items-center justify-between gap-2 text-sm font-medium text-paper-2 lg:group-data-[collapsed=true]/shell:hidden",
          isActive && "font-semibold text-ink",
        )}
      >
        <span className="truncate">{label}</span>
        {badge && (
          <span
            aria-label={badgeLabel}
            className="shrink-0 rounded-full bg-risk px-1.5 py-0.5 font-mono text-[10px] leading-none text-paper"
          >
            {badge}
          </span>
        )}
      </span>
      <RailTooltip label={badge ? `${label} (${badge})` : label} />
    </Link>
  );
}
