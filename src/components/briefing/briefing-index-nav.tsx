import { Archive, CreditCard, FileText, MessagesSquare, Settings, ShieldAlert, UserRound, Workflow } from "lucide-react";
import {
  ADVISOR_DESK_PATH,
  ADVISOR_PATH,
  BILLING_PATH,
  BRIEFING_PATH,
  DEFERRED_PATH,
  DOCUMENTS_PATH,
  PEOPLE_PATH,
  SETTINGS_PATH,
} from "@/constants/routes";
import { SidebarNavLink } from "@/components/briefing/sidebar-nav-link";
import { formatBadgeCount } from "@/features/briefing/badge-count";
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
    label: "Advisor desk",
    href: ADVISOR_DESK_PATH,
    icon: MessagesSquare,
    description: "Live HR chats",
    advisorOnly: true,
  },
  {
    label: "Billing",
    href: BILLING_PATH,
    icon: CreditCard,
    description: "Plan & billing",
    adminOnly: true,
  },
] as const;

export type IndexSection = (typeof indexItems)[number]["label"];

/** Employees only reach their own file, their own documents and their account. */
function employeeItems(linkedEmployeeId?: string | null) {
  return [
    ...(linkedEmployeeId
      ? [
          {
            label: "People",
            title: "My profile",
            href: `${PEOPLE_PATH}/${linkedEmployeeId}`,
            icon: UserRound,
            description: "Your file",
          },
          {
            label: "Documents",
            title: "Documents",
            href: DOCUMENTS_PATH,
            icon: FileText,
            description: "Saved history",
          },
        ]
      : []),
    {
      label: "Settings",
      title: "Settings",
      href: SETTINGS_PATH,
      icon: Settings,
      description: "Your account",
    },
  ];
}

export function BriefingIndexNav({
  active,
  role,
  linkedEmployeeId,
  advisorOpenCount,
  isAdvisor = false,
  isHrTeam = false,
}: {
  active: IndexSection | string;
  role: Role;
  linkedEmployeeId?: string | null;
  advisorOpenCount?: number;
  /** HR advisors and super admins also get the live advisor desk. */
  isAdvisor?: boolean;
  /** Skylar's own HR team has no employees to manage, so the desk is all they get. */
  isHrTeam?: boolean;
}) {
  // Billing stays out of the sidebar; it is reachable from the account menu.
  // Skylar's own HR team: advisors get the desk only; anyone whose role was removed gets just their account.
  const items =
    role === "admin" && isHrTeam && !isAdvisor
      ? employeeItems(null)
      : role === "admin"
      ? indexItems
          .filter((item) => (isHrTeam ? item.label === "Advisor desk" : item.label !== "Billing" && (isAdvisor || !("advisorOnly" in item))))
          .map((item) => ({ ...item, title: item.label as string }))
      : employeeItems(linkedEmployeeId);

  return (
    <nav aria-label="Briefing index" className="grid gap-0.5 sm:grid-cols-4 lg:grid-cols-1">
      {items.map((item) => (
        <SidebarNavLink
          key={item.href}
          href={item.href}
          icon={item.icon}
          label={item.title}
          isActive={item.label === active}
          badge={item.label === "Advisor" ? formatBadgeCount(advisorOpenCount) : null}
          badgeLabel={`${advisorOpenCount} open cases`}
        />
      ))}
    </nav>
  );
}
