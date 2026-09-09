import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSubscription, syncStripeSubscription } from "@/lib/subscriptions";
import { subscriptionSummary } from "@/lib/subscription";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const sub = await getSubscription(user.id);
    if (!sub?.stripe_subscription_id) {
      return NextResponse.json({ error: "no subscription" }, { status: 400 });
    }
    const updated = await getStripe().subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
    // Preserve access until the paid/trial period ends; Stripe owns the schedule.
    await syncStripeSubscription(sub.stripe_customer_id, updated);
    return NextResponse.json({
      ok: true,
      cancel_at_period_end: updated.cancel_at_period_end,
      subscription: subscriptionSummary(sub, updated),
    });
  } catch (error) {
    console.error("Subscription cancellation failed:", error);
    return NextResponse.json({ error: "subscription_cancel_failed" }, { status: 503 });
  }
}
