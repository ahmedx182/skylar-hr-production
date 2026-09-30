# 01 — Product Requirements
**Skylar HR Assistant — v2 "Briefing Room"**

Legend: **[C]** Confirmed · **[P]** Proposed · **[A]** Assumption requiring validation

**This document supersedes rev. 1's requirements wherever they conflict** — the received design confirms a different information architecture (a sequential card deck, not a dashboard-plus-pages structure) than originally assumed. Read Document 02 alongside this one; the two are meant to be used together.

---

## User Roles & Permissions **[C]**

Unchanged in substance from rev. 1: **Manager** and **Company Admin** roles, with Admin additionally handling billing and seat management, and an internal **Skylar Team** role for the escalation queue. **[A]** Still requiring product-owner confirmation: who specifically needs Skylar-side queue access.

---

## Core User Journeys

### Journey 1: Live-in-5 Onboarding **[C — Document 02]**

Six full-screen beats, Skylar speaking first on each, magic-link sign-in (no password):

1. Who are you (company + work email, magic link sent)
2. Who is this about (employee named, created inline if new)
3. What's going on (free-text description, with example-prompt rows if needed)
4. Up to two clarifying questions, one card each
5. The plan (recommended approach, script, documentation — "Save to [Name]'s record")
6. Filed, and a preview of tomorrow's first briefing card

**Acceptance criterion:** signup to a filed action plan in under 5 minutes, zero configuration steps in between. Everything else (team import, handbook upload, invites, pricing tiers) is explicitly deferred to arrive as its own briefing card over the following days — **not** a setup checklist shown at signup.

### Journey 2: The Daily Briefing **[C]**

On return visits, the user opens directly into a Skylar-ordered sequence of cards — not a dashboard they scan themselves. Priority order: anything currently with an advisor, then what's due today, then relevant law changes, then a quiet closing card. Each card is `NEXT`-advanced or `NOT NOW`-deferred to tomorrow. A pull-down Index provides direct access to the full deck, deferred items, the People list, and outstanding Documents for users who want it — but this is secondary, not the primary way most users navigate.

### Journey 3: A Conversation About an Employee **[C]**

Not a persistent chat window. The user's message appears as a quoted italic line; Skylar's reply is a full card (headline + explanation + italic caveat where relevant). The full transcript is available as a swipe-away read-only ledger. If the AI's guidance references the employee's prior history, it should do so explicitly in the card's language (e.g., referencing a prior warning), consistent with rev. 1's continuity-aware intent — the mechanism is unchanged, only the surface presentation is.

### Journey 4: Escalation to a Human Advisor **[C — Document 02]**

When a message trips a risk classification, the reply card gets a 3px red top rule and the sequence pauses. The card names the specific advisor who will take it, what they'll receive, and the response-time commitment. The escalation action is **press-and-hold for 900ms**, not a tap — releasing early cancels silently. On completion, the card transitions to a sealed state with a rotating red stamp graphic (case ID + date), the status becomes "WITH ADVISOR," and this conversation leads the next day's Briefing.

### Journey 5: Reviewing One Employee's Full History **[C]**

Opened via long-press on a name from anywhere it appears — not a standalone list page in normal use. Shows a Skylar-authored one-sentence status summary (rewritten as the file changes) plus a chronological ledger of every event: conversations, notes, documents, reviews, hire records. Documents are rows in this ledger, not a separate vault. Exportable as one dated PDF. Nothing is deleted, only amended.

### Journey 6: Company Admin Manages Billing **[C — unchanged from rev. 1]**

Stripe Customer Portal for self-service card/invoice/cancellation management.

---

## Functional Requirements

