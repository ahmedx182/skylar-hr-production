# TASK-6: Build Advisor Response and Resolution Workflow

**Status:** Done  
**Priority:** High  
**Area:** Advisor / Escalation Resolution

## Summary

Extend the advisor escalation queue beyond visibility and triage. Advisors need
a safe workflow to open an escalation, review the case context, draft a response,
mark the response commitment, and resolve or keep the case active without
breaking the existing company-scoped HR record model.

## Why This Is Next

`TASK-5` intentionally stopped at the queue UI. It shows active escalations but
does not let an advisor respond, update status, or close the loop. The product
still needs the actual advisor handoff outcome so high-risk cases do not remain
read-only after escalation.

## Acceptance Criteria

- [x] Advisor queue items can be opened into a case detail view.
- [x] Case detail shows employee context, original manager question, escalation
      reason, current status, assigned advisor, response commitment, and related
      ledger entries.
- [x] Advisor can save a draft response without sending or resolving the case.
- [x] Advisor can mark a case as `responded` with response text and timestamp.
- [x] Advisor can mark a case as `resolved` only after a response exists.
- [x] Status updates are persisted server-side and scoped to the correct
      company and escalation case.
- [x] The employee ledger records the advisor response or resolution event.
- [x] The Daily Briefing reflects responded/resolved escalations correctly.
- [x] Admin-only MVP access remains enforced until the advisor role model is
      decided.
- [x] Unit coverage exists for status transitions and queue state mapping.
      persistence.

## Implementation Notes

- Reused the existing advisor escalation repository and queue response shape.
- Added `GET` and `PATCH` handlers for individual advisor escalation cases at
  `/api/advisor/escalations/[escalationId]`.
- Added case detail loading, draft save, mark responded, and resolve actions to
  the advisor queue UI.
- Persisted advisor response and resolution events into the employee ledger so
  the Daily Briefing can surface the updated case state through existing ledger
  cards.
- Kept MVP access admin-scoped; no new advisor role model was introduced.
- Outbound email notifications remain out of scope.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm test` - 76 tests passed
- `npm run build`
