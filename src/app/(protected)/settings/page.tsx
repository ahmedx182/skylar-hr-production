import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, LockKeyhole, UserRound, WalletCards } from "lucide-react";
import { AccountSettingsForm } from "@/components/settings/account-settings-form";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import { BILLING_PATH } from "@/constants/routes";
import { companyDisplayName } from "@/lib/company-display-name";
import { requirePageSession } from "@/server/auth/require-session";
import { findUserById } from "@/server/repositories/user.repository";

export const metadata: Metadata = { title: "Account Settings" };

export default async function SettingsPage() {
  const session = await requirePageSession();
  const user = await findUserById(session.uid);
  const workspaceName = companyDisplayName(session);

  return (
    <BriefingRoomFrame session={session} active="Settings">
      <section className="grid content-start gap-4">
        <div className="rounded-[24px] bg-ink-2 px-5 py-5 text-paper shadow-[0_20px_56px_rgba(0,0,0,0.22),inset_0_0_0_1px_rgba(244,239,231,0.055)] md:px-6">
          <p className="font-mono text-xs uppercase text-paper-3">Account settings</p>
          <h1 className="mt-2 max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">
            Keep your workspace identity clean.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-paper-3 md:text-base">
            Manage the account details Skylar uses in the workroom header, billing, and saved records.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-[20px] bg-ink-2/70 p-5 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.04)]">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-paper text-ink">
                <UserRound className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-paper">Profile and workspace</p>
                <p className="mt-1 text-sm text-paper-3">{session.email ?? "Signed in"}</p>
              </div>
            </div>
            <AccountSettingsForm
              displayName={user?.displayName ?? ""}
              companyName={workspaceName}
              canEditCompany={session.role === "admin"}
            />
          </div>

          <aside className="grid content-start gap-4">
            <div className="rounded-[20px] bg-ink-2/70 p-5 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.04)]">
              <LockKeyhole className="size-5 text-success" aria-hidden="true" />
              <p className="mt-4 font-mono text-xs uppercase text-paper-3">Security</p>
              <p className="mt-2 text-lg font-semibold text-paper">Passwordless session</p>
              <p className="mt-2 text-sm leading-6 text-paper-3">
                Sign-in stays tied to Firebase email links and the secure server session cookie.
              </p>
            </div>

            <div className="rounded-[20px] bg-ink-2/70 p-5 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.04)]">
              <WalletCards className="size-5 text-attention" aria-hidden="true" />
              <p className="mt-4 font-mono text-xs uppercase text-paper-3">Role</p>
              <p className="mt-2 text-lg font-semibold capitalize text-paper">{session.role}</p>
              {session.role === "admin" && (
                <Link
                  href={BILLING_PATH}
                  className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-paper/[0.08] px-4 text-sm font-semibold text-paper transition-colors hover:bg-paper hover:text-ink"
                >
                  <CreditCard className="size-4" aria-hidden="true" />
                  Billing
                </Link>
              )}
            </div>
          </aside>
        </div>
      </section>
    </BriefingRoomFrame>
  );
}
