# Skylar Project Memory

Last reviewed: 2026-09-28

This file is the short working memory for the current repository. The seven
copied project documents in this folder remain the detailed product,
technical, design, delivery, testing, and decisions references.

## Product Direction

Skylar is an HR Briefing Room, not a generic dashboard and not a permanent
chat application. The main experience is an ordered daily briefing that guides
the user through the next important HR action. People and Documents are direct
access areas, secondary to the briefing.

The active application roles are only:

- `admin`: can manage employee records and notes.
- `employee`: provisioned workspace user with no admin mutations.

There is no active `super_admin`, manager, advisor, or Skylar Team role in the
current code. Advisor and company administration roles remain future decisions.

## Implemented Now

- Firebase passwordless email-link authentication.
- Active-user email allowlist before requesting a magic link.
- Secure server session cookies and protected server-rendered routes.
- Server-side role and company authorization.
- Real Firestore-backed `users`, `employees`, and
  `employee_ledger_entries` data.
- Daily Briefing starter flow.
- People index and employee profile pages.
- Employee creation and profile editing for admins.
- Employee-linked note creation for admins.
- Inline note editing and admin-confirmed deletion for notes.
- Admin-confirmed employee deletion, including attached ledger records while
  preserving the provisioned Firebase identity.
- Searchable employee selection when creating a note.
- Documents index and saved record detail pages.
- Account menu, logout, quick actions, and Ask Skylar UI surface.
- Top loading progress indicator.
- Responsive custom UI with lightweight transitions and no blur animation.
- First Claude conversation slice: protected streaming endpoint and a shared
  Skylar chat surface opened from the Briefing card.
- Task 2 is implemented: Prepare conversation opens the shared Skylar chat,
  passes the active employee and briefing context, streams Claude replies, and
  supports follow-up messages in the same conversation.
- Skylar chat responses render basic bold text, paragraphs, and bullet points
  instead of showing raw Markdown markers.
- Six-beat Live-in-5 flow for an empty admin workspace: workspace context,
  employee creation, situation, clarifying context, plan, and filed state.
- Live-in-5 uses a dedicated `/onboarding` route so creating the first employee
  cannot replace the remaining beats with the normal Briefing page.
- Live-in-5 beat 2 creates the employee through the server action, and beat 5
  saves the first real ledger note through the server action.
- Task 4 is implemented as approved-domain signup, not public signup: a new
  company and first admin user can be created only when the work email domain is
  listed in `SIGNUP_ALLOWED_DOMAINS`.
- Employee profile metadata: copied work email, state, last updated date,
  role, and location.
- Unit and integration test foundation for auth, schemas, guards, and errors.

## Important Current Decisions

- Use admin/employee roles only.
- `ahmed.fayyaz@artilence.com` is the admin account.
- Employee creation, profile updates, and note creation are admin-only and
  enforced on the server.
- Existing users must be provisioned and active before requesting a sign-in
  link; new-company signup is separately restricted by approved domains.
- Employee notes belong in the unified employee ledger.
- Documents are ledger records, not a separate document-vault product.
- The floating Ask Skylar surface remains a future assistant surface; the
  Briefing card now has the first Claude-backed conversation action.
- Briefing card conversation help uses `/api/briefing/conversation`; the
  Anthropic key remains server-only and the UI has a graceful unconfigured
  state.
- The current local Anthropic model is `claude-haiku-4-5-20251001`.
- Avoid blur-heavy transitions. Keep motion subtle and performant.
- Keep profile metadata compact and avoid duplicate note information in the
  employee header.

## Main Routes

| Route | Current purpose |
| --- | --- |
| `/login` | Passwordless email sign-in |
| `/verify` | Completes the Firebase email link |
| `/briefing` | Daily Briefing starter flow |
| `/onboarding` | Direct Live-in-5 flow for testing and first-run entry |
| `/deferred` | Deferred view, currently needs real persistence |
| `/people` | Employee index |
| `/people/new` | Create employee flow |
| `/people/[employeeId]` | Employee profile and saved notes |
| `/notes/new` | Create note flow |
| `/documents` | Ledger/document index |
| `/documents/[documentId]` | Ledger record detail |

## Remaining Product Work

### Task 3 status: implemented

**Task 3: Build the real Daily Briefing deck and card actions.**

- Server-side `/api/briefing/today` orders Firestore-backed cards by urgency and
  due date.
- `Prepare`, `Next`, and `Not now` are functional card actions.
- `Next` persists the current-day action and animates the current card down as
  the next card rises from underneath, like a physical stack of cards.
- `Not now` persists the card until the next day.
- The “What&apos;s ahead” sidebar uses the same server-owned deck.
- Starter briefing copy has been replaced with real employee and ledger state.

### Highest priority

- Finish Task 4 by backing the Marcus/Priya/Tom prototype situations with
  durable records and persisting advisor escalation.
- Build real conversation cards, clarifying questions, plans, and transcripts.
- Connect the floating Ask Skylar action to the real assistant backend.

### Employee memory and risk

- Generate and regenerate AI employee summaries after ledger changes.
- Support conversation, review, hire, document, and amendment ledger events.
- Add long-press employee navigation from briefing cards.
- Add PDF employee-file export.
- Add risk classification and high-risk card state.
- Build the 900ms escalation hold, cancel, sealed state, case ID, advisor
  assignment, queue, email notification, response status, and analytics.
- Decide the keyboard-accessible equivalent for press-and-hold escalation.

### Platform and business

- Add reviewed Firestore security rules and cross-tenant isolation tests.
- Add Stripe Checkout, Customer Portal, webhooks, trial gating, and billing.
- Add manager/company seat invites if the role model is expanded later.
- Build marketing/signup pages.
- Add production Vercel, Firebase domains, Anthropic, Resend, and Sentry
  configuration.
- Add monitoring, scheduled Firestore backups, rollback, and support process.
- Add Capacitor iOS/Android builds, push notifications, deep links, and store
  release work.
- Finalize Terms of Service, Privacy Policy, UAT owner, advisor access, and
  production project ownership.

## Verification State

`npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass after
the Task 3 Daily Briefing deck implementation.

Current test result: 10 test files and 63 tests passing.

## Source Documents

- [Product requirements](01-product-requirements.md)
- [Design implementation guide](02-design-implementation-guide.md)
- [Technical implementation spec](03-technical-implementation-spec.md)
- [Ahmed onboarding/build guide](04-ahmed-onboarding-build-guide.md)
- [Delivery plan/backlog](05-delivery-plan-backlog.md)
- [Testing/release/operations](06-testing-release-operations.md)
- [Open decisions/traceability](07-open-decisions-traceability.md)
- [Engineering architecture](SKYLAR_ENGINEERING_ARCHITECTURE_v4.md)
