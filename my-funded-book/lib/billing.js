import "server-only";
import { getStripe } from "@/lib/stripe";
import { subscriptionSummary } from "@/lib/subscription";

export async function getBillingSummary(row) {
  if (!row?.stripe_subscription_id) return subscriptionSummary(row);
  // Scheduled cancellation is read from Stripe, so no new Neon column/migration
  // is required and changes made in the customer portal appear immediately.
  const subscription = await getStripe().subscriptions.retrieve(row.stripe_subscription_id);
  return subscriptionSummary(row, subscription);
}

export async function stopAccountBilling(row) {
  if (!row?.stripe_customer_id && !row?.stripe_subscription_id) return;
  const stripe = getStripe();
  const ids = new Set();
  if (row.stripe_customer_id) {
    // Exhaust every page before mutation; include possible duplicate subscriptions.
    for await (const sub of stripe.subscriptions.list({
      customer: row.stripe_customer_id, status: "all", limit: 100,
    })) {
      if (!["canceled", "incomplete_expired"].includes(sub.status)) ids.add(sub.id);
    }
  }
  if (row.stripe_subscription_id) {
    const stored = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
    if (!["canceled", "incomplete_expired"].includes(stored.status)) ids.add(stored.id);
  }
  for (const id of ids) {
    // Any Stripe failure blocks deletion. Retrying is safe after partial success.
    await stripe.subscriptions.cancel(id, { invoice_now: false, prorate: false });
  }
}
