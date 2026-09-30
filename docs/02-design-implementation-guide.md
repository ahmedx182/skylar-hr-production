# 02 — Design Implementation Guide
**Skylar HR Assistant — v2 "Briefing Room"**

This document is now based on the actual received design exports, not a reconstruction. Treat it as the real spec. Ahmed also has direct Claude Design workspace access (`ahmed@coreimmersive.com`) and should reference the live files there for anything this document doesn't cover in enough detail — this guide summarizes and organizes for implementation, it doesn't replace the source.

---

## The Core Idea

There is no dashboard, no sidebar, no persistent navigation. The product is a sequence of full-screen cards ("The Briefing") that Skylar orders each day: anything with an advisor first, then what's due, then law changes, then a quiet close. The user presses **NEXT** to advance, **NOT NOW** to defer a card to tomorrow. A pull-down **Index** (four rows: Today's deck, Deferred, People, Documents) exists for direct navigation but is secondary — a person's file opens by long-pressing their name from any card that mentions them; documents appear inline where they were created, not in a separate vault.

---

## Design Tokens

### Color

| Token | Hex | Contrast | Usage |
|---|---|---|---|
| Ink | `#0B0B0E` | — | Base background, every screen |
| Ink 2 | `#15151B` | — | Inset wells, user message quotes, bottom sheets |
| Ink 3 | `#1F1F27` | — | Pressed states, dividers on Ink 2 |
| Paper | `#F2EFE8` | 17.6:1 on Ink | Headlines, body text, the one primary button per card |
| Paper 2 | `#B4B0A6` | 9.4:1 on Ink | Secondary copy, Skylar's italic asides |
| Paper 3 | `#7E7B74` | 4.7:1 on Ink | Mono metadata only, never below 12px |
| Amber | `#F2A93B` | 10.1:1 on Ink | Handle-carefully: follow-ups due, deadlines, a clarifying question that matters. Dot or one-word mono tag only — **never a fill** |
| Red | `#FF4A45` | 5.9:1 on Ink | Real risk only: leave law, disability, pregnancy, termination, discrimination, and the escalation seal. **The only color besides Paper allowed as a fill** |
| Green | `#4CD07D` | 9.8:1 on Ink | Filed/resolved. A dot, or the word "FILED" in mono green. Never actionable — it's a reward marker, nothing to press |
| Hairline | `rgba(242,239,232,.12)` | — | Every divider, everywhere. Never grey — always Paper at 12% opacity, so the whole product reads as ruled on one sheet |

**Hard rules:**
- No blue, anywhere. In this dark UI a blue button would read as a link, not an action.
- Accents (amber/red/green) appear only as a dot (8px), a rule (2-3px), or a mono tag — never as a background fill, with the sole exception of the Paper primary button and the Red escalation seal.
- Accent colors never appear adjacent to each other on the same card.

### Typography

Two typefaces only:
- **Bodoni Moda** (Google Fonts, variable, optical sizing `opsz`) — every headline and every piece of body copy. High-contrast editorial serif, set large and loose.
- **JetBrains Mono** — everything operable and every stamped fact: buttons, labels, dates, IDs, counters. Always uppercase, `letter-spacing: .06em`–`.08em`.

| Style | Size/Line-height | Weight | Usage |
|---|---|---|---|
| Brief (desktop) | `clamp(48px,7vw,96px)` / 92-96 | 400 | The one-idea headline on a Brief card |
| Brief (mobile) | 44/44 | 400 | Same, mobile |
| H1 | 56/58 (desktop), 36/38 (mobile) | 400 | Plan/screen headlines |
| H2 | 32/36 | 400 | Secondary headline within a card |
| Body | 18/28 | 400 | All paragraph copy |
| Aside | 16/24, italic, Paper 2 | 400 | Skylar's clarifying/reassuring asides — always italic, always secondary color |
| Control (mono) | 13/normal | 500, `+8% tracking`, uppercase | Every button label |
| Record (mono) | 13/18 | 400 | Timestamps, case IDs, employee IDs, filenames, status words |

