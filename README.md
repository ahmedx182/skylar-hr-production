# Skylar Briefing Room

Skylar is a focused HR workroom for reviewing the next important people
conversation, keeping employee context close, and saving a clean record.
The primary experience is an ordered daily briefing, not a generic dashboard
or chat application.

## Current Scope

The current build includes:

- Passwordless Firebase email-link sign-in.
- Active-user allowlisting before a magic link can be requested.
- Secure server sessions with protected server-rendered routes.
- Two application roles: `admin` and `employee`.
- Admin-only creation and editing of employee records.
- Admin-only notes linked to employees.
- Real Firestore-backed People, Documents, employee profiles, and ledger data.
- Daily Briefing, Deferred, People, and Documents views.
- Employee profile details including email, role, location, state, notes, and last update.
- Searchable employee selection when creating a note.
- Account menu, logout, quick actions, and the Ask Skylar interaction surface.
- Top-of-page loading progress and lightweight transitions without blur effects.

The first Claude conversation slice is implemented behind the briefing card's
Prepare conversation action. Add `ANTHROPIC_API_KEY` to enable it; without the
key, the app shows a clear setup message and keeps the rest of the briefing
usable. Advisor escalation, billing, and the remaining conversation workflow
are planned extensions.

## Stack

- Next.js 14 App Router
- React 18 and TypeScript
- Tailwind CSS
- Firebase Authentication
- Firebase Admin SDK
- Cloud Firestore
- Zod
- Vitest
- lucide-react

## Local Setup

Requirements:

- Node.js `>=22.11`
- Firebase project credentials

Install dependencies:

```bash
npm install
```

Create `.env.local` from `.env.example` and provide the Firebase client and
server credentials. Add `ANTHROPIC_API_KEY` when enabling Skylar conversation
help; `ANTHROPIC_MODEL` defaults to `claude-haiku-4-5-20251001`.

Run the development server on port 3000:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification

```bash
npm run typecheck
npm run lint
npm test
```

## Important Routes

| Route | Purpose |
| --- | --- |
| `/login` | Passwordless work-email sign-in |
| `/verify` | Completes the Firebase email link |
| `/briefing` | Ordered daily HR briefing |
| `/deferred` | Deferred briefing items |
| `/people` | Employee index |
| `/people/[employeeId]` | Employee profile and saved notes |
| `/people/new` | New employee flow |
| `/documents` | Saved ledger records |
| `/documents/[documentId]` | Saved record detail |
| `/notes/new` | New note flow |

The protected conversation endpoint is `/api/briefing/conversation` and
returns a server-side Claude response as a text stream.

## Architecture Notes

Server Components and server repositories own authentication, authorization,
company scoping, and Firestore access. Client Components are limited to
interactive UI such as forms, menus, copy-to-clipboard, progress, and the
assistant panel.

The main data collections currently used are:

- `users`
- `employees`
- `employee_ledger_entries`

Admin authorization is enforced on the server through the session role. The
browser is never trusted for company ID, role, or mutation permissions.

See the full implementation memo in
[`docs/SKYLAR_ENGINEERING_ARCHITECTURE_v4.md`](docs/SKYLAR_ENGINEERING_ARCHITECTURE_v4.md).
