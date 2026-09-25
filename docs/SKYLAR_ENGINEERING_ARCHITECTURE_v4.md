# Skylar HR Assistant v2 --- Engineering Architecture & Implementation Guide

**Project:** Skylar HR Assistant --- "Briefing Room"\
**Repository:** `skylar-hr-coreimersive`\
**Platform:** Responsive web first; Capacitor mobile later\
**Framework:** Next.js 14 App Router + TypeScript\
**Architecture decision:** SSR-first, Server Components by default,
minimal client-side JavaScript\
**Status:** Project scaffolded; packages, base folders, and environment
files created

------------------------------------------------------------------------

## 1. Purpose of This Document

This document is the implementation source of truth for the new Skylar
codebase. It combines the confirmed v2 product requirements,
design/interaction specification, technical implementation notes, and
our engineering decisions for SSR, authentication, state management,
data access, performance, security, and project organization.

Where the supplied Skylar v2 documents conflict with older rev. 1
material, the v2 "Briefing Room" requirements and current design take
precedence.

The implementation must preserve one central product principle:

> **Skylar is not a dashboard and not a chat application. It is an
> ordered daily briefing that guides a manager through the next
> important HR action.**

The primary experience is therefore a sequence of focused cards rather
than a collection of pages, charts, widgets, or a permanent sidebar.

------------------------------------------------------------------------

# 2. Product Model

## 2.1 What Skylar Is

Skylar is a manager-facing HR guidance system that:

-   surfaces the most important HR item first;
-   guides managers through employee situations;
-   remembers employee history;
-   provides structured conversation guidance;
-   detects high-risk situations;
-   escalates appropriate cases to a human advisor;
-   records actions into an employee file;
-   creates a chronological, auditable HR record;
-   supports billing and company administration.

AI is an implementation capability, not the visual identity of the
product. The interface should behave intelligently without looking like
a generic AI assistant.

------------------------------------------------------------------------

## 2.2 Primary Roles

### Manager

Can:

-   complete Live-in-5 onboarding;
-   view the daily Briefing;
-   create/select employees inline;
-   discuss employee situations;
-   receive Skylar guidance;
-   save actions to employee records;
-   view employee files;
-   defer Briefing items;
-   submit high-risk situations for human review.

### Company Admin

Includes Manager capabilities plus:

-   company-level administration;
-   billing;
-   subscription management;
-   seat/invite management.

### Skylar Team / Advisor

Internal role for:

-   viewing escalated cases;
-   reviewing employee/context information allowed for the case;
-   responding to escalation requests;
-   updating case status.

The exact advisor-access model and assignment strategy remain product
decisions that must be confirmed before the escalation queue is
finalized.

------------------------------------------------------------------------

# 3. Core User Journeys

## 3.1 Live-in-5

The onboarding experience consists of six sequential full-screen beats.

### Beat 1 --- Who are you?

Collect:

-   company name;
-   work email.

Authentication is passwordless through a Firebase email magic link.

### Beat 2 --- Who is this about?

The manager identifies an employee.

If the employee does not exist, Skylar creates the employee inline
instead of forcing the user into a separate employee-management
workflow.

### Beat 3 --- What is going on?

Free-text situation description.

Example prompts can be shown when useful, but the experience should
still feel like a briefing rather than a form wizard.

### Beat 4 --- Clarifying questions

Skylar may ask up to two clarifying questions.

Each question is its own card.

### Beat 5 --- The plan

Skylar returns structured guidance including:

-   recommended approach;
-   suggested conversation;
-   documentation/action requirements.

Primary action:

`Save to [Employee]'s record`

### Beat 6 --- Filed + tomorrow

Confirm that the plan was filed.

Then preview the next meaningful event, such as a follow-up date or
tomorrow's first Briefing item.

### Acceptance target

A new user should move from signup to a filed action plan in less than
five minutes without configuration/setup interruptions.

------------------------------------------------------------------------

# 4. The Daily Briefing

The Briefing is the product's main interface.

It is **not** a dashboard.

The server builds an ordered sequence of cards.

Recommended priority:

1.  cases currently with an advisor;
2.  actions due today;
3.  relevant law/policy updates;
4.  quiet closing card.

The manager moves through cards using:

-   `NEXT`
-   `NOT NOW`

`NOT NOW` defers the item according to product rules, normally to
tomorrow.

The current position is represented by the Briefing progress UI.

------------------------------------------------------------------------

# 5. Secondary Navigation --- The Index

The Index is secondary navigation, not the main product shell.

It exposes:

-   Today's deck;
-   Deferred;
-   People;
-   Documents.

Do not turn the Index into a traditional persistent dashboard/sidebar
architecture.

Desktop and mobile may expose the Index differently, but the mental
model remains the same: the manager normally works through the Briefing
and uses the Index only when direct access is needed.

------------------------------------------------------------------------

# 6. Employee Conversation Model

Skylar is not a chat-bubble application.

The primary presentation is:

1.  manager's statement/question;
2.  Skylar response card;
3.  recommended action;
4.  optional continuation.

The transcript exists as a secondary read-only record.

A response may explicitly reference previous employee history where
relevant.

Example:

> You documented a similar attendance concern on September 14.

This continuity is important to the value of the product.

------------------------------------------------------------------------

# 7. High-Risk Escalation

When risk classification identifies a high-risk situation:

1.  the normal sequence pauses;
2.  the card enters a risk state;
3.  the manager sees the assigned advisor;
4.  Skylar explains what information will be sent;
5.  the response-time commitment is shown;
6.  the manager performs the escalation hold interaction.

## Hold interaction

Duration:

`900ms`

State machine:

``` text
IDLE
  ↓ pointer/key down
HOLDING
  ↓ 900ms completed
SEALED

HOLDING
  ↓ released early
IDLE
```

Early release must cancel silently.

After successful completion:

-   escalation is persisted;
-   `sealedAt` is recorded;
-   a case ID exists;
-   status becomes `WITH ADVISOR`;
-   the sealed state is rendered;
-   the case is prioritized in the next Briefing.

A keyboard-accessible equivalent remains a product/design decision and
must not be invented silently.

------------------------------------------------------------------------

# 8. Employee File

The Employee File is a living HR dossier rather than a dashboard.

It contains:

-   employee identity;
-   Skylar-generated one-sentence status summary;
-   open items;
-   next touchpoint;
-   chronological ledger.

Ledger event types include:

``` ts
type EmployeeLedgerType =
  | "conversation"
  | "note"
  | "document"
  | "review"
  | "hire"
  | "other";
```

Nothing is deleted from the historical record. Corrections are handled
through amendments.

The file can be exported as a dated PDF.

Documents belong in this unified history rather than becoming an
independent "Document Vault" product.

------------------------------------------------------------------------

# 9. Technology Stack

## Application

-   Next.js 14 App Router
-   React
-   TypeScript
-   Tailwind CSS

## Authentication / Data

-   Firebase Authentication
-   Firebase Admin SDK
-   Cloud Firestore

## AI

-   Anthropic Claude API
-   streaming responses

## Billing

-   Stripe
-   Stripe Customer Portal
-   Stripe webhooks

## Email

-   Resend

## Monitoring

-   Sentry

## Validation / Forms

-   Zod
-   React Hook Form
-   `@hookform/resolvers`

## Client State

-   Zustand

## Client Query Layer

-   TanStack Query

TanStack Query is intentionally **not** the default data-fetching
mechanism for every page. SSR/RSC server fetching remains the default.

## Utilities

-   `date-fns`
-   `clsx`
-   `tailwind-merge`
-   `lucide-react`

## Later Mobile

-   Capacitor
-   iOS
-   Android

------------------------------------------------------------------------

# 10. SSR-First Architecture

## 10.1 Core Rule

**Server Components by default.**

A component becomes a Client Component only when it requires
browser-only behavior such as:

-   gestures;
-   local interactive state;
-   browser APIs;
-   form typing;
-   press-and-hold;
-   card transition state;
-   optimistic mutation state.

Do not place `"use client"` at a page or layout level simply for
convenience.

------------------------------------------------------------------------

## 10.2 Request Model

Target request path:

``` text
Browser
   ↓
Next.js
   ↓
Verify secure session
   ↓
Resolve authenticated user
   ↓
Resolve company/role
   ↓
Server repository queries
   ↓
Service/business logic
   ↓
Server Component rendering
   ↓
HTML streamed to browser
   ↓
Small interactive islands hydrate
```

This is preferred over:

``` text
Empty HTML
   ↓
Large client bundle
   ↓
Firebase initializes
   ↓
Auth initializes
   ↓
Client query starts
   ↓
Spinner
   ↓
Data arrives
```

------------------------------------------------------------------------

# 11. Server vs Client Responsibilities

## Server owns

-   authentication verification;
-   session verification;
-   authorization;
-   tenant isolation;
-   Firestore protected reads/writes;
-   Briefing ordering;
-   Claude API calls;
-   risk processing;
-   Stripe;
-   Resend;
-   employee summary regeneration;
-   sensitive HR business logic.

## Client owns

-   current Briefing pointer;
-   gesture tracking;
-   Index open/closed state;
-   temporary composer input;
-   press-and-hold progress;
-   optimistic visual feedback;
-   small local UI preferences.

The browser must never become the authority for company ID, role,
permissions, billing state, or risk/escalation authorization.

------------------------------------------------------------------------

# 12. Recommended Project Structure

