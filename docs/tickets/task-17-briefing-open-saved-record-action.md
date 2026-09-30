# TASK-17 — Briefing Open Saved Record Action

## Goal
Saved-note and saved-conversation cards in Today should let the user open the exact record from the card, instead of forcing them to go through Documents or the employee profile first.

## Scope
- Add an `open_file` action to ledger-backed briefing cards.
- Label conversation cards as `Open transcript` and note cards as `Open note`.
- Render the action as a direct link to the saved document.
- Preserve employee context in the back link when the document is opened from a briefing card.

## Acceptance
- Saved conversation cards show an `Open transcript` action.
- Saved note cards show an `Open note` action.
- The document route includes the employee context when available.
- Unit coverage verifies the action is emitted by the daily deck.
