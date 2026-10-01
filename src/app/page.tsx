import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ArrowUpRight, CheckCircle2, FileText, ShieldAlert, Users, Zap } from "lucide-react";
import { BRIEFING_PATH, LOGIN_PATH, PRIVACY_PATH, TERMS_PATH } from "@/constants/routes";
import { getSession } from "@/server/auth/get-session";

export default async function MarketingPage() {
  if (await getSession()) redirect(BRIEFING_PATH);

  return (
    <div className="min-h-dvh bg-[#0d0b09] text-paper selection:bg-[#F2A93B]/20">

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50 bg-[#0d0b09]/70 backdrop-blur-2xl">
        <div className="mx-auto flex h-[58px] max-w-7xl items-center justify-between px-6 md:px-10">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/brand/logo.png" alt="Skylar" width={26} height={26} className="shrink-0" />
            <span className="text-[15px] font-semibold tracking-wide text-paper">Skylar</span>
          </Link>
          <nav className="hidden items-center gap-7 lg:flex">
            {["#product", "#how-it-works", "#pricing"].map((href, i) => (
              <a key={href} href={href} className="text-[13.5px] text-paper/45 transition-colors duration-200 hover:text-paper">
                {["Product", "How it works", "Pricing"][i]}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <Link href={LOGIN_PATH} className="hidden text-[13.5px] text-paper/45 transition-colors hover:text-paper lg:block">
              Sign in
            </Link>
            <Link
              href={LOGIN_PATH}
              className="inline-flex h-[34px] items-center gap-2 rounded-full bg-paper px-5 text-[13px] font-semibold text-[#0d0b09] transition-opacity hover:opacity-90"
            >
              Get started
              <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main>

        {/* ══════════════════════════════════════════════════════════
            HERO
        ══════════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden pt-[58px]">
          {/* Top amber glow */}
          <div className="pointer-events-none absolute left-1/2 top-0 h-[800px] w-[1100px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(242,169,59,0.13),transparent_60%)]" />
          {/* Bottom fade into next section */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent to-[#0d0b09]" />

          <div className="mx-auto max-w-7xl px-6 md:px-10">
            <div className="grid min-h-[calc(100dvh-58px)] items-center gap-14 py-16 lg:grid-cols-[1fr_460px] lg:gap-16 lg:py-20">

              {/* Left — copy */}
              <div className="max-w-xl">
                <p className="lp-pill-pop mb-7 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#F2A93B]/75">
                  <span className="lp-dot-pulse size-1.5 rounded-full bg-[#F2A93B]" aria-hidden="true" />
                  HR AI · Briefing Room
                </p>

                <h1 className="lp-fade-up lp-d-100 text-[2.75rem] font-semibold leading-[1.07] tracking-[-0.025em] text-paper md:text-[3.5rem] lg:text-[4rem]">
                  Your people work,
                  <br />
                  <span className="text-paper/35">ordered and ready</span>
                  <br />
                  every morning.
                </h1>

                <p className="lp-fade-up lp-d-200 mt-7 max-w-[400px] text-[1.0625rem] leading-[1.8] text-paper/50">
                  Skylar reads every open HR thread, ranks them by urgency, and delivers
                  a plain-language briefing — so every conversation starts prepared.
                </p>

                <div className="lp-fade-up lp-d-300 mt-10 flex flex-wrap items-center gap-4">
                  <Link
                    href={LOGIN_PATH}
                    className="group inline-flex h-11 items-center gap-2 rounded-full bg-paper px-7 text-sm font-semibold text-[#0d0b09] shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_8px_24px_rgba(244,239,231,0.14)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_12px_36px_rgba(244,239,231,0.24)]"
                  >
                    Start free — 14 days
                    <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                  <Link
                    href={LOGIN_PATH}
                    className="inline-flex h-11 items-center gap-1.5 text-sm text-paper/45 transition-all duration-200 hover:gap-2 hover:text-paper"
                  >
                    Sign in
                    <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>

                <p className="lp-fade-in lp-d-400 mt-4 text-xs text-paper/25">No credit card · Cancel any time</p>

                {/* Metrics row */}
                <div className="mt-12 flex flex-wrap gap-8 pt-8">
                  {[
                    { n: "< 5 min", d: "Signup to first plan", delay: "lp-d-500" },
                    { n: "4 hrs",   d: "Advisor SLA",           delay: "lp-d-600" },
                    { n: "100%",    d: "Passwordless",           delay: "lp-d-700" },
                  ].map(({ n, d, delay }) => (
                    <div key={d} className={`lp-count-in ${delay}`}>
                      <p className="text-[1.35rem] font-semibold tabular-nums text-paper">{n}</p>
                      <p className="mt-0.5 text-[11.5px] text-paper/35">{d}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — product card */}
              <div className="lp-card-rise lp-d-300 relative">
                {/* Warm glow behind the card — pulses */}
                <div className="lp-glow-pulse pointer-events-none absolute -inset-10 bg-[radial-gradient(ellipse_at_center,rgba(242,169,59,0.10),transparent_65%)]" />

                {/* Depth cards behind */}
                <div className="absolute inset-x-10 top-6 h-16 rounded-[18px] bg-white/[0.015] ring-1 ring-white/[0.04]" />
                <div className="absolute inset-x-5 top-3 h-20 rounded-[20px] bg-white/[0.03] ring-1 ring-white/[0.06]" />

                {/* Main briefing card — floats + shimmer on load */}
                <div className="lp-float lp-card-shimmer relative overflow-hidden rounded-[22px] bg-[#f0e9e0] text-[#1c1510] shadow-[0_40px_80px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.08)] transition-shadow duration-500 hover:shadow-[0_48px_100px_rgba(0,0,0,0.72),0_0_0_1px_rgba(255,255,255,0.12)]">
                  {/* Header */}
                  <div className="flex items-center justify-between bg-[#ebe3d9] px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Image src="/brand/logo.png" alt="" width={16} height={16} aria-hidden="true" className="opacity-60" />
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.15em] text-[#1c1510]/45">Skylar Briefing</span>
                    </div>
                    <span className="text-[10.5px] text-[#1c1510]/35">Thu, Oct 2 · 8:14 am</span>
                  </div>

                  <div className="px-6 py-5">
                    <p className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-[#1c1510]/30">
                      Priority 1 of 5
                    </p>
                    <h3 className="mt-2.5 text-[1.15rem] font-semibold leading-snug text-[#1c1510]">
                      Check in with Marcus before his performance review at 2 pm.
                    </h3>
                    <p className="mt-2.5 text-[13px] leading-[1.65] text-[#1c1510]/55">
                      He raised a pay question last week. Skylar suggests acknowledging it early — before it surfaces mid-review.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-[#1c1510]/[0.07] px-3 py-1 text-[11px] font-medium text-[#1c1510]/55 transition-colors duration-200 hover:bg-[#1c1510]/[0.12]">Performance</span>
                      <span className="rounded-full bg-[#F2A93B]/[0.18] px-3 py-1 text-[11px] font-medium text-[#7a4a00]">Due today</span>
                    </div>

                    <div className="mt-4 space-y-1.5">
                      {["Talking points drafted", "Script ready", "Filed to employee record"].map((item) => (
                        <div key={item} className="flex items-center gap-2 text-[12px] text-[#1c1510]/50">
                          <CheckCircle2 className="size-3.5 shrink-0 text-[#2e9955]" aria-hidden="true" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between bg-[#ebe3d9]/60 px-5 py-3.5">
                    <div className="flex gap-2">
                      <button type="button" className="rounded-full bg-[#1c1510] px-4 py-1.5 text-[12px] font-semibold text-[#f0e9e0] transition-all duration-200 hover:scale-105 hover:bg-[#2e2318] active:scale-95">Next →</button>
                      <button type="button" className="rounded-full border border-[#1c1510]/10 px-4 py-1.5 text-[12px] text-[#1c1510]/40 transition-colors duration-200 hover:border-[#1c1510]/20 hover:text-[#1c1510]/60">Not now</button>
                    </div>
                    <span className="text-[10.5px] text-[#1c1510]/25">Prepared by Skylar AI</span>
                  </div>
                </div>

                {/* Floating advisor pill */}
                <div className="lp-pill-pop lp-d-900 lp-border-glow absolute -bottom-5 -right-3 hidden rounded-xl border border-white/[0.08] bg-[#17130f] px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.6)] lg:block">
                  <p className="text-[9.5px] font-bold uppercase tracking-widest text-paper/30">Advisor case</p>
                  <p className="mt-1 text-[13px] font-semibold text-paper">Reply within 4 hrs</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="lp-dot-pulse size-1.5 rounded-full bg-[#F2A93B]" aria-hidden="true" />
                    <span className="text-[11px] text-[#F2A93B]">With advisor</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            PRODUCT SECTION — no divider, flows out of hero
        ══════════════════════════════════════════════════════════ */}
        <section id="product" className="relative px-6 pb-32 pt-12 md:px-10 md:pb-40 md:pt-16">
          {/* Mid-page ambient glow */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

          <div className="mx-auto max-w-7xl">
            <div className="grid gap-16 lg:grid-cols-2 lg:gap-28">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#F2A93B]/65">What Skylar does</p>
                <h2 className="mt-5 text-[2.5rem] font-semibold leading-[1.1] tracking-tight text-paper md:text-5xl">
                  One AI that holds
                  <br />
                  every people thread.
                </h2>
                <p className="mt-5 max-w-[380px] text-[15.5px] leading-[1.8] text-paper/45">
                  Not a form builder or a policy library. A thinking partner that remembers every conversation, flags every risk, and tells you what to do next.
                </p>

                <div className="mt-10 space-y-6">
                  {[
                    { icon: <Zap className="size-[15px]" />, title: "Live-in-5", body: "Describe a situation. Get a complete action plan — recommended approach, script, documentation — in under five minutes." },
                    { icon: <Users className="size-[15px]" />, title: "Employee memory", body: "Every note and conversation saved per employee. The second session starts exactly where the first ended." },
                    { icon: <ShieldAlert className="size-[15px]" />, title: "Advisor escalation", body: "High-risk situations flagged and routed to a named HR advisor with full context. 4-hour response commitment." },
                    { icon: <FileText className="size-[15px]" />, title: "Daily briefing", body: "Prioritised card stack every morning. Advisor cases first, then what's due, then context. Just tap NEXT." },
                  ].map(({ icon, title, body }) => (
                    <div key={title} className="group flex gap-3.5 transition-all duration-300">
                      <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border border-white/[0.07] bg-white/[0.04] text-paper/40 transition-all duration-300 group-hover:border-[#F2A93B]/20 group-hover:bg-[#F2A93B]/[0.07] group-hover:text-[#F2A93B]/70">
                        {icon}
                      </div>
                      <div>
                        <p className="text-[14.5px] font-semibold text-paper transition-colors duration-200 group-hover:text-paper">{title}</p>
                        <p className="mt-1 text-[13.5px] leading-[1.7] text-paper/40 transition-colors duration-200 group-hover:text-paper/55">{body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="rounded-2xl bg-white/[0.025] p-6 ring-1 ring-white/[0.05]">
                  <p className="mb-4 text-[10.5px] font-semibold uppercase tracking-[0.17em] text-paper/25">Without Skylar</p>
                  <ul className="space-y-3">
                    {[
                      "Re-read every email thread before each 1-on-1",
                      "Forget what was said two weeks ago",
                      "Handle sensitive situations blind to the risk level",
                      "Build documentation from scratch every time",
                      "Miss follow-ups when things fall off your radar",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3 text-[13.5px] text-paper/30">
                        <span className="mt-[7px] size-[5px] shrink-0 rounded-full bg-paper/20" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl bg-[#F2A93B]/[0.05] p-6 ring-1 ring-[#F2A93B]/[0.12]">
                  <p className="mb-4 text-[10.5px] font-semibold uppercase tracking-[0.17em] text-[#F2A93B]/60">With Skylar</p>
                  <ul className="space-y-3">
                    {[
                      "Open the briefing — every conversation already prepared",
                      "Every thread continues where it ended",
                      "High-risk situations flagged before you act",
                      "Documentation drafted and filed in the same session",
                      "Outstanding threads lead tomorrow's briefing automatically",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3 text-[13.5px] text-paper/65">
                        <CheckCircle2 className="mt-[1px] size-4 shrink-0 text-[#4CD07D]" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            HOW IT WORKS — no hard top border, gradient fade in
        ══════════════════════════════════════════════════════════ */}
        <section id="how-it-works" className="relative px-6 pb-32 pt-4 md:px-10 md:pb-40">
          {/* Thin gradient line instead of border */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />

          <div className="mx-auto max-w-7xl">
            <div className="mb-14 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#F2A93B]/65">How it works</p>
                <h2 className="mt-4 text-[2.5rem] font-semibold leading-[1.1] tracking-tight text-paper md:text-5xl">
                  From first message
                  <br />
                  to filed plan in minutes.
                </h2>
              </div>
              <Link href={LOGIN_PATH} className="inline-flex items-center gap-1.5 text-sm text-paper/35 transition-colors duration-200 hover:text-paper">
                Start free trial <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>

            <div className="grid md:grid-cols-3">
              {[
                { n: "01", title: "Describe the situation", body: "Tell Skylar what's happening with one of your people. Two follow-up questions. One complete action plan — approach, script, documentation — saved to the employee's file." },
                { n: "02", title: "Read your morning briefing", body: "Every morning Skylar orders your open threads by urgency and surfaces the single most important action. No dashboard, no scanning. Just what to do first." },
                { n: "03", title: "Escalate when stakes are high", body: "Skylar flags legally sensitive situations and routes them to a named advisor with the full case history. Response within four business hours, tracked in your briefing." },
              ].map(({ n, title, body }, i) => (
                <div key={n} className={`group relative px-8 py-10 transition-colors duration-300 hover:bg-white/[0.015] ${i > 0 ? "border-l border-white/[0.04]" : ""}`}>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px scale-x-0 bg-gradient-to-r from-transparent via-[#F2A93B]/30 to-transparent transition-transform duration-500 group-hover:scale-x-100" />
                  <p className="mb-6 font-mono text-[2.25rem] font-semibold leading-none text-paper/[0.06] transition-colors duration-300 group-hover:text-[#F2A93B]/15">{n}</p>
                  <h3 className="text-[15.5px] font-semibold text-paper">{title}</h3>
                  <p className="mt-2.5 text-[13.5px] leading-[1.8] text-paper/40 transition-colors duration-300 group-hover:text-paper/55">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            PRICING
        ══════════════════════════════════════════════════════════ */}
        <section id="pricing" className="relative px-6 pb-32 pt-4 md:px-10 md:pb-40">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />

          <div className="mx-auto max-w-7xl">
            <div className="grid gap-16 lg:grid-cols-2 lg:gap-28">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#F2A93B]/65">Pricing</p>
                <h2 className="mt-5 text-[2.5rem] font-semibold leading-[1.1] tracking-tight text-paper md:text-5xl">
                  Start free.
                  <br />
                  Stay if it works.
                </h2>
                <p className="mt-5 text-[15.5px] leading-[1.8] text-paper/45">
                  14-day free trial, full access. No credit card to start.
                </p>

                <div className="mt-9 space-y-2.5">
                  {[
                    "Unlimited employees",
                    "Daily AI briefing deck",
                    "Conversation memory per employee",
                    "Advisor escalation routing",
                    "Team seats included",
                    "PDF document exports",
                    "Passwordless sign-in",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3 text-[13.5px] text-paper/55">
                      <CheckCircle2 className="size-4 shrink-0 text-[#4CD07D]" aria-hidden="true" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="w-full max-w-[340px] rounded-3xl bg-white/[0.04] p-8 ring-1 ring-white/[0.09] transition-all duration-500 hover:bg-white/[0.06] hover:shadow-[0_16px_60px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.12)]">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-paper/35">Professional</p>
                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="text-[3rem] font-semibold leading-none text-paper">$49</span>
                    <span className="text-sm text-paper/35">/ mo</span>
                  </div>
                  <p className="mt-1 text-xs text-paper/25">per workspace · billed monthly</p>

                  <Link
                    href={LOGIN_PATH}
                    className="mt-7 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-paper text-sm font-semibold text-[#0d0b09] transition-opacity hover:opacity-90"
                  >
                    Start 14-day free trial
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                  <p className="mt-2.5 text-center text-[11px] text-paper/25">No credit card required</p>

                  <div className="mt-7 space-y-4 border-t border-white/[0.06] pt-6">
                    {[
                      { q: "Can I invite my team?", a: "Yes — admins invite from settings." },
                      { q: "What happens after the trial?", a: "Add a card to continue. No auto-charge." },
                      { q: "Is my data private?", a: "Each workspace is fully isolated." },
                    ].map(({ q, a }) => (
                      <div key={q}>
                        <p className="text-[13px] font-semibold text-paper/65">{q}</p>
                        <p className="mt-0.5 text-[12px] text-paper/30">{a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            FINAL CTA — amber wash, no hard top border
        ══════════════════════════════════════════════════════════ */}
        <section className="relative px-6 pb-28 md:px-10 md:pb-36">
          <div className="mx-auto max-w-7xl">
            <div className="group relative overflow-hidden rounded-3xl bg-[#F2A93B]/[0.07] px-8 py-24 text-center ring-1 ring-[#F2A93B]/[0.10] transition-all duration-700 hover:bg-[#F2A93B]/[0.09] hover:ring-[#F2A93B]/[0.18] md:py-32">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_65%_at_50%_0%,rgba(242,169,59,0.14),transparent_65%)]" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(242,169,59,0.06),transparent)]" />
              <div className="relative">
                <Image src="/brand/logo.png" alt="Skylar" width={48} height={48} className="mx-auto mb-7 opacity-85" />
                <h2 className="text-[2.5rem] font-semibold leading-[1.1] tracking-tight text-paper md:text-5xl lg:text-[3.5rem]">
                  Walk into every day
                  <br />
                  already prepared.
                </h2>
                <p className="mx-auto mt-5 max-w-[380px] text-[15.5px] leading-[1.8] text-paper/45">
                  No setup. No configuration. Tell Skylar what&apos;s going on and your first briefing is ready in minutes.
                </p>
                <Link
                  href={LOGIN_PATH}
                  className="mt-9 inline-flex h-11 items-center gap-2 rounded-full bg-paper px-10 text-sm font-semibold text-[#0d0b09] shadow-[0_4px_24px_rgba(244,239,231,0.18)] transition-all hover:opacity-90"
                >
                  Start free — 14 days
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <p className="mt-3 text-xs text-paper/25">No credit card required</p>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="px-6 py-10 md:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/brand/logo.png" alt="Skylar" width={22} height={22} />
              <span className="text-[15px] font-semibold text-paper">Skylar</span>
            </Link>
            <nav className="flex flex-wrap gap-5" aria-label="Footer">
              {[
                { href: "#product", label: "Product" },
                { href: "#how-it-works", label: "How it works" },
                { href: "#pricing", label: "Pricing" },
                { href: LOGIN_PATH, label: "Sign in", external: false },
                { href: TERMS_PATH, label: "Terms", external: false },
                { href: PRIVACY_PATH, label: "Privacy", external: false },
              ].map(({ href, label }) => (
                <Link key={label} href={href} className="text-[13px] text-paper/28 transition-colors duration-200 hover:text-paper/70">
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="mt-8 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
          <p className="mt-5 text-[12px] text-paper/18">© {new Date().getFullYear()} Skylar HR. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
