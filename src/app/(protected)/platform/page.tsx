import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Building2,
  CircleDollarSign,
  CreditCard,
  FileText,
  TriangleAlert,
  ShieldAlert,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import { StatTile } from "@/components/platform/stat-tile";
import { ActivityBarChart } from "@/components/platform/activity-bar-chart";
import { RangeControls } from "@/components/platform/range-controls";
import { WorkspacePlanBadge, WorkspaceStatusBadge } from "@/components/platform/workspace-badges";
import { PLATFORM_WORKSPACES_PATH } from "@/constants/routes";
import { FREE_PACKAGE_ID, formatDollars, monthlyEquivalentCents } from "@/features/pricing/package";
import { FREE_MESSAGE_LIMIT } from "@/features/billing/subscription-status";
import { formatCount, formatPercent, formatRelative } from "@/features/platform/format";
import { resolveRange } from "@/features/platform/range";
import { getSession } from "@/server/auth/get-session";
import { requirePlatformAdminPage } from "@/server/auth/platform-admin";
import { listPackages } from "@/server/repositories/pricing.repository";
import { listWorkspaceRows, platformActivity, type WorkspaceRow } from "@/server/repositories/platform.repository";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getSession())?.isPlatformAdmin ? "Platform overview" : "Not found" };
}
export const dynamic = "force-dynamic";

