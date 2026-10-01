import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, LockKeyhole, UserPlus, UserRound, WalletCards } from "lucide-react";
import { AccountSettingsForm } from "@/components/settings/account-settings-form";
import { InviteTeamMember } from "@/components/settings/invite-team-member";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { UserRoleManager } from "@/components/settings/user-role-manager";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import { BILLING_PATH, PRIVACY_PATH, TERMS_PATH } from "@/constants/routes";
import { companyDisplayName } from "@/lib/company-display-name";
import { getServerEnv } from "@/lib/env/server";
import { adminAuth } from "@/lib/firebase/admin";
import { requirePageSession } from "@/server/auth/require-session";
import { listCompanyPendingInvites } from "@/server/repositories/invite.repository";
import { findUserById, listCompanyUsers } from "@/server/repositories/user.repository";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await requirePageSession();
  const [user, companyUsers, pendingInvites] = await Promise.all([
    findUserById(session.uid),
    session.role === "admin" ? listCompanyUsers(session.companyId) : Promise.resolve([]),
    session.role === "admin" ? listCompanyPendingInvites(session.companyId) : Promise.resolve([]),
  ]);
  const workspaceName = companyDisplayName(session);
  const paymentGateDisabled = getServerEnv().DEMO_DISABLE_PAYMENT_GATE;
  const isAdmin = session.role === "admin";

  if (!isAdmin) {
    // Older user records have no Firestore createdAt; fall back to the Firebase Auth creation time.
    const authCreated = await adminAuth()
      .getUser(session.uid)
      .then((record) => new Date(record.metadata.creationTime))
      .catch(() => undefined);
    const createdAt = user?.createdAt?.toDate() ?? authCreated;
    const rows = [
      { label: "Name", value: user?.displayName || "Not set" },
      { label: "Email", value: session.email ?? "Unknown" },
      {
        label: "Account created",
        value: createdAt
          ? createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
          : "Unknown",
      },
    ];

    return (
      <BriefingRoomFrame session={session} active="Settings">
        <section className="grid content-start gap-5">
          <div className="rounded-[20px] bg-ink-2 px-5 py-5 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.055)]">
            <p className="font-mono text-xs uppercase text-paper-3">Settings</p>
            <h1 className="mt-1.5 text-3xl font-semibold leading-tight text-paper md:text-4xl">
              Your account
            </h1>
          </div>
          <dl className="grid gap-4 rounded-[20px] bg-ink-2/70 p-5 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.04)]">
            {rows.map((row) => (
              <div key={row.label}>
                <dt className="font-mono text-xs uppercase text-paper-3">{row.label}</dt>
                <dd className="mt-1 text-base font-semibold text-paper">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </BriefingRoomFrame>
    );
  }

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "team", label: "Team" },
    { id: "security", label: "Security" },
  ];

  return (
    <BriefingRoomFrame session={session} active="Settings">
      <section className="grid content-start gap-5">
        {/* Page header */}
        <div className="rounded-[20px] bg-ink-2 px-5 py-5 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.055)]">
          <p className="font-mono text-xs uppercase text-paper-3">Settings</p>
          <h1 className="mt-1.5 text-3xl font-semibold leading-tight text-paper md:text-4xl">
            Account &amp; workspace
          </h1>
        </div>

        {/* Tabbed content */}
        <SettingsTabs tabs={tabs}>
          {/* ── Profile tab ── */}
          <>
            <div className="rounded-[20px] bg-ink-2/70 p-5 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.04)]">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-paper text-ink">
                  <UserRound className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-paper">Profile &amp; workspace</p>
                  <p className="mt-0.5 text-xs text-paper-3">{session.email ?? "Signed in"}</p>
                </div>
              </div>
              <AccountSettingsForm
                displayName={user?.displayName ?? ""}
                companyName={workspaceName}
                canEditCompany={isAdmin}
              />
            </div>
          </>

          {/* ── Team tab (admin only) ── */}
          {isAdmin ? (
            <>
              <div className="rounded-[20px] bg-ink-2/70 p-5 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.04)]">
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-paper/[0.06] text-paper">
                    <UserPlus className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-paper">Invite team member</p>
                    <p className="mt-0.5 text-xs text-paper-3">Send a sign-in link to a colleague.</p>
                  </div>
                </div>
                <InviteTeamMember pendingInvites={pendingInvites} />
              </div>

              {companyUsers.length > 0 && (
                <div className="rounded-[20px] bg-ink-2/70 p-5 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.04)]">
                  <p className="text-sm font-semibold text-paper">Team members</p>
                  <p className="mt-0.5 text-xs text-paper-3">
                    Change a member&apos;s role between admin and employee.
                  </p>
                  <div className="mt-4">
                    <UserRoleManager users={companyUsers} currentUid={session.uid} />
                  </div>
                </div>
              )}
            </>
          ) : null}

          {/* ── Security tab ── */}
          <>
            <div className="rounded-[20px] bg-ink-2/70 p-5 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.04)]">
              <LockKeyhole className="size-5 text-success" aria-hidden="true" />
              <p className="mt-4 text-sm font-semibold text-paper">Passwordless session</p>
              <p className="mt-2 text-sm leading-6 text-paper-3">
                Sign-in stays tied to Firebase email links and the secure server session cookie.
              </p>
            </div>

            <div className="rounded-[20px] bg-ink-2/70 p-5 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.04)]">
              <WalletCards className="size-5 text-attention" aria-hidden="true" />
              <p className="mt-4 text-xs text-paper-3 font-mono uppercase">Role</p>
              <p className="mt-1.5 text-base font-semibold capitalize text-paper">{session.role}</p>
              {isAdmin && !paymentGateDisabled && (
                <Link
                  href={BILLING_PATH}
                  className="mt-4 inline-flex h-9 items-center gap-2 rounded-full bg-paper/[0.08] px-4 text-sm font-semibold text-paper transition-colors hover:bg-paper hover:text-ink"
                >
                  <CreditCard className="size-4" aria-hidden="true" />
                  Billing
                </Link>
              )}
            </div>

            <div className="rounded-[20px] bg-ink-2/70 p-5 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.04)]">
              <p className="font-mono text-xs uppercase text-paper-3">Legal</p>
              <div className="mt-3 grid gap-2">
                <Link href={TERMS_PATH} className="text-sm font-semibold text-paper-2 transition-colors hover:text-paper">
                  Terms of Service
                </Link>
                <Link href={PRIVACY_PATH} className="text-sm font-semibold text-paper-2 transition-colors hover:text-paper">
                  Privacy Policy
                </Link>
              </div>
            </div>
          </>
        </SettingsTabs>
      </section>
    </BriefingRoomFrame>
  );
}