``` text
skylar-hr-coreimersive/
│
├── public/
│   ├── brand/
│   │   ├── logo.png
│   │   └── favicon assets
│   ├── icons/
│   └── images/
│
├── src/
│   │
│   ├── app/
│   │   ├── (public)/
│   │   │   └── ...
│   │   │
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── verify/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (protected)/
│   │   │   ├── briefing/
│   │   │   │   └── page.tsx
│   │   │   ├── employees/
│   │   │   │   └── [employeeId]/
│   │   │   │       └── page.tsx
│   │   │   ├── billing/
│   │   │   └── layout.tsx
│   │   │
│   │   ├── onboarding/
│   │   │   └── page.tsx
│   │   │
│   │   ├── advisor/
│   │   │   └── escalations/
│   │   │
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── session/
│   │   │   │   ├── logout/
│   │   │   │   └── send-link/
│   │   │   ├── briefing/
│   │   │   ├── conversations/
│   │   │   ├── employees/
│   │   │   ├── skylar-review/
│   │   │   ├── stripe/
│   │   │   └── webhooks/
│   │   │
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   ├── not-found.tsx
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── briefing/
│   │   ├── employee/
│   │   ├── conversation/
│   │   ├── escalation/
│   │   ├── index/
│   │   └── auth/
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── briefing/
│   │   ├── onboarding/
│   │   ├── employees/
│   │   ├── conversations/
│   │   ├── escalation/
│   │   └── billing/
│   │
│   ├── lib/
│   │   ├── firebase/
│   │   │   ├── client.ts
│   │   │   └── admin.ts
│   │   ├── anthropic/
│   │   ├── stripe/
│   │   ├── resend/
│   │   └── utils/
│   │
│   ├── server/
│   │   ├── auth/
│   │   ├── repositories/
│   │   ├── services/
│   │   ├── actions/
│   │   └── guards/
│   │
│   ├── providers/
│   ├── stores/
│   ├── schemas/
│   ├── types/
│   └── constants/
│
├── .env.local
├── .env.example
├── firestore.rules
├── firestore.indexes.json
├── next.config.mjs
├── package.json
├── tsconfig.json
└── README.md
```

------------------------------------------------------------------------

# 13. Domain Organization

Avoid putting business logic directly into pages.

The dependency direction should be:

``` text
Page / Route
     ↓
Service
     ↓
Repository
     ↓
Firestore / external provider
```

Example:

``` text
briefing/page.tsx
     ↓
briefing.service.ts
     ↓
briefing.repository.ts
     ↓
Firestore
```

## Repository responsibility

Repositories know how data is stored.

Examples:

-   query Firestore;
-   convert timestamps;
-   create/update documents;
-   perform transactions.

Repositories should not decide product behavior.

## Service responsibility

Services know business rules.

Examples:

-   Briefing priority ordering;
-   defer logic;
-   employee summary refresh;
-   escalation creation;
-   authorization decisions;
-   subscription gating.

## Component responsibility

Components render state and collect user interaction.

Components must not contain Firestore query logic.

------------------------------------------------------------------------

# 14. Firebase Client / Admin Separation

## `src/lib/firebase/client.ts`

Browser-only Firebase functionality.

Main responsibility:

-   Firebase Auth magic-link completion;
-   obtaining Firebase ID tokens when establishing the server session.

Avoid using the browser Firestore SDK as the default protected HR data
layer.

## `src/lib/firebase/admin.ts`

Server-only.

Must begin with:

``` ts
import "server-only";
```

Responsibilities:

-   verify Firebase ID tokens;
-   create/verify session cookies;
-   protected Firestore access;
-   server-side user/company resolution.

Never import Firebase Admin into a Client Component.

------------------------------------------------------------------------

# 15. Authentication Architecture

## 15.1 Login method

Firebase email-link authentication.

No password.

## 15.2 Flow

``` text
Manager enters work email
        ↓
Magic link requested
        ↓
Email delivered
        ↓
Manager opens link
        ↓
/verify
        ↓
Firebase completes email-link login
        ↓
Client receives Firebase ID token
        ↓
POST /api/auth/session
        ↓
Firebase Admin verifies token
        ↓
Server creates secure session cookie
        ↓
Protected SSR application available
```

------------------------------------------------------------------------

## 15.3 Cross-device magic-link case

When requesting the link:

``` text
localStorage
└── skylar_magic_email
```

When the link opens:

-   if stored email exists, continue;
-   if not, request email re-entry;
-   then complete `signInWithEmailLink`.

Do not assume the email link is opened on the same browser/device.

------------------------------------------------------------------------

# 16. Session Cookie

Recommended cookie:

``` text
Name: __session
HttpOnly: true
Secure: true in production
SameSite: lax
Path: /
```

Session lifetime should be explicitly configured rather than implicitly
relying on browser Firebase state.

Do not store Firebase tokens in Zustand.

Do not store authentication tokens in normal localStorage.

------------------------------------------------------------------------

# 17. `getSession()` Pattern

Create a server-only helper such as:

``` text
src/server/auth/get-session.ts
```

Responsibilities:

1.  read the session cookie;
2.  verify it using Firebase Admin;
3.  resolve the application user;
4.  return normalized session data.

Example shape:

``` ts
interface AuthSession {
  uid: string;
  email: string | null;
  companyId: string;
  role: "manager" | "admin" | "skylar";
}
```

Protected Server Components should consume this server helper.

------------------------------------------------------------------------

# 18. Authorization

Authentication and authorization are different.

A valid Firebase account does not automatically mean the user may access
a requested employee.

Every sensitive operation must check:

``` text
Authenticated?
    ↓
Application user exists?
    ↓
Correct role?
    ↓
Correct company?
    ↓
Requested resource belongs to company?
    ↓
Allowed operation?
```

Never trust a client-supplied `companyId`.

Resolve company ID from the verified user/session.

------------------------------------------------------------------------

# 19. Protected Layout

`src/app/(protected)/layout.tsx`

Responsibilities:

-   verify session;
-   redirect unauthenticated users;
-   resolve current application user;
-   reject disabled users;
-   provide minimal authenticated shell/context.

Do not turn this layout into a large Client Component.

------------------------------------------------------------------------

# 20. State Management Strategy

## 20.1 Server state

Server is source of truth for:

-   user;
-   company;
-   employees;
-   employee history;
-   conversations;
-   Briefing contents;
-   escalations;
-   billing/subscription.

## 20.2 Zustand

Use Zustand only for ephemeral application interaction state.

Suggested stores:

``` text
stores/
├── briefing-store.ts
├── composer-store.ts
└── ui-store.ts
```

### Briefing store

May contain:

``` ts
{
  currentIndex: number;
  direction: "forward" | "backward" | null;
  isTransitioning: boolean;
}
```

Do not store the actual authoritative employee/Briefing database in
Zustand.

### UI store

May contain:

``` ts
{
  indexOpen: boolean;
  transcriptOpen: boolean;
}
```

### Composer state

Only temporary unsaved text when needed.

------------------------------------------------------------------------

# 21. TanStack Query Strategy

TanStack Query is useful, but it must not convert the SSR application
into a client SPA.

Use it for:

-   mutation feedback;
-   client-side refresh after mutations;
-   advisor queue polling if required;
-   secondary interactive panels;
-   optimistic updates where safe.

Do not automatically use it for:

-   initial Briefing load;
-   initial employee file;
-   initial protected user;
-   company permissions.

Those should normally be server-rendered.

------------------------------------------------------------------------

# 22. Firestore Multi-Tenant Model

Tenant isolation is launch-critical.

Every tenant-owned document must have an unambiguous company
relationship.

Recommended top-level conceptual model:

``` text
companies/{companyId}

users/{userId}

employees/{employeeId}

conversations/{conversationId}

skylar_review_requests/{requestId}

subscriptions/{companyId}
```

Each tenant-owned entity should include:

``` ts
companyId: string
```

Where scale/query behavior benefits from company-scoped subcollections,
that can be introduced deliberately, but never mix tenant records
without an enforceable ownership field.

------------------------------------------------------------------------

# 23. Suggested Core Types

## Company

``` ts
interface Company {
  id: string;
  name: string;
  createdAt: Timestamp;
  createdBy: string;
  subscriptionStatus: string;
  trialEndsAt?: Timestamp;
}
```

## User

``` ts
interface AppUser {
  id: string;
  companyId: string;
  email: string;
  displayName?: string;
  role: "manager" | "admin" | "skylar";
  status: "active" | "disabled";
  createdAt: Timestamp;
}
```

## Employee

``` ts
interface Employee {
  id: string;
  companyId: string;
  name: string;
  jobTitle?: string;
  location?: string;

  summary?: {
    text: string;
    updatedAt: Timestamp;
  };

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

------------------------------------------------------------------------

# 24. Employee Ledger

Prefer a scalable ledger representation rather than allowing the
employee document to grow indefinitely.

The supplied technical specification describes `situationHistory` as an
array. For production scalability, implementation should evaluate moving
ledger entries into a company/employee-scoped collection while
preserving the same logical schema.

Logical ledger entry:

``` ts
interface EmployeeLedgerEntry {
  id: string;
  companyId: string;
  employeeId: string;

  type:
    | "conversation"
    | "note"
    | "document"
    | "review"
    | "hire"
    | "other";

  date: Timestamp;
  description: string;

  statusDot:
    | "amber"
    | "green"
    | "red"
    | null;

  reference?: string | null;
  conversationId?: string | null;
  documentId?: string | null;

  createdAt: Timestamp;
  createdBy: string;
}
```

Newest entries should be queryable first.

------------------------------------------------------------------------

# 25. Conversation Model

A conversation should retain enough information to:

-   reproduce transcript;
-   build current response card;
-   regenerate context;
-   audit guidance;
-   link to employee;
-   link to escalation.

Suggested conceptual structure:

``` ts
interface Conversation {
  id: string;
  companyId: string;
  employeeId: string;
  createdBy: string;

  status:
    | "active"
    | "filed"
    | "with_advisor"
    | "closed";

  classification?: string;
  riskLevel?: "normal" | "attention" | "high";

  messages: ConversationMessage[];

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

For large conversations, a messages subcollection may be preferable to
an indefinitely growing Firestore array.

------------------------------------------------------------------------

# 26. Escalation Model

``` ts
interface SkylarReviewRequest {
  id: string;

  companyId: string;
  employeeId: string;
  conversationId: string;

  status:
    | "pending"
    | "with_advisor"
    | "responded"
    | "closed";

  advisorName: string;
  advisorCredentialLine: string;
  responseCommitment: string;

  caseId: string;

  sealedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Advisor assignment logic remains unresolved and must be confirmed before
hardcoding production behavior.

------------------------------------------------------------------------

# 27. Briefing Domain Model

The Briefing should be generated server-side.

Example normalized card:

``` ts
type BriefingCardType =
  | "advisor"
  | "due"
  | "law"
  | "plan"
  | "filed"
  | "close";

interface BriefingCard {
  id: string;
  type: BriefingCardType;

  priority: number;

  title: string;
  body?: string;

  employeeId?: string;
  conversationId?: string;
  escalationId?: string;

  status?: string;
  dueAt?: string;

