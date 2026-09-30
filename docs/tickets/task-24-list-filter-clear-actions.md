# TASK-24 — List Filter Clear Actions

## Goal
Search and filter controls should be easy to reset once a manager narrows a list.

## Scope
- Add a visible `Clear` action to People filters when search/status is active.
- Add a visible `Clear` action to Documents filters when search/type/status is active.
- Add a visible `Clear` action to Employee History filters when search/status/type is active.

## Acceptance
- `Clear` only appears when the list is filtered or searched.
- Clicking `Clear` resets the search input and all filters to `All`.
- Visible/total counts update back to the full list.
