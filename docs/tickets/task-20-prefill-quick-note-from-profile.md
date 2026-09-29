# TASK-20 — Prefill Quick Note From Employee Profile

## Goal
When a manager is already on an employee profile, the sidebar `New note` quick action should create a note for that same employee without requiring another search.

## Scope
- Allow `BriefingRoomFrame` to receive active employee context for quick actions.
- Pass the current employee id from the employee profile page.
- Preselect that employee in the quick-create note modal.

## Acceptance
- On an employee profile, opening sidebar `New note` shows that employee selected.
- The hidden `employeeId` submitted by the quick note form matches the active profile employee.
- Other pages keep the default searchable employee picker.