  actions: BriefingAction[];
}
```

Do not make UI components responsible for deciding priority.

------------------------------------------------------------------------

# 28. Briefing Service

Recommended server flow:

``` text
getTodayBriefing(session)
        ↓
validate user/company
        ↓
parallel data reads
        ↓
normalize candidate cards
        ↓
apply priority rules
        ↓
remove completed/deferred items
        ↓
append quiet close
        ↓
return BriefingCard[]
```

Parallelize independent reads:

``` ts
const [
  advisorCases,
  dueItems,
  lawUpdates,
] = await Promise.all([
  getAdvisorCases(companyId),
  getDueItems(companyId),
  getLawUpdates(companyId),
]);
```

Do not perform independent Firestore queries sequentially unless one
depends on another.

------------------------------------------------------------------------

# 29. Deferral

`NOT NOW` is business state, not just a client UI change.

The defer operation must persist enough information to prevent the same
item from reappearing immediately.

Conceptually:

``` ts
{
  deferredUntil: Timestamp;
  deferredBy: userId;
  deferredAt: Timestamp;
}
```

The Briefing service filters deferred cards until they become eligible
again.

------------------------------------------------------------------------

# 30. Employee Summary Regeneration

The employee summary is AI-generated and changes as the file changes.

Do not regenerate it during every page request.

Trigger regeneration after meaningful ledger mutations:

``` text
new conversation filed
new note
new review
new document
advisor response
important status change
        ↓
queue/call summary regeneration
        ↓
persist summary
```

Then Employee File SSR simply reads the latest stored summary.

------------------------------------------------------------------------

# 31. Claude Integration

All Anthropic calls must happen server-side.

Never expose:

``` text
ANTHROPIC_API_KEY
```

to the browser.

Suggested organization:

``` text
src/lib/anthropic/
├── client.ts
├── prompts.ts
└── stream.ts
```

and:

``` text
src/server/services/
├── conversation.service.ts
├── classification.service.ts
└── employee-summary.service.ts
```

------------------------------------------------------------------------

# 32. AI Responsibilities

Keep AI tasks explicit.

Potential tasks:

1.  situation clarification;
2.  structured guidance;
3.  conversation preparation;
4.  situation classification;
5.  risk classification;
6.  employee summary generation.

Do not rely on one giant prompt to perform all product behavior.

------------------------------------------------------------------------

# 33. Structured AI Output

Where the application needs deterministic behavior, request structured
output validated with Zod.

Example conceptual schema:

``` ts
const guidanceSchema = z.object({
  headline: z.string(),
  explanation: z.string(),
  steps: z.array(z.string()),
  caveat: z.string().nullable(),
  classification: z.string(),
  riskLevel: z.enum([
    "normal",
    "attention",
    "high",
  ]),
});
```

Never directly trust model output before validation.

------------------------------------------------------------------------

# 34. Streaming

Conversation responses should stream.

Target experience:

``` text
submit
  ↓
server validates
  ↓
context loaded
  ↓
Claude starts
  ↓
first text arrives quickly
  ↓
card progressively renders
  ↓
final structured response validated
  ↓
conversation persisted
```

The product requirement includes a sub-500ms streaming target; optimize
time-to-first-token rather than waiting for the full completion.

------------------------------------------------------------------------

# 35. AI Context Construction

Do not send the employee's entire history blindly on every request.

Build context deliberately.

Possible context:

``` text
system/product guidance
current employee summary
relevant recent ledger entries
current situation
relevant prior conversation
company handbook/policy excerpts if available
```

Prefer retrieval of relevant history over unlimited transcript
injection.

Benefits:

-   faster requests;
-   lower token cost;
-   less noise;
-   more stable answers;
-   better privacy discipline.

------------------------------------------------------------------------

# 36. Risk Classification

High-risk behavior is product-critical.

Risk classification should be treated as its own controlled step rather
than inferred from UI wording.

Relevant categories in the design/spec include sensitive employment
matters such as:

-   leave law;
-   disability;
-   pregnancy;
-   termination;
-   discrimination.

The exact production classification policy should be controlled by the
approved product/legal prompt/rules and not casually expanded by UI
code.

------------------------------------------------------------------------

# 37. API Design

Route handlers should be thin.

Example:

``` text
POST /api/conversations
    ↓
parse request
    ↓
validate Zod schema
    ↓
getSession()
    ↓
authorize
    ↓
conversationService.create(...)
    ↓
return normalized response
```

Route handlers should not contain hundreds of lines of Firestore and AI
logic.

------------------------------------------------------------------------

# 38. Validation

Validate at trust boundaries.

Use Zod for:

-   request body;
-   query parameters;
-   route parameters where appropriate;
-   AI structured output;
-   environment configuration where practical;
-   webhook payload normalization.

Client validation improves UX.

Server validation provides security.

Never rely only on React Hook Form validation.

------------------------------------------------------------------------

# 39. Server Actions vs Route Handlers

Use Server Actions for tightly coupled form mutations where they
simplify the implementation.

Use Route Handlers when:

-   streaming;
-   external webhooks;
-   mobile will call the same endpoint;
-   API semantics matter;
-   client-side fetch is required.

Because Capacitor/mobile is planned, important business operations
should generally remain service-driven and reusable independently of the
React page.

------------------------------------------------------------------------

# 40. Performance Strategy

Performance is an architectural requirement.

## Initial render

Prefer:

``` text
Server Component
+ direct server data access
+ streamed HTML
```

over:

``` text
Client Component
+ useEffect
+ API fetch
+ loading spinner
```

------------------------------------------------------------------------

# 41. Query Performance

Rules:

-   query by `companyId`;
-   query by indexed status/due date;
-   apply `limit`;
-   paginate ledgers;
-   avoid full collection reads;
-   avoid client filtering of protected datasets;
-   select/construct only needed data;
-   run independent queries concurrently.

Bad:

``` text
get every employee
→ filter company in JS
```

Good:

``` text
company-scoped/indexed query
→ order
→ limit
```

------------------------------------------------------------------------

# 42. Caching Policy

HR data is sensitive and frequently stateful.

Do not globally cache authenticated employee data simply for
performance.

### Good caching candidates

-   public marketing content;
-   static configuration;
-   non-user-specific reference material where allowed.

### Dynamic/private

-   employee files;
-   conversations;
-   escalation status;
-   subscription authorization;
-   today's personalized Briefing.

Prefer correctness and isolation over aggressive caching.

------------------------------------------------------------------------

# 43. Suspense and Streaming UI

Use Suspense intentionally.

Do not cover every component with skeletons.

Good candidates:

-   secondary Employee File sections;
-   non-critical document metadata;
-   expensive secondary panels.

The main Briefing content should be prioritized.

------------------------------------------------------------------------

# 44. Client Bundle Discipline

Avoid importing into client components:

-   Firebase Admin;
-   Anthropic SDK;
-   Stripe server SDK;
-   Resend;
-   server repositories;
-   server services.

Use `server-only` in sensitive modules.

Periodically inspect bundle size.

------------------------------------------------------------------------

# 45. Images and Brand Assets

Recommended:

``` text
public/
└── brand/
    ├── logo.png
    ├── favicon.ico
    ├── favicon-32.png
    ├── apple-touch-icon.png
    └── logo.svg   # when final vector asset exists
```

Use `next/image` for raster brand assets where appropriate.

The current Skylar logo is the standalone folded/ribbon `S` mark.

------------------------------------------------------------------------

# 46. Visual System

The supplied v2 design defines:

``` text
Ink       #0B0B0E
Ink 2     #15151B
Ink 3     #1F1F27

Paper     #F2EFE8
Paper 2   #B4B0A6
Paper 3   #7E7B74

Amber     #F2A93B
Red       #FF4A45
Green     #4CD07D

Hairline  rgba(242,239,232,.12)
```

Semantic meaning must remain:

``` text
Amber → attention / due
Red   → genuine risk / escalation
Green → filed / resolved
```

No blue.

No gradients in the application UI.

Semantic colors should not become decorative backgrounds.

------------------------------------------------------------------------

# 47. Current Typography Direction

The supplied design specifies Bodoni Moda + JetBrains Mono.

During our visual exploration, the serif-heavy treatment felt too
AI/editorial for the desired production feel.

Therefore:

-   preserve the supplied layout, color semantics, and product
    interaction model;
-   use a more professional, highly readable modern sans-serif direction
    for the implementation reference;
-   retain mono typography sparingly for factual metadata such as dates,
    IDs, status, and system records.

**Important:** changing the supplied Bodoni typography is a design
deviation and should be approved by the product owner/design owner
before it becomes final production branding.

Implementation should centralize font tokens so this decision can change
without component rewrites.

------------------------------------------------------------------------

# 48. CSS Design Tokens

Recommended base:

``` css
:root {
  --color-ink: #0b0b0e;
  --color-ink-2: #15151b;
  --color-ink-3: #1f1f27;

  --color-paper: #f2efe8;
  --color-paper-2: #b4b0a6;
  --color-paper-3: #7e7b74;

  --color-attention: #f2a93b;
  --color-risk: #ff4a45;
  --color-success: #4cd07d;

  --color-hairline: rgba(242, 239, 232, 0.12);

  --space-1: 8px;
  --space-2: 16px;
  --space-3: 24px;
  --space-4: 40px;
  --space-5: 64px;
  --space-6: 96px;
}
```

Components should consume semantic tokens instead of scattering hex
values.

------------------------------------------------------------------------

# 49. Component Philosophy

Build primitives before screens.

Suggested UI primitives:

``` text
Button
StatusDot
StatusLabel
Hairline
Metadata
Avatar
IconButton
Field
Textarea
LoadingState
ErrorState
EmptyState
```

Then domain components:

``` text
BriefingCard
BriefingProgress
BriefingEngine
EmployeeReference
EmployeeLedger
ConversationCard
TranscriptLedger
RiskCard
HoldToEscalate
SealedCase
IndexSheet
```

------------------------------------------------------------------------

# 50. Briefing Component Boundary

Recommended:

``` text
BriefingPage               SERVER
└── BriefingShell          SERVER
    └── BriefingEngine     CLIENT
        ├── BriefingCard
        ├── Progress
        ├── NextButton
        └── NotNowButton
```

Only the interactive engine needs browser state.

The data acquisition remains on the server.

------------------------------------------------------------------------

# 51. Error Handling

Define application error classes such as:

``` text
AuthenticationError
AuthorizationError
ValidationError
NotFoundError
ConflictError
ExternalServiceError
```

Do not expose raw Firebase/Stripe/Anthropic errors to end users.

Log technical details server-side.

Return safe user-facing messages.

------------------------------------------------------------------------

# 52. Loading States

The design should feel calm.

Avoid excessive spinners.

Prefer:

-   server-rendered content;
-   subtle skeleton/placeholder where unavoidable;
-   disabled submit state;
-   streamed AI content;
-   preserving existing content during mutation.

------------------------------------------------------------------------

# 53. Mutation Strategy

After a mutation:

1.  validate;
2.  authorize;
3.  write server state;
4.  update dependent records;
5.  revalidate/refresh relevant UI;
6.  provide immediate user feedback.

Use optimistic UI only when the action can be safely reversed.

Do not optimistically mark a high-risk escalation as successfully sealed
before the server confirms persistence.

------------------------------------------------------------------------

# 54. Stripe Architecture

Stripe server SDK only.

Primary responsibilities:

-   Checkout/trial flow if required;
-   Customer Portal session;
-   webhook verification;
-   subscription synchronization.

Webhook events are authoritative for subscription status.

Do not trust the browser returning from Stripe as proof of active
subscription.

------------------------------------------------------------------------

# 55. Trial Gating

Product requirement:

`14-day trial`

Authorization should be based on server-side company subscription state.

Conceptually:

``` text
active subscription
OR
trialEndsAt > now
    ↓
allowed

otherwise
    ↓
billing-required experience
```

Admin and Manager behavior may differ depending on product rules.

------------------------------------------------------------------------

# 56. Resend

Resend handles server-generated email such as escalation notifications.

Never call Resend directly from the browser.

Escalation flow:

``` text
persist escalation
    ↓
commit case ID/status
    ↓
send notification
```

Email failure must be observable/retryable and should not silently
destroy the already-created escalation record.

------------------------------------------------------------------------

# 57. Sentry

Capture:

-   server exceptions;
-   route-handler failures;
-   client crashes;
-   failed AI requests;
-   Stripe webhook errors;
-   escalation workflow failures.

Do not send sensitive HR text to Sentry unnecessarily.

Scrub/redact sensitive payloads.

------------------------------------------------------------------------

# 58. Security Rules

Multi-tenant isolation is a release blocker.

Security must exist at multiple layers:

``` text
Firebase/Firestore rules
+
server authorization
+
service-level ownership checks
```

Never rely on hidden UI.

A Manager from Company A must not be able to access Company B data by
manually changing an employee ID or API request.

------------------------------------------------------------------------

# 59. Firestore Security Testing

Before release, explicitly create:

``` text
Company A
Manager A
Employee A

Company B
Manager B
Employee B
```

Test:

-   Manager A reads Employee B;
-   Manager A updates Employee B;
-   Manager A reads Company B conversation;
-   Manager A submits Company B ID to API;
-   Manager A attempts Company B document access.

Every request must fail.

------------------------------------------------------------------------

# 60. Firestore Indexes

Track indexes in:

``` text
firestore.indexes.json
```

Likely index dimensions include combinations of:

``` text
companyId
status
dueAt
employeeId
createdAt
deferredUntil
```

Create indexes from actual query patterns rather than speculative
combinations.

------------------------------------------------------------------------

# 61. Firestore Transactions

Use transactions/batches where consistency matters.

Example escalation:

``` text
create review request
update conversation status
add employee ledger entry
```

These states should not partially diverge if one write fails.

------------------------------------------------------------------------

# 62. Auditability

For sensitive writes, retain:

``` text
createdAt
createdBy
updatedAt
updatedBy
```

For important status transitions, prefer explicit historical records
rather than overwriting the only evidence of the previous state.

------------------------------------------------------------------------

# 63. Environment Variables

Expected structure:

``` env
NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

ANTHROPIC_API_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRICE_ID=

RESEND_API_KEY=
SKYLAR_TEAM_EMAIL=

SENTRY_DSN=
```

Actual production values must never be committed.

------------------------------------------------------------------------

# 64. Environment Separation

Maintain separate configuration for:

-   local;
-   staging/preview;
-   production.

Firebase email-link authorized domains must be configured for every
relevant environment.

Do not use production customer data for normal development.

------------------------------------------------------------------------

# 65. Accessibility

Target:

`WCAG 2.1 AA`

Important requirements:

-   minimum touch target approximately 44px;
-   keyboard-accessible controls;
-   visible focus treatment;
-   semantic buttons;
-   appropriate labels;
-   color is not the sole information carrier;
-   `aria-live="polite"` around card changes where appropriate;
-   accessible alternative for long-press interactions;
-   accessible solution for 900ms escalation hold must be approved.

------------------------------------------------------------------------

# 66. Responsive Strategy

Build responsive parity from the start.

Reference sizes in supplied design:

``` text
Desktop: 1280 × 800
Mobile:  402 × 874
```

Do not finish desktop and later "make it responsive."

Every launch-critical feature must work at mobile width.

------------------------------------------------------------------------

# 67. Motion

Supplied design defines two principal motion systems:

### Card advance

``` text
360ms
ease-out
```

Current card rises/fades; next card enters.

### Escalation seal

900ms intentional hold followed by sealed-state transition.

Avoid decorative animation.

Motion must reinforce state, not advertise AI.

------------------------------------------------------------------------

# 68. Testing Strategy

## Unit tests

Best candidates:

-   Briefing priority ordering;
-   defer eligibility;
-   role authorization;
-   subscription/trial gating;
-   risk result normalization;
-   schema validation.

## Integration tests

Best candidates:

-   session creation;
-   protected API authorization;
-   Firestore tenant checks;
-   escalation transaction;
-   Stripe webhook processing.

## Manual critical flows

Must include:

-   magic-link signup;
-   cross-device magic link;
-   Live-in-5 under five minutes;
-   normal conversation;
-   AI stream interruption;
-   existing employee context;
-   high-risk escalation;
-   early hold cancellation;
-   successful 900ms seal;
-   advisor queue;
-   billing portal;
-   tenant isolation;
-   mobile layouts.

------------------------------------------------------------------------

# 69. Performance Targets

Track at least:

-   server response time;
-   Firestore query duration;
-   time to first byte;
-   AI time to first token;
-   client bundle size;
-   hydration cost;
-   Core Web Vitals.

The product should feel immediate because most first-view data is
rendered on the server.

------------------------------------------------------------------------

# 70. Performance Rules

1.  Server Components by default.
2.  Minimal `"use client"` boundaries.
3.  No client-side auth gate for initial protected content.
4.  Parallelize independent server reads.
5.  Paginate long ledgers.
6.  Stream Claude.
7.  Avoid N+1 Firestore queries.
8.  Avoid full collection reads.
9.  Keep SDKs server-side where possible.
10. Lazy-load secondary UI.
11. Keep initial Briefing payload small.
12. Persist AI summaries instead of regenerating on every read.
13. Use indexes matching production queries.
14. Measure before adding caches.
15. Never trade tenant isolation for speed.

------------------------------------------------------------------------

# 71. Logging

Use structured logs.

Useful fields:

``` text
requestId
userId
companyId
route
operation
durationMs
status
externalProvider
```

Do not log full employee-sensitive prompts/responses by default.

------------------------------------------------------------------------

# 72. Deployment

Primary target:

`Vercel`

Recommended pipeline:

``` text
feature branch
    ↓
PR
    ↓
preview deployment
    ↓
tests/review
    ↓
main
    ↓
production
```

Rollback via Vercel is straightforward for application code but may not
reverse Firestore schema/data changes.

Flag data migrations explicitly.

------------------------------------------------------------------------

# 73. Data Backup

Firestore redundancy is not the same as protection against accidental
application writes.

Before real customer HR data is stored, configure a backup/export
strategy appropriate to the production Firebase plan and operating
requirements.

------------------------------------------------------------------------

# 74. Mobile Future-Proofing

Capacitor is planned later.

Therefore:

-   business logic must not live only inside React components;
-   APIs/services should be reusable;
-   Briefing ordering belongs on server;
-   auth/session strategy must account for later mobile authentication
    differences;
-   touch interaction must already work;
-   responsive mobile web should be production quality.

Do not prematurely add Capacitor during the current web build.

------------------------------------------------------------------------

# 75. Implementation Sequence

## Phase 0 --- Foundation --- current

-   Next.js 14 scaffold
-   TypeScript
-   Tailwind
-   dependencies
-   project structure
-   environment templates
-   brand assets

## Phase 1 --- Server foundation

Build:

-   Firebase client;
-   Firebase Admin;
-   environment validation;
-   server-only boundaries;
-   common error types;
-   utility functions.

## Phase 2 --- Authentication

Build:

-   magic-link request;
-   verify screen;
-   session endpoint;
-   secure cookie;
-   `getSession`;
-   logout;
-   protected layout;
-   role guards;
-   cross-device email recovery.

## Phase 3 --- Firestore foundation

Build:

-   collections/types;
-   repositories;
-   security rules;
-   indexes;
-   tenant test fixtures.

## Phase 4 --- Design primitives

Build:

-   design tokens;
-   typography;
-   buttons;
-   status indicators;
-   hairlines;
-   fields;
-   responsive spacing;
-   logo/favicon integration.

## Phase 5 --- Briefing Engine

Build:

-   server Briefing service;
-   priority algorithm;
-   card schema;
-   SSR initial load;
-   interactive card engine;
-   NEXT;
-   NOT NOW;
-   progress;
-   Index.

## Phase 6 --- Live-in-5

Build all six beats with employee inline creation and initial situation
persistence.

## Phase 7 --- Claude conversation

Build:

-   prompts;
-   context builder;
-   streaming;
-   structured response validation;
-   classification;
-   conversation persistence.

## Phase 8 --- Escalation

Build:

-   risk card;
-   900ms state machine;
-   persistence transaction;
-   sealed state;
-   case ID;
-   advisor data;
-   Resend notification;
-   advisor queue.

## Phase 9 --- Employee File

Build:

-   server employee query;
-   status summary;
-   ledger;
-   pagination;
-   transcript access;
-   documents as ledger entries;
-   PDF export.

## Phase 10 --- Billing

Build:

-   Stripe integration;
-   14-day trial;
-   Customer Portal;
-   webhooks;
-   subscription authorization.

## Phase 11 --- Hardening

-   tenant penetration testing;
-   accessibility;
-   responsive QA;
-   Sentry;
-   performance profiling;
-   error states;
-   empty Briefing;
-   production configuration.

------------------------------------------------------------------------

# 76. Immediate Next Files

The next implementation should create these files first:

``` text
src/lib/firebase/client.ts
src/lib/firebase/admin.ts

src/server/auth/get-session.ts
src/server/auth/require-session.ts
src/server/auth/require-role.ts

src/app/api/auth/session/route.ts
src/app/api/auth/logout/route.ts

src/types/auth.ts
src/schemas/auth.schema.ts

src/app/(auth)/login/page.tsx
src/app/(auth)/verify/page.tsx

src/app/(protected)/layout.tsx
```

Then verify:

``` text
magic link
→ Firebase login
→ ID token
→ session cookie
→ refresh browser
→ SSR still authenticated
→ logout
→ protected page rejected
```

Do not proceed to Claude or Briefing implementation until this
foundation works reliably.

------------------------------------------------------------------------

# 77. Engineering Rules

## Always

-   validate server input;
-   authorize server-side;
-   scope data by tenant;
-   use server components by default;
-   keep external secrets server-only;
-   use timestamps consistently;
-   handle loading/error/empty states;
-   keep product logic in services;
-   keep storage logic in repositories;
-   preserve audit history.

## Never

-   trust client `companyId`;
-   expose Firebase Admin credentials;
-   expose Anthropic/Stripe/Resend secrets;
-   use Zustand as the database;
-   fetch all records then filter client-side;
-   build a traditional dashboard as the primary Skylar experience;
-   make conversations look like generic chat bubbles;
-   delete employee history silently;
-   use decorative risk colors;
-   allow a tap to accidentally submit an escalation;
-   hardcode an advisor until assignment behavior is confirmed.

------------------------------------------------------------------------

# 78. Open Decisions

These remain unresolved from the supplied project documentation and
should be tracked rather than guessed:

1.  final production Firebase project/access;
2.  production Claude model available to the account;
3.  exact Skylar-team escalation queue access;
4.  advisor assignment logic;
5.  keyboard equivalent for escalation hold;
6.  exact near-empty returning-user Briefing behavior;
7.  final Terms of Service / Privacy Policy;
8.  named UAT approver;
9.  final approval for any typography deviation from the supplied Bodoni
    design.

------------------------------------------------------------------------

# 79. Definition of Done for Foundation

The architecture foundation is ready when:

-   `npm run build` passes;
-   no secrets are committed;
-   Firebase client/admin are separated;
-   protected SSR route works;
-   refresh retains authenticated server session;
-   unauthenticated access redirects;
-   role/company information is resolved server-side;
-   tenant ownership is enforced;
-   base design tokens are centralized;
-   logo/favicon are wired;
-   no unnecessary global Client Component wraps the application;
-   Sentry can be added without exposing HR payloads.

------------------------------------------------------------------------

------------------------------------------------------------------------

# 81. Production Engineering Standard --- Mandatory

All Skylar implementation must be written as production-grade
engineering code suitable for a high-scale, security-sensitive HR
platform.

These are mandatory implementation rules, not optional preferences.

## 81.1 Shared Components First

Before creating a new component, hook, schema, helper, service,
repository function, or utility:

1.  check whether an equivalent shared abstraction already exists;
2.  extend an existing shared abstraction when the responsibility is
    genuinely shared;
3.  create a new abstraction only when it has a distinct responsibility;
4.  never copy/paste logic between features to move faster.

Examples of shared UI:

``` text
components/ui/
├── button.tsx
├── icon-button.tsx
├── status-dot.tsx
├── status-label.tsx
├── metadata.tsx
├── field.tsx
├── textarea.tsx
├── avatar.tsx
├── hairline.tsx
├── loading-state.tsx
├── error-state.tsx
└── empty-state.tsx
```

Domain-specific components remain inside their feature/domain when they
are not reusable globally.

Do not create a giant generic component with dozens of conditional props
merely to claim reuse. Reuse must preserve clear responsibilities.

------------------------------------------------------------------------

# 82. Modular Code Standard

Every module should have one clear responsibility.

Preferred dependency direction:

``` text
UI
 ↓
Feature
 ↓
Service
 ↓
Repository
 ↓
Provider / Database
```

Avoid:

``` text
UI
 ↓
Firebase + Claude + Stripe + business rules
```

Business logic must be independently testable without rendering React
components.

A feature should normally expose a small public surface rather than
allowing arbitrary cross-feature imports.

Avoid circular dependencies.

Prefer explicit dependency boundaries.

------------------------------------------------------------------------

# 83. FAANG-Grade Production Code Expectations

Every implementation should be reviewed against:

``` text
Correctness
Security
Maintainability
Observability
Testability
Performance
Scalability
Accessibility
Failure recovery
Tenant isolation
```

Code is not complete merely because the happy path works.

Before merging a feature, consider:

-   invalid input;
-   unauthorized access;
-   stale state;
-   duplicate requests;
-   retries;
-   partial provider failure;
-   network interruption;
-   race conditions;
-   concurrent writes;
-   idempotency;
-   timeout behavior;
-   rate limits;
-   data leakage;
-   query growth;
-   backwards compatibility;
-   downstream side effects.

------------------------------------------------------------------------

# 84. Pre-Code Security and Side-Effect Review

Before writing or changing production logic, perform a short threat and
impact review.

For each change ask:

``` text
What data does this touch?
Who is allowed to access it?
Can company/tenant boundaries be bypassed?
Can user input reach a privileged operation?
Can this operation be replayed?
Can it execute twice?
Can concurrent requests corrupt state?
Can a provider timeout leave partial state?
Does this expose employee-sensitive data?
Does this change another feature indirectly?
Does it invalidate existing cache?
Does it create additional AI/API cost?
Does it require an index or migration?
Does rollback remain possible?
```

A change must not introduce unreviewed ripple effects into unrelated
features.

For shared modules, identify known consumers before modifying behavior.

Prefer additive/backwards-compatible changes when practical.

For sensitive multi-document mutations, use Firestore transactions or
batched writes where appropriate.

------------------------------------------------------------------------

# 85. Security-by-Default Coding Rules

Every server mutation must follow:

``` text
Parse
 ↓
Validate
 ↓
Authenticate
 ↓
Authorize
 ↓
Resolve tenant from trusted session
 ↓
Load resource
 ↓
Verify ownership
 ↓
Execute business logic
 ↓
Persist
 ↓
Audit/log
 ↓
Return safe response
```

Never accept authorization context from the browser as authoritative.

Never trust:

``` text
companyId
role
subscriptionStatus
advisorAccess
employee ownership
```

merely because the client submitted it.

Sensitive values must be derived server-side.

------------------------------------------------------------------------

# 86. API Query Optimization --- Mandatory

Every new database/API query must be evaluated for:

-   expected result cardinality;
-   index usage;
-   pagination;
-   ordering;
-   query frequency;
-   cacheability;
-   N+1 behavior;
-   payload size;
-   tenant scoping;
-   worst-case growth.

Do not fetch data that the current response does not require.

Avoid:

``` text
fetch everything
→ filter
→ sort
→ slice
```

Prefer:

``` text
tenant filter
+ status/date filter
+ indexed order
+ limit
+ cursor pagination
```

Independent calls should normally run concurrently using `Promise.all`.

Dependent calls should remain sequential only when the dependency is
real.

------------------------------------------------------------------------

# 87. API Response Discipline

API responses should be normalized and minimal.

Do not return complete Firestore documents to the browser automatically.

Return only fields required by the UI.

Never expose internal fields such as:

-   provider metadata;
-   internal prompt content;
-   internal risk reasoning;
-   private audit information;
-   service credentials;
-   unrelated employee fields.

Large collections must use cursor-based pagination.

------------------------------------------------------------------------

# 88. Caching Strategy

Caching must be deliberate.

Cache only when the data classification and invalidation model are
understood.

## Cache candidates

Good candidates may include:

-   public/static content;
-   law/reference material where freshness rules permit;
-   normalized AI outputs for identical safe requests;
-   reusable non-sensitive AI reference/context transformations;
-   stable company configuration where authorization is preserved.

## Avoid broad shared caching for

-   private employee files;
-   live escalation state;
-   sensitive conversation content;
-   authorization results without correct user/tenant keying;
-   data where stale results could cause incorrect HR guidance.

Every cache entry involving tenant data must include appropriate
tenant/user/resource dimensions in the cache key.

------------------------------------------------------------------------

# 89. Cache Invalidation

Every cached feature must define:

``` text
cache key
TTL
owner/tenant scope
invalidation event
fallback behavior
```

Do not add a cache without defining how it becomes fresh again.

Example:

``` text
employee summary cache
        ↓
invalidate on:
- conversation filed
- note created
- review added
- document added
- advisor response
```

Correctness is more important than cache hit rate.

------------------------------------------------------------------------

# 90. API Rate Limiting

Rate limiting is required for expensive, abuse-prone, or
security-sensitive endpoints.

At minimum evaluate rate limiting for:

``` text
auth/send-link
conversation/AI generation
clarification generation
employee summary generation
risk classification
PDF/export
advisor escalation submission
Stripe session creation
```

Rate-limit keys should be chosen deliberately from combinations such as:

``` text
userId
companyId
IP where appropriate
endpoint
operation
```

Do not rely only on IP-based rate limiting for authenticated product
operations.

Return `429 Too Many Requests` with safe retry guidance where
appropriate.

Rate limiting must not leak whether another company's resource exists.

------------------------------------------------------------------------

# 91. Idempotency

Operations that can be retried must be safe against duplicate execution.

High-priority examples:

-   escalation creation;
-   Stripe webhook processing;
-   billing portal/checkout creation where relevant;
-   conversation finalization;
-   employee ledger writes;
-   email notification jobs.

Use deterministic idempotency keys or persisted operation IDs where
appropriate.

A user double-click, browser retry, provider retry, or network retry
must not create duplicate HR records.

------------------------------------------------------------------------

# 92. Anthropic Optimization Policy --- Mandatory

Anthropic calls are expensive and latency-sensitive.

Before every Anthropic request:

1.  determine whether a model call is actually necessary;
2.  check whether a valid cached result can safely satisfy the request;
3.  minimize context;
4.  retrieve only relevant employee history;
5.  use the smallest suitable model/task configuration approved for the
    product;
6.  use structured output where deterministic behavior is needed;
7.  stream user-facing generation where appropriate;
8.  enforce timeout/retry limits;
9.  record token/latency metrics without logging sensitive content;
10. persist reusable results instead of regenerating them on every page
    load.

------------------------------------------------------------------------

# 93. Anthropic Cache Keys

AI caching must never mix tenants or employees.

A conceptual cache key should include the inputs that materially affect
the answer:

``` text
companyId
employeeId
taskType
promptVersion
modelVersion
relevantContextVersion/hash
normalizedUserInputHash
```

Do not use only the user's raw question as a cache key.

When employee history changes, any cached AI result whose context is no
longer valid must expire or miss naturally through context versioning.

------------------------------------------------------------------------

# 94. Anthropic Prompt Caching

Where supported by the selected Anthropic model/API and appropriate for
the request, use Anthropic prompt caching for stable repeated
prompt/context prefixes.

Good candidates may include:

-   stable system instructions;
-   approved HR guidance framework;
-   stable policy/reference context;
-   repeated company policy context.

Do not assume every request should be cached indefinitely.

Sensitive employee-specific material requires deliberate TTL, isolation,
and cache-key design.

The exact production model and supported prompt-caching behavior must be
verified against the Anthropic account/API configuration before
implementation.

------------------------------------------------------------------------

# 95. AI Cost and Latency Telemetry

Track per AI operation:

``` text
taskType
model
promptVersion
durationMs
timeToFirstTokenMs
inputTokens
outputTokens
cacheHit/cacheMiss
retryCount
success/failure
```

Do not include raw sensitive employee text in normal telemetry.

This allows optimization based on real production behavior rather than
assumptions.

------------------------------------------------------------------------

# 96. LangGraph --- AI Workflow Orchestration and Auditing

Skylar should use **LangGraph** for auditable multi-step AI workflows
where workflow state, branching, retry behavior, human escalation, and
traceability materially benefit from graph orchestration.

LangGraph should not be introduced merely as another abstraction around
a single simple model call.

Primary candidates:

``` text
Situation intake
      ↓
Context retrieval
      ↓
Clarification decision
      ↓
Risk classification
      ↓
Guidance generation
      ↓
Validation
      ↓
Persist / Escalate
```

and:

``` text
Employee history changed
      ↓
Collect relevant history
      ↓
Generate summary
      ↓
Validate summary
      ↓
Persist version
```

------------------------------------------------------------------------

# 97. LangGraph Architecture Boundary

Recommended structure:

``` text
src/server/ai/
├── graphs/
│   ├── conversation.graph.ts
│   ├── escalation.graph.ts
│   └── employee-summary.graph.ts
├── nodes/
│   ├── load-context.node.ts
│   ├── classify-risk.node.ts
│   ├── clarify.node.ts
│   ├── generate-guidance.node.ts
│   ├── validate-output.node.ts
│   └── persist-result.node.ts
├── state/
│   └── schemas.ts
├── audit/
│   └── ai-audit.service.ts
└── prompts/
    └── versions.ts
```

Keep provider clients under:

``` text
src/lib/anthropic/
```

LangGraph belongs to server application orchestration, not React UI.

------------------------------------------------------------------------

# 98. LangGraph Audit Requirements

Every significant AI workflow execution should have an auditable
execution record containing safe metadata such as:

``` ts
interface AIWorkflowAudit {
  id: string;
  companyId: string;
  userId: string;

