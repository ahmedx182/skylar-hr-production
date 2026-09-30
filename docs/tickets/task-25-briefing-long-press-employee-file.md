# TASK-25 — Briefing Long-Press Employee File

## Goal
Briefing cards should support the product interaction where a manager can hold on an employee name/person surface to open the employee file.

## Scope
- Add hold-to-open behavior to the employee chip on briefing cards.
- Add the same hold behavior to the employee summary panel on briefing cards.
- Show a subtle fill progress while the hold is active.
- Provide a keyboard equivalent: Enter/Space opens the employee file.

## Acceptance
- Holding the employee chip opens `/people/[employeeId]`.
- Holding the employee summary panel opens the same profile.
- Releasing early cancels the hold.
- Keyboard users can open the profile without a pointer hold.
