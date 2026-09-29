# TASK-27 — Stripe Billing And Trial Gating

**Status:** Done

## Goal
Close the launch-critical billing gap from the client MD by adding a server-side Stripe billing flow and company trial gating.

## Scope
- Add `subscriptions/{companyId}` billing state with 14-day trial access.
- Seed new workspaces with trial metadata.
- Add server-only Stripe Checkout, Customer Portal, and webhook routes.
- Gate the main workroom when company access is expired.
- Add an admin Billing page showing status, trial end, access, and Stripe actions.

## Acceptance
- Admins can start Stripe Checkout from Billing.
- Admins with a Stripe customer can open the Customer Portal.
- Stripe webhook verifies signatures before syncing subscription state.
- Trial access expires based on server-side company billing state.
- Local builds keep working when Stripe env values are blank.
