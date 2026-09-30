# 05 — Delivery Plan & Implementation Backlog
**Skylar HR Assistant — v2 "Briefing Room"**

**Status: repository confirmed empty. Timeline confirmed at 2 weeks.** This replaces rev. 1's two-branch (uncertain) plan with a single concrete schedule.

**Why 2 weeks is workable:** the design is fully resolved down to exact interaction timing (the 900ms seal hold, 360ms card transitions), exact tokens, and even reference interaction logic for the hardest interaction in the product. The scope of distinct components is genuinely smaller than a traditional multi-page dashboard app — most of the product is variations on one reusable card component. The real risk in a 2-week build isn't "not enough time to code," it's **losing time to ambiguity or rework** — which this handoff and the received design are specifically meant to prevent by resolving decisions up front rather than mid-build.

---

## Week 1: Foundation + Core Sequence

**Days 1–2: Environment, auth, data model**
- Repo scaffold, Firebase project setup, magic-link auth configured and tested end-to-end (send link → click → session established)
- Firestore security rules for `companies`/`users`/`employees`/`conversations` — **senior review before proceeding past this point**
- Employee and conversation data models in place per Document 03

**Days 3–4: The Briefing + card engine**
- Build the reusable card component(s) (Brief / Plan / Risk species per Document 02) — this is the highest-leverage piece of work in the whole build, since nearly everything else is built on top of it
- `/api/briefing/today` ordering logic (escalations first → due items → law flags → closing card)
- Card advance/defer mechanics (NEXT / NOT NOW), the segmented progress rule, swipe + arrow-key navigation

**Day 5: Live-in-5, beats 1–3**
- Magic-link signup screen (beat 1)
- "Who is this about" employee-naming step (beat 2)
- "What's going on" composer with example-prompt rows (beat 3)

**Checkpoint (end of Week 1):** a new signup can complete beats 1–3 and land on a real conversation card. This is the point to demo, even informally, before continuing — catching a wrong assumption here costs a day, catching it in Week 2 costs more.

---

## Week 2: Conversation, Escalation, Employee File, Billing, Polish

**Days 6–7: Conversation + Live-in-5 completion**
- Claude API integration into the reply-card pattern (quoted user message + full-card AI response)
- Clarifying-question cards (beats 4), the plan card (beat 5), filed/tomorrow-preview card (beat 6)
- Risk detection triggering the red-rule pause

**Days 8–9: Escalation ("the seal")**
- Build the press-and-hold interaction exactly per the reference state machine in Document 03/the design export — this is worth dedicated, uninterrupted time given it's the product's core business mechanism
- Skylar-side queue + email notification
- Escalation analytics (can be minimal for launch — a count and a list is enough, don't over-build this specific piece if time is tight)

**Day 10: Employee File**
- The ledger view (summary sentence + chronological rows)
- Long-press-to-open from any card mentioning a name
- The Index (pull-down: Today's deck / Deferred / People / Documents)

**Days 11–12: Billing + marketing site**
- Stripe Checkout, Customer Portal, webhooks
- Trial gating
- Marketing site pages

**Days 13–14: QA, security review, launch**
- Full QA pass (Document 06)
- Firestore security rules stress test (senior review)
- Production cutover (live Stripe keys, production Firebase project, monitoring)
- Go live

---

## If Something Runs Long — Cut in This Order

Named up front so a cut under pressure is a decision, not a scramble:

1. **Cut first:** escalation analytics dashboard polish (a working queue + notification matters far more than a polished chart)
2. **Cut second:** marketing site beyond the essential signup path (a plain but functional pricing/signup page beats a fully art-directed marketing site that isn't done)
3. **Do not cut:** the Live-in-5 flow, the escalation seal interaction itself, and Firestore security rules review — these three are the product's actual differentiators and its actual liability surface, in that order of importance

---

## Client Check-Ins

Same structure as rev. 1: exact date/time/timezone for the first check-in is still unconfirmed (Document 07). Suggested demo content per the schedule above:
- **End of Week 1:** signup through beat 3, live
- **End of Week 2 / launch:** full flow, live, in production
