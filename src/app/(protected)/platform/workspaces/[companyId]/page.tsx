import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, FileText, MessageSquare, ShieldAlert, Trash2, UserRound, Users } from "lucide-react";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import { StatTile } from "@/components/platform/stat-tile";
import { WorkspaceActions } from "@/components/platform/workspace-actions";
import { WorkspacePlanBadge, WorkspaceStatusBadge } from "@/components/platform/workspace-badges";
import { PLATFORM_WORKSPACES_PATH } from "@/constants/routes";
import { formatCount, formatDate, formatRelative } from "@/features/platform/format";
import { giftDaysRemaining, giftMessagesRemaining } from "@/features/billing/subscription-status";
import { daysUntilPurge } from "@/features/platform/lifecycle";
import { getSession } from "@/server/auth/get-session";
import { requirePlatformAdminPage } from "@/server/auth/platform-admin";
import { getFreeMessageLimit } from "@/server/repositories/pricing.repository";
import { listPlatformAudit, listWorkspaceRows, listWorkspaceUsers } from "@/server/repositories/platform.repository";
import { auditActionLabel } from "@/components/platform/audit-label";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getSession())?.isPlatformAdmin ? "Workspace" : "Not found" };
}
export const dynamic = "force-dynamic";

export default async function PlatformWorkspacePage({ params }: { params: { companyId: string } }) {
  const session = await requirePlatformAdminPage();
  const [rows, users, audit, freeLimit] = await Promise.all([
    listWorkspaceRows(),
    listWorkspaceUsers(params.companyId),
    listPlatformAudit({ companyId: params.companyId, limit: 20 }),
    getFreeMessageLimit(),
  ]);
  const row = rows.find((candidate) => candidate.id === params.companyId);
  if (!row) notFound();

  const activeGift = row.giftActive && row.gift ? row.gift : null;
  const billingLabel = row.planOverride === "paid"
    ? "Paid access granted by Skylar"
    : activeGift
      ? `Gifted by Skylar until ${formatDate(activeGift.endsAtMs)}`
      : row.payingViaStripe
      ? `Stripe subscription (${row.billingStatus.replace("_", " ")})`
      : row.billingStatus === "canceled"
        ? "Stripe subscription canceled"
        : "Free plan";

  return (
    <BriefingRoomFrame session={session} active="Workspaces" mode="platform">
      <section className="grid content-start gap-5">
        <Link href={PLATFORM_WORKSPACES_PATH} className="inline-flex w-fit items-center gap-1.5 text-sm text-paper-3 hover:text-paper">
          <ArrowLeft className="size-4" aria-hidden="true" />
          All workspaces
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold text-paper">{row.name}</h1>
              <WorkspaceStatusBadge status={row.status} />
              <WorkspacePlanBadge row={row} />
            </div>
            <p className="mt-1 text-sm text-paper-3">
              Created {formatDate(row.createdAtMs)} by {row.ownerEmail ?? "an unknown owner"}
              <span className="mx-2 text-paper/20">|</span>
              <span className="font-mono text-xs">{row.id}</span>
            </p>
          </div>
        </div>

        {row.status === "deleted" && (
          <p className="flex items-start gap-3 rounded-2xl bg-risk/10 px-4 py-3 text-sm leading-6 text-paper">
            <Trash2 className="mt-1 size-4 shrink-0 text-risk" aria-hidden="true" />
            <span>
              Deleted. Everything is kept until <strong>{formatDate(row.deleteAfterMs)}</strong> ({daysUntilPurge(row.deleteAfterMs)} days left),
              then permanently removed. Reason: {row.deletedReason ?? "none recorded"}.
            </span>
          </p>
        )}

        {row.status === "blocked" && (
          <p className="flex items-start gap-3 rounded-2xl bg-risk/10 px-4 py-3 text-sm leading-6 text-paper">
            <ShieldAlert className="mt-1 size-4 shrink-0 text-risk" aria-hidden="true" />
            Suspended {formatRelative(row.blockedAtMs).toLowerCase()}. Reason: {row.blockedReason ?? "none recorded"}.
          </p>
        )}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid content-start gap-5">
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              <StatTile icon={Users} label="User accounts" value={formatCount(row.userCount)} detail={`${formatCount(row.adminCount)} admins`} />
              <StatTile icon={UserRound} label="Employee files" value={formatCount(row.employeeRecordCount)} />
              <StatTile
                icon={FileText}
                label="Records saved"
                value={formatCount(row.recordCount)}
                detail={`${formatCount(row.conversationCount)} conversations, last ${formatRelative(row.lastActivityMs).toLowerCase()}`}
              />
              <StatTile
                icon={MessageSquare}
                label={activeGift && !row.payingViaStripe && row.planOverride !== "paid" ? "Gifted advisor messages" : "Free advisor messages"}
                value={
                  activeGift && !row.payingViaStripe && row.planOverride !== "paid"
                    ? `${activeGift.messagesUsed} / ${activeGift.messageLimit}`
                    : row.plan === "paid" ? "Unlimited" : `${row.freeMessagesUsed} / ${freeLimit}`
                }
                detail={
                  activeGift && !row.payingViaStripe && row.planOverride !== "paid"
                    ? `used, ${giftDaysRemaining(activeGift)} days left`
                    : row.plan === "paid" ? "Paid plan" : "used on the free plan"
                }
              />
              <StatTile
                icon={ShieldAlert}
                tone={row.openEscalations > 0 ? "risk" : "neutral"}
                label="Advisor escalations"
                value={formatCount(row.openEscalations)}
                detail={`open, ${formatCount(row.totalEscalations)} all time`}
              />
              <StatTile icon={Building2} label="Billing" value={row.plan === "paid" ? "Paid" : "Free"} detail={billingLabel} tone={row.plan === "paid" ? "accent" : "neutral"} />
            </div>

            <div className="rounded-2xl bg-paper/[0.045] p-4 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.05)]">
              <p className="text-sm font-semibold text-paper">Members ({users.length})</p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="text-xs text-paper-3">
                      <th className="px-2 py-2 font-medium">Email</th>
                      <th className="px-2 py-2 font-medium">Role</th>
                      <th className="px-2 py-2 font-medium">Status</th>
                      <th className="px-2 py-2 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-t border-paper/[0.06]">
                        <td className="max-w-[280px] truncate px-2 py-2 text-paper">{user.email}</td>
                        <td className="px-2 py-2 capitalize text-paper-2">{user.id === row.ownerUid ? <span className="font-semibold normal-case text-sun">Owner</span> : user.role}</td>
                        <td className="px-2 py-2 capitalize text-paper-2">{user.status}</td>
                        <td className="whitespace-nowrap px-2 py-2 text-paper-3">{formatDate(user.createdAtMs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && <p className="py-4 text-sm text-paper-3">No user accounts in this workspace.</p>}
              </div>
              <p className="mt-3 text-xs text-paper-3">Employee notes and conversations stay private to the workspace and are not shown here.</p>
            </div>
          </div>

          <div className="grid content-start gap-5">
            <WorkspaceActions
              companyId={row.id}
              companyName={row.name}
              status={row.status}
              planOverride={row.planOverride}
              gift={activeGift ? { daysLeft: giftDaysRemaining(activeGift), messagesLeft: giftMessagesRemaining(activeGift) } : null}
            />

            <div className="rounded-2xl bg-paper/[0.045] p-4 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.05)]">
              <p className="text-sm font-semibold text-paper">Billing</p>
              <dl className="mt-3 grid gap-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-paper-3">Plan</dt><dd className="text-right text-paper">{billingLabel}</dd></div>
                {row.planOverrideNote && (
                  <div className="flex justify-between gap-3"><dt className="text-paper-3">Grant note</dt><dd className="text-right text-paper-2">{row.planOverrideNote}</dd></div>
                )}
                {row.gift && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-paper-3">{activeGift ? "Gift" : "Last gift"}</dt>
                    <dd className="text-right text-paper-2">
                      {row.gift.messagesUsed} of {row.gift.messageLimit} messages, {activeGift ? "ends" : "ended"} {formatDate(activeGift ? row.gift.endsAtMs : Math.min(row.gift.endsAtMs, Date.now()))}
                      {row.gift.note && <span className="block text-paper-3">{row.gift.note}</span>}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-3"><dt className="text-paper-3">Stripe status</dt><dd className="text-right capitalize text-paper-2">{row.billingStatus.replace("_", " ")}</dd></div>
              </dl>
            </div>

            <div className="rounded-2xl bg-paper/[0.045] p-4 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.05)]">
              <p className="text-sm font-semibold text-paper">History</p>
              {audit.length ? (
                <ol className="mt-3 grid gap-3">
                  {audit.map((entry) => (
                    <li key={entry.id} className="border-l-2 border-paper/10 pl-3">
                      <p className="text-sm font-medium text-paper">{auditActionLabel(entry.action)}</p>
                      <p className="text-xs text-paper-3">
                        {entry.actorEmail ?? "Unknown admin"}, {formatRelative(entry.createdAtMs).toLowerCase()}
                      </p>
                      {entry.reason && <p className="mt-1 text-xs leading-5 text-paper-2">{entry.reason}</p>}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-sm text-paper-3">No admin actions yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </BriefingRoomFrame>
  );
}
