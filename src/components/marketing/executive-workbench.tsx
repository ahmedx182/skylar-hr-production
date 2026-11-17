"use client";

import { useState } from "react";
import Image from "next/image";
import {
  CalendarClock,
  CheckCircle2,
  Copy,
  FileCheck,
  History,
  LayoutDashboard,
  MessageSquareText,
  Sparkles,
  UserCheck,
  UserRound,
} from "lucide-react";
import { StatusDot } from "@/components/briefing/status-dot";

type ProductView = "briefing" | "ai_chat" | "human_advisor" | "employee_file";

export function ExecutiveWorkbench() {
  const [activeView, setActiveView] = useState<ProductView>("briefing");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="hero-anim-card relative mx-auto mt-8 sm:mt-12 w-full max-w-5xl">
      {/* Ambient backlight glow */}
      <div
        className="pointer-events-none absolute -inset-4 sm:-inset-6 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(242,169,59,0.16),transparent_65%)] blur-2xl sm:blur-3xl"
        aria-hidden="true"
      />

      {/* Main SaaS Window Frame - Matches Skylar Briefing Room */}
      <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-paper/10 bg-[#0B0B0E] shadow-[0_20px_60px_rgba(0,0,0,0.85)] sm:shadow-[0_30px_100px_rgba(0,0,0,0.85)] backdrop-blur-xl">

        {/* ── App Header (Matches BriefingRoomFrame, Responsive & Non-Wrapping) ── */}
        <div className="flex h-11 sm:h-13 items-center justify-between border-b border-paper/10 bg-[#121116] px-3 sm:px-5 md:px-6">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* macOS Window Dots */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0" aria-hidden="true">
              <span className="size-2 sm:size-2.5 rounded-full bg-[#FF4A45]/80" />
              <span className="size-2 sm:size-2.5 rounded-full bg-[#F5AD44]/80" />
              <span className="size-2 sm:size-2.5 rounded-full bg-[#4CD07D]/80" />
            </div>
            <div className="hidden h-3.5 w-px bg-paper/10 sm:block" />
            
            {/* Product Title */}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <Image src="/brand/logo.png" alt="Skylar" width={16} height={16} className="shrink-0 sm:size-[18px]" />
              <p className="text-xs sm:text-sm font-semibold text-paper truncate whitespace-nowrap">
                Skylar <span className="font-normal text-paper/40">Briefing Room</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-attention/30 bg-attention/10 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-semibold text-attention whitespace-nowrap">
              <span className="size-1.5 rounded-full bg-attention animate-pulse" />
              <span className="hidden sm:inline">1 Free Escalation in Trial</span>
              <span className="sm:hidden">1 Escalation</span>
            </span>
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success whitespace-nowrap">
              <span className="size-1.5 rounded-full bg-success" />
              <span>Founder View</span>
            </div>
          </div>
        </div>

        {/* ── Responsive Tab Switcher (Fits mobile 375px cleanly & desktop badges) ── */}
        <div className="grid grid-cols-4 border-b border-paper/10 bg-[#0e0d11] px-1 sm:px-4">
          {[
            {
              id: "briefing" as const,
              label: "Today's Briefing Card",
              shortLabel: "Briefing",
              badge: "Focus 1/3",
              icon: LayoutDashboard,
            },
            {
              id: "ai_chat" as const,
              label: "AI Thinking Partner",
              shortLabel: "AI Chat",
              badge: "Talking Points",
              icon: Sparkles,
            },
            {
              id: "human_advisor" as const,
              label: "Human HR Support",
              shortLabel: "Advisor",
              badge: "Certified SPHR",
              icon: UserCheck,
            },
            {
              id: "employee_file" as const,
              label: "Employee Dossier",
              shortLabel: "Dossier",
              badge: "Saved Context",
              icon: History,
            },
          ].map(({ id, label, shortLabel, badge, icon: Icon }) => {
            const isActive = activeView === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveView(id)}
                className={`relative flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3 py-2.5 sm:py-3 text-[11px] sm:text-xs font-semibold transition-all duration-150 border-b-2 -mb-px text-center ${
                  isActive
                    ? "border-attention text-paper bg-paper/[0.04]"
                    : "border-transparent text-paper/40 hover:text-paper hover:bg-paper/[0.02]"
                }`}
              >
                <Icon className={`size-3 sm:size-3.5 shrink-0 ${isActive ? "text-attention" : "text-paper/40"}`} />
                <span className="hidden sm:inline whitespace-nowrap">{label}</span>
                <span className="sm:hidden whitespace-nowrap">{shortLabel}</span>
                {badge && (
                  <span className="hidden md:inline-flex items-center rounded bg-paper/[0.07] px-1.5 py-0.5 text-[9px] font-medium text-paper/50 whitespace-nowrap">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Main Product Display Canvas ────────────────────────────── */}
        <div className="p-3 sm:p-6 md:p-8 bg-[#0B0B0E]">

          {/* ──────────────────────────────────────────────────────────
              VIEW 1: TODAY'S BRIEFING CARD (Full Width & Clean)
          ────────────────────────────────────────────────────────── */}
          {activeView === "briefing" && (
            <div className="animate-in fade-in duration-200">
              <article className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-ink/10 border-l-4 border-l-attention bg-paper text-ink shadow-[0_20px_70px_rgba(0,0,0,0.35)]">

                {/* Card Header: Status Dot + Clean Tracking Label + Position */}
                <header className="flex items-center justify-between border-b border-ink/10 px-4 sm:px-7 py-3 bg-paper/50">
                  <div className="flex items-center gap-2">
                    <StatusDot tone="attention" />
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] sm:tracking-[0.14em] text-attention truncate">
                      Start with what&apos;s still open
                    </span>
                  </div>
                  <span className="text-xs font-medium text-ink/45 shrink-0">
                    1 of 3
                  </span>
                </header>

                <div className="p-4 sm:p-7 md:p-8 space-y-4 sm:space-y-6">

                  {/* Subject Tag & Due Pill */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/[0.06] px-2.5 sm:px-3 py-1 text-xs font-semibold text-ink">
                      <UserRound className="size-3.5 text-ink/60" aria-hidden="true" />
                      <span>Marcus Chen</span>
                      <span className="text-ink/40 font-normal">· Staff Engineer</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/[0.06] px-2.5 sm:px-3 py-1 text-xs font-medium text-ink/70">
                      <CalendarClock className="size-3.5 text-attention" aria-hidden="true" />
                      <span>Review today at 2 PM</span>
                    </span>
                  </div>

                  {/* Focus & Headline */}
                  <div>
                    <h3 className="text-lg sm:text-2xl md:text-[1.85rem] font-bold leading-snug tracking-tight text-ink">
                      Don&apos;t let last week&apos;s pay question get lost in today&apos;s review.
                    </h3>
                    <p className="mt-2 text-[13px] sm:text-[15px] leading-relaxed text-ink/75 max-w-3xl">
                      Marcus asked about pay. Open with that context, listen to what&apos;s changed and record the next step after the conversation.
                    </p>
                  </div>

                  {/* 3-Step Conversation Guide */}
                  <div className="rounded-xl border border-ink/10 bg-ink/[0.03] p-3.5 sm:p-5">
                    <p className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-ink/50">
                      Conversation Guide
                    </p>
                    <div className="mt-3 grid gap-3 sm:gap-4 sm:grid-cols-3">
                      <div className="flex items-start gap-2.5 sm:gap-3">
                        <span className="grid size-5 sm:size-6 shrink-0 place-items-center rounded-full bg-paper text-[11px] sm:text-xs font-bold text-ink shadow-[inset_0_0_0_1px_rgba(11,11,14,0.15)]">
                          1
                        </span>
                        <div>
                          <p className="text-xs font-bold text-ink">Start gently</p>
                          <p className="mt-0.5 text-[11.5px] sm:text-xs text-ink/65 leading-relaxed">
                            Ask how things have been since you last spoke.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 sm:gap-3">
                        <span className="grid size-5 sm:size-6 shrink-0 place-items-center rounded-full bg-paper text-[11px] sm:text-xs font-bold text-ink shadow-[inset_0_0_0_1px_rgba(11,11,14,0.15)]">
                          2
                        </span>
                        <div>
                          <p className="text-xs font-bold text-ink">Look for context</p>
                          <p className="mt-0.5 text-[11.5px] sm:text-xs text-ink/65 leading-relaxed">
                            Give Marcus room to share what changed.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 sm:gap-3">
                        <span className="grid size-5 sm:size-6 shrink-0 place-items-center rounded-full bg-paper text-[11px] sm:text-xs font-bold text-ink shadow-[inset_0_0_0_1px_rgba(11,11,14,0.15)]">
                          3
                        </span>
                        <div>
                          <p className="text-xs font-bold text-ink">Agree one next step</p>
                          <p className="mt-0.5 text-[11.5px] sm:text-xs text-ink/65 leading-relaxed">
                            End with a clear expectation and follow-up date.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Keep in Mind Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/[0.04] border border-ink/[0.08] px-3 py-1 text-[11px] sm:text-xs font-medium text-ink/75">
                      <CheckCircle2 className="size-3.5 text-success shrink-0" />
                      <span>This is a check-in, not a confrontation.</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/[0.04] border border-ink/[0.08] px-3 py-1 text-[11px] sm:text-xs font-medium text-ink/75">
                      <MessageSquareText className="size-3.5 text-attention shrink-0" />
                      <span>Save only the agreed next step afterward.</span>
                    </span>
                  </div>

                  {/* Actions Bar - Stacks cleanly on mobile */}
                  <footer className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-ink/10 pt-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="flex-1 sm:flex-initial rounded-full bg-ink px-4 py-2 text-xs font-semibold text-paper hover:opacity-90 transition-opacity text-center"
                      >
                        Next →
                      </button>
                      <button
                        type="button"
                        className="flex-1 sm:flex-initial rounded-full border border-ink/15 px-3.5 py-2 text-xs font-medium text-ink/65 hover:bg-ink/[0.04] text-center"
                      >
                        Not now
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveView("ai_chat")}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-attention px-4 py-2.5 sm:py-2 text-xs font-bold text-[#0d0b09] shadow-sm hover:opacity-90 transition-all w-full sm:w-auto"
                    >
                      <Sparkles className="size-3.5 shrink-0" />
                      <span>Prepare Talking Points with Skylar AI →</span>
                    </button>
                  </footer>

                </div>
              </article>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              VIEW 2: SKYLAR AI CHAT DRAWER
          ────────────────────────────────────────────────────────── */}
          {activeView === "ai_chat" && (
            <div className="animate-in fade-in duration-200 space-y-4">
              <div className="rounded-xl sm:rounded-2xl border border-paper/10 bg-[#141217] p-4 sm:p-7">
                
                {/* Chat Header */}
                <div className="flex items-center justify-between border-b border-paper/10 pb-3 sm:pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-8 sm:size-9 place-items-center rounded-xl bg-attention/15 text-attention">
                      <Sparkles className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-paper">Skylar AI Thinking Partner</h4>
                      <p className="text-[11px] text-paper/40">Reviewing conversation context for Marcus Chen</p>
                    </div>
                  </div>
                  <span className="hidden sm:inline-flex rounded-full bg-success/15 px-2.5 py-0.5 text-[10px] font-semibold text-success">
                    Context Synced
                  </span>
                </div>

                {/* Simulated Conversation */}
                <div className="mt-4 space-y-3">
                  {/* User query */}
                  <div className="flex justify-end">
                    <div className="max-w-lg rounded-xl rounded-tr-sm bg-paper/10 px-3.5 py-2.5 text-xs sm:text-[13px] text-paper">
                      How should I respond if Marcus asks for an immediate compensation bump today?
                    </div>
                  </div>

                  {/* Skylar response */}
                  <div className="flex justify-start">
                    <div className="max-w-xl rounded-xl rounded-tl-sm border border-paper/10 bg-[#1c1a22] p-3.5 sm:p-4 text-xs sm:text-[13px] leading-relaxed text-paper/90">
                      <div className="flex items-center justify-between gap-2 border-b border-paper/10 pb-2">
                        <span className="font-semibold text-attention text-[11px] uppercase tracking-wider">Suggested Talking Points</span>
                        <button
                          type="button"
                          onClick={handleCopy}
                          className="flex items-center gap-1 text-[11px] text-paper/50 hover:text-paper"
                        >
                          <Copy className="size-3" />
                          <span>{copied ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                      <p className="mt-2.5">
                        &ldquo;I hear you, Marcus. You&apos;ve taken on significant architectural ownership this quarter. Today&apos;s review is about calibrating where your impact is strongest and what comes next. Let&apos;s document your milestones today, and I will review the compensation band alignment before our next 1:1 on Friday.&rdquo;
                      </p>
                    </div>
                  </div>
                </div>

                {/* Escalation CTA */}
                <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-paper/10 pt-4">
                  <span className="text-[11px] sm:text-xs text-paper/50">Need human HR judgment on company equity or policy?</span>
                  <button
                    type="button"
                    onClick={() => setActiveView("human_advisor")}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-attention/30 bg-attention/15 px-4 py-2 text-xs font-bold text-attention hover:bg-attention/25 w-full sm:w-auto"
                  >
                    <UserCheck className="size-3.5 shrink-0" />
                    <span>Bring in Human HR Advisor →</span>
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              VIEW 3: LIVE HUMAN ADVISOR THREAD
          ────────────────────────────────────────────────────────── */}
          {activeView === "human_advisor" && (
            <div className="animate-in fade-in duration-200 space-y-4">
              <div className="rounded-xl sm:rounded-2xl border border-attention/30 bg-[#161419] p-4 sm:p-7">
                
                {/* Advisor Header - Responsive */}
                <div className="flex items-center justify-between gap-2 border-b border-paper/10 pb-3 sm:pb-4">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="grid size-8 sm:size-10 shrink-0 place-items-center rounded-full bg-attention/20 text-attention font-bold text-xs sm:text-sm ring-1 ring-attention/40">
                      SJ
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <p className="text-xs sm:text-sm font-bold text-paper truncate">Sarah Jenkins, SPHR</p>
                        <span className="rounded bg-success/15 px-1.5 py-0.5 text-[9.5px] sm:text-[10px] font-semibold text-success shrink-0">
                          Active
                        </span>
                      </div>
                      <p className="text-[10.5px] sm:text-xs text-paper/40 truncate">Senior HR Advisor · Skylar Team</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-attention/40 bg-attention/10 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold text-attention shrink-0 whitespace-nowrap">
                    1 Escalation in Trial
                  </span>
                </div>

                {/* Live Advisor Message */}
                <div className="mt-3.5 rounded-xl border border-paper/10 bg-[#1A1820] p-3.5 sm:p-4 text-xs leading-relaxed text-paper">
                  <p className="font-semibold text-attention text-[11px] sm:text-xs">HR Advisory Review for Marcus Chen:</p>
                  <p className="mt-2 text-paper/80">
                    &ldquo;I have reviewed Marcus&apos;s 2.5-year tenure and your company&apos;s current engineering compensation rubric. Since he is performing in the top quartile of deliverables, it is appropriate to set an expectation for the Q1 calibration cycle without committing to a specific percentage today. Here is the compliant language to avoid implied verbal contracts.&rdquo;
                  </p>
                  <div className="mt-3 rounded-lg bg-paper/[0.04] p-3 text-paper/80 border border-paper/[0.06]">
                    <p className="font-medium text-paper text-[11px] sm:text-xs">Recommended Resolution:</p>
                    <p className="mt-1 text-[11px] sm:text-xs space-y-1">
                      1. Acknowledge market data collection is underway.
                      <br />
                      2. Set follow-up date for January 15th calibration.
                      <br />
                      3. Log this summary directly into Marcus&apos;s personnel record.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-paper/10 pt-4">
                  <span className="text-[11px] sm:text-xs text-paper/40">Advisor recommendations save directly to the employee record.</span>
                  <button
                    type="button"
                    onClick={() => setActiveView("employee_file")}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-paper px-4 py-2 text-xs font-bold text-[#0d0b09] hover:opacity-90 w-full sm:w-auto"
                  >
                    <FileCheck className="size-3.5" />
                    <span>Save to Marcus&apos;s Record →</span>
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              VIEW 4: EMPLOYEE RECORD & CONTINUOUS MEMORY
          ────────────────────────────────────────────────────────── */}
          {activeView === "employee_file" && (
            <div className="animate-in fade-in duration-200 space-y-4">
              <div className="rounded-xl sm:rounded-2xl border border-paper/10 bg-[#141217] p-4 sm:p-7">
                
                <div className="flex items-center justify-between gap-2 border-b border-paper/10 pb-3 sm:pb-4">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="grid size-8 sm:size-10 shrink-0 place-items-center rounded-xl bg-paper/10 text-paper font-bold text-xs sm:text-sm">
                      MC
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-paper truncate">Marcus Chen · Dossier</h4>
                      <p className="text-[10.5px] sm:text-xs text-paper/40 truncate">Staff Engineer · Joined June 2024</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-success/15 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold text-success shrink-0 whitespace-nowrap">
                    Synchronized
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-paper/10 bg-[#1C1A21] p-3.5 sm:p-4 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-paper/40 pb-2 border-b border-paper/10">
                      <span>Log: Review Preparation Note</span>
                      <span>Today, 1:45 PM</span>
                    </div>
                    <p className="mt-2 text-paper/80">
                      Recorded prep context regarding compensation calibration for Q1. Prepared compliant talking points with Skylar AI and verified with SPHR advisor Sarah Jenkins.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-paper/10 pt-4">
                  <span className="text-[11px] sm:text-xs text-paper/40">Employee context persists privately across every session.</span>
                  <button
                    type="button"
                    onClick={() => setActiveView("briefing")}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-paper/20 bg-paper/[0.04] px-4 py-2 text-xs font-medium text-paper hover:bg-paper/[0.08] w-full sm:w-auto"
                  >
                    <span>← Return to Briefing Card</span>
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* ── Status Footer Bar (Clean & Professional) ────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-t border-paper/10 bg-[#0e0d11] px-4 sm:px-6 py-2.5 text-[11px] text-paper/40">
          <div className="flex items-center gap-2">
            <span>Employee: <strong className="text-paper/70 font-semibold">Marcus Chen</strong></span>
            <span>•</span>
            <span className="text-success font-medium flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-success" />
              Synced & Documented
            </span>
          </div>
          <div className="hidden sm:block text-paper/30">
            Daily Briefing Engine · Skylar HR
          </div>
        </div>

      </div>
    </div>
  );
}
