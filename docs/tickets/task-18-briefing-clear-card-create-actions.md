# TASK-18 — Briefing Clear Card Create Actions

## Goal
When Today has no active people work left, the clear card should still give the user useful next steps instead of ending in a passive status panel.

## Scope
- Replace the inert `Finish` clear-card action with creation actions.
- Add `New note` and `New person` actions to the clear card.
- Render those actions as direct links to the existing create flows.
- Add unit coverage for the clear-card action list.

## Acceptance
- The clear card shows `New note` and `New person`.
- `New note` opens the saved-note creation flow.
- `New person` opens the employee creation flow.
- The daily deck test verifies clear-card actions.
