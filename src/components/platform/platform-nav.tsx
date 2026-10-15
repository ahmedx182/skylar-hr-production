import Link from "next/link";
import { BadgeDollarSign, BarChart3, Building2, LayoutDashboard, ScrollText, ShieldCheck, Users } from "lucide-react";
import { RailTooltip } from "@/components/briefing/rail-tooltip";
import { SidebarNavLink } from "@/components/briefing/sidebar-nav-link";
import { BRIEFING_PATH, PLATFORM_AUDIT_PATH, PLATFORM_PATH, PLATFORM_PRICING_PATH, PLATFORM_USERS_PATH, PLATFORM_WORKSPACES_PATH } from "@/constants/routes";
import { cn } from "@/lib/utils/cn";

export type PlatformSection = "Overview" | "Workspaces" | "Users" | "Pricing" | "Audit log";

const platformItems: { label: PlatformSection; href: string; icon: typeof BarChart3 }[] = [
  { label: "Overview", href: PLATFORM_PATH, icon: BarChart3 },
  { label: "Workspaces", href: PLATFORM_WORKSPACES_PATH, icon: Building2 },
  { label: "Users", href: PLATFORM_USERS_PATH, icon: Users },
  { label: "Pricing", href: PLATFORM_PRICING_PATH, icon: BadgeDollarSign },
  { label: "Audit log", href: PLATFORM_AUDIT_PATH, icon: ScrollText },
];

export function PlatformNav({ active }: { active: PlatformSection | string }) {
  return (
    <nav aria-label="Platform" className="grid gap-0.5 sm:grid-cols-5 lg:grid-cols-1">
      {platformItems.map((item) => (
        <SidebarNavLink key={item.href} href={item.href} icon={item.icon} label={item.label} isActive={item.label === active} />
      ))}
    </nav>
  );
}

/** Visible only to platform admins: flips the sidebar between their own workspace and the platform console. */
export function SidebarModeSwitch({ mode }: { mode: "workspace" | "platform" }) {
  const options = [
    { key: "workspace" as const, label: "Workspace", href: BRIEFING_PATH, icon: LayoutDashboard },
    { key: "platform" as const, label: "Platform", href: PLATFORM_PATH, icon: ShieldCheck },
  ];

  return (
    <div
      role="navigation"
      aria-label="Switch mode"
      className="grid grid-cols-2 gap-1 rounded-xl bg-paper/[0.05] p-1 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.06)] lg:group-data-[collapsed=true]/shell:grid-cols-1 lg:group-data-[collapsed=true]/shell:bg-transparent lg:group-data-[collapsed=true]/shell:p-0 lg:group-data-[collapsed=true]/shell:shadow-none"
    >
      {options.map((option) => {
        const isActive = option.key === mode;
        const Icon = option.icon;
        return (
          <Link
            key={option.key}
            href={option.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group relative flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors",
              "lg:group-data-[collapsed=true]/shell:size-10 lg:group-data-[collapsed=true]/shell:justify-self-center",
              isActive
                ? option.key === "platform"
                  ? "bg-sun text-ink"
                  : "bg-paper text-ink"
                : "text-paper-3 hover:bg-paper/[0.06] hover:text-paper",
            )}
          >
            <Icon className="size-3.5 shrink-0 lg:group-data-[collapsed=true]/shell:size-4" aria-hidden="true" />
            <span className="lg:group-data-[collapsed=true]/shell:hidden">{option.label}</span>
            <RailTooltip label={`${option.label} mode`} />
          </Link>
        );
      })}
    </div>
  );
}