  workflow: string;
  workflowVersion: string;
  promptVersion: string;
  model: string;

  startedAt: Timestamp;
  completedAt?: Timestamp;

  status:
    | "running"
    | "completed"
    | "failed"
    | "escalated";

  visitedNodes: string[];

  cacheHit?: boolean;
  retryCount?: number;

  employeeId?: string;
  conversationId?: string;
  escalationId?: string;

  errorCode?: string;
}
```

Do not store chain-of-thought or hidden model reasoning.

Audit the workflow events, inputs/outputs necessary for legitimate
product traceability, prompt/model versions, state transitions, and
operational metadata without attempting to capture private model
reasoning.

Sensitive prompt/output retention must follow the product's privacy and
retention policy.

------------------------------------------------------------------------

# 99. LangGraph Human-in-the-Loop

Human escalation should be modeled as an explicit state transition.

Example:

``` text
classifyRisk
      ↓
normal ─────────→ generateGuidance
      ↓ high
prepareEscalation
      ↓
WAITING_FOR_MANAGER_CONFIRMATION
      ↓ 900ms confirmed
sealEscalation
      ↓
WITH_ADVISOR
```

The AI workflow must never silently bypass the manager's required
confirmation step.

Human approval state must be persisted independently from transient
browser state.

------------------------------------------------------------------------

# 100. LangGraph Failure Safety

Every graph node must define:

-   accepted state;
-   output state;
-   validation;
-   timeout behavior;
-   retry policy;
-   failure path;
-   audit event.

Retries must not duplicate persistent side effects.

Persisting nodes must be idempotent.

Do not blindly retry high-cost model calls or writes.

------------------------------------------------------------------------

# 101. Testing Is Required for Every Feature

A feature is not complete until its tests are written.

Every feature PR should include tests for the logic introduced by that
feature.

At minimum evaluate:

``` text
happy path
validation failure
unauthenticated
unauthorized
cross-tenant access
not found
provider failure
timeout
retry
duplicate request
concurrency/race behavior
empty state
boundary values
```

Not every UI component needs a meaningless snapshot test. Tests should
protect behavior and risk.

------------------------------------------------------------------------

# 102. Test Structure

Recommended:

``` text
tests/
├── unit/
│   ├── auth/
│   ├── briefing/
│   ├── employees/
│   ├── conversations/
│   ├── escalation/
│   ├── billing/
│   └── ai/
│
├── integration/
│   ├── auth/
│   ├── firestore/
│   ├── api/
│   ├── stripe/
│   └── ai/
│
└── e2e/
    ├── onboarding/
    ├── briefing/
    ├── conversation/
    ├── escalation/
    └── billing/
```

Co-located unit tests are also acceptable where they improve
maintainability.

Choose one convention and keep it consistent.

------------------------------------------------------------------------

# 103. Required Unit Tests by Feature

## Authentication

Test:

-   valid session creation;
-   invalid Firebase token;
-   expired/revoked session;
-   missing cookie;
-   logout;
-   role normalization;
-   cross-device magic-link email recovery logic.

## Authorization

Test:

-   Manager allowed own-company resource;
-   Manager denied another-company resource;
-   Admin permissions;
-   Skylar-team permissions;
-   disabled user rejected.

## Briefing

Test:

-   advisor case priority;
-   due item ordering;
-   law update ordering;
-   quiet close appended;
-   completed item removed;
-   deferred item hidden;
-   deferred item becomes eligible again;
-   empty/near-empty state.

## Employee File

Test:

-   correct tenant query;
-   ledger chronological ordering;
-   pagination cursor;
-   summary display fallback;
-   amendment behavior;
-   cross-tenant denial.

## Conversation

Test:

-   input schema;
-   context construction;
-   relevant history selection;
-   AI output schema;
-   persistence;
-   stream failure;
-   retry behavior;
-   duplicate finalization prevention.

## Risk / Escalation

Test:

-   normal risk path;
-   high-risk path;
-   early hold cancellation;
-   successful hold;
-   duplicate escalation prevention;
-   transaction rollback;
-   advisor assignment input;
-   sealed status;
-   notification failure handling.

## AI / LangGraph

Test:

-   expected node order;
-   conditional branch selection;
-   invalid node output;
-   retry limit;
-   cache hit;
-   cache miss;
-   prompt-version changes invalidate cache;
-   tenant isolation in cache key;
-   idempotent persistence node;
-   escalation interrupt/human confirmation;
-   audit event creation.

## Billing

Test:

-   active subscription;
-   active trial;
-   expired trial;
-   webhook signature failure;
-   duplicate webhook;
-   portal authorization;
-   cross-company billing access denial.

## Rate Limiting

Test:

-   request under limit;
-   request at limit;
-   request over limit;
-   different tenant/user isolation;
-   safe `429` response.

------------------------------------------------------------------------

# 104. Integration Tests Per Feature

When a feature crosses infrastructure boundaries, add integration tests.

Examples:

``` text
session route + Firebase Admin
repository + Firestore emulator/test project
conversation API + mocked Anthropic boundary
LangGraph workflow + mocked model
Stripe webhook + persistence
escalation + Firestore transaction + notification boundary
```

External providers should normally be mocked in deterministic CI tests,
with a smaller controlled provider smoke-test suite where appropriate.

------------------------------------------------------------------------

# 105. Regression Tests for Bug Fixes

Every production bug fix should include a regression test when the
failure can be reproduced programmatically.

Workflow:

``` text
reproduce failure
↓
write failing test
↓
implement fix
↓
test passes
↓
verify related behavior
```

Do not fix repeatable production bugs without protecting against
recurrence.

------------------------------------------------------------------------

# 106. Testing and Side-Effect Isolation

Tests must not:

-   send real customer emails;
-   create real Stripe charges;
-   modify production Firestore;
-   call production AI unnecessarily;
-   use real employee data.

Use:

-   mocks;
-   emulators;
-   fixtures;
-   isolated test projects;
-   dependency injection at provider boundaries.

------------------------------------------------------------------------

# 107. CI Quality Gates

Before merge, CI should eventually enforce:

``` text
typecheck
lint
unit tests
integration tests
build
security-sensitive test suite
```

Recommended additional gates as the project matures:

``` text
dependency audit
bundle-size regression
E2E smoke tests
Firestore rules tests
```

A failing required gate blocks merge.

------------------------------------------------------------------------

# 108. Definition of Done --- Updated

A feature is done only when:

-   requirements are implemented;
-   shared components were reused where appropriate;
-   code is modular;
-   server/client boundary is correct;
-   validation exists;
-   authentication/authorization are enforced;
-   tenant isolation is verified;
-   security impact was reviewed;
-   side effects and rollback behavior were considered;
-   queries are optimized/indexed;
-   caching strategy is defined where useful;
-   rate limiting exists where required;
-   retries/idempotency are safe;
-   observability is added;
-   AI calls are minimized/cached where safely applicable;
-   LangGraph workflow/audit behavior is covered when the feature uses
    graph orchestration;
-   unit tests exist;
-   integration tests exist where infrastructure boundaries are crossed;
-   regression risks are tested;
-   responsive behavior works;
-   accessibility is checked;
-   `npm run build` passes.

------------------------------------------------------------------------

# 109. Pre-PR Engineering Checklist

Before opening a PR:

``` text
[ ] Did I reuse shared components?
[ ] Did I use Tailwind as the default styling system and avoid unnecessary custom CSS?
[ ] Is the code modular and single-responsibility?
[ ] Did I avoid unnecessary client components?
[ ] Did I validate all untrusted input?
[ ] Did I verify authentication and authorization?
[ ] Did I verify tenant isolation?
[ ] Did I review security risks before implementation?
[ ] Could this change cause ripple effects?
[ ] Are multi-step side effects transaction-safe/idempotent?
[ ] Are queries scoped, indexed, limited, and paginated?
[ ] Can any safe data/request be cached?
[ ] Is cache invalidation defined?
[ ] Does this endpoint require rate limiting?
[ ] Are Anthropic calls minimized and optimized?
[ ] Is AI caching tenant-safe?
[ ] Is prompt/model/workflow versioning recorded?
[ ] Is LangGraph appropriate for this AI workflow?
[ ] Is the workflow auditable without storing chain-of-thought?
[ ] Are logs free of unnecessary sensitive HR content?
[ ] Are unit tests included?
[ ] Are integration tests included where needed?
[ ] Did I add a regression test for a bug fix?
[ ] Does typecheck/lint/test/build pass?
```

------------------------------------------------------------------------

# 110. Additional Dependency Note

LangGraph was not part of the originally supplied Skylar technical
stack; it is an engineering addition requested for auditable AI workflow
orchestration.

Before implementing the first LangGraph workflow, add the appropriate
JavaScript/TypeScript LangGraph package and pin/lock it through the
project's package lockfile.

The implementation must still use Anthropic as the model provider unless
the product specification is explicitly changed.

LangGraph should orchestrate AI workflow state and auditability; it
should not replace the application's repositories, authorization layer,
or business services.

------------------------------------------------------------------------

# 111. Motion, Transition and Loading System --- Mandatory

Skylar should feel responsive, calm, deliberate, and polished. Motion is
part of interaction feedback, not decoration.

The supplied v2 design defines two core product motions: the Briefing
card transition and the 900ms escalation seal. Our implementation may
add restrained micro-interactions and loading transitions where they
improve continuity, but must preserve the product's lightweight
character and accessibility requirements.

## 111.1 Motion Principles

Every animation must satisfy at least one purpose:

-   communicate navigation or hierarchy;
-   show cause and effect;
-   preserve continuity between states;
-   confirm an action;
-   make loading/progressive rendering feel stable;
-   draw attention to an important state change.

Avoid animation whose only purpose is visual spectacle.

Required qualities:

``` text
smooth
lightweight
interruptible
responsive
GPU-friendly
accessible
consistent
non-blocking
```

Do not delay an important action merely to finish an animation.

------------------------------------------------------------------------

# 112. Animation Technology Policy

Prefer the lightest mechanism that solves the interaction.

Priority:

``` text
1. CSS transitions / keyframes
2. Web Animations API
3. Anime.js for coordinated timelines or complex DOM motion
4. Three.js only for a justified 3D/graphics experience
```

Do not introduce Three.js for ordinary card transitions, hover effects,
loaders, buttons, or decorative backgrounds. It adds bundle/runtime cost
and is inappropriate for routine HR workflow UI.

If Anime.js is introduced, import it only where needed and lazy-load
heavy/secondary motion where practical.

Three.js must require an explicit design/performance justification
before being added to the production bundle.

------------------------------------------------------------------------

# 113. Performance-Safe Animation

Prefer animating:

``` text
transform
opacity
```

Avoid repeatedly animating layout-heavy properties such as:

``` text
width
height
top
left
margin
padding
```

when a transform can achieve the same visual result.

Avoid forced synchronous layout and layout thrashing.

Use `requestAnimationFrame` or animation libraries correctly for
frame-bound work.

Target smooth interaction on realistic mobile hardware, not only desktop
development machines.

------------------------------------------------------------------------

# 114. Briefing Transition

The supplied design specifies:

``` text
Duration: 360ms
Easing: ease-out
```

Expected sequence:

``` text
CURRENT CARD
opacity 1 → 0
translateY(0) → translateY(-10px)

NEXT CARD
opacity 0 → 1
translateY(14px) → translateY(0)
```

The progress indicator updates with the card transition.

Implementation must avoid remounting unrelated page structure.

Only the content participating in the transition should animate.

------------------------------------------------------------------------

# 115. Micro-Interactions

Permitted examples:

-   subtle button press feedback;
-   focus-state transitions;
-   status-dot state changes;
-   Index open/close;
-   transcript reveal;
-   deferred-item confirmation;
-   filed-state confirmation;
-   lightweight field validation feedback;
-   loading-to-content transition.

Keep micro-interactions short and restrained.

Suggested general duration range:

``` text
120–220ms
```

unless the product specification defines a specific duration.

Do not add bouncing, glowing, floating, particle, gradient-orb, or "AI
thinking" animations.

------------------------------------------------------------------------

# 116. Escalation Motion

The escalation interaction is intentionally slower because it represents
a consequential action.

Required hold:

``` text
900ms
```

The visual progress must correspond to the actual hold state.

Rules:

-   pointer/key release before completion cancels;
-   cancellation must not submit anything;
-   successful completion waits for server confirmation before final
    sealed success is treated as authoritative;
-   network failure must produce a recoverable error state;
-   duplicate submissions must be prevented;
-   motion must not hide the underlying operation state.

The sealed state should feel decisive but remain lightweight.

------------------------------------------------------------------------

# 117. Reduced Motion

Respect:

``` css
@media (prefers-reduced-motion: reduce)
```

For reduced-motion users:

-   remove non-essential movement;
-   use near-instant fades/state changes;
-   avoid large spatial transitions;
-   preserve all functional state feedback;
-   never remove the actual escalation confirmation requirement merely
    because animation is reduced.

Motion is presentation. Business confirmation logic remains intact.

------------------------------------------------------------------------

# 118. Loading Architecture

Loading should be designed at three levels:

``` text
1. Initial route/server loading
2. Section/streaming loading
3. Mutation/action loading
```

Avoid a single full-screen spinner for routine navigation.

Because Skylar is SSR-first, the first goal is to render useful server
content rather than show a loader.

------------------------------------------------------------------------

# 119. Skeleton Loading

Use skeletons when the final layout is known and data is still
resolving.

Skeletons should:

-   match the approximate final content dimensions;
-   prevent layout shift;
-   use the existing Ink/Ink2/Paper system;
-   be subtle;
-   avoid aggressive shimmer;
-   disappear smoothly when real content arrives.

Good candidates:

-   Employee File timeline;
-   secondary employee metadata;
-   document rows;
-   advisor metadata;
-   deferred list;
-   secondary Index content.

Avoid unnecessary skeletons for content that SSR can already render
immediately.

------------------------------------------------------------------------

# 120. Skeleton Component System

Create reusable primitives such as:

``` text
components/ui/
├── skeleton.tsx
├── text-skeleton.tsx
├── row-skeleton.tsx
└── loading-boundary.tsx
```

Domain skeletons may compose those primitives:

``` text
components/briefing/
└── briefing-skeleton.tsx

components/employee/
└── employee-file-skeleton.tsx

components/escalation/
└── advisor-skeleton.tsx
```

Do not duplicate skeleton CSS across features.

------------------------------------------------------------------------

# 121. Skeleton Visual Style

Use restrained values derived from the approved design system.

Conceptually:

``` text
Base surface: Ink 2
Highlight: subtle Paper alpha
Border: Hairline
Radius: follow the product's square geometry
```

Do not use bright SaaS shimmer gradients.

If a shimmer is used at all, it should be extremely subtle and
disabled/reduced for `prefers-reduced-motion`.

A simple low-contrast opacity pulse may be preferable.

------------------------------------------------------------------------

# 122. Route Loading

Use App Router `loading.tsx` only where route-level loading can
genuinely occur and a stable fallback improves the experience.

Do not automatically create a loader for every route.

Examples:

``` text
app/(protected)/briefing/loading.tsx
app/(protected)/employees/[employeeId]/loading.tsx
```

The fallback should resemble the final surface to avoid visual jumps.

------------------------------------------------------------------------

# 123. Suspense Boundaries

Use Suspense around independently resolvable secondary content.

Example:

``` text
Employee File
├── identity + summary        HIGH PRIORITY
├── current status            HIGH PRIORITY
├── ledger                    STREAMABLE
└── documents metadata        STREAMABLE
```

Do not fragment the page into dozens of tiny Suspense boundaries.

The primary task should become usable first.

------------------------------------------------------------------------

# 124. Mutation Loading States

Every mutation must have an explicit pending state.

Examples:

``` text
Saving...
Deferring...
Filing...
Preparing...
Sending for review...
Opening billing...
```

Buttons should prevent accidental duplicate submissions while pending.

Do not replace the entire screen with a loader when only one action is
pending.

Preserve the user's context.

------------------------------------------------------------------------

# 125. AI Loading and Streaming

Do not show a fake "AI thinking" animation.

Preferred AI response experience:

``` text
Submit
↓
small immediate acknowledgement
↓
stream begins
↓
content progressively appears
↓
final structured state settles
```

If time-to-first-token exceeds the normal target, show a restrained
textual processing state rather than a decorative AI loader.

The UI should distinguish:

``` text
request queued
request processing
streaming
completed
failed
```

without exposing internal model implementation details.

------------------------------------------------------------------------

# 126. Optimistic UI

Use optimistic feedback only for safe, reversible operations.

Potential candidates:

-   Index open/close;
-   local card transition after a confirmed low-risk mutation;
-   non-critical UI preferences.

Avoid optimistic authoritative success for:

-   escalation sealing;
-   billing;
-   employee record persistence;
-   permission changes;
-   high-risk status changes.

For these operations, server confirmation is required.

------------------------------------------------------------------------

# 127. Loading Error Recovery

Every asynchronous loading surface must define:

``` text
pending
success
empty
error
retry/recovery
```

Do not leave indefinite skeletons after a request fails.

Errors should preserve existing usable data whenever possible.

------------------------------------------------------------------------

# 128. Preventing Layout Shift

Loading states must reserve realistic final dimensions.

For images:

-   provide width/height or stable aspect ratio;
-   use Next.js Image where appropriate.

For text/data:

-   skeleton line counts should approximate expected content;
-   avoid large height collapse when replacing skeletons.

Track CLS as part of performance review.

------------------------------------------------------------------------

# 129. Motion and Loading Bundle Budget

Do not sacrifice first-load performance for polish.

Before adding an animation library:

1.  confirm CSS/Web Animations cannot solve it cleanly;
2.  measure added client bundle cost;
3.  confirm the animation runs only in a Client Component;
4.  lazy-load where appropriate;
5.  verify mobile performance.

Three.js should not be part of the initial application bundle unless an
approved product experience specifically requires 3D rendering.

------------------------------------------------------------------------

# 130. Animation Testing

Features containing meaningful motion must include tests for state
behavior.

Do not test exact visual frames.

Test behavior such as:

-   NEXT advances once;
-   animation lock prevents accidental double advance;
-   NOT NOW persists before/with transition as designed;
-   early escalation hold cancels;
-   completed escalation hold submits once;
-   reduced-motion mode still completes the action;
-   pending mutation prevents duplicate action;
-   animation cleanup occurs on unmount/navigation.

Use fake timers where appropriate for deterministic timing tests.

------------------------------------------------------------------------

# 131. Loading-State Testing

For asynchronous features test:

-   initial pending state;
-   successful content replacement;
-   empty result;
-   server error;
-   retry;
-   slow response;
-   streaming interruption where applicable;
-   skeleton removal;
-   no duplicate mutation while pending.

The loading implementation is part of feature completeness, not
post-development polish.

------------------------------------------------------------------------

# 132. Updated UI Definition of Done

A UI feature is complete only when:

``` text
[ ] SSR/RSC boundary is correct
[ ] shared components are reused
[ ] responsive desktop/mobile behavior works
[ ] loading state exists where required
[ ] skeleton is used only where useful
[ ] empty state exists
[ ] error/retry state exists
[ ] pending mutations prevent duplicates
[ ] transitions are smooth and lightweight
[ ] reduced-motion behavior works
[ ] no unnecessary animation library is shipped
[ ] no significant layout shift is introduced
[ ] keyboard/focus behavior works
[ ] motion/loading tests are included
[ ] performance is acceptable on mobile
```

------------------------------------------------------------------------

# 133. Tailwind-First Styling Standard --- Mandatory

Skylar uses **Tailwind CSS as the primary and default styling system**.

Do not use traditional per-component CSS files for normal application
styling.

Preferred:

``` tsx
<section className="min-h-dvh bg-ink px-6 py-8 text-paper md:px-16 md:py-12">
```

Avoid:

``` tsx
<section className="briefing-card">
```

combined with a separate:

``` css
.briefing-card {
  min-height: 100vh;
  background: ...;
  padding: ...;
}
```

unless CSS is genuinely required for a capability Tailwind cannot
express cleanly.

------------------------------------------------------------------------

# 134. Tailwind Design Tokens

The approved Skylar design system must be represented through
centralized Tailwind/theme tokens rather than repeated arbitrary values.

Target semantic utilities should read approximately like:

``` text
bg-ink
bg-ink-2
bg-ink-3

text-paper
text-paper-2
text-paper-3

text-attention
text-risk
text-success

border-hairline
```

The source colors remain:

``` text
Ink       #0B0B0E
Ink 2     #15151B
Ink 3     #1F1F27

Paper     #F2EFE8
Paper 2   #B4B0A6
Paper 3   #7E7B74

Amber     #F2A93B
Red       #FF4A45
Green     #4CD07D
```

Do not scatter values such as:

``` tsx
text-[#F2A93B]
bg-[#0B0B0E]
```

through the application when a semantic token exists.

------------------------------------------------------------------------

# 135. Tailwind Utility Composition

Use the already-installed:

``` text
clsx
tailwind-merge
```

to build one shared class helper.

Example:

``` ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Then components can safely compose classes:

``` tsx
<button
  className={cn(
    "h-[52px] px-6 font-medium transition-opacity",
    "focus-visible:outline-none focus-visible:ring-2",
    disabled && "pointer-events-none opacity-50",
    className
  )}
>
```

Do not manually concatenate complex conditional class strings throughout
the codebase.

------------------------------------------------------------------------

# 136. Tailwind Responsive Strategy

Responsive behavior must be implemented mobile-first.

Example:

``` tsx
className="
  px-6 py-8
  md:px-10 md:py-10
  lg:px-16 lg:py-12
"
```

The target designs remain:

``` text
Mobile reference:  402 × 874
Desktop reference: 1280 × 800
```

Do not create separate desktop/mobile component trees unless the
interaction itself genuinely differs.

Prefer responsive Tailwind utilities over JavaScript viewport checks.

------------------------------------------------------------------------

# 137. Tailwind Motion

Simple motion should use Tailwind transition utilities:

``` tsx
className="
  transition-[transform,opacity]
  duration-[360ms]
  ease-out
"
```

For reusable product-specific animations, define named keyframes
centrally through the project's Tailwind/theme configuration and expose
semantic animation utilities.

Examples:

``` text
animate-briefing-enter
animate-briefing-exit
animate-skeleton-pulse
```

Do not repeat long arbitrary animation declarations across components.

Anime.js remains reserved for coordinated timelines/stateful motion that
becomes awkward or fragile with Tailwind alone.

------------------------------------------------------------------------

# 138. Tailwind Skeletons

Shared skeleton primitives should be Tailwind-based.

Conceptually:

``` tsx
<div
  className="
    bg-ink-2
    motion-safe:animate-pulse
    motion-reduce:animate-none
  "
/>
```

Skeleton composition belongs in reusable components rather than copied
markup/styles.

Keep skeleton motion subtle and consistent with Skylar's restrained
visual system.

------------------------------------------------------------------------

# 139. Tailwind Accessibility States

Interactive components must include deliberate Tailwind states for:

``` text
hover
focus-visible
active
disabled
aria states where useful
motion-safe
motion-reduce
```

Keyboard focus must never be removed without an accessible replacement.

Example pattern:

``` tsx
className="
  transition-opacity
  hover:opacity-90
  active:opacity-75
  focus-visible:outline-none
  focus-visible:ring-2
  focus-visible:ring-paper
  focus-visible:ring-offset-2
  focus-visible:ring-offset-ink
  disabled:pointer-events-none
  disabled:opacity-40
"
```

------------------------------------------------------------------------

# 140. Tailwind Component Variants

When a shared component has legitimate variants, centralize them instead
of duplicating class combinations at call sites.

Examples:

``` text
Button
├── primary
├── secondary
├── danger
└── ghost

Status
├── attention
├── risk
└── success
```

Variant APIs should remain small and semantic.

Do not create dozens of visual variants that undermine the design
system.

------------------------------------------------------------------------

# 141. When Custom CSS Is Allowed

Custom CSS is an exception, not the default.

It is acceptable for:

-   global font declarations;
-   root-level browser normalization when necessary;
-   complex pseudo-element effects that are materially clearer in CSS;
-   unsupported browser-specific behavior;
-   highly specialized animation/keyframes when central Tailwind
    configuration is insufficient;
-   third-party library integration overrides.

Any custom CSS should be centralized and documented.

Do not create:

``` text
Component.module.css
feature.css
page.css
```

for routine layout/styling that Tailwind already handles.

------------------------------------------------------------------------

# 142. Tailwind and Server Components

Tailwind works naturally with Server Components and should not force a
component to become client-side.

A component must not gain `"use client"` merely for styling.

Client boundaries remain determined by behavior, not CSS.

This is important to Skylar's SSR-first performance architecture.

------------------------------------------------------------------------

# 143. Tailwind Performance Rules

-   Keep class names statically discoverable where possible.
-   Avoid generating Tailwind class names dynamically from arbitrary
    strings.
-   Map application state to known class sets.
-   Avoid enormous repeated class strings by extracting real shared
    components.
-   Do not extract every three utilities into abstractions that make
    markup harder to understand.
-   Keep the final CSS/build output under review.
-   Do not add a second UI styling framework alongside Tailwind without
    explicit architectural approval.

------------------------------------------------------------------------

# 144. Updated Styling Rule

For every new UI implementation, use this decision order:

``` text
Can shared component already solve it?
        ↓ no
Can Tailwind utilities solve it?
        ↓ no
Can a centralized Tailwind token/keyframe solve it?
        ↓ no
Does Web Animations API solve runtime motion?
        ↓ no
Does Anime.js provide meaningful value?
        ↓ no
Is specialized custom CSS genuinely justified?
```

Three.js remains outside this normal styling decision tree and requires
a specific approved 3D use case.

# 80. Final Architectural Principle

The application should behave as:

``` text
Skylar decides what matters
        ↓
Server prepares the context
        ↓
Manager sees one clear decision
        ↓
Manager acts
        ↓
Action becomes part of the employee record
        ↓
Skylar determines what comes next
```

Not:

``` text
Login
↓
Dashboard
↓
Widgets
↓
Menus
↓
Chatbot
↓
User figures out what to do
```

That distinction should remain visible in every engineering and product
decision.

------------------------------------------------------------------------

## Source Basis

This implementation guide is grounded in the supplied Skylar v2 project
materials, particularly:

-   `01-product-requirements.md`
-   `02-design-implementation-guide.md`
-   `03-technical-implementation-spec.md`
-   `04-ahmed-onboarding-build-guide.md`
-   `06-testing-release-operations.md`
-   `07-open-decisions-traceability.md`

The v2 "Briefing Room" requirements and received design specification
supersede older rev. 1 assumptions where they conflict.

------------------------------------------------------------------------

## Engineering Additions Beyond the Supplied v2 Documents

The following requirements in this guide are explicit engineering
decisions/additions for this implementation rather than claims that they
were mandated by the supplied Skylar v2 source documents:

-   shared-component-first implementation discipline;
-   FAANG-grade production engineering checklist;
-   mandatory pre-code security/side-effect review;
-   explicit API rate limiting policy;
-   explicit idempotency policy;
-   Anthropic cache/cost optimization policy;
-   LangGraph orchestration and workflow auditing;
-   mandatory feature-level unit/integration/regression testing
    expectations;
-   CI quality gates.

These additions must remain compatible with the source-defined product
behavior, privacy requirements, tenant isolation, Briefing experience,
and escalation flow.
