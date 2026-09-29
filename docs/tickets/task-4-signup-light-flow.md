# TASK-4: Build real signup and light prototype onboarding flow

**Status:** Done  
**Priority:** High  
**Area:** Signup / Onboarding / Prototype Alignment

## Summary

Make the first-user path follow the light version of the client prototype:
approved-domain company signup, employee intake, action plan, saved follow-up,
Home/open situations, Priya risk escalation, and advisor handoff.

## Acceptance Criteria

- [x] Login entry supports a domain-gated new-company signup mode with company
      name and work email.
- [x] Existing provisioned users can still sign in through the allowlisted email
      path.
- [x] New-company signup is restricted by `SIGNUP_ALLOWED_DOMAINS`; missing or
      empty domain configuration does not allow public signup.
- [x] Completing a signup email link creates the company/workspace and first
      admin user before the session cookie is set.
- [x] First-time signup routes into `/onboarding`.
- [x] `/onboarding` follows the light prototype flow beats while preserving the
      existing Skylar visual style.
- [x] Marcus/Priya/Tom prototype situations are backed by durable records
      beyond the first Marcus employee and note.
- [x] Advisor escalation is persisted and visible in a server-side queue.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm test` — 68 tests passed
- `npm run build`
