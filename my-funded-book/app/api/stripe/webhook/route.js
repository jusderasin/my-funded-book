import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createAdminSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Source de vérité unique du statut d'abonnement : table Supabase `subscriptions`,
// écrite uniquement ici via la clé service_role.
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

  async function resolveUserId(customerId, subscription) {
    const { data } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    return data?.user_id || subscription?.metadata?.userId || null;
  }

  async function syncSubscription(customerId, subscription) {
    const userId = await resolveUserId(customerId, subscription);
    if (!userId) {
      console.error("Webhook: aucun user_id pour le customer", customerId);
      return;
    }
    const item = subscription?.items?.data?.[0];
    const periodEnd = item?.current_period_end ?? subscription?.current_period_end ?? null;

    const { error } = await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription?.id || null,
        price_id: item?.price?.id || null,
        status: subscription?.status || "inactive",
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        cancel_at_period_end: subscription?.cancel_at_period_end === true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) throw error;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await syncSubscription(session.customer, subscription);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await syncSubscription(subscription.customer, subscription);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Erreur webhook:", err);
    return NextResponse.json({ error: "webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
