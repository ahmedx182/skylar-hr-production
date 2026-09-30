# 04 — Ahmed's Onboarding & Build Guide
**Skylar HR Assistant**

---

## Step 1: Access

Before writing any code, get:
- [ ] GitHub access to `pnarciso1/skylar-hr-production` (collaborator invite from Paolo)
- [ ] Firebase project access (production project — confirm with Paolo whether this exists yet; see Document D's flagged blocker)
- [ ] Anthropic API key for the production account, **and confirmation of which Claude model that account can actually access** (see the known issue flagged in Document 03)
- [ ] Stripe account access (test mode to start)
- [ ] Resend account access (or whatever email provider is actually configured)
- [ ] Vercel project access
- [ ] Design file — an actual export, not the login-walled share link

**Do not proceed past this checklist until each item is confirmed** — several of these are unverified blockers (Document 07), and starting implementation against guessed credentials or a nonexistent production project wastes the limited time available.

---

## Step 2: Clone and Verify the Repository

```bash
git clone https://github.com/pnarciso1/skylar-hr-production.git
cd skylar-hr-production
```

**Your first real task is not writing a feature — it's an honest inventory.** Report back on:
- What's actually in the repo (file structure, `package.json` dependencies)
- Whether it matches the stack in Document 03 (Next.js 14, TypeScript, Tailwind, Firebase, Stripe)
- Which of the Functional Requirements in Document 01 already appear to be implemented, partially implemented, or not started
- Whether a `.env.example` or equivalent exists showing what configuration is expected

**[Proposed commands — verify against what's actually in the repo]:**
```bash
npm install
npm run dev
```

This inventory is the input to Document 05's delivery plan — the plan cannot be finalized until this is known.

---

## Step 3: Environment Variables

**[Proposed — confirm actual variable names against the repo, don't assume these match exactly]**

```
ANTHROPIC_API_KEY=              # from Anthropic Console, production account
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
STRIPE_SECRET_KEY=              # test mode initially
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRICE_ID=                # the $150/month price object in Stripe
RESEND_API_KEY=
SKYLAR_TEAM_EMAIL=               # notification recipient for review requests
ADMIN_PASSWORD=                  # or replace with real admin-role auth — see Document 01's role question
```

Get actual values from Paolo directly (do not commit them, do not request them over an insecure channel).

---

## Step 4: Run Locally

```bash
npm run dev
```

Verify (once environment is confirmed working):
- [ ] Signup flow creates a company and lands you in a chat
- [ ] A test message to Claude returns a streamed response
- [ ] Firestore shows the conversation being written

---

## Branch, Commit, and Review Conventions **[Proposed — confirm with Paolo]**

- Feature branches off `main`, named `feature/short-description`
- One pull request per Functional Requirement ID where practical (e.g., `FR-06` for employee creation) — makes review and traceability (Document 08) straightforward
- Commit messages reference the FR ID: `FR-06: add employee creation flow`
- **Anything touching Firestore security rules, Stripe webhook handling, or the tenant-isolation logic requires senior review before merge, no exceptions** — this is called out repeatedly in this handoff because it's the one place a fast junior-developer pace creates real risk.

---

## The First Feature to Build End-to-End

**Recommendation: FR-01 through FR-04 first (signup → auth → the "Live in 5" first conversation), before any other feature.**

Reasoning: this is the single flow every other feature depends on being able to test against (you need a logged-in company to test employees, documents, escalation, billing), it's explicitly the highest-priority UX requirement in the product, and building it first surfaces whether the Firebase/Stripe/Anthropic environment is actually working end-to-end before time is spent on anything else.

---

## Ordered Implementation Sequence

1. Auth + multi-tenant data model + Firestore security rules (get senior review on rules before moving on)
2. Live-in-5 signup → guided first conversation → delivered action plan
3. Employee entity + conversation linking + Employee Timeline
4. Skylar Handoff (detection, submission, queue, status)
5. Stripe billing (Checkout, Portal, webhooks) — can be built in parallel with 3–4 if there's a second pair of hands; otherwise sequential
6. Document Vault + HR Snapshot dashboard
7. Marketing/signup site pages
8. Admin dashboard (escalation analytics + queue view)
9. Polish, error/empty states, accessibility pass
10. Mobile (Capacitor) — October phase, not before web is stable

---

## When to Escalate Rather Than Guess

Escalate to Paolo (or whoever's designated for senior review) immediately, rather than proceeding on a guess, when:
- Anything touching Firestore security rules or cross-tenant data access
- The Stripe webhook signature verification isn't behaving as expected
- The design export contradicts something in this written spec — **the approved design is the authority for visual presentation, the approved requirements are the authority for behavior; if they conflict, that's a flag for Paolo, not a judgment call to make solo**
- Any point where the 12-day timeline and the actual remaining scope clearly don't fit — better to surface that on day 2 than day 11
