import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { BRIEFING_PATH } from "@/constants/routes";
import { getSession } from "@/server/auth/get-session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getSession()) redirect(BRIEFING_PATH);

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(520px,0.92fr)]">
      <section className="relative hidden overflow-hidden border-r border-paper/10 px-10 py-10 lg:flex lg:flex-col lg:justify-center xl:px-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(245,169,72,0.16),transparent_30%),radial-gradient(circle_at_78%_72%,rgba(120,112,96,0.20),transparent_32%),linear-gradient(180deg,#171411_0%,#0c0d0f_68%)]" />

        <div className="relative max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-sun">Skylar HR</p>
          <h2 className="mt-5 text-5xl font-semibold leading-[1.02] text-paper xl:text-6xl">
            Walk into the day with Skylar already briefed.
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-8 text-paper-2">
            Skylar gathers the important people work, orders it, and writes it in plain
            language before the first conversation starts.
          </p>
        </div>

        <div className="relative mt-12 h-[430px] max-w-3xl xl:h-[480px]">
          <div className="absolute left-2 top-8 w-[72%] rotate-[-2deg] rounded-[26px] bg-paper p-6 text-ink shadow-[0_30px_90px_rgba(0,0,0,0.38)]">
            <p className="font-mono text-xs uppercase text-ink/45">Today&apos;s first action</p>
            <h3 className="mt-5 text-4xl font-semibold leading-tight">
              Check in with Maya about last week&apos;s attendance note.
            </h3>
            <p className="mt-5 max-w-md text-base leading-7 text-ink/65">
              Keep it short and human: ask what changed, listen for context, and agree on one next step.
            </p>
            <div className="mt-8 flex gap-2">
              <span className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-paper">
                Prepared
              </span>
              <span className="rounded-full bg-[#e7ded2] px-3 py-1.5 text-xs font-semibold text-ink/70">
                Due today
              </span>
            </div>
          </div>

          <div className="absolute right-0 top-0 w-[38%] rotate-[3deg] rounded-[24px] border border-paper/10 bg-paper/[0.10] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur">
            <p className="font-mono text-xs uppercase text-paper-3">Keep close</p>
            <div className="mt-5 space-y-4">
              {["Prior note filed", "Suggested opener ready", "Outcome to save"].map((item) => (
                <p key={item} className="flex items-center gap-3 text-sm font-semibold text-paper-2">
                  <span className="size-2 rounded-full bg-sun" aria-hidden="true" />
                  {item}
                </p>
              ))}
            </div>
          </div>

          <div className="absolute bottom-0 right-8 w-[48%] rounded-[28px] border border-paper/10 bg-[#171719] p-5 shadow-[0_26px_80px_rgba(0,0,0,0.34)]">
            <p className="font-mono text-xs uppercase text-paper-3">After the conversation</p>
            <div className="mt-5 grid gap-3">
              {[
                ["Save the outcome", "Write down only what matters."],
                ["Return when needed", "Skylar brings it back at the right time."],
              ].map(([title, body]) => (
                <div key={title} className="rounded-2xl bg-paper/[0.06] px-4 py-3">
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-paper-3">{body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute bottom-7 left-10 flex items-center gap-2 rounded-full border border-paper/10 bg-ink/70 px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.26)] backdrop-blur">
            {["Employee", "Admin"].map((label) => (
              <span
                key={label}
                className="rounded-full bg-paper/[0.08] px-3 py-1.5 text-xs font-semibold text-paper-2"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="relative flex min-h-dvh items-center justify-center overflow-hidden px-6 py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(245,169,72,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_42%)]" />
        <div className="relative w-full max-w-[520px]">
          <div className="mb-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/brand/logo.png" alt="Skylar" width={42} height={38} priority />
              <div>
                <p className="text-lg font-semibold leading-none">Skylar</p>
                <p className="mt-1 font-mono text-xs text-paper-3">Skylar HR</p>
              </div>
            </div>
            <span className="rounded-full border border-paper/10 px-3 py-1.5 font-mono text-xs uppercase text-paper-3">
              Secure link
            </span>
          </div>

          <div className="rounded-[28px] border border-paper/10 bg-[#1b1917]/82 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.38)] backdrop-blur md:p-8">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-sun">Welcome back</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">
              Sign in to Skylar.
            </h1>
            <p className="mt-4 text-base leading-7 text-paper-2">
              Enter your work email and Skylar will send a private sign-in link. No password to
              remember, no extra inbox noise after you&apos;re in.
            </p>

            <LoginForm />
          </div>

          <div className="mt-5 grid gap-3 text-sm text-paper-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-paper/10 bg-paper/[0.035] p-4">
              <p className="font-semibold text-paper">Built for Skylar workdays</p>
              <p className="mt-2 leading-6">
                Skylar opens directly to the next conversation that needs care.
              </p>
            </div>
            <div className="rounded-2xl border border-paper/10 bg-paper/[0.035] p-4">
              <p className="font-semibold text-paper">Session kept server-side</p>
              <p className="mt-2 leading-6">Your browser only receives the secure session cookie.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
