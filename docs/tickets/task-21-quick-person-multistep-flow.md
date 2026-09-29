# TASK-21 — Quick Person Multistep Flow

## Goal
The sidebar `New person` quick-create modal should match the guided add-person flow instead of showing one long form.

## Scope
- Add a four-step flow to the quick-create person modal.
- Require name and email before moving past step one.
- Allow role/location and summary steps to be skipped.
- Keep the final create action on the review step.

## Acceptance
- Sidebar `New person` shows progress and step labels.
- Step one blocks continue until name and work email are present.
- Optional steps can be skipped.
- Creating the person still uses the existing server action.
