# Stripe Integration TODO

This repo already had a working Stripe Checkout integration (Scenario A: existing
`checkout.sessions.create` call). The Checkout Studio parameters below were merged into
that existing call in [`src/app/api/billing/checkout/route.ts`](src/app/api/billing/checkout/route.ts).
This file is the single source of truth for what's left before going live.

## Values to Replace

These are **not** placeholders in code — they're real, already-wired values — but the
underlying secrets/IDs in your environment are currently empty and must be filled in
before Checkout can actually run.

**Files containing these values:**
- [.env.local](.env.local)

| Variable | Current Value | What to Set |
|---|---|---|
| `STRIPE_SECRET_KEY` | *(empty)* | Your Stripe secret key from the [Dashboard](https://dashboard.stripe.com/test/apikeys). |
| `STRIPE_WEBHOOK_SECRET` | *(empty)* | The signing secret for the `/api/stripe/webhook` endpoint from the [Dashboard](https://dashboard.stripe.com/test/webhooks). |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | *(empty)* | Your Stripe publishable key from the Dashboard. |
| `STRIPE_PRICE_ID` | *(optional)* | No longer required. Prices are created from the Platform console (Pricing → Sync to Stripe). If set, it seeds the Professional package once. |

The `success_url`, `cancel_url`, `mode`, and `line_items` parameters in the checkout
route already use real app routes and your `STRIPE_PRICE_ID` env var — they were left
untouched (no sample placeholders to replace).

## Configured Parameters

These parameters were configured in Checkout Studio and are now set on the existing
Checkout Session call.

**Files containing these parameters:**
- [src/app/api/billing/checkout/route.ts](src/app/api/billing/checkout/route.ts)

| Parameter | Value |
|---|---|
| `ui_mode` | `hosted_page` (SDK `stripe@22.6.2` ≥ 21.0.0) |
| `billing_address_collection` | `auto` |
| `phone_number_collection` | `{ enabled: false }` |
| `automatic_tax` | `{ enabled: false }` |
| `allow_promotion_codes` | `false` |
| `payment_method_collection` | `always` (mode is `subscription`) |
| `submit_type` | `auto` |
| `integration_identifier` | `hosted_web_0001` |
| `origin_context` | `web` |

**Not removed:** `customer`, `subscription_data.metadata`, and `metadata` were kept even
though they aren't Checkout Studio fields — they're what ties a Checkout Session back to
the workspace (`companyId`) so the webhook can activate the right company. Removing them
would break the webhook → billing-state flow, so they were preserved rather than deleted.

## Setup and Next Steps

### Environment variables

Fill in the four empty values in `.env.local` listed above. This project is Next.js, so
only `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is browser-exposed (`NEXT_PUBLIC_` prefix); the
secret key, webhook secret, and price ID stay server-only — no renaming needed, the
existing names already follow Next.js convention correctly.

### Project structure

No new files or routes were added (Scenario A — the integration already existed):
- `src/app/api/billing/checkout/route.ts` — creates the Checkout Session (edited).
- `src/app/api/billing/portal/route.ts` — opens the Customer Portal (unchanged).
- `src/app/api/stripe/webhook/route.ts` — verifies signatures, syncs subscription state (unchanged).
- `src/server/repositories/billing.repository.ts` — Firestore billing state (unchanged).
- `src/server/stripe/client.ts` — lazy Stripe client + price id accessor (unchanged).
- `src/components/billing/billing-actions.tsx` — "Start billing" / "Customer portal" buttons (unchanged).
- `src/app/(protected)/billing/page.tsx` — admin Billing page (unchanged).

### How the integration works

1. An admin clicks **Start billing** on `/billing` → `POST /api/billing/checkout`.
2. The route creates (or reuses) a Stripe Customer, then creates a `subscription`-mode
   Checkout Session tagged with `metadata.companyId`, and redirects to the returned `url`.
3. The customer pays on Stripe's hosted page.
4. Stripe calls `POST /api/stripe/webhook`. The route verifies the signature, then:
   - on `customer.subscription.*`, calls `syncStripeSubscription` to update status/period.
   - on `checkout.session.completed`, calls `markCheckoutCompleted` to link the subscription
     id to the company via the session's `metadata.companyId`.
5. The Billing page reads company billing state server-side on every load — **the webhook
   is authoritative**; returning from Stripe does not unlock anything by itself.
6. **Customer Portal**: `POST /api/billing/portal` opens Stripe's portal for workspaces
   that already have a `stripeCustomerId`, so admins can manage/cancel the subscription.
7. **Paywall**: free workspaces get `FREE_MESSAGE_LIMIT` (5) advisor messages. After that the
   conversation API returns 402 and the admin chat shows an **Upgrade to keep chatting** button
   linking to `/billing`.
8. **Return notices**: after checkout, `/briefing?billing=success` shows a confirmation (or
   "activating" until the webhook lands); `/billing?billing=cancelled` confirms nothing was charged.
9. **Landing page**: pricing cards come from the published packages in Platform → Pricing; all CTAs go to
   signup, and upgrading happens from Billing inside the app.
10. **Packages**: super admins create/edit/archive packages (name, price, monthly or yearly, features, badge, order).
    The Free package's message allowance is editable and enforced straight away. Checkout takes a `packageId`, and the
    subscription records which package was bought.
11. **Deleting a workspace** (Platform → Workspaces → Admin actions) is a soft delete: it locks everyone out, cancels any
    live Stripe subscription, and keeps all data for 30 days. It can be restored in that window. A daily job
    (`/api/cron/purge-deleted`, scheduled in `vercel.json`, authenticated by `CRON_SECRET`) then removes it
    permanently, including its user logins. The same job permanently removes employee files and notes that
    admins deleted more than 30 days ago (they sit in **Recently deleted** until then and can be restored).

### Testing

Unit tests already cover this flow and pass (`npx vitest run tests/unit/stripe`):
checkout session creation, customer reuse, duplicate-subscription rejection, webhook
signature verification, and subscription sync. They mock the Stripe SDK, so they don't
require real keys.

To test against Stripe directly once keys are set:
- Install the [Stripe CLI](https://docs.stripe.com/cli/install): `npm i -g @stripe/cli`
- `stripe login`, then `stripe sandbox create` for a quick disposable test environment
- Forward webhooks locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
  (use the printed `whsec_...` as `STRIPE_WEBHOOK_SECRET` for local testing)
- Use any [Stripe test card](https://docs.stripe.com/testing#cards), e.g.
  `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP.

### Next steps

- Populate the four empty env vars above (locally and in your deployment environment).
- Open **Platform → Pricing** as a super admin, check the Professional package (default $49 / month), and press
  **Sync to Stripe**. This creates the Stripe Product and recurring Price for you and stores their IDs. Changing a price later
  creates a new Stripe Price; current subscribers stay on the price they signed up at.
- Customers can only check out packages that are published and synced.
- Register the production webhook endpoint in the Dashboard and set `STRIPE_WEBHOOK_SECRET`.
- `DEMO_DISABLE_PAYMENT_GATE` is unset in `.env.local` (defaults to off), so the Billing
  page already shows the Stripe actions. If it's ever set to hide them for a client demo,
  unset it again before billing UAT — see `src/app/(protected)/billing/page.tsx`.
- Set `CRON_SECRET` in production (Vercel sets the Authorization header from it automatically). If you don't host on Vercel,
  schedule a daily `GET /api/cron/purge-deleted` with header `Authorization: Bearer <CRON_SECRET>`.
- Run a full free → paid → portal → cancel cycle in test mode before going live.

### Resources

- https://support.stripe.com
- https://docs.stripe.com/mcp
