# TASK-16 — Advisor Case Workbench Actions

## Goal
Make the Advisor escalation detail panel act like a workbench: when an advisor is reviewing a case, they can jump directly to the employee file and the related ledger records without hunting through People or Documents.

## Scope
- Keep Advisor search/filter results aligned with the detail panel.
- Show an honest empty detail state when filters hide all cases.
- Add an employee-file shortcut from the selected escalation.
- Make related ledger snippets clickable and route back with employee context.

## Acceptance
- Searching or filtering to zero cases does not leave an unrelated case open in the detail panel.
- Advisor can open the employee file from the selected case.
- Related ledger rows open the saved document and preserve `from=employee` navigation context.
- Typecheck, lint, unit tests, and production build pass.
