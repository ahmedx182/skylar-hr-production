import Link from "next/link";
import { Archive, CreditCard, FileText, Settings, ShieldAlert, UserRound, Workflow } from "lucide-react";
import {
  ADVISOR_PATH,
  BILLING_PATH,
  BRIEFING_PATH,
  DEFERRED_PATH,
  DOCUMENTS_PATH,
  PEOPLE_PATH,
  SETTINGS_PATH,
} from "@/constants/routes";
import { cn } from "@/lib/utils/cn";
import type { Role } from "@/types/auth";

const indexItems = [
  {
    label: "Today",
    href: BRIEFING_PATH,
    icon: Workflow,
    description: "Start here",
  },
  {
    label: "Deferred",
    href: DEFERRED_PATH,
    icon: Archive,
    description: "For later",
  },
  {
    label: "People",
    href: PEOPLE_PATH,
    icon: UserRound,
    description: "Employee notes",
  },
  {
    label: "Documents",
    href: DOCUMENTS_PATH,
    icon: FileText,
    description: "Saved history",
  },
  {
    label: "Advisor",
    href: ADVISOR_PATH,
    icon: ShieldAlert,
    description: "Escalations",
    adminOnly: true,
  },
  {
    label: "Billing",
    href: BILLING_PATH,
    icon: CreditCard,
    description: "Trial & plan",
    adminOnly: true,
  },
  {
    label: "Settings",
    href: SETTINGS_PATH,
    icon: Settings,
    description: "Account",
  },
] as const;

export type IndexSection = (typeof indexItems)[number]["label"];

export function BriefingIndexNav({ active, role }: { active: IndexSection; role: Role }) {
  return (
    <nav aria-label="Briefing index" className="grid gap-1 sm:grid-cols-4 lg:grid-cols-1">
      {indexItems.filter((item) => !("adminOnly" in item) || role === "admin").map((item) => {
        const Icon = item.icon;
        const isActive = item.label === active;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group grid grid-cols-[30px_minmax(0,1fr)] items-center gap-2.5 rounded-xl px-2 py-2.5 text-left transition-colors",
              "hover:bg-paper/[0.06]",
              isActive && "bg-paper text-ink shadow-[0_12px_30px_rgba(0,0,0,0.18)] hover:bg-paper",
            )}
          >
            <span
              className={cn(
                "grid size-7 place-items-center rounded-lg text-paper-2",
                isActive && "bg-ink text-paper",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  "block truncate text-sm font-semibold text-paper",
                  isActive && "text-ink",
                )}
              >
                {item.label}
              </span>
              <span
                className={cn(
                  "mt-0.5 block truncate text-[11px] text-paper-3",
                  isActive && "text-ink/55",
                )}
              >
                {item.description}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
