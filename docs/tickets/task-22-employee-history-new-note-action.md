# TASK-22 — Employee History New Note Action

## Goal
Employee profiles should always offer a direct way to save a new note for that person, even when they already have history.

## Scope
- Add a `New note` action to the employee History header.
- Preserve employee context with `/notes/new?employeeId=...`.
- Avoid duplicating the same action inside the empty ledger state.

## Acceptance
- Every employee profile shows `New note` in the History section.
- The action opens the new-note flow with that employee preselected.
- Empty employee profiles still clearly explain that no notes exist yet.
