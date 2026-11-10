import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ArrowUpRight, CheckCircle2, FileText, ShieldAlert, Users, Zap } from "lucide-react";
import { BRIEFING_PATH, LOGIN_PATH, PRIVACY_PATH, SIGNUP_PATH, TERMS_PATH } from "@/constants/routes";
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
                {["Product", "How it works", "Plans"][i]}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <Link href={LOGIN_PATH} className="hidden text-[13.5px] text-paper/45 transition-colors hover:text-paper lg:block">
              Sign in
            </Link>
            <Link
              href={SIGNUP_PATH}
              className="inline-flex h-[34px] items-center gap-2 rounded-full bg-paper px-5 text-[13px] font-semibold text-[#0d0b09] transition-opacity hover:opacity-90"
            >
              Try Skylar free
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
              <div className="max-w-2xl">
                <p className="lp-pill-pop mb-7 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#F2A93B]/75">
                  <span className="lp-dot-pulse size-1.5 rounded-full bg-[#F2A93B]" aria-hidden="true" />
                  Your next people decision
                </p>

                <h1 className="lp-fade-up lp-d-100 text-[2.75rem] font-semibold leading-[1.07] tracking-[-0.025em] text-paper md:text-[3.5rem] lg:text-[3.75rem]">
                  <span className="md:whitespace-nowrap">Less second-guessing.</span>
                  <br />
                  <span className="text-paper/35">Clear next steps.</span>
                </h1>

                <p className="lp-fade-up lp-d-200 mt-7 max-w-[400px] text-[1.0625rem] leading-[1.8] text-paper/50">
                  A difficult conversation. A policy question. Something you haven&apos;t dealt with
                  before. Work through it in real time with Skylar AI, or access a human Skylar HR pro when the questions get tough.
                </p>

                <div className="lp-fade-up lp-d-300 mt-10 flex flex-wrap items-center gap-4">
                  <Link
                    href={SIGNUP_PATH}
                    className="group inline-flex h-11 items-center gap-2 rounded-full bg-paper px-7 text-sm font-semibold text-[#0d0b09] shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_8px_24px_rgba(244,239,231,0.14)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_12px_36px_rgba(244,239,231,0.24)]"
                  >
                    Try Skylar for 14 days
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

                <p className="lp-fade-in lp-d-400 mt-4 text-xs text-paper/25">No credit card required</p>

              </div>

              {/* Right — product card */}
              <div className="lp-card-rise lp-d-300 relative">
                {/* Warm glow behind the card — pulses */}
                <div className="lp-glow-pulse pointer-events-none absolute -inset-10 bg-[radial-gradient(ellipse_at_center,rgba(242,169,59,0.10),transparent_65%)]" />

                {/* Depth cards behind */}
                <div className="absolute inset-x-10 top-6 h-16 rounded-[18px] bg-paper/[0.015] ring-1 ring-paper/[0.04]" />
                <div className="absolute inset-x-5 top-3 h-20 rounded-[20px] bg-paper/[0.03] ring-1 ring-paper/[0.06]" />

                {/* Main briefing card — floats + shimmer on load */}
                <div className="lp-float lp-card-shimmer relative overflow-hidden rounded-[22px] bg-[#f0e9e0] text-[#1c1510] shadow-[0_40px_80px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.08)] transition-shadow duration-500 hover:shadow-[0_48px_100px_rgba(0,0,0,0.72),0_0_0_1px_rgba(255,255,255,0.12)]">
                  {/* Header */}
                  <div className="flex items-center justify-between bg-[#ebe3d9] px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Image src="/brand/logo.png" alt="" width={16} height={16} aria-hidden="true" className="opacity-60" />
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.15em] text-[#1c1510]/45">Skylar Briefing</span>
                    </div>
                    <span className="text-[10.5px] text-[#1c1510]/35">Example: before a review</span>
                  </div>

                  <div className="px-6 py-5">
                    <p className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-[#1c1510]/30">
                      Start with what&apos;s still open
                    </p>
                    <h3 className="mt-2.5 text-[1.15rem] font-semibold leading-snug text-[#1c1510]">
                      Don&apos;t let last week&apos;s pay question get lost in today&apos;s review.
                    </h3>
                    <p className="mt-2.5 text-[13px] leading-[1.65] text-[#1c1510]/55">
                      Marcus asked about pay. Open with that context, listen to what&apos;s changed and record the next step after the conversation.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-[#1c1510]/[0.07] px-3 py-1 text-[11px] font-medium text-[#1c1510]/55 transition-colors duration-200 hover:bg-[#1c1510]/[0.12]">Performance</span>
                      <span className="rounded-full bg-[#F2A93B]/[0.18] px-3 py-1 text-[11px] font-medium text-[#7a4a00]">Due today</span>
                    </div>

                    <div className="mt-4 space-y-1.5">
                      {["Review talking points", "Review draft", "Save to employee file"].map((item) => (
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
                    <span className="text-[10.5px] text-[#1c1510]/25">AI-generated draft. Review before use.</span>
                  </div>
                </div>

                {/* Floating advisor pill */}
                <div className="lp-pill-pop lp-d-900 lp-border-glow absolute -bottom-5 -right-3 hidden rounded-xl border border-paper/[0.08] bg-[#17130f] px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.6)] lg:block">
                  <p className="text-[9.5px] font-bold uppercase tracking-widest text-paper/30">Human HR support</p>
                  <p className="mt-1 text-[13px] font-semibold text-paper">Ask a Skylar HR professional</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="lp-dot-pulse size-1.5 rounded-full bg-[#F2A93B]" aria-hidden="true" />
                    <span className="text-[11px] text-[#F2A93B]">One free escalation in your trial</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            PROOF STRIP
        ══════════════════════════════════════════════════════════ */}
        <section className="px-6 md:px-10">
          <div className="mx-auto grid max-w-7xl divide-y divide-paper/[0.08] border-y border-paper/[0.08] md:grid-cols-3 md:divide-x md:divide-y-0">
            {[
              { n: "Start a dialogue", d: "Get an outcome" },
              { n: "Keep a record", d: "Won\u2019t forget the history" },
              { n: "Passwordless sign-in", d: "One less thing to remember" },
            ].map(({ n, d }, i) => (
              <div key={n} style={{ animationDelay: `${i * 80}ms` }} className="lp-reveal py-8 md:px-10 md:first:pl-0 md:last:pr-0">
                <p className="text-lg font-semibold tracking-tight text-paper">{n}</p>
                <p className="mt-1 text-[13.5px] text-paper/45">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            PRODUCT — sticky intro, features as a ruled list
        ══════════════════════════════════════════════════════════ */}
        <section id="product" className="px-6 py-28 md:px-10 md:py-40">
          <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-24">
            <div className="lp-reveal self-start lg:sticky lg:top-32">
              <p className="text-sm font-medium text-[#F2A93B]/80">What Skylar does</p>
              <h2 className="mt-4 text-[2.5rem] font-semibold leading-[1.08] tracking-[-0.02em] text-paper md:text-5xl">
                A thinking partner for HR questions that can&apos;t wait.
              </h2>
              <p className="mt-6 max-w-[46ch] text-[15.5px] leading-[1.8] text-paper/50">
                Work through employee situations with Skylar AI, prepare what to say and keep a record you can return to. When you need human judgment, bring the question to a Skylar HR professional.
              </p>
            </div>

            <ul className="divide-y divide-paper/[0.08] border-y border-paper/[0.08]">
              {[
                { icon: <Zap className="size-[18px]" />, title: "What's the situation?", body: "Describe what is happening. Work through an approach, draft talking points and a record to review before you use it, in under five minutes." },
                { icon: <Users className="size-[18px]" />, title: "Keep the context", body: "Saved notes and conversations with the relevant employee records come standard, so you can return to what was discussed." },
                { icon: <ShieldAlert className="size-[18px]" />, title: "A person behind the guidance", body: "Skylar AI is a place to start. But when you need real human experience, bring your situation to a Skylar HR professional." },
                { icon: <FileText className="size-[18px]" />, title: "A clear place to start", body: "Review open situations and upcoming follow-ups in one briefing. Start with the conversation that needs your attention." },
              ].map(({ icon, title, body }, i) => (
                <li key={title} style={{ animationDelay: `${i * 60}ms` }} className="lp-reveal group flex gap-6 py-9 md:gap-8">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-paper/[0.04] text-paper/50 ring-1 ring-paper/[0.08] transition-colors duration-300 group-hover:bg-[#F2A93B]/[0.1] group-hover:text-[#F2A93B] group-hover:ring-[#F2A93B]/30">
                    {icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight text-paper">{title}</h3>
                    <p className="mt-2 max-w-[52ch] text-[14.5px] leading-[1.75] text-paper/50">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            BEFORE / AFTER — one panel, two sides
        ══════════════════════════════════════════════════════════ */}
        <section className="px-6 pb-28 md:px-10 md:pb-40">
          <div className="lp-reveal mx-auto grid max-w-7xl overflow-hidden rounded-[28px] ring-1 ring-paper/[0.08] md:grid-cols-2">
            <div className="bg-paper/[0.025] p-8 md:p-14">
              <h3 className="text-2xl font-semibold tracking-tight text-paper/55 md:text-3xl">When you&apos;re handling it alone</h3>
              <ul className="mt-8 space-y-4">
                {[
                  "Starting each conversation from scratch",
                  "Searching notes for what you need",
                  "Staring at a blank document",
                  "Carrying the next step in your head",
                ].map((item) => (
                  <li key={item} className="text-[15px] text-paper/40 line-through decoration-paper/20 decoration-1">{item}</li>
                ))}
              </ul>
            </div>
            <div className="relative bg-[#F2A93B]/[0.07] p-8 md:p-14">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(242,169,59,0.14),transparent_60%)]" />
              <h3 className="relative text-2xl font-semibold tracking-tight text-paper md:text-3xl">With Skylar</h3>
              <ul className="relative mt-8 space-y-4">
                {[
                  "Context you can return to",
                  "A place for the employee record",
                  "A draft to review and make your own",
                  "A clearer view of open work",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[15px] text-paper/80">
                    <CheckCircle2 className="mt-0.5 size-[18px] shrink-0 text-[#F2A93B]" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            HOW IT WORKS — three ruled columns
        ══════════════════════════════════════════════════════════ */}
        <section id="how-it-works" className="px-6 pb-28 md:px-10 md:pb-40">
          <div className="mx-auto max-w-7xl">
            <div className="lp-reveal max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#F2A93B]/70">How it works</p>
              <h2 className="mt-4 text-[2.5rem] font-semibold leading-[1.08] tracking-[-0.02em] text-paper md:text-5xl">
                A colleague to think with.<br className="hidden md:block" /> A professional to turn to.
              </h2>
            </div>

            <div className="mt-16 grid gap-x-10 gap-y-12 md:grid-cols-3">
              {[
                { n: "01", title: "Start with one situation", body: "Describe the employee situation in your own words. Work through the facts and a possible next step, with talking points and a record to review before you use it." },
                { n: "02", title: "Read your daily briefing", body: "Skylar tracks next steps, urgency and reminders for you. Each morning your open threads are ordered so you know what to do first." },
                { n: "03", title: "Get a person's perspective", body: "Bring in a human Skylar HR professional when you need human judgment. One free escalation is included in your trial." },
              ].map(({ n, title, body }, i) => (
                <div key={n} style={{ animationDelay: `${i * 90}ms` }} className="lp-reveal group border-t border-paper/[0.12] pt-8 transition-colors duration-300 hover:border-[#F2A93B]/60">
                  <p className="font-mono text-sm text-[#F2A93B]/80">{n}</p>
                  <h3 className="mt-6 text-xl font-semibold tracking-tight text-paper">{title}</h3>
                  <p className="mt-3 max-w-[44ch] text-[14.5px] leading-[1.75] text-paper/50">{body}</p>
                </div>
              ))}
            </div>

            <Link href={SIGNUP_PATH} className="lp-reveal mt-14 inline-flex items-center gap-2 text-sm font-medium text-paper/60 transition-all duration-200 hover:gap-3 hover:text-paper">
              Try Skylar for 14 days <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            PRICING
        ══════════════════════════════════════════════════════════ */}
        <section id="pricing" className="relative px-6 pb-32 pt-4 md:px-10 md:pb-40">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-paper/[0.05] to-transparent" />

          <div className="mx-auto max-w-7xl">
            <div className="lp-reveal max-w-xl">
              <p className="text-sm font-medium text-[#F2A93B]/80">A place to start</p>
              <h2 className="mt-5 text-[2.5rem] font-semibold leading-[1.1] tracking-tight text-paper md:text-5xl">
                Meet your new
                <br />
                thinking partner.
              </h2>
              <p className="mt-5 text-[15.5px] leading-[1.8] text-paper/45">
                Try unlimited chat with Skylar AI for 14 days, with one free escalation to a human Skylar HR professional. No credit card required.
              </p>
            </div>

            <div className="mt-14 grid gap-5 md:grid-cols-2">
              <div className="lp-reveal flex flex-col rounded-3xl bg-paper/[0.03] p-8 ring-1 ring-paper/[0.08] md:p-10">
                <p className="text-sm font-semibold text-paper/70">Get to know Skylar</p>
                <p className="mt-4 text-[2.75rem] font-semibold leading-none tracking-tight text-paper">14 days, free</p>
                <p className="mt-3 text-[14px] leading-6 text-paper/50">Try Skylar with the questions on your desk.</p>
                <ul className="mt-8 flex-1 space-y-3.5">
                  {[
                    "Ask Skylar AI as many questions as you need during your trial",
                    "One free escalation to a human Skylar HR professional",
                    "No credit card required",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-[14px] leading-5 text-paper/70">
                      <CheckCircle2 className="mt-px size-4 shrink-0 text-paper/40" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href={SIGNUP_PATH}
                  className="mt-10 flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-paper/[0.07] text-sm font-semibold text-paper ring-1 ring-paper/[0.12] transition-colors hover:bg-paper/[0.12] active:scale-[0.98]"
                >
                  Begin your 14-day trial
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>

              <div className="lp-reveal relative flex flex-col rounded-3xl bg-[#F2A93B]/[0.06] p-8 shadow-[0_24px_80px_rgba(242,169,59,0.08)] ring-1 ring-[#F2A93B]/30 md:p-10" style={{ animationDelay: "100ms" }}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-paper">Professional</p>
                  <span className="rounded-full bg-[#F2A93B]/15 px-2.5 py-1 text-[11px] font-semibold text-[#F2A93B]">After your trial</span>
                </div>
                <p className="mt-4 flex items-baseline gap-1.5 text-paper">
                  <span className="text-[2.75rem] font-semibold leading-none tracking-tight">$149</span>
                  <span className="text-sm text-paper/45">/ month</span>
                </p>
                <p className="mt-3 text-[14px] leading-6 text-paper/55">Keep the conversation going. Make Skylar part of how you prepare for employee conversations and HR questions.</p>
                <ul className="mt-8 flex-1 space-y-3.5">
                  {[
                    "Everything in your trial",
                    "Secure checkout and invoices by Stripe",
                    "Cancel any time from the billing portal",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-[14px] leading-5 text-paper/75">
                      <CheckCircle2 className="mt-px size-4 shrink-0 text-[#F2A93B]" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href={SIGNUP_PATH}
                  className="mt-10 flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-paper text-sm font-semibold text-[#0d0b09] transition-opacity hover:opacity-90 active:scale-[0.98]"
                >
                  Choose Skylar
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <p className="mt-3 text-center text-[11px] text-paper/40">Start with the trial, upgrade when you are ready</p>
              </div>
            </div>

            <dl className="lp-reveal mt-16 grid gap-x-16 gap-y-10 border-t border-paper/[0.08] pt-12 md:grid-cols-2">
              {[
                { q: "Can I invite my team?", a: "Yes. Admins invite teammates from Settings, on any plan." },
                { q: "What's included in the trial?", a: "Your 14-day free trial includes unlimited chat with Skylar AI and one free escalation to a human Skylar HR professional. No credit card required." },
                { q: "Am I chatting with AI or a person?", a: "Chat with Skylar AI to work through your questions. Human support is a separate escalation to a Skylar HR professional; your 14-day trial includes one free escalation." },
                { q: "Is my data private?", a: "Each workspace is fully isolated. Payments are handled by Stripe; we never see your card." },
              ].map(({ q, a }) => (
                <div key={q}>
                  <dt className="text-[15px] font-semibold text-paper/85">{q}</dt>
                  <dd className="mt-2 max-w-[52ch] text-[14px] leading-6 text-paper/50">{a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            FINAL CTA — left aligned, button on the right
        ══════════════════════════════════════════════════════════ */}
        <section className="px-6 pb-28 md:px-10 md:pb-36">
          <div className="lp-reveal relative mx-auto max-w-7xl overflow-hidden rounded-[28px] bg-[#F2A93B]/[0.07] p-8 ring-1 ring-[#F2A93B]/[0.14] md:p-16">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_90%_at_0%_100%,rgba(242,169,59,0.16),transparent_65%)]" />
            <div className="relative grid gap-10 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <h2 className="max-w-3xl text-[2.5rem] font-semibold leading-[1.08] tracking-[-0.02em] text-paper md:text-[3.5rem]">
                  You don&apos;t need every answer. You need a thinking partner.
                </h2>
                <p className="mt-5 max-w-[52ch] text-[15.5px] leading-[1.8] text-paper/55">
                  Bring the question on your mind. Work through a useful next step with Skylar AI, with human HR support available through escalation.
                </p>
              </div>
              <div className="md:text-right">
                <Link
                  href={SIGNUP_PATH}
                  className="group inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full bg-paper px-8 text-sm font-semibold text-[#0d0b09] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Try Skylar for 14 days
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
                <p className="mt-3 text-xs text-paper/40">No credit card required</p>
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
                { href: "#product", label: "Explore the product" },
                { href: "#how-it-works", label: "How it works" },
                { href: "#pricing", label: "Plans" },
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
          <div className="mt-8 h-px bg-gradient-to-r from-transparent via-paper/[0.05] to-transparent" />
          <p className="mt-5 text-[12px] text-paper/18">© {new Date().getFullYear()} Skylar HR. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