Letter-spacing on large headlines: −1.5% to −2%. Nothing operable should render below 13px mono.

### Spacing & Shape

- 8-point base scale: 8 / 16 / 24 / 40 / 64 / 96
- Card padding: 64px desktop, 24px mobile
- Gap between a Brief headline and its body: always 40px
- **Radius: zero, everywhere**, except dots and the escalation seal (which are fully circular). "A briefing book has square pages."
- No shadows, ever. Hierarchy comes from hairlines and from Ink vs. Ink 2 only.
- Bottom sheets slide up from the bottom on Ink 2 with a hairline top edge, no shadow/blur.

### Motion

Exactly two animations exist in the entire product — do not add others without a real reason:
1. **Card advance:** current card slides up 24px and fades out; next card rises from below. 360ms, ease-out.
2. **The seal** (escalation only) — see below.

### Controls

- Height 52px (44px minimum), square corners, mono uppercase label
- **Paper** (filled, Paper bg / Ink text) — the one primary action per card, bottom-right desktop / full-width bottom mobile
- **Outline** (hairline border, transparent) — commits to record or opens a sheet
- **Quiet** (no border, Paper 2 text) — defer/dismiss, always paired with another control, never alone
- **Red outline** — the single red control in the product; fills red only on the press-and-hold described below
- Inputs are underlined text, not boxed — value set in the serif at 22px, so typed text reads as part of the briefing. Focus state: underline goes solid Paper, 2px, no focus ring.

---

## Screen-by-Screen Reference

### The Briefing (replaces "Dashboard")

A ruled list of numbered cards for today (`01`, `02`, `03`...), each showing one line of text and a status tag (WITH ADVISOR / a due-date word / LAW / a plain date). A segmented progress rule (thin Paper-colored bars) at the bottom of every card is the *only* persistent chrome, showing position in today's deck — there is no menu bar. Pull down from the top of any card to reveal the Index (Today's deck / Deferred / People / Documents, each with a count).

**Gestures:** swipe up or → key = next; swipe down = Index; long-press a name = that person's file; typing anywhere raises the composer. Nothing depends on hover.

### Live-in-5 (the onboarding flow — six beats, ~5 minutes)

Each beat is a full-screen card, Skylar speaking first:

