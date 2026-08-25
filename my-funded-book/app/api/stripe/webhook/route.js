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
    const existing = await sql`SELECT user_id FROM subscriptions WHERE stripe_customer_id = ${customerId} LIMIT 1`;
    const userId = existing?.[0]?.user_id || subscription?.metadata?.userId || subscription?.metadata?.supabase_user_id;
    
    if (!userId) {
      console.error("Aucun user_id trouvé pour Stripe Customer:", customerId);
      return;
    }

    const periodEndUnix =
      subscription?.items?.data?.[0]?.current_period_end ??
      subscription?.current_period_end ??
      null;

    const periodEndIso = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null;
    const priceId = subscription?.items?.data?.[0]?.price?.id || null;
    const nowIso = new Date().toISOString();
    
    // Récupération du statut Stripe et conversion automatique de "trialing" en "active"
    let subStatus = subscription?.status || "inactive";
    if (subStatus === "trialing") {
      subStatus = "active";
    }

    const subId = subscription?.id || null;

    const userRow = await sql`SELECT user_id FROM subscriptions WHERE user_id = ${userId} LIMIT 1`;

    if (userRow && userRow.length > 0) {
      await sql`
        UPDATE subscriptions
        SET 
          stripe_customer_id = ${customerId},
          stripe_subscription_id = ${subId},
          price_id = ${priceId},
          status = ${subStatus},
          current_period_end = ${periodEndIso},
          updated_at = ${nowIso}
        WHERE user_id = ${userId};
      `;
    } else {
      await sql`
        INSERT INTO subscriptions (
          user_id,
          stripe_customer_id,
          stripe_subscription_id,
          price_id,
          status,
          current_period_end,
          updated_at
        ) VALUES (
          ${userId},
          ${customerId},
          ${subId},
          ${priceId},
          ${subStatus},
          ${periodEndIso},
          ${nowIso}
        );
      `;
    }
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
        const nowIso = new Date().toISOString();
        await sql`
          UPDATE subscriptions 
          SET status = 'canceled', updated_at = ${nowIso} 
          WHERE stripe_customer_id = ${subscription.customer};
        `;
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Erreur Webhook:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
