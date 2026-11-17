import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Compass,
  FileCheck,
  History,
  KeyRound,
  Lock,
  MessageSquare,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { BRIEFING_PATH, LOGIN_PATH, PRIVACY_PATH, SIGNUP_PATH, TERMS_PATH } from "@/constants/routes";
import { getSession } from "@/server/auth/get-session";
import { ExecutiveWorkbench } from "@/components/marketing/executive-workbench";
import { ScrollRevealProvider } from "@/components/marketing/scroll-reveal-provider";

export default async function MarketingPage() {
  if (await getSession()) redirect(BRIEFING_PATH);

  return (
    <div className="relative min-h-dvh bg-[#090807] text-paper selection:bg-[#F2A93B]/25">
      <ScrollRevealProvider />

      {/* ── Background Noise & Ambient Glow Gradients ───────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="pointer-events-none fixed left-1/2 top-0 z-0 h-[700px] w-[1300px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(242,169,59,0.16),transparent_70%)]" />

      {/* ── Navigation Header ────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-paper/[0.07] bg-[#090807]/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-[64px] max-w-7xl items-center justify-between px-4 sm:px-6 md:px-10">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="grid size-8 place-items-center rounded-lg border border-paper/10 bg-paper/[0.04] transition-colors group-hover:border-[#F2A93B]/40">
              <Image src="/brand/logo.png" alt="Skylar" width={20} height={20} className="shrink-0" />
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] font-bold tracking-tight text-paper">Skylar</span>
              <span className="text-[9.5px] font-semibold tracking-widest text-[#F2A93B] uppercase -mt-0.5">HR Partner</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {[
              { href: "#difference", label: "The difference" },
              { href: "#how-it-works", label: "How it works" },
              { href: "#scenarios", label: "Scenarios" },
              { href: "#workflow", label: "Workflow" },
              { href: "#security", label: "Security" },
              { href: "#pricing", label: "Plans" },
              { href: "#faqs", label: "FAQs" },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="text-[13.5px] font-medium text-paper/55 transition-colors duration-200 hover:text-paper"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href={LOGIN_PATH}
              className="hidden text-[13.5px] font-medium text-paper/60 transition-colors hover:text-paper lg:block"
            >
              Sign in
            </Link>
            <Link
              href={SIGNUP_PATH}
              className="inline-flex h-[38px] items-center gap-2 rounded-full bg-paper px-5 text-[13px] font-semibold text-[#0d0b09] shadow-[0_0_20px_rgba(242,169,59,0.18)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_28px_rgba(242,169,59,0.3)]"
            >
              <span>Try it free</span>
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">

        {/* ══════════════════════════════════════════════════════════
            1. HERO SECTION: COMMANDING CENTERED SAAS LAUNCHPAD
        ══════════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden pt-[88px] pb-10 sm:pt-[125px] sm:pb-16 md:pt-[140px] md:pb-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-10">

            {/* Centered Hero Header */}
            <div className="mx-auto flex max-w-4xl flex-col items-center text-center">

              {/* Eyebrow Pill - Clean single line, never wraps */}
              <div className="hero-anim-1 mb-3.5 sm:mb-5 inline-flex items-center gap-2 rounded-full border border-[#F2A93B]/25 bg-[#F2A93B]/[0.07] px-3 py-1 sm:px-3.5 sm:py-1.5 backdrop-blur-md">
                <span className="size-1.5 rounded-full bg-[#F2A93B] animate-pulse shrink-0" aria-hidden="true" />
                <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-[#F2A93B] uppercase whitespace-nowrap">
                  HR Support for Founders
                </span>
              </div>

              {/* Main H1 Headline: Balanced 2-line symmetry across devices, zero orphan words */}
              <h1 className="hero-anim-2 max-w-5xl text-[clamp(19px,5.4vw,22px)] sm:text-3xl md:text-4xl lg:text-[2.9rem] xl:text-[3.25rem] font-bold tracking-tight text-paper leading-[1.24] sm:leading-[1.15]">
                <span className="block whitespace-nowrap">An AI colleague to think with.</span>
                <span className="block whitespace-nowrap text-paper/40 font-semibold mt-1 sm:mt-2">A human professional to turn to.</span>
              </h1>

              {/* Supporting Subhead */}
              <p className="hero-anim-3 mt-3 sm:mt-4 text-[15px] sm:text-xl md:text-2xl font-medium tracking-tight text-paper/90 [text-wrap:balance]">
                Less second-guessing. <span className="whitespace-nowrap text-[#F2A93B]">Clear next steps.</span>
              </p>

              {/* Body Paragraph: Concise and balanced for mobile ergonomics */}
              <p className="hero-anim-4 mt-2.5 sm:mt-4 max-w-xl text-[13px] sm:text-[15.5px] leading-[1.65] sm:leading-[1.75] text-paper/60 px-2 [text-wrap:balance]">
                Think through tricky employee situations with Skylar AI, prepare what to say, and bring in a human HR professional when you need experienced judgment.
              </p>

              {/* CTA Action Buttons - Sleek side-by-side on mobile, immediately reachable */}
              <div className="hero-anim-5 mt-4 sm:mt-7 flex flex-row items-center justify-center gap-2.5 sm:gap-4 w-full sm:w-auto px-4 sm:px-0">
                <Link
                  href={SIGNUP_PATH}
                  className="group relative inline-flex h-11 sm:h-12 flex-1 sm:flex-initial items-center justify-center gap-2 rounded-full bg-paper px-6 sm:px-8 text-sm font-semibold text-[#0d0b09] shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_12px_35px_rgba(242,169,59,0.22)] transition-all duration-200 hover:scale-[1.02]"
                >
                  <span className="whitespace-nowrap">Try it free</span>
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1 shrink-0" aria-hidden="true" />
                </Link>
                <Link
                  href={LOGIN_PATH}
                  className="inline-flex h-11 sm:h-12 flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-full border border-paper/15 bg-paper/[0.04] px-5 sm:px-6 text-sm font-medium text-paper/75 backdrop-blur-md transition-all duration-200 hover:border-paper/30 hover:bg-paper/[0.08] hover:text-paper"
                >
                  <span className="whitespace-nowrap">Sign in</span>
                  <ArrowUpRight className="size-3.5 text-paper/40 shrink-0" aria-hidden="true" />
                </Link>
              </div>

              {/* Trust Signals */}
              <div className="hero-anim-5 mt-3.5 sm:mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs text-paper/50 px-4">
                <span className="inline-flex items-center gap-1.5 font-medium text-paper/80">
                  <CheckCircle2 className="size-3.5 text-[#F2A93B]" aria-hidden="true" />
                  No credit card required.
                </span>
                <span className="hidden sm:inline text-paper/20">•</span>
                <span>14-day trial includes unlimited AI chat and 1 human HR escalation.</span>
              </div>

            </div>

            {/* Panoramic SaaS Executive Console with Clean Briefing Room Mirroring */}
            <ExecutiveWorkbench />

          </div>
        </section>

        {/* ── Storytelling Transition Bridge ───────────────────────────── */}
        <div className="reveal-on-scroll mx-auto flex max-w-7xl items-center justify-center py-6 px-6" aria-hidden="true">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-px bg-gradient-to-b from-transparent via-[#F2A93B]/40 to-[#F2A93B]" />
            <span className="rounded-full border border-[#F2A93B]/30 bg-[#F2A93B]/10 px-3 py-1 font-mono text-[10.5px] font-semibold text-[#F2A93B]">
              THE DIFFERENCE
            </span>
            <div className="h-10 w-px bg-gradient-to-b from-[#F2A93B] via-[#F2A93B]/40 to-transparent" />
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            2. THE PROBLEM, THEN THE DIFFERENCE
        ══════════════════════════════════════════════════════════ */}
        <section id="difference" className="reveal-on-scroll relative px-4 sm:px-6 md:px-10 py-16 md:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#F2A93B]">
                <Clock className="size-3.5" />
                The difference
              </div>
              <h2 className="mt-4 text-2xl sm:text-3xl md:text-5xl font-bold leading-[1.15] tracking-[-0.025em] text-paper">
                The HR questions keep coming.
                <br className="hidden md:block" />
                <span className="text-paper/40">You don&apos;t have to carry them alone.</span>
              </h2>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {/* Without Skylar */}
              <div className="reveal-on-scroll reveal-delay-1 relative rounded-2xl border border-paper/[0.08] bg-paper/[0.02] p-6 sm:p-8 md:p-12 transition-all hover:border-paper/15">
                <div className="flex items-center justify-between border-b border-paper/[0.08] pb-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-paper/40">Without Skylar</p>
                  <span className="text-xs text-paper/35">Handling it alone</span>
                </div>
                <ul className="mt-8 space-y-4 sm:space-y-5">
                  {[
                    "Piece together the context before each conversation.",
                    "Wonder where to start with an unfamiliar situation.",
                    "Draft talking points and notes from scratch.",
                    "Carry the next step in your head.",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3.5 text-[14.5px] sm:text-[15px] leading-relaxed text-paper/50">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-paper/30" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* With Skylar */}
              <div className="reveal-on-scroll reveal-delay-2 relative overflow-hidden rounded-2xl border border-[#F2A93B]/30 bg-[#F2A93B]/[0.06] p-6 sm:p-8 md:p-12 shadow-[0_20px_70px_rgba(242,169,59,0.08)]">
                <div className="pointer-events-none absolute right-0 top-0 size-64 bg-[radial-gradient(circle_at_top_right,rgba(242,169,59,0.18),transparent_70%)]" />
                <div className="relative flex items-center justify-between border-b border-[#F2A93B]/20 pb-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F2A93B]">With Skylar</p>
                  <span className="rounded-full bg-[#F2A93B]/15 px-3 py-1 text-[11px] font-bold text-[#F2A93B]">Clarity & Calm</span>
                </div>
                <ul className="relative mt-8 space-y-4 sm:space-y-5">
                  {[
                    "Return to the employee context you've saved.",
                    "Think through the question with Skylar AI.",
                    "Start from draft talking points and notes you can review.",
                    "Keep the follow-up close to the conversation.",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3.5 text-[15px] sm:text-[15.5px] font-medium leading-relaxed text-paper/95">
                      <CheckCircle2 className="mt-1 size-4 shrink-0 text-[#F2A93B]" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Storytelling Transition Bridge ───────────────────────────── */}
        <div className="reveal-on-scroll mx-auto flex max-w-7xl items-center justify-center py-6 px-6" aria-hidden="true">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-px bg-gradient-to-b from-transparent via-[#F2A93B]/40 to-[#F2A93B]" />
            <span className="rounded-full border border-[#F2A93B]/30 bg-[#F2A93B]/10 px-3 py-1 font-mono text-[10.5px] font-semibold text-[#F2A93B]">
              HOW IT WORKS
            </span>
            <div className="h-10 w-px bg-gradient-to-b from-[#F2A93B] via-[#F2A93B]/40 to-transparent" />
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            3. WHAT SKYLAR DOES AND HOW IT WORKS (COMBINED)
        ══════════════════════════════════════════════════════════ */}
        <section id="how-it-works" className="reveal-on-scroll relative px-4 sm:px-6 md:px-10 py-16 md:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#F2A93B]">What Skylar does and how it works</p>
              <h2 className="mt-4 text-2xl sm:text-3xl md:text-5xl font-bold leading-[1.12] tracking-[-0.025em] text-paper">
                Bring the question.
                <br className="hidden md:block" />
                <span className="text-paper/40">Work toward a clearer next step.</span>
              </h2>
              <p className="mt-5 max-w-[56ch] text-[15px] sm:text-[16px] leading-[1.8] text-paper/60">
                Skylar AI gives you a place to think through everyday people questions. Human HR support is there when the situation needs experience and judgment beyond an AI conversation.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Put the situation in context.",
                  body: "Tell Skylar AI what's happening, what you know and what you still need to understand.",
                  icon: <MessageSquare className="size-5 text-[#F2A93B]" />,
                },
                {
                  step: "02",
                  title: "Prepare before you act.",
                  body: "Work through possible next steps, review draft talking points and save the relevant notes with the employee record.",
                  icon: <Sparkles className="size-5 text-[#F2A93B]" />,
                },
                {
                  step: "03",
                  title: "Ask for human HR support.",
                  body: "When you need a person's perspective, request an escalation to a human Skylar HR professional. Your standard trial includes one escalation.",
                  icon: <ShieldAlert className="size-5 text-[#F2A93B]" />,
                },
              ].map(({ step, title, body, icon }, i) => (
                <div
                  key={step}
                  className={`reveal-on-scroll reveal-delay-${i + 1} group relative flex flex-col justify-between rounded-2xl border border-paper/[0.08] bg-paper/[0.02] p-6 sm:p-8 transition-all duration-300 hover:border-[#F2A93B]/40 hover:bg-paper/[0.04]`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#F2A93B]">{step}</span>
                      <div className="grid size-10 place-items-center rounded-xl bg-paper/[0.04] ring-1 ring-paper/[0.08] transition-colors group-hover:bg-[#F2A93B]/10">
                        {icon}
                      </div>
                    </div>
                    <h3 className="mt-5 text-lg sm:text-xl font-bold tracking-tight text-paper">{title}</h3>
                    <p className="mt-2.5 text-[14px] sm:text-[14.5px] leading-[1.75] text-paper/55">{body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href={SIGNUP_PATH}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-paper px-6 text-sm font-semibold text-[#0d0b09] shadow-md transition-transform duration-200 hover:scale-[1.02]"
              >
                <span>Try it free</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <span className="text-xs text-paper/40">No credit card required. Explore Skylar for 14 days.</span>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            ✨ NEW SECTION: BUILT FOR THE CONVERSATIONS FOUNDERS DREAD
        ══════════════════════════════════════════════════════════ */}
        <section id="scenarios" className="reveal-on-scroll relative border-t border-paper/[0.08] px-4 sm:px-6 md:px-10 py-16 md:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#F2A93B]">Common situations</p>
              <h2 className="mt-4 text-2xl sm:text-3xl md:text-5xl font-bold leading-[1.15] tracking-[-0.025em] text-paper">
                The high-stakes conversations that define your culture.
              </h2>
              <p className="mt-4 max-w-[56ch] text-[15px] sm:text-[16px] leading-[1.8] text-paper/60">
                Founders face people challenges that don&apos;t fit into neat templates. Skylar gives you structured thinking and ready-to-use scripts before every crucial conversation.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: <Scale className="size-5 text-attention" />,
                  title: "Compensation & Equity",
                  trigger: "Out-of-cycle pay inquiries",
                  solution: "Acknowledge market data early without making off-the-cuff verbal promises. Keep performance scoring cleanly separated from budget cycles.",
                },
                {
                  icon: <TrendingUp className="size-5 text-attention" />,
                  title: "Performance Realignment",
                  trigger: "Early hire struggling to scale",
                  solution: "Objective, compassionate coaching scripts to diagnose skill versus motivation gaps before an issue turns into a costly dispute.",
                },
                {
                  icon: <Compass className="size-5 text-attention" />,
                  title: "Multi-State Compliance",
                  trigger: "Relocation & remote work requests",
                  solution: "Instant clarity on payroll nexus, tax considerations, and leave laws, with direct escalation to an HR professional for state-specific validation.",
                },
                {
                  icon: <Users className="size-5 text-attention" />,
                  title: "Leadership & Co-founder",
                  trigger: "Role overlap and team friction",
                  solution: "Neutral framing to clarify decision boundaries, reset division ownership, and record agreed next steps to prevent recurring friction.",
                },
              ].map(({ icon, title, trigger, solution }, i) => (
                <div
                  key={title}
                  className={`reveal-on-scroll reveal-delay-${i + 1} flex flex-col justify-between rounded-2xl border border-paper/[0.08] bg-paper/[0.02] p-6 transition-all duration-200 hover:border-paper/20 hover:bg-paper/[0.04]`}
                >
                  <div>
                    <div className="grid size-10 place-items-center rounded-xl bg-attention/10 ring-1 ring-attention/20">
                      {icon}
                    </div>
                    <h3 className="mt-5 text-base font-bold text-paper">{title}</h3>
                    <p className="mt-1 text-xs font-semibold text-attention">{trigger}</p>
                    <p className="mt-3 text-[13.5px] leading-relaxed text-paper/60">{solution}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            4. WORKFLOW DETAIL, LOWER ON THE PAGE
        ══════════════════════════════════════════════════════════ */}
        <section id="workflow" className="reveal-on-scroll relative border-t border-paper/[0.08] px-4 sm:px-6 md:px-10 py-16 md:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#F2A93B]">Workflow detail</p>
              <h2 className="mt-4 text-2xl sm:text-3xl md:text-4xl font-bold leading-[1.15] tracking-[-0.02em] text-paper">
                Keep the context close to the next conversation.
              </h2>
              <p className="mt-4 max-w-[58ch] text-[15px] sm:text-[15.5px] leading-[1.8] text-paper/60">
                Return to saved notes, review open questions and prepare for the follow-up. Use drafts as a starting point, then decide what fits the situation and record what you agree.
              </p>
            </div>

            <div className="mt-12 grid divide-y divide-paper/[0.08] border-y border-paper/[0.08] md:grid-cols-3 md:divide-x md:divide-y-0">
              {[
                {
                  icon: <MessageSquare className="size-4 text-[#F2A93B]" />,
                  title: "Start a dialogue",
                  subtitle: "Get an outcome",
                  description: "Talk through sensitive workplace decisions in plain language and get concrete next steps.",
                },
                {
                  icon: <History className="size-4 text-[#F2A93B]" />,
                  title: "Keep a record",
                  subtitle: "Won’t forget the history",
                  description: "Context stays pinned to the employee record so you never have to rebuild the narrative.",
                },
                {
                  icon: <KeyRound className="size-4 text-[#F2A93B]" />,
                  title: "No password needed",
                  subtitle: "Enter your work email. We'll send you a sign-in link.",
                  description: "Instant access without passwords to manage. Sign in securely with a private magic link.",
                },
              ].map(({ icon, title, subtitle, description }) => (
                <div key={title} className="py-7 md:px-7 md:first:pl-0 md:last:pr-0">
                  <div className="flex items-center gap-2">
                    {icon}
                    <p className="text-base sm:text-lg font-bold tracking-tight text-paper">{title}</p>
                  </div>
                  <p className="mt-2 text-[14px] font-semibold text-paper/85">{subtitle}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-paper/45">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            ✨ NEW SECTION: ENTERPRISE-GRADE CONFIDENTIALITY & TRUST
        ══════════════════════════════════════════════════════════ */}
        <section id="security" className="reveal-on-scroll relative border-t border-paper/[0.08] px-4 sm:px-6 md:px-10 py-16 md:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#F2A93B]">Confidentiality & security</p>
              <h2 className="mt-4 text-2xl sm:text-3xl md:text-5xl font-bold leading-[1.15] tracking-[-0.025em] text-paper">
                Personnel matters require strict fiduciary privacy.
              </h2>
              <p className="mt-4 max-w-[56ch] text-[15px] sm:text-[16px] leading-[1.8] text-paper/60">
                You are discussing sensitive personnel decisions. We protect your company data with strict tenant isolation and zero public model training.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: <Lock className="size-5 text-success" />,
                  title: "Zero Model Training",
                  desc: "Your employee notes, dialogues, and transcripts are never used to train or fine-tune public AI models.",
                },
                {
                  icon: <ShieldCheck className="size-5 text-success" />,
                  title: "Workspace Isolation",
                  desc: "Strict multi-tenant segregation guarantees your records and history remain strictly confined to your organization.",
                },
                {
                  icon: <UserCheck className="size-5 text-success" />,
                  title: "Certified HR Advisors",
                  desc: "Human HR escalations are conducted by vetted SPHR-certified professionals bound by legal non-disclosure.",
                },
                {
                  icon: <FileCheck className="size-5 text-success" />,
                  title: "Complete Data Control",
                  desc: "Export full dossier records or permanently delete employee histories at any time. You maintain total ownership.",
                },
              ].map(({ icon, title, desc }, i) => (
                <div
                  key={title}
                  className={`reveal-on-scroll reveal-delay-${i + 1} rounded-2xl border border-paper/[0.08] bg-paper/[0.02] p-6`}
                >
                  <div className="grid size-10 place-items-center rounded-xl bg-success/10 ring-1 ring-success/25">
                    {icon}
                  </div>
                  <h3 className="mt-4 text-base font-bold text-paper">{title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-paper/55">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* ══════════════════════════════════════════════════════════
            5. TRIAL AND PAID PLAN
        ══════════════════════════════════════════════════════════ */}
        <section id="pricing" className="reveal-on-scroll relative border-t border-paper/[0.08] px-4 sm:px-6 md:px-10 py-16 md:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#F2A93B]">Trial & plans</p>
              <h2 className="mt-4 text-2xl sm:text-3xl md:text-5xl font-bold leading-[1.12] tracking-tight text-paper">
                Start with the HR question on your desk.
              </h2>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2 max-w-4xl">
              {/* Trial Card */}
              <div className="reveal-on-scroll reveal-delay-1 flex flex-col justify-between rounded-3xl border border-paper/[0.08] bg-paper/[0.025] p-6 sm:p-8 md:p-10 transition-all hover:border-paper/20">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-paper/70">Try Skylar free</p>
                    <span className="rounded-full bg-paper/10 px-3 py-1 text-xs font-semibold text-paper/70">14-day trial</span>
                  </div>
                  <p className="mt-4 text-3xl sm:text-[2.75rem] font-bold leading-none tracking-tight text-paper">14 days, free</p>
                  <p className="mt-3 text-[14px] leading-6 text-paper/50">Try Skylar with the questions on your desk.</p>
                  <ul className="mt-8 space-y-3.5">
                    {[
                      "14 days of unlimited chat with Skylar AI.",
                      "One escalation to a human Skylar HR professional.",
                      "No credit card required to start.",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3 text-[14px] leading-5 text-paper/75">
                        <CheckCircle2 className="mt-px size-4 shrink-0 text-paper/40" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-10">
                  <Link
                    href={SIGNUP_PATH}
                    className="flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-paper/[0.08] text-sm font-semibold text-paper ring-1 ring-paper/[0.14] transition-colors hover:bg-paper/[0.14]"
                  >
                    <span>Try it free</span>
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                  <p className="mt-3 text-center text-[11px] text-paper/40">No credit card required to start</p>
                </div>
              </div>

              {/* Paid Card */}
              <div className="reveal-on-scroll reveal-delay-2 relative flex flex-col justify-between rounded-3xl border border-[#F2A93B]/35 bg-[#F2A93B]/[0.06] p-6 sm:p-8 md:p-10 shadow-[0_24px_80px_rgba(242,169,59,0.08)]">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#F2A93B]">Keep the conversation going</p>
                    <span className="rounded-full bg-[#F2A93B]/20 px-3 py-1 text-xs font-bold text-[#F2A93B]">Most Popular</span>
                  </div>
                  <p className="mt-4 flex items-baseline gap-1.5 text-paper">
                    <span className="text-3xl sm:text-[2.75rem] font-bold leading-none tracking-tight">$149</span>
                    <span className="text-sm text-paper/50">/ month</span>
                  </p>
                  <p className="mt-3 text-[14px] leading-6 text-paper/60">
                    Ready to keep Skylar part of your working day? Choose the paid plan to continue after your trial.
                  </p>
                  <ul className="mt-8 space-y-3.5">
                    {[
                      "Unlimited chat with Skylar AI",
                      "Human Skylar HR escalations",
                      "Employee context memory and saved records",
                      "Cancel any time",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3 text-[14px] leading-5 text-paper/85">
                        <CheckCircle2 className="mt-px size-4 shrink-0 text-[#F2A93B]" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-10">
                  <Link
                    href={SIGNUP_PATH}
                    className="flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-paper text-sm font-semibold text-[#0d0b09] shadow-md transition-opacity hover:opacity-90"
                  >
                    <span>Continue with Skylar</span>
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                  <p className="mt-3 text-center text-[11px] text-paper/40">Start with the trial, upgrade when you are ready</p>
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
                6. SHORT FAQS
            ══════════════════════════════════════════════════════════ */}
            <div id="faqs" className="reveal-on-scroll mt-16 border-t border-paper/[0.08] pt-12">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F2A93B]">Short FAQs</p>
              <dl className="mt-8 grid gap-5 sm:gap-6 md:grid-cols-2">
                {[
                  {
                    q: "Am I talking to AI or a person?",
                    a: "Chat with Skylar AI to work through questions and prepare your next step. Human HR support is a separate escalation to a Skylar HR professional. Your standard trial includes one escalation.",
                  },
                  {
                    q: "Do I need a credit card to try Skylar?",
                    a: "No. You can explore Skylar for 14 days without entering a credit card.",
                  },
                  {
                    q: "What happens after the trial?",
                    a: "Choose the paid plan to continue. The current monthly upgrade price is $149. Confirm the final trial-expiry screen and billing flow before publication.",
                  },
                  {
                    q: "How do I sign in?",
                    a: "Enter your work email and follow the sign-in link we send you. No password needed.",
                  },
                ].map(({ q, a }) => (
                  <div key={q} className="rounded-xl border border-paper/[0.06] bg-paper/[0.02] p-5 sm:p-6">
                    <dt className="text-[15px] font-bold text-paper/95">{q}</dt>
                    <dd className="mt-2.5 text-[14px] leading-relaxed text-paper/55">{a}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            7. CLOSING INVITATION
        ══════════════════════════════════════════════════════════ */}
        <section className="reveal-on-scroll relative px-4 sm:px-6 md:px-10 pb-24 md:pb-32">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[28px] border border-[#F2A93B]/25 bg-[#F2A93B]/[0.07] p-6 sm:p-10 md:p-16 shadow-[0_20px_80px_rgba(242,169,59,0.06)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_90%_at_0%_100%,rgba(242,169,59,0.18),transparent_65%)]" />
            <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <h2 className="max-w-3xl text-2xl sm:text-3xl md:text-5xl font-bold leading-[1.12] tracking-[-0.025em] text-paper">
                  Before the next difficult conversation, ask Skylar.
                </h2>
                <p className="mt-4 sm:mt-5 max-w-[52ch] text-[15px] sm:text-[15.5px] leading-[1.8] text-paper/60">
                  Think through the question, prepare what to say and turn to a human HR professional when you need a person&apos;s judgment.
                </p>
              </div>
              <div className="md:text-right">
                <Link
                  href={SIGNUP_PATH}
                  className="group inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full bg-paper px-8 text-sm font-semibold text-[#0d0b09] shadow-lg transition-transform duration-200 hover:scale-[1.02]"
                >
                  <span>Try it free</span>
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
                <p className="mt-3 text-xs text-paper/40">No credit card required. Your trial lasts 14 days.</p>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ── Redesigned High-End SaaS Footer ────────────────────────── */}
      <footer className="relative border-t border-paper/[0.08] bg-[#070605] px-4 sm:px-6 md:px-10 pt-14 sm:pt-16 pb-12">
        <div className="mx-auto max-w-7xl">
          {/* Top Grid: Brand + 3 organized navigation columns */}
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-5 lg:gap-14">
            
            {/* Brand & Mission Column */}
            <div className="sm:col-span-2 md:col-span-2 space-y-4">
              <Link href="/" className="inline-flex items-center gap-3 group">
                <div className="grid size-8 place-items-center rounded-lg border border-paper/10 bg-paper/[0.04] transition-colors group-hover:border-[#F2A93B]/40">
                  <Image src="/brand/logo.png" alt="Skylar" width={20} height={20} className="shrink-0" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[15px] font-bold tracking-tight text-paper">Skylar</span>
                  <span className="text-[9.5px] font-semibold tracking-widest text-[#F2A93B] uppercase -mt-0.5">HR Partner</span>
                </div>
              </Link>
              <p className="max-w-[34ch] text-[13.5px] leading-relaxed text-paper/55">
                An AI colleague to think with. A human HR professional to turn to. Built for founders and leaders handling high-stakes employee decisions with clarity and calm.
              </p>
              
              {/* Trust Badge & System Status */}
              <div className="pt-2 flex flex-col gap-2.5">
                <div className="inline-flex items-center gap-2 rounded-full border border-paper/[0.08] bg-paper/[0.02] px-3 py-1.5 w-fit">
                  <span className="size-2 rounded-full bg-[#10b981] animate-pulse" />
                  <span className="text-[11px] font-medium text-paper/70">All Systems Operational</span>
                </div>
                <p className="text-[11.5px] text-paper/40">
                  Isolated workspace encryption · Fiduciary privacy guaranteed
                </p>
              </div>
            </div>

            {/* Col 2: Product */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-paper/90">Product</p>
              <ul className="mt-4 space-y-2.5">
                {[
                  { href: "#difference", label: "The Difference" },
                  { href: "#how-it-works", label: "How It Works" },
                  { href: "#workflow", label: "Briefing Room" },
                  { href: "#scenarios", label: "Common Scenarios" },
                  { href: "#security", label: "Confidentiality" },
                  { href: "#pricing", label: "Plans & Trial" },
                ].map(({ href, label }) => (
                  <li key={label}>
                    <a href={href} className="text-[13px] text-paper/50 transition-colors hover:text-[#F2A93B]">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3: Common Situations */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-paper/90">Situations</p>
              <ul className="mt-4 space-y-2.5">
                {[
                  { href: "#scenarios", label: "Compensation & Equity" },
                  { href: "#scenarios", label: "Performance Realignment" },
                  { href: "#scenarios", label: "Multi-State Compliance" },
                  { href: "#scenarios", label: "Leadership Alignment" },
                  { href: "#faqs", label: "Frequently Asked" },
                ].map(({ href, label }) => (
                  <li key={label}>
                    <a href={href} className="text-[13px] text-paper/50 transition-colors hover:text-[#F2A93B]">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 4: Trust & Access */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-paper/90">Access & Legal</p>
              <ul className="mt-4 space-y-2.5">
                {[
                  { href: SIGNUP_PATH, label: "Start 14-Day Trial" },
                  { href: LOGIN_PATH, label: "Sign In (Magic Link)" },
                  { href: TERMS_PATH, label: "Terms of Service" },
                  { href: PRIVACY_PATH, label: "Privacy Policy" },
                ].map(({ href, label }) => (
                  <li key={label}>
                    <Link href={href} className="text-[13px] text-paper/50 transition-colors hover:text-[#F2A93B]">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Divider */}
          <div className="mt-12 sm:mt-14 border-t border-paper/[0.08]" />

          {/* Bottom Bar: Copyright + Note + Back to Top */}
          <div className="mt-8 flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
            <p className="text-[12px] text-paper/40">
              © {new Date().getFullYear()} Skylar HR. All rights reserved. 14-day free trial · No credit card required.
            </p>
            <div className="flex items-center gap-6">
              <span className="hidden sm:inline text-[12px] text-paper/30">
                Crafted for founders & company leaders
              </span>
              <a
                href="#"
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-paper/60 transition-colors hover:text-paper"
              >
                <span>Back to top</span>
                <span aria-hidden="true">↑</span>
              </a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
