import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createAdminSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const stripe = getStripe();
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `Webhook signature invalide: ${err.message}` }, { status: 400 });
  }

  const admin = createAdminSupabase();

  async function syncByCustomer(customerId, subscription) {
    const { data: row } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    let userId = row?.user_id || subscription?.metadata?.supabase_user_id;
    if (!userId) return;

    // Stripe a déplacé current_period_end au niveau de l'item d'abonnement
    // dans ses versions d'API récentes. On lit d'abord au niveau de l'item,
    // puis on retombe sur l'ancien emplacement (compat toutes versions).
    const periodEndUnix =
      subscription?.items?.data?.[0]?.current_period_end ??
      subscription?.current_period_end ??
      null;

    await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription?.id || null,
        price_id: subscription?.items?.data?.[0]?.price?.id || null,
        status: subscription?.status || "inactive",
        current_period_end: periodEndUnix
          ? new Date(periodEndUnix * 1000).toISOString()
          : null,
        cancel_at_period_end: subscription?.cancel_at_period_end ?? false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await syncByCustomer(session.customer, subscription);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        await syncByCustomer(subscription.customer, subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const { data: row } = await admin
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", subscription.customer)
          .maybeSingle();
        if (row?.user_id) {
          await admin
            .from("subscriptions")
            .update({ status: "canceled", updated_at: new Date().toISOString() })
            .eq("user_id", row.user_id);
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
