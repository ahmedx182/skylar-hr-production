import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";
import { BRIEFING_PATH, LOGIN_PATH, PRIVACY_PATH, TERMS_PATH } from "@/constants/routes";
import { getSession } from "@/server/auth/get-session";

export const metadata: Metadata = { title: "Create your workspace" };

export default async function SignupPage() {
  if (await getSession()) redirect(BRIEFING_PATH);
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_72%_18%,rgba(245,169,72,0.12),transparent_40%)] px-6 py-10">
      <div className="w-full max-w-[520px]">
        <Link href="/" className="mb-8 flex items-center gap-3 text-lg font-semibold">
          <Image src="/brand/logo.png" alt="" width={42} height={38} priority />Skylar HR
        </Link>
        <div className="rounded-[28px] border border-paper/10 bg-[#1b1917]/80 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.38)] md:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-sun">For organization owners</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">Create your workspace.</h1>
          <p className="mt-4 leading-7 text-paper-2">Verify your work email, become your workspace&apos;s first admin, then set up your people and invite your team.</p>
          <p className="mt-3 text-sm text-paper-3">14-day free trial. No credit card required. Manage your team&apos;s allowed email domains in workspace settings.</p>
          <SignupForm />
          <p className="mt-6 text-sm text-paper-2">Already have an account? <Link href={LOGIN_PATH} className="font-semibold text-sun underline underline-offset-4">Sign in</Link></p>
        </div>
        <p className="mt-5 text-sm leading-6 text-paper-3">By continuing, you agree to the <Link href={TERMS_PATH} className="underline">Terms</Link> and <Link href={PRIVACY_PATH} className="underline">Privacy Policy</Link>.</p>
      </div>
    </div>
  );
}
