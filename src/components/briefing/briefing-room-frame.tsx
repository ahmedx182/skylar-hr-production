import { AccountMenu } from "@/components/briefing/account-menu";
import { AppShellGrid } from "@/components/briefing/app-shell-grid";
import { BriefingIndexNav, type IndexSection } from "@/components/briefing/briefing-index-nav";
import { EmployeeSkylarChat } from "@/components/briefing/employee-skylar-chat";
import { FloatingSkylarAction } from "@/components/briefing/floating-skylar-action";
import { QuickActions } from "@/components/briefing/quick-actions";
import { PlatformNav, SidebarModeSwitch, type PlatformSection } from "@/components/platform/platform-nav";
import { getLayoutPreferences } from "@/server/preferences/layout-preferences";
import { countOpenEscalations } from "@/server/repositories/advisor-escalation.repository";
import { listCompanyEmployees } from "@/server/repositories/briefing-read.repository";
import type { AuthSession } from "@/types/auth";

export async function BriefingRoomFrame({
  session,
  active,
  children,
  quickActionEmployeeId,
  mode = "workspace",
}: {
  session: AuthSession;
  active: IndexSection | PlatformSection | string;
  children: React.ReactNode;
  quickActionEmployeeId?: string;
  mode?: "workspace" | "platform";
}) {
  const isPlatform = mode === "platform";
  const [employees, openEscalations] = isPlatform
    ? [[], 0]
    : await Promise.all([
        listCompanyEmployees(session.companyId),
        session.role === "admin" ? countOpenEscalations(session.companyId) : Promise.resolve(0),
      ]);
  const employeeOptions = employees.map((employee) => ({
    id: employee.id,
    name: employee.name,
    detail: [employee.employeeCode, employee.email, employee.jobTitle].filter(Boolean).join(" · ") || "Employee file",
  }));

  return (
    <main className="min-h-dvh bg-ink text-paper">
      <div className="flex min-h-dvh w-full flex-col px-4 pb-3 md:px-5 md:pb-4 lg:pl-3 2xl:pr-7">
        <header className="skylar-app-header sticky top-0 z-20 -mx-4 flex h-14 items-center justify-between gap-4 border-b border-paper/10 bg-ink px-5 md:-mx-5 md:px-6 lg:-ml-3 lg:pl-5 2xl:-mr-7 2xl:pr-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden="true"
              className="block size-8 bg-[url('/brand/logo.png')] bg-[length:28px_26px] bg-center bg-no-repeat"
            />
            <p className="truncate text-base font-semibold">
              Skylar{" "}
              <span className="ml-1.5 text-sm font-normal text-paper-3">
                {isPlatform ? "Platform console" : "Briefing Room"}
              </span>
            </p>
            {isPlatform && (
              <span className="hidden rounded-full bg-sun/15 px-2.5 py-1 text-[11px] font-semibold text-sun sm:inline">
                Super admin
              </span>
            )}
          </div>
          <AccountMenu session={session} />
        </header>

        <AppShellGrid
          initialCollapsed={getLayoutPreferences().navCollapsed}
          title={isPlatform ? "Platform" : "Today's flow"}
          tagline={isPlatform ? "Every workspace in one place." : "Guided first. Jump when needed."}
          bottomSlot={session.isPlatformAdmin ? <SidebarModeSwitch mode={mode} /> : undefined}
          sidebar={
            isPlatform ? (
              <PlatformNav active={active} />
            ) : (
              <>
                <BriefingIndexNav
                  active={active}
                  role={session.role}
                  linkedEmployeeId={session.linkedEmployeeId}
                  advisorOpenCount={openEscalations}
                />
                {session.role === "admin" && (
                  <>
                    <div className="h-px bg-paper/10" />
                    <QuickActions role={session.role} employees={employeeOptions} initialEmployeeId={quickActionEmployeeId} />
                  </>
                )}
              </>
            )
          }
        >
          {children}
        </AppShellGrid>
      </div>
      {!isPlatform && (session.role === "admin" ? <FloatingSkylarAction /> : <EmployeeSkylarChat />)}
    </main>
  );
}
