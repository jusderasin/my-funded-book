import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

const PRICES = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY,
  yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY,
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
  if (!price) return NextResponse.json({ error: "invalid plan" }, { status: 400 });

  const site = process.env.NEXT_PUBLIC_SITE_URL;

  const admin = createAdminSupabase();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let customerId = sub?.stripe_customer_id;
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
  // Si ce client a déjà un abonnement en cours, on ne crée PAS un second checkout :
  // on le renvoie vers le portail pour gérer l'abonnement existant.
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
    subscription_data: { metadata: { supabase_user_id: user.id } },
  });

  return NextResponse.json({ url: session.url });
}
