# TASK-19 — Prefill New Note Employee Context

## Goal
When the user starts a follow-up note from a specific employee or saved conversation, the note form should already know which employee the note belongs to.

## Scope
- Allow `/notes/new` to accept `employeeId`.
- Preselect the matching employee in the new-note form.
- Pass employee context from saved conversation follow-up links.
- Add a direct `New note` action to an empty employee ledger state.

## Acceptance
- `/notes/new?employeeId=...` opens with that employee selected.
- Saved conversation detail follow-up notes preserve employee context.
- Empty employee profiles offer a direct new-note action for that employee.
