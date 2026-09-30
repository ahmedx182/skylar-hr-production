# TASK-7: Build Real Conversation Records and Transcripts

**Status:** Done  
**Priority:** High  
**Area:** Conversations / Employee Ledger

## Summary

Make Skylar assistant conversations durable HR records, not only ephemeral chat
memory. When a manager chats with Skylar in an employee context, the full
conversation should be saved as a transcript-style ledger record attached to
that employee file.

## Acceptance Criteria

- [x] Employee-scoped Skylar chats create or update a durable conversation
      record.
- [x] Conversation records are company-scoped and user-scoped on the server.
- [x] The employee ledger stores the transcript with `type: conversation`.
- [x] The employee profile and Documents views surface saved conversations
      through the existing ledger UI.
- [x] New Skylar chats still load recent saved context before answering.
- [x] Workspace-general chats can keep memory without creating employee ledger
      records.
- [x] Unit coverage exists for transcript formatting and thread helpers.

## Implementation

- Added shared transcript/thread helpers in
  `src/features/briefing/skylar-conversation-transcript.ts`.
- Updated `appendSkylarConversationTurn` so employee-scoped chats validate the
  employee belongs to the company, save conversation memory, and upsert a
  deterministic employee ledger entry with `type: conversation`.
- Conversation ledger entries reuse the existing People and Documents surfaces,
  so saved transcripts appear without a separate UI path.
- Workspace-general chats continue to save assistant memory without creating
  employee ledger records.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm test` - 80 tests passed
- `npm run build`
