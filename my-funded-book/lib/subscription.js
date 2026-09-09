// Shared access rules; this module contains no database or Stripe client.
export function hasSubscriptionAccess(subscription, now = Date.now()) {
  if (!subscription || !["active", "trialing"].includes(subscription.status)) return false;
  if (!subscription.current_period_end) return true;
  return new Date(subscription.current_period_end).getTime() > now;
}

export function stripePeriodEnd(subscription) {
  const unix = subscription?.items?.data?.[0]?.current_period_end ??
    subscription?.current_period_end ?? null;
  return unix == null ? null : new Date(unix * 1000).toISOString();
}

// Explicit allowlist: never send customer IDs or the full database row to the browser.
export function subscriptionSummary(row, stripeSubscription = null) {
  if (!row) return null;
  const status = stripeSubscription?.status ?? row.status;
  const periodEnd = stripeSubscription
    ? stripePeriodEnd(stripeSubscription)
    : row.current_period_end;
  const hasStripeSubscription = Boolean(row.stripe_subscription_id);
  return {
    status,
    current_period_end: periodEnd ? new Date(periodEnd).toISOString() : null,
    cancel_at_period_end: stripeSubscription?.cancel_at_period_end === true,
    billing_details_loaded: !hasStripeSubscription || Boolean(stripeSubscription),
    can_manage: Boolean(row.stripe_customer_id),
    can_cancel: hasStripeSubscription &&
      !["canceled", "incomplete_expired"].includes(status),
    complimentary: !hasStripeSubscription && ["active", "trialing"].includes(status),
  };
}