| ID | Requirement | Priority | Notes |
|---|---|---|---|
| FR-01 | Magic-link (passwordless) signup; creates Company + User (admin) records | Launch-critical | Auth mechanism changed from rev. 1 |
| FR-02 | Magic-link login | Launch-critical | No password reset flow needed — there's no password |
| FR-03 | Multi-tenant Firestore security rules | Launch-critical | Unchanged from rev. 1 |
| FR-04 | Live-in-5 six-beat onboarding flow | Launch-critical | See Journey 1 |
| FR-05 | The Briefing: daily card sequence with priority ordering and defer-to-tomorrow logic | Launch-critical | New/renamed from rev. 1's "dashboard" — this has real ordering logic, not just a layout |
| FR-06 | Conversation cards: question-by-question exchange, quoted-message + reply-card pattern, swipeable read-only transcript ledger | Launch-critical | Replaces rev. 1's chat-bubble UI requirement |
| FR-07 | Employee entity: create inline (from any "who is this about" moment); long-press-to-open file | Launch-critical | No standalone creation form required, though one may still be useful via the Index's People row |
| FR-08 | Employee file: summary sentence + chronological ledger (conversations, notes, documents, reviews) | Launch-critical | Replaces rev. 1's separate Employee Timeline + Document Vault as two ideas — now one ledger |
| FR-09 | Auto-classification of situations by type, feeding both the ledger and the Briefing's ordering | Launch-critical | |
| FR-10 | Escalation: risk detection, red-rule pause, press-and-hold seal interaction, status tracking | Launch-critical | Exact interaction spec in Document 02 |
| FR-11 | Skylar-side queue to view and respond to escalations | Launch-critical | |
| FR-12 | Email notification to Skylar team on new escalation | Launch-critical | |
| FR-13 | Escalation analytics (admin-facing) | Launch-critical | |
| FR-14 | The Index: pull-down navigation (Today's deck / Deferred / People / Documents) | Launch-critical | Replaces rev. 1's persistent sidebar |
| FR-15 | Stripe Checkout, Customer Portal, webhook-driven subscription sync | Launch-critical | Unchanged |
| FR-16 | 14-day trial gating | Launch-critical | Unchanged |
| FR-17 | Marketing site | Launch-critical | Unchanged |
| FR-18 | Invite additional Manager seats | Launch-critical | Likely surfaces as a deferred Briefing card per the Live-in-5 pattern, not a settings-page action alone |
| FR-19 | Signup-source tracking | Optional | Unchanged from rev. 1 |
| FR-20 | iOS/Android via Capacitor | October | Unchanged |

**Removed from rev. 1 as a distinct requirement:** a standalone "Document Vault" page (FR-14 in rev. 1) and a standalone "HR Snapshot dashboard" (FR-15 in rev. 1) — both are superseded by the Employee File ledger and The Briefing respectively, per the actual design.

---

## States to Design/Build For

Largely unchanged from rev. 1, with one addition specific to this architecture:
- **Empty Briefing state:** what a brand-new company (post Live-in-5) sees on their *second* visit, before enough activity exists to populate a real deck — the design's "quiet close" card pattern likely covers this, but confirm the specific copy/behavior for a near-empty deck rather than assuming it's identical to a busy one
- **Escalation cancel state:** releasing the press-and-hold before 900ms — must cancel silently with no partial-escalation artifact left behind
- Standard: loading/error/permission-denied states from rev. 1 still apply

---

## Nonfunctional Requirements

Unchanged from rev. 1 (WCAG 2.1 AA target, sub-500ms streaming target, 44px touch targets — now explicitly confirmed as a stated design rule, not just a proposal), plus:
- **[P]** New: card-advance animation must hold to 360ms and the escalation fill to 900ms as specified — these timings are load-bearing for the product's emotional design (the hold specifically prevents accidental escalation), not arbitrary polish to trim under time pressure

---

## Open Product Questions

1. Who at Skylar needs escalation queue access (unresolved from rev. 1)
2. Keyboard-accessible equivalent for the press-and-hold escalation gesture — the design doesn't specify one; needs a decision, not an assumption (see Document 02)
3. Exact behavior of a near-empty Briefing deck on a returning user's second or third day
