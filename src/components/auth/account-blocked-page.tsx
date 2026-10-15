import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LOGIN_PATH, TERMS_PATH } from "@/constants/routes";
import { getServerEnv } from "@/lib/env/server";

/** Standalone explanation shown when a suspended or deleted account tries to sign in. */
export function AccountBlockedPage({
  icon: Icon,
  title,
  lead,
  showTerms = false,
}: {
  icon: LucideIcon;
  title: string;
  lead: string;
  showTerms?: boolean;
}) {
  const supportEmail = getServerEnv().SUPPORT_EMAIL;

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-md rounded-[24px] bg-ink-2 p-8 shadow-[0_24px_70px_rgba(0,0,0,0.35),inset_0_0_0_1px_rgba(244,239,231,0.06)]">
        <span className="grid size-12 place-items-center rounded-2xl bg-risk/15 text-risk">
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-6 text-2xl font-semibold text-paper">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-paper-2">{lead}</p>
        <p className="mt-3 text-sm leading-6 text-paper-3">
          If you believe this is a mistake, contact Skylar support
          {supportEmail ? (
            <>
              {" "}at{" "}
              <a href={`mailto:${supportEmail}`} className="text-paper underline underline-offset-2">
                {supportEmail}
              </a>
            </>
          ) : null}
          .
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link
            href={LOGIN_PATH}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-paper px-5 text-sm font-semibold text-ink transition-opacity hover:opacity-90"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to sign in
          </Link>
          {showTerms && (
            <Link href={TERMS_PATH} className="text-sm text-paper-3 underline underline-offset-2 hover:text-paper">
              Read the Terms of Use
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