1. **0:00 — Who are you** — no landing page, no form. Two underlined fields (company, work email), serif input. Single "Continue →" button. **Magic-link sign-in — no password field.**
2. **0:30 — Who is this about** — names the employee the situation concerns (creates inline if new)
3. **0:45 — What's going on** — free-text description, composer styled as part of the briefing, with three ruled-row example prompts if the user hesitates ("An employee has been late repeatedly," etc.)
4. **1:30 — Two questions** — Skylar asks up to two clarifying questions, one per card
5. **3:00 — The plan** — the actual action plan: recommended approach, conversation script, documentation, each a numbered ruled row; "Save to [Name]'s record" as the primary action
6. **4:30 — Filed, and tomorrow** — quiet green "FILED" confirmation (no celebratory animation — filing is quiet everywhere in this design), then Skylar previews what happens next (a specific follow-up date, and a preview of tomorrow's first briefing card). **Only here, after real value is delivered, does the product mention anything else** — team import, handbook upload, pricing, invites are explicitly deferred to arrive as their own briefing cards over the following week, each with a stated reason, never as a setup checklist.

**Acceptance criterion (unchanged from rev. 1, now more specific):** a new signup reaches beat 6 in under 5 minutes with zero configuration steps in between.

### Conversation

Not a chat window. The user's message renders as a single italic quoted line ("YOU SAID...") at the top of a card; Skylar's reply *is* the card — a headline-sized answer, a supporting paragraph, and an italic aside for any caveat. The full message-by-message transcript exists as a separate ruled-ledger view, reached by swiping left (or the ← key) — a record you scroll, not a feed you're stuck inside. It is read-only; you cannot type into the transcript view.

When a message trips a risk classification, the reply card gets a **3px red top rule** and the sequence pauses — the risk tag in the header switches to a red dot + "HIGH RISK," and the card leads into the Escalation moment.

### Escalation ("The Seal")

The one fully interactive, non-trivial animation in the product — build this carefully, it's the emotional center of the business model.

- The escalation card shows: who the advisor will be (name, credential line), what they receive (this conversation, the employee's file, the handbook), and the response-time commitment ("Reply within 4 business hours · no charge to ask")
- The action is **press-and-hold, not a tap** — a red-outline button that fills left-to-right over **900ms** on hold (`onMouseDown`/`onTouchStart` begins the fill; releasing early before 900ms cancels silently and the fill retreats — implement this exactly, it's a deliberate anti-accidental-escalation mechanism)
- On completion: the card transitions (rise/fade, ~500ms) to a "sealed" state — headline changes tense ("Let's pause here" → "Renée has it, you'll hear from her by 2:00 today"), a circular red **stamp graphic** appears bearing the case ID and date (this is the one object in the whole product that rotates — roughly −8°), and the status tag becomes a boxed "WITH ADVISOR" mark
- This sealed conversation becomes card 01 of the next day's Briefing

### Employee File (replaces "Document Vault" as a concept)

Opens from a long-press on any name — there is no standalone People list in normal use. Two panels: a fixed left summary (Skylar-authored one-sentence status of the person, rewritten as the file changes, explicitly stating whether anything is high-risk; plus open items, document count, and next scheduled touchpoint) and a scrollable right-hand **ledger** — every event (conversations, notes, documents, reviews, hires) as one ruled row: mono date, an optional status dot (amber=open/unsigned, green=closed/filed, red=with advisor; most rows have **no dot at all**, which is the point — a quiet file is a healthy record), a plain-English description, and a mono reference (a doc filename, a case ID, or "TRANSCRIPT →"). Newest first. Entire file exportable as one dated PDF. **Nothing is ever deleted, only amended.**

Documents are rows in this ledger, not a separate page. The Index's "Documents" row is this same data, filtered across all employees to unsigned/outstanding items only.

---

## Responsive Behavior

Confirmed from the actual exports (not assumed): every screen has both a 1280×800 desktop frame and a 402×874 iOS-frame mobile version in the design files. Mobile differences are specific, not a generic reflow:
- Brief headline drops to 44/44, H1 to 36/38; body stays 18px
- Card padding drops from 64px to 24px
- The primary button becomes full-width at the bottom rather than bottom-right
- The transcript/ledger becomes a swipe gesture rather than a fixed side panel

This mobile-parity was designed from the start — build both sizes from the same component rather than designing mobile as an afterthought once desktop is done.

---

## Accessibility Notes

- Hairlines at 12% opacity meet contrast requirements as *dividers*, but verify all text-on-background combinations against the stated ratios in the token table (Paper 3 / `#7E7B74` at 4.7:1 is the tightest — confirm it's only ever used at 12px+ mono per the design's own rule, and never for body copy)
- The press-and-hold escalation interaction needs a keyboard-accessible equivalent (e.g., holding Enter/Space, or a confirm-dialog fallback) — the design doesn't specify this explicitly; **flag to design/product** rather than guessing, since getting this wrong on the product's single highest-stakes interaction is worse than asking
- `aria-live="polite"` on the card-advance region so screen readers announce new briefing cards without needing a manual re-read

---

## What's Reusable vs. What Needs Building

The design exports (`.dc.html` files) are Claude Design's canvas/documentation format — they're a precise visual and interaction reference (including real CSS values, exact animation timing, and in the Escalation file, actual working interaction logic in a script block demonstrating the press-and-hold state machine). **The Escalation file's script block is worth reading directly as interaction-logic reference** — it shows the exact phase state machine (idle → holding → sealed) Ahmed should replicate in the real component, not just the visual end states.

Do not copy the exported HTML/inline-styles directly into production components — rebuild as proper React/Next.js components using these tokens (ideally as Tailwind config / CSS custom properties) as the source of truth.
