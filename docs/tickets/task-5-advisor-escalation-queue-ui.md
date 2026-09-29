# TASK-5: Build Advisor Escalation Queue UI

**Status:** Done  
**Priority:** High  
**Area:** Advisor / Escalation Queue

## Summary

Create the internal advisor queue screen for high-risk escalations. The first
version should read from the existing `GET /api/advisor/escalations` endpoint,
list active cases, and show enough case detail for a Skylar advisor to triage a
Priya-style leave-law escalation.

## Acceptance Criteria

- [x] Add an advisor queue route for admins.
- [x] Fetch escalations from `GET /api/advisor/escalations`.
- [x] Show case ID, employee name, question, status, assigned advisor, and
      response commitment.
- [x] Highlight `with_advisor` cases clearly.
- [x] Empty state explains that no escalations are waiting.
- [x] Queue UI matches the existing Skylar visual style.
- [x] Add tests or focused verification for the queue data mapping.

## Notes

- Current MVP queue access is admin-scoped until the Skylar-side access model is
  confirmed.
- Do not add advisor response workflows yet; this ticket is for visibility and
  triage only.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm test` - 73 tests passed
- `npm run build`
