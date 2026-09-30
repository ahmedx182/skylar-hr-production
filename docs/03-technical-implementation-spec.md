# 03 — Technical Implementation Specification
**Skylar HR Assistant — v2 "Briefing Room"**

This supersedes rev. 1 wherever the two conflict. The data model is largely unchanged; the auth mechanism and the frontend architecture are not.

---

## Architecture — What Changed

**Unchanged:** Next.js 14 App Router, TypeScript, Tailwind, Firestore, Anthropic Claude API (streaming), Stripe, Resend, Vercel, Sentry.

**Changed:**
- **Auth: Firebase Auth email-link (passwordless) sign-in**, not email/password. This requires: enabling the Email Link provider in the Firebase console, configuring authorized domains for the link redirect, and handling the "link opened on a different device than it was requested on" edge case (Firebase's SDK has a documented pattern for this — store the email in `localStorage` when the link is sent, prompt for re-entry if it's missing on click-through).
- **Frontend architecture: a card-sequence engine, not a multi-route dashboard.** Most of the product is one reusable `<BriefingCard>` component (or family of card-type components: Brief / Plan / Risk, per Document 02's "three species of card") rendered one at a time from an ordered array, with `NEXT`/`NOT NOW` advancing a pointer — not separate pages the user navigates between via a nav bar. The Index (pull-down) is closer to a traditional route/modal for the small subset of users who want direct navigation.

**Why this matters for effort estimation:** fewer distinct page types, but real sequencing/priority logic (what goes into today's deck, in what order) that didn't exist in the rev. 1 architecture. Don't under-scope this as "just a carousel."

---

## Data Model — Updates

Mostly unchanged from rev. 1. Additions/changes:

### `companies` — unchanged

### `users` — unchanged, minus password-related fields (none needed for magic-link auth)

### `employees`
Add a **`summary`** field: `{ text: string, updatedAt: Timestamp }` — the Skylar-authored one-sentence status shown at the top of the Employee File. This is AI-generated and rewritten as the file changes (per Document 02), so it needs a regeneration trigger (e.g., after any new ledger entry) rather than being static.

### `conversations` — unchanged structurally, but note: the UI no longer shows this as a scrolling bubble thread by default — the transcript view (ledger-style, read-only) is a secondary view reached by swipe/key, while the primary surface is the current reply card only. This is a rendering/UI decision, not a data model change — same `messages` array works for both.

### Employee ledger entries (situationHistory, extended)
Rev. 1's `situationHistory` array on the employee doc becomes the backing data for the Employee File's unified ledger, which now also needs to represent non-conversation events (notes, document uploads, review records, hire records) as the same kind of row. Recommend generalizing to:
```
situationHistory: Array<{
  type: 'conversation' | 'note' | 'document' | 'review' | 'hire' | 'other',
  date: Timestamp,
  description: string,          // the plain-English ledger line
  statusDot: 'amber' | 'green' | 'red' | null,   // null = no dot, most rows
  reference: string | null,     // case ID, filename, or "TRANSCRIPT →" link target
  conversationId: string | null,
  documentId: string | null,
}>
```
This is a broader schema than rev. 1 anticipated (which only modeled conversation-derived entries) — needed because the design explicitly shows notes, reviews, and hire records living in the same ledger, not a conversation-only history.

### `skylar_review_requests` — add fields to match the sealed-state UI:
```
advisorName: string,           // "Renée Alvarez" — shown in the sealed card
advisorCredentialLine: string, // "Skylar advisor · 11 yrs CA employment"
responseCommitment: string,    // "Reply within 4 business hours"
sealedAt: Timestamp,
```
**[A]** Assumption: advisor assignment (which named advisor a given escalation goes to) is either static/single-advisor for MVP or assigned by some rule not yet specified — confirm with product owner before hardcoding a single name.

### Briefing ordering (new)
No new collection strictly required — the Briefing's card order can be computed at request time from existing data (pending escalations first, then due dates, then law-update flags, then a closing card) rather than stored as its own persisted sequence. **Recommend computing this server-side in an API route** (e.g., `/api/briefing/today`) rather than client-side, so the ordering logic has one implementation, not one per platform (web today, mobile in October).

---

## API Routes — Updates

All rev. 1 routes carry over. Additions:

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/send-link` | POST | Sends the magic sign-in link |
| `/api/briefing/today` | GET | Returns the ordered card sequence for the authenticated user's company |
| `/api/employees/[id]/summary` | POST (internal, or triggered) | Regenerates the AI summary sentence after a ledger update |

Escalation-related routes from rev. 1 (`/api/skylar-review/*`) are unchanged in purpose; response payloads need the added advisor fields above.

---

## A Note on the Escalation Interaction Specifically

The received design export includes an actual working state-machine implementation (idle → holding → sealed, with a 900ms `setTimeout` and cancel-on-early-release) in its interactive prototype. **This is worth Ahmed reading directly as reference logic**, not just the visual spec — replicate the same phase model (a `phase` state of 0/1/2, `onMouseDown`/`onTouchStart` begins the timer, `onMouseUp`/`onMouseLeave`/`onTouchEnd` cancels if still in the holding phase) rather than reinventing the interaction from the written description alone.

---

## Environments, Deployment, Mobile

Unchanged from rev. 1, except: confirm Firebase Auth's email-link redirect domains are configured correctly for **each** environment (local, staging, production) separately — this is a common source of "works locally, breaks in staging" bugs specific to magic-link auth that doesn't exist with password auth.
