import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

const PRICES = {
  monthly: process.env.STRIPE_PRICE_MONTHLY || process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY,
  yearly: process.env.STRIPE_PRICE_YEARLY || process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY,
};

export async function POST(req) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const stripe = getStripe();
  const { plan } = await req.json();
  const price = PRICES[plan];

  if (!price) {
    console.error("ID de prix Stripe introuvable pour le plan :", plan);
    return NextResponse.json({ error: `Prix non configuré pour le plan ${plan}` }, { status: 400 });
  }

  // --- Correction de l'URL du site ---
  const origin =
    req.headers.get("origin") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://mytradebook-jusderasins-projects.vercel.app";
  const site = origin.replace(/\/$/, "");

  const admin = createAdminSupabase();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let customerId = sub?.stripe_customer_id;

  // Si on a un customerId, vérifions qu'il existe bien et n'est pas supprimé
  if (customerId) {
    try {
      const res = await stripe.customers.retrieve(customerId);
      if (res.deleted) customerId = null;
    } catch (err) {
      customerId = null;
    }
  }

  // Création d'un nouveau client si inexistant ou supprimé
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await admin
      .from("subscriptions")
      .upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: "user_id" });
  }

  // --- Garde-fou anti-doublon ---
  const existing = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });
  const hasActive = existing.data.some((s) =>
    ["active", "trialing", "past_due", "unpaid"].includes(s.status)
  );
  if (hasActive) {
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${site}/dashboard`,
    });
    return NextResponse.json({ url: portal.url, already_subscribed: true });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${site}/dashboard?checkout=success`,
    cancel_url: `${site}/pricing?checkout=cancel`,
    metadata: { supabase_user_id: user.id },
    subscription_data: { 
      trial_period_days: 14,
      metadata: { supabase_user_id: user.id } 
    },
  });

  return NextResponse.json({ url: session.url });
}
