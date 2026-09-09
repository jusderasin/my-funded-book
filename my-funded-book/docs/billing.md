# Billing: Neon + Stripe

Neon (`DATABASE_URL`) stores the mapping between the authenticated Supabase user,
Stripe customer and subscription, plus the access status and period end.
All billing SQL lives in `lib/subscriptions.js`; the browser never queries a
Supabase `subscriptions` table. The legacy Supabase table may remain in place.

## Access and display

- The server layout reads Neon. Active and trialing subscriptions retain access
  until their period end. Existing manual grants without an expiry remain valid.
- `GET /api/stripe/subscription` authenticates the user, reads their Neon mapping,
  and retrieves the associated Stripe subscription to display scheduled
  cancellation accurately, including changes made in the Stripe portal.
- Responses use a field allowlist and `Cache-Control: private, no-store`.
  The service worker excludes API routes and clears the old cache on activation.
- A Stripe/Neon outage returns 503. The UI keeps the last known state and offers
  retry instead of claiming there is no subscription.
- No schema migration or new environment variable is needed. In particular this
  implementation does not assume Neon has a `cancel_at_period_end` column.
  The trade-off is one Stripe retrieval per billing refresh for paid accounts.

## Cancellation and deletion

The cancel button sets Stripe `cancel_at_period_end: true`. It does not cancel
immediately or revoke the remaining paid/trial access. Stripe's returned status
and expiry are synchronized to Neon.

Account deletion first reads Neon, enumerates every page of subscriptions for
the mapped Stripe customer, and cancels all nonterminal subscriptions (including
duplicates). It also checks the stored subscription ID. Stripe or Neon failures
block deletion. No final invoice or proration is requested.

Only after billing stops does deletion clean application rows, remove the Neon
mapping, then delete the Supabase auth user. A failure before auth deletion is
reported and the user can retry. There is no distributed transaction: billing
may already be stopped when later data cleanup fails. Manual account deletion
outside this route still requires separate Stripe cleanup.

Webhook updates never insert missing user mappings from Stripe metadata. Checkout
creates the mapping first. A late event after deletion therefore cannot recreate
the billing row. A deletion event only cancels its exact subscription ID, and
update events retrieve the current Stripe state before synchronizing it.

## Validation

```sh
npm ci
npm test
npm run validate:billing
npm run build
```

The automated tests mock Stripe, Neon and Supabase boundaries. They cover access
expiry, trials and free grants, authentication, user-scoped lookups, scheduled
cancellation, outage handling, deletion ordering, duplicate subscriptions, webhook
ordering, displayed states and API cache exclusion.

Before releasing, also exercise a **Stripe test-mode** account in an environment
using test credentials and an isolated database: portal, trial cancellation,
reload, webhook delivery, account deletion and a free grant. Automated tests do
not validate production credentials or the deployed Neon schema.

Stripe references:
- https://docs.stripe.com/api/subscriptions/cancel
- https://docs.stripe.com/api/subscriptions/list
- https://docs.stripe.com/billing/subscriptions/cancel
