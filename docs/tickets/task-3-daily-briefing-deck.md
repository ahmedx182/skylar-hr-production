# TASK-3: Build the real Daily Briefing deck and card actions

**Status:** Done  
**Priority:** High  
**Area:** Daily Briefing / Card Engine

## Summary

Replace the starter Daily Briefing content with a server-owned, Firestore-backed
deck that orders real employee and ledger items by urgency and due date. Make
the card actions usable and keep the sidebar synchronized with the active deck.

## Acceptance Criteria

- [x] `GET /api/briefing/today` returns the authenticated user's ordered deck.
- [x] Cards are ordered by urgency, then due date, with a quiet clear state when
      there is no remaining work.
- [x] `Prepare` opens the existing Skylar conversation surface with card context.
- [x] `Next` advances the deck and hides the card for the current day.
- [x] `Next` transitions as a stacked-card interaction: the current card drops
      underneath while the next card rises into place.
- [x] `Not now` defers the card until the next day.
- [x] Card actions are company- and user-scoped on the server.
- [x] The “What’s ahead” sidebar is driven by the same server-owned card list.
- [x] Unit coverage exists for ordering, hidden cards, and the empty deck state.

## Implementation

- Added the deck builder in `src/features/briefing/daily-deck.ts`.
- Added persisted action handling in
  `src/server/repositories/briefing-action.repository.ts`.
- Added the briefing API in `src/app/api/briefing/today/route.ts`.
- Added the interactive deck client in
  `src/components/briefing/briefing-deck-client.tsx`.
- Replaced starter briefing rendering with real data in the briefing page and
  shell components.
- Added tests in `tests/unit/briefing/daily-deck.test.ts`.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm test` — 58 tests passed
- `npm run build`

## Follow-up

The action collection uses the server-side Firebase Admin SDK. Firestore client
security rules should include `briefing_card_actions` if browser access to that
collection is introduced later.
