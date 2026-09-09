import "server-only";
import { sql } from "@/lib/db";
import { stripePeriodEnd } from "@/lib/subscription";

// Neon is the only application store for billing. Supabase subscriptions is legacy.
export async function getSubscription(userId) {
  const rows = await sql`
    SELECT user_id, stripe_customer_id, stripe_subscription_id,
           status, current_period_end, price_id
    FROM subscriptions WHERE user_id = ${userId} LIMIT 1
  `;
  return rows?.[0] || null;
}

export async function saveStripeCustomer(userId, customerId) {
  await sql`
    INSERT INTO subscriptions (user_id, stripe_customer_id, status)
    VALUES (${userId}, ${customerId}, 'inactive')
    ON CONFLICT (user_id) DO UPDATE
    SET stripe_customer_id = EXCLUDED.stripe_customer_id
  `;
}

export async function syncStripeSubscription(customerId, subscription) {
  // Checkout creates the mapping before Stripe can send events. UPDATE only:
  // a late event must never recreate a deleted account from Stripe metadata.
  const rows = await sql`
    UPDATE subscriptions
    SET stripe_subscription_id = ${subscription.id},
        price_id = ${subscription.items?.data?.[0]?.price?.id || null},
        status = ${subscription.status},
        current_period_end = ${stripePeriodEnd(subscription)},
        updated_at = ${new Date().toISOString()}
    WHERE stripe_customer_id = ${customerId}
      AND (stripe_subscription_id IS NULL OR stripe_subscription_id = ${subscription.id}
           OR status IN ('inactive', 'canceled', 'incomplete_expired'))
    RETURNING user_id
  `;
  return rows?.[0] || null;
}

export async function markSubscriptionCanceled(customerId, subscriptionId) {
  // A delayed deletion for an old subscription must not revoke a newer one.
  await sql`
    UPDATE subscriptions SET status = 'canceled', updated_at = ${new Date().toISOString()}
    WHERE stripe_customer_id = ${customerId} AND stripe_subscription_id = ${subscriptionId}
  `;
}

export async function deleteSubscription(userId) {
  await sql`DELETE FROM subscriptions WHERE user_id = ${userId}`;
}
