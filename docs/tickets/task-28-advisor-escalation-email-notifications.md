# TASK-28 — Advisor Escalation Email Notifications

**Status:** Done

## Goal
Close the client-MD gap where high-risk escalations were visible in the advisor queue but did not notify the Skylar team outside the app.

## Scope
- Add server-only Resend notification support.
- Send an email when a new advisor escalation is created.
- Store notification result on the escalation record.
- Keep local/dev escalation creation usable when Resend env values are absent.
- Update advisor queue copy to reflect real notification behavior.

## Acceptance
- New advisor escalations attempt an email notification when `RESEND_API_KEY` and `SKYLAR_TEAM_EMAIL` are configured.
- Notification status is persisted as `sent`, `skipped`, or `failed`.
- Resend is never called from the browser.
- Email content includes case id, employee, reason, commitment, and advisor queue link.
