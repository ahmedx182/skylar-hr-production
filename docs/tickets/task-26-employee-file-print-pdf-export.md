# TASK-26 — Employee File Print/PDF Export

**Status:** Done

## Goal
Employee files should be exportable as a dated PDF record using the browser print/save-as-PDF flow.

## Scope
- Add an `Export PDF` action to employee profiles.
- Trigger the browser print dialog from the employee profile.
- Add print styles that hide app navigation, floating assistant chrome, and edit/create controls.
- Keep the employee profile content readable in a light print layout.

## Acceptance
- Employee profile exposes an `Export PDF` action for admins.
- Clicking it opens the browser print dialog.
- Print output focuses on the employee file content rather than the whole app shell.
- Existing screen UI remains unchanged outside print mode.
