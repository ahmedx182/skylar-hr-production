import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldOff, Trash2 } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { BRIEFING_PATH, LOGIN_PATH } from "@/constants/routes";
import { formatDate } from "@/features/platform/format";
import { getSession } from "@/server/auth/get-session";

export const metadata: Metadata = { title: "Workspace unavailable" };

export default async function SuspendedPage() {
  const session = await getSession();
  if (!session) redirect(LOGIN_PATH);
  if (!session.workspaceBlocked || session.isPlatformAdmin) redirect(BRIEFING_PATH);

  const isDeleted = session.workspaceDeleteAfterMs != null;
  const Icon = isDeleted ? Trash2 : ShieldOff;
  const workspace = session.companyName ? <strong className="text-paper">{session.companyName}</strong> : "this workspace";

  return (
    <main className="grid min-h-dvh place-items-center bg-ink px-4 text-paper">
      <div className="w-full max-w-md rounded-[24px] bg-ink-2 p-8 shadow-[0_24px_70px_rgba(0,0,0,0.35),inset_0_0_0_1px_rgba(244,239,231,0.06)]">
        <span className="grid size-12 place-items-center rounded-2xl bg-risk/15 text-risk">
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-6 text-2xl font-semibold">{isDeleted ? "This workspace was deleted" : "This workspace is suspended"}</h1>
        {isDeleted ? (
          <p className="mt-3 text-sm leading-6 text-paper-2">
            {workspace} has been deleted. Its data is kept until{" "}
            <strong className="text-paper">{formatDate(session.workspaceDeleteAfterMs ?? null)}</strong>, then removed permanently. Until then
            Skylar can restore it.
          </p>
        ) : (
          <p className="mt-3 text-sm leading-6 text-paper-2">
            Access to {workspace} has been paused by Skylar. Your data is safe and nothing has been deleted.
          </p>
        )}
        <p className="mt-3 text-sm leading-6 text-paper-3">
          If you think this is a mistake, contact Skylar support from {session.email ?? "your work email"}.
        </p>
        <div className="mt-8">
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
