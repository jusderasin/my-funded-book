import { NextResponse } from "next/server";
import Stripe from "stripe";
import { sql } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `Webhook signature invalide: ${err.message}` }, { status: 400 });
  }

  async function syncByCustomer(customerId, subscription) {
    // 1. Chercher l'user_id dans Neon via stripe_customer_id
    const rows = await sql`SELECT user_id FROM subscriptions WHERE stripe_customer_id = ${customerId} LIMIT 1`;
    
    // 2. Si pas trouvé par le customerId, fallback sur la metadata
    const userId = rows[0]?.user_id || subscription?.metadata?.userId || subscription?.metadata?.supabase_user_id;
    if (!userId) return;

    const periodEndUnix =
      subscription?.items?.data?.[0]?.current_period_end ??
      subscription?.current_period_end ??
      null;

    const periodEndIso = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null;
    const priceId = subscription?.items?.data?.[0]?.price?.id || null;
    const cancelAtPeriodEnd = subscription?.cancel_at_period_end ?? false;

    // 3. Mise à jour / Insertion dans Neon
    await sql`
      INSERT INTO subscriptions (
        user_id,
        stripe_customer_id,
        stripe_subscription_id,
        price_id,
        status,
        current_period_end,
        cancel_at_period_end,
        updated_at
      ) VALUES (
        ${userId},
        ${customerId},
        ${subscription?.id || null},
        ${priceId},
        ${subscription?.status || "inactive"},
        ${periodEndIso},
        ${cancelAtPeriodEnd},
        NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        stripe_customer_id = EXCLUDED.stripe_customer_id,
        stripe_subscription_id = EXCLUDED.stripe_subscription_id,
        price_id = EXCLUDED.price_id,
        status = EXCLUDED.status,
        current_period_end = EXCLUDED.current_period_end,
        cancel_at_period_end = EXCLUDED.cancel_at_period_end,
        updated_at = NOW();
    `;
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
        await sql`
          UPDATE subscriptions 
          SET status = 'canceled', updated_at = NOW() 
          WHERE stripe_customer_id = ${subscription.customer};
        `;
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
