import { AccountMenu } from "@/components/briefing/account-menu";
import { BriefingIndexNav, type IndexSection } from "@/components/briefing/briefing-index-nav";
import { FloatingSkylarAction } from "@/components/briefing/floating-skylar-action";
import { QuickActions } from "@/components/briefing/quick-actions";
import { listCompanyEmployees } from "@/server/repositories/briefing-read.repository";
import type { AuthSession } from "@/types/auth";

export async function BriefingRoomFrame({
  session,
  active,
  children,
}: {
  session: AuthSession;
  active: IndexSection;
  children: React.ReactNode;
}) {
  const employees = await listCompanyEmployees(session.companyId);
  const employeeOptions = employees.map((employee) => ({
    id: employee.id,
    name: employee.name,
    detail: [employee.email, employee.jobTitle].filter(Boolean).join(" · ") || "Employee file",
  }));

  return (
    <main className="min-h-dvh bg-ink text-paper">
      <div className="flex min-h-dvh w-full flex-col px-4 py-3 md:px-5 md:py-4 2xl:px-7">
        <header className="skylar-app-header flex items-center justify-between gap-4 px-1 py-1">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="block size-11 bg-[url('/brand/logo.png')] bg-[length:38px_35px] bg-center bg-no-repeat"
            />
            <div className="min-w-0">
              <p className="text-lg font-semibold">Skylar</p>
              <p className="mt-0.5 truncate text-sm text-paper-3">Briefing Room</p>
            </div>
          </div>
          <AccountMenu session={session} />
        </header>

        <section className="grid flex-1 gap-4 py-4 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)] 2xl:grid-cols-[256px_minmax(0,1fr)]">
          <aside className="skylar-sidebar grid content-start gap-4 border-t border-paper/10 pt-4 lg:border-r lg:border-t-0 lg:pr-4 lg:pt-3">
            <div>
              <p className="text-xs font-semibold uppercase text-paper-3">Today&apos;s flow</p>
              <p className="mt-2 max-w-sm text-sm leading-5 text-paper-2">
                Guided first. Jump when needed.
              </p>
            </div>
            <BriefingIndexNav active={active} />
            <div className="h-px bg-paper/10" />
            <QuickActions role={session.role} employees={employeeOptions} />
          </aside>

          <div className="skylar-page-content min-w-0">{children}</div>
        </section>
      </div>
      <FloatingSkylarAction />
    </main>
  );
}
