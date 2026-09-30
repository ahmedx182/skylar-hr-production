# 06 — Testing, Release & Operations
**Skylar HR Assistant**

---

## Test Plan by Launch-Critical Requirement

| FR | Automated | Manual |
|---|---|---|
| FR-01/02 (auth) | Unit test signup/login logic if time permits | Signup with email+password, signup with Google, login, password reset, duplicate-email error |
| FR-03 (tenant isolation) | — | **Critical:** create two test companies; from Company A's logged-in session, attempt to read/write Company B's employees/conversations/documents both through the UI and via direct Firestore calls in browser console. Must fail every time. |
| FR-04 (Live in 5) | — | Fresh signup, timed, to a delivered action plan — confirm under 5 minutes with no required steps skipped |
| FR-05 (chat) | — | Normal conversation, very long message, network interruption mid-stream (message must not be lost) |
| FR-06–09 (employee memory) | — | Create employee inline, select existing employee, verify AI references prior history on 2nd conversation about the same employee |
| FR-10–13 (Skylar Handoff) | — | Trigger a high-risk scenario, confirm button appears, confirm email arrives, confirm queue shows it, mark responded, confirm client-side status updates |
| FR-16/17 (billing) | — | Full trial → add card → active subscription flow in Stripe test mode; trial expiry without card; Customer Portal cancel/reactivate |
| FR-21/22 (mobile, October) | — | Full flow on a physical iOS and Android device, not simulator only; push notification delivery and deep link |

**Permission/role checks:** non-admin attempts billing management (should be blocked), unauthenticated request to any API route (should be rejected), Skylar-only routes accessed by a regular company user (should be rejected).

**Responsive testing:** every launch-critical flow at mobile width, not just desktop — this matters more than usual given mobile apps follow within weeks.

---

## Client User Acceptance Testing

**[Blocker — needs product-owner input]** No named approval role or UAT process was specified in prior project history. Recommend: Skylar (Lauren and/or Evan) personally runs through the Live-in-5 flow and the Skylar Review Request flow end-to-end before any client is invited to the live product — these are the two flows the entire business model depends on, and they should be verified by a human who isn't the developer.

---

## Definition of Done

**Per task:** code merged to `main`, passes the manual test steps above for its FR, no console errors, reviewed per Document 04's review conventions (senior review completed for anything flagged as requiring it).

**Per production release:** every launch-critical FR in Document 01 passes its test, Firestore security rules have been specifically stress-tested for cross-tenant leakage, Stripe is confirmed in live mode with the correct price ID, a real Skylar Review Request has been sent and received end-to-end in production (not just test mode), and Terms of Service / Privacy Policy are live (see Document 08's blocker on this).

---

## Deployment, Rollback, Monitoring

- **Deployment:** Vercel, auto-deploy from `main` — confirm this is how the repo is actually configured
- **Rollback:** Vercel's instant-rollback-to-previous-deployment feature; for any change involving a Firestore data model change, rollback is more complex — flag data-model changes explicitly in PRs so they're not treated as trivially reversible
- **Monitoring:** Sentry for error tracking, a basic uptime check (Vercel's own or an external service) — confirm alerting actually reaches someone, not just a dashboard nobody watches
- **Support:** given the pricing agreement's technical-support scope (bug fixes and infrastructure issues only, not new features), a lightweight process for triaging incoming issues into "support scope" vs. "new feature request" is worth setting up before launch, not after the first ambiguous request arrives

---

## Mobile-Specific Milestones (October)

Separate and track distinctly, since they have different failure modes:
- **Beta/internal testing** — TestFlight (iOS) and internal testing track (Android), before public submission
- **App Store submission** — submit early in the October window specifically to absorb Apple's review-time uncertainty; have a demo account with placeholder data ready for Apple's reviewers
- **Public release** — the actual go-live date, which may lag submission by an unpredictable number of days on the iOS side

---

## Data Backup & Recovery

**[P] Proposed, not yet confirmed as a formal requirement:** Firestore has built-in redundancy, but that's not the same as backup against an application-level mistake (e.g., a bad migration or bulk-write bug). Recommend enabling Firestore's scheduled export-to-Cloud-Storage backups before real customer data exists in production, given the product now handles paying customers' HR records, not pilot test data.
