import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRICES = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY,
  yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY,
};

export async function POST(req) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { plan } = await req.json();
    const price = PRICES[plan];
    if (!price) {
      return NextResponse.json({ error: `Prix non configuré pour le plan ${plan}` }, { status: 400 });
    }

    const stripe = getStripe();
    const admin = createAdminSupabase();
    const site = (process.env.NEXT_PUBLIC_SITE_URL || req.headers.get("origin") || "").replace(/\/$/, "");

    const { data: sub } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    let customerId = sub?.stripe_customer_id || null;

    if (customerId) {
      try {
        const c = await stripe.customers.retrieve(customerId);
        if (c.deleted) customerId = null;
      } catch {
        customerId = null;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      const { error } = await admin
        .from("subscriptions")
        .upsert(
          { user_id: user.id, stripe_customer_id: customerId, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      if (error) throw error;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      mode: "subscription",
      allow_promotion_codes: true,
      client_reference_id: user.id,
      success_url: `${site}/dashboard?checkout=success`,
      cancel_url: `${site}/pricing?checkout=cancel`,
      subscription_data: {
        trial_period_days: 14,
        metadata: { userId: user.id },
      },
      metadata: { userId: user.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: "Impossible de créer la session de paiement." }, { status: 500 });
  }
}
