# Skylar Project Memory

Last reviewed: 2026-09-29

Local commit saved: `9772adf Complete Skylar briefing room task batch`

This file is the short working memory for the current repository. The detailed
product, design, technical, delivery, testing, and decisions references remain
in the numbered docs in this folder.

## Current State

The web app has a broad Briefing Room implementation covering the completed
task batch from Task 3 through Task 30. The working tree was clean immediately
after commit `9772adf`.

Verified after the latest task work:

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm test` passed: 19 test files, 99 tests.
- `npm run build` passed.

## Product Direction

Skylar is an HR Briefing Room, not a generic dashboard and not a permanent chat
application. The primary experience is an ordered daily briefing that guides a
manager through the next important people action. People, Documents, Advisor,
Billing, and Settings are direct access areas secondary to the briefing.

Active application roles in code:

- `admin`: can manage employee records, notes, billing, advisor queue actions,
  and workspace settings.
- `employee`: provisioned workspace user with no admin mutations.

There is still no separate production `advisor` or `skylar` role. Advisor queue
access is currently admin-scoped until the real Skylar-side access model is
confirmed.

## Implemented Now

- Passwordless Firebase email-link authentication.
- Approved-domain new workspace signup using `SIGNUP_ALLOWED_DOMAINS`.
- Active-user allowlist before requesting sign-in links.
- Secure server session cookies and protected server-rendered routes.
- Server-side role and company authorization.
- Firestore-backed users, employees, employee ledger entries, briefing actions,
  advisor escalations, Skylar conversations, and billing subscription records.
- Real Daily Briefing deck from company employee/ledger state.
- `Next` and `Not now` persisted briefing actions.
- Briefing `What's ahead` sidebar with risk/recent/clear badges.
- People index with search/filter.
- Employee profile with history, next steps, new-note action, and jsPDF export.
- Documents index with search/filter and saved record detail.
- Employee history search/filter and action checklist display.
- New note flow with employee prefill from profile/context.
- New person flow with multi-step, skippable modal-style experience.
- Deferred work page backed by real deferred briefing actions.
- Floating Skylar assistant with saved employee conversation context.
- Employee auto-selection in assistant when opened from an employee profile.
- Employee switch/search in assistant.
- Saved Skylar conversation transcript records.
- AI employee memory summaries regenerated from ledger context.
- Risk classification for high-risk people work.
- Advisor escalation queue UI.
- Advisor escalation detail/workbench actions: draft, mark responded, resolve.
- 900ms hold-to-escalate interaction for risk cards.
- Advisor escalation email notification via Resend when configured.
- Billing page with Stripe Checkout, Customer Portal, webhook route, and
  server-side 14-day trial gating.
- Account Settings page with display name and admin workspace rename.
- Custom destructive confirmation modals for delete actions.
- PDF export using `jspdf`, not browser print.
- Project ticket docs for Tasks 3-30.

## Important Current Decisions

- `ahmed.fayyaz@artilence.com` is the known admin account.
- Employee notes and conversations belong in the unified employee ledger.
- Documents are ledger records, not a separate document-vault product.
- Stripe webhooks are authoritative for subscription state.
- Resend is server-only; browser code never calls it directly.
- Missing Stripe/Resend env values should not break local builds. Routes show or
  persist setup/skipped states instead.
- Keep motion subtle and avoid blur-heavy transitions.
- Use `jsPDF` for employee file exports.

## Main Routes

| Route | Current purpose |
| --- | --- |
| `/login` | Passwordless email sign-in and approved-domain signup |
| `/verify` | Completes the Firebase email link |
| `/briefing` | Ordered Daily Briefing deck |
| `/onboarding` | Live-in-5 first-run flow |
| `/deferred` | Deferred briefing items |
| `/people` | Employee index |
| `/people/new` | New employee flow |
| `/people/[employeeId]` | Employee profile, history, PDF export |
| `/notes/new` | Create note flow |
| `/documents` | Saved ledger/document index |
| `/documents/[documentId]` | Saved record detail |
| `/advisor` | Advisor escalation queue/workbench |
| `/billing` | Trial/subscription state and Stripe actions |
| `/settings` | Account/workspace settings |

## Latest Completed Tickets

- Task 27: Stripe billing and trial gating.
- Task 28: Advisor escalation email notifications.
- Task 29: Account Settings page.
- Task 30: jsPDF employee file export.

All ticket docs from Task 3 through Task 30 are marked done under
`docs/tickets/`.

## Remaining Launch Work

Highest priority before a Thursday client release:

- Confirm production env/access: Vercel, Firebase, Anthropic, Stripe, Resend,
  Sentry.
- Configure live/staging Stripe price, Checkout, Portal, and webhook endpoint.
- Configure Resend sender/recipient and verify a real escalation email in the
  target environment.
- Run UAT for signup, Live-in-5, briefing, employee file, advisor escalation,
  billing/trial gating, and PDF export.
- Stress-test Firestore security rules and cross-tenant isolation.
- Confirm Terms of Service and Privacy Policy links/pages.
- Confirm named UAT approver and go/no-go owner.

Still remaining beyond the current web-app task batch:

- Real Skylar-side advisor role/access model.
- Team/manager seat invite flow if still required for release.
- Marketing/public pages if client expects them before launch.
- Production monitoring, backups, rollback checklist, and support triage.
- Capacitor iOS/Android builds, push notifications, deep links, store metadata,
  TestFlight/internal testing, and app store submission.

## Source Documents

- [Product requirements](01-product-requirements.md)
- [Design implementation guide](02-design-implementation-guide.md)
- [Technical implementation spec](03-technical-implementation-spec.md)
- [Ahmed onboarding/build guide](04-ahmed-onboarding-build-guide.md)
- [Delivery plan/backlog](05-delivery-plan-backlog.md)
- [Testing/release/operations](06-testing-release-operations.md)
- [Open decisions/traceability](07-open-decisions-traceability.md)
- [Engineering architecture](SKYLAR_ENGINEERING_ARCHITECTURE_v4.md)