export default async function PlatformOverviewPage({
  searchParams,
}: {
  searchParams: { range?: string | string[]; from?: string | string[]; to?: string | string[] };
}) {
  const session = await requirePlatformAdminPage();
  const range = resolveRange(searchParams);
  const { description: rangeLabel, granularity } = range;
  const [allRows, { points: activity, activeCompanyIds }, packages] = await Promise.all([
    listWorkspaceRows(),
    platformActivity(range),
    listPackages({ includeArchived: true }),
  ]);
  const packageById = new Map(packages.map((pkg) => [pkg.id, pkg]));
  const freeLimit = packageById.get(FREE_PACKAGE_ID)?.advisorMessageLimit ?? FREE_MESSAGE_LIMIT;
  // Subscriptions from before packages existed have no package recorded; they were all on the first paid package.
  const legacyPaid = packages.find((pkg) => pkg.priceCents > 0 && !pkg.archived) ?? packages.find((pkg) => pkg.priceCents > 0);

  const deleted = allRows.filter((row) => row.status === "deleted");
  // Deleted workspaces are on their way out, so they're left out of every live total below.
  const rows = allRows.filter((row) => row.status !== "deleted");
  const active = rows.filter((row) => row.status === "active");
  const blocked = rows.filter((row) => row.status === "blocked");
  const stripePaying = rows.filter((row) => row.payingViaStripe);
  const mrrCents = stripePaying.reduce((sum, row) => {
    const pkg = (row.packageId ? packageById.get(row.packageId) : null) ?? legacyPaid;
    return sum + (pkg ? monthlyEquivalentCents(pkg) : 0);
  }, 0);
  const granted = rows.filter((row) => row.planOverride === "paid" || (row.giftActive && !row.payingViaStripe));
  const paid = rows.filter((row) => row.plan === "paid");
  const users = rows.reduce((sum, row) => sum + row.userCount, 0);
  const admins = rows.reduce((sum, row) => sum + row.adminCount, 0);
  const employeeRecords = rows.reduce((sum, row) => sum + row.employeeRecordCount, 0);
  const records = rows.reduce((sum, row) => sum + row.recordCount, 0);
  const conversations = rows.reduce((sum, row) => sum + row.conversationCount, 0);
  const openEscalations = rows.reduce((sum, row) => sum + row.openEscalations, 0);
  const totalEscalations = rows.reduce((sum, row) => sum + row.totalEscalations, 0);
  const newInRange = rows.filter((row) => row.createdAtMs !== null && row.createdAtMs >= range.startMs && row.createdAtMs <= range.endMs).length;
  const activeInRange = rows.filter((row) => activeCompanyIds.has(row.id)).length;
  const recordsInRange = activity.reduce((sum, point) => sum + point.records, 0);
  const upgradeLeads = rows.filter(
    (row) => row.status === "active" && row.plan === "free" && row.freeMessagesUsed >= freeLimit,
  );
  const withOpenCases = rows.filter((row) => row.openEscalations > 0);
  const mostActive = [...rows].sort((a, b) => b.recordCount - a.recordCount).filter((row) => row.recordCount > 0).slice(0, 5);

  return (
    <BriefingRoomFrame session={session} active="Overview" mode="platform">
      <section className="grid content-start gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-paper">Platform overview</h1>
            <p className="mt-1 text-sm text-paper-3">Live totals across every Skylar workspace. Activity figures cover {rangeLabel}.</p>
          </div>
          <RangeControls range={range} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            icon={Building2}
            label="Workspaces"
            value={formatCount(rows.length)}
            detail={`${formatCount(active.length)} active, ${formatCount(blocked.length)} suspended${deleted.length ? `, ${formatCount(deleted.length)} pending deletion` : ""}, ${formatCount(newInRange)} new in ${rangeLabel}`}
          />
          <StatTile
            icon={CreditCard}
            tone="accent"
            label="Paid workspaces"
            value={formatCount(paid.length)}
            detail={`${formatCount(stripePaying.length)} via Stripe, ${formatCount(granted.length)} gifted, ${formatPercent(paid.length, rows.length)} of all`}
          />
          <StatTile
            icon={CircleDollarSign}
            tone="success"
            label="Estimated MRR"
            value={formatDollars(mrrCents)}
            detail={`${formatCount(stripePaying.length)} Stripe subscriptions, yearly plans counted monthly`}
          />
          <StatTile
            icon={Activity}
            label="Active workspaces"
            value={formatCount(activeInRange)}
            detail={`${formatPercent(activeInRange, rows.length)} of workspaces saved a record in ${rangeLabel}`}
          />
          <StatTile
            icon={Users}
            label="User accounts"
            value={formatCount(users)}
            detail={`${formatCount(admins)} admins, ${formatCount(users - admins)} members`}
          />
          <StatTile icon={UserRound} label="Employee files" value={formatCount(employeeRecords)} detail="People tracked across workspaces" />
          <StatTile
            icon={FileText}
            label="Records saved"
            value={formatCount(records)}
            detail={`${formatCount(recordsInRange)} in ${rangeLabel}. ${formatCount(conversations)} conversations and ${formatCount(records - conversations)} notes in total`}
          />
          <StatTile
            icon={ShieldAlert}
            tone={openEscalations > 0 ? "risk" : "neutral"}
            label="Advisor escalations"
            value={formatCount(openEscalations)}
            detail={`open now, ${formatCount(totalEscalations)} all time`}
          />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          <ActivityBarChart
            title={`New workspaces per ${granularity}`}
            unit="workspaces"
            rangeLabel={rangeLabel}
            granularity={granularity}
            endsToday={range.endsToday}
            points={activity.map((point) => ({ startMs: point.startMs, value: point.workspaces }))}
          />
          <ActivityBarChart
            title={`Records saved per ${granularity}`}
            unit="records"
            rangeLabel={rangeLabel}
            granularity={granularity}
            endsToday={range.endsToday}
            points={activity.map((point) => ({ startMs: point.startMs, value: point.records }))}
          />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          <AttentionList
            title="Needs attention"
            empty="Nothing needs attention right now."
            groups={[
              { label: "Suspended", rows: blocked, note: (row) => row.blockedReason ?? "No reason recorded" },
              {
                label: "Out of free messages (upgrade leads)",
                rows: upgradeLeads,
                note: (row) => `${row.freeMessagesUsed} of ${freeLimit} used`,
              },
              {
                label: "Open advisor escalations",
                rows: withOpenCases,
                note: (row) => `${row.openEscalations} open`,
              },
            ]}
          />

          <div className="rounded-2xl bg-paper/[0.045] p-4 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-paper">
                <TrendingUp className="size-4 text-paper-3" aria-hidden="true" />
                Most active workspaces
              </p>
              <Link href={PLATFORM_WORKSPACES_PATH} className="inline-flex items-center gap-1 text-xs font-semibold text-paper-3 hover:text-paper">
                All workspaces
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
            {mostActive.length ? (
              <ol className="mt-3 grid gap-1">
                {mostActive.map((row, index) => (
                  <li key={row.id}>
                    <Link
                      href={`${PLATFORM_WORKSPACES_PATH}/${row.id}`}
                      className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2 hover:bg-paper/[0.05]"
                    >
                      <span className="font-mono text-xs text-paper-3">{index + 1}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-paper">{row.name}</span>
                        <span className="block text-xs text-paper-3">
                          {formatCount(row.recordCount)} records, {formatCount(row.userCount)} users, last active {formatRelative(row.lastActivityMs).toLowerCase()}
                        </span>
                      </span>
                      <WorkspacePlanBadge row={row} />
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-paper-3">No records have been saved yet.</p>
            )}
          </div>
        </div>
      </section>
    </BriefingRoomFrame>
  );
}

function AttentionList({
  title,
  empty,
  groups,
}: {
  title: string;
  empty: string;
  groups: { label: string; rows: WorkspaceRow[]; note: (row: WorkspaceRow) => string }[];
}) {
  const visible = groups.filter((group) => group.rows.length > 0);
  return (
    <div className="rounded-2xl bg-paper/[0.045] p-4 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.05)]">
      <p className="flex items-center gap-2 text-sm font-semibold text-paper">
        <TriangleAlert className="size-4 text-paper-3" aria-hidden="true" />
        {title}
      </p>
      {visible.length === 0 && <p className="mt-3 text-sm text-paper-3">{empty}</p>}
      <div className="mt-3 grid gap-4">
        {visible.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-semibold text-paper-3">
              {group.label} <span className="font-mono">({group.rows.length})</span>
            </p>
            <ul className="mt-1.5 grid gap-1">
              {group.rows.slice(0, 5).map((row) => (
                <li key={row.id}>
                  <Link
                    href={`${PLATFORM_WORKSPACES_PATH}/${row.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-paper/[0.05]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-paper">{row.name}</span>
                      <span className="block truncate text-xs text-paper-3">{group.note(row)}</span>
                    </span>
                    <WorkspaceStatusBadge status={row.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
