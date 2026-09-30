# TASK-32 — Demo Readiness Minus Payment

**Status:** Done

## Goal
Make tomorrow's client demo usable across the core app while payment remains out of scope.

## Scope
- Add an environment-controlled billing gate bypass for demo environments.
- Keep Stripe Checkout, Portal, and webhook code intact for later payment UAT.
- Make the Billing page state clear that payment is disabled for the demo.

## Acceptance
- Setting `DEMO_DISABLE_PAYMENT_GATE=true` prevents expired trial state from blocking protected app flows.
- Billing still shows release/payment status without launching Stripe when demo payment is disabled.
- The implementation follows the existing dark Briefing Room panel/card structure.
