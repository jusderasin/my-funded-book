import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSubscription, saveStripeCustomer } from "@/lib/subscriptions";
import { getStripe } from "@/lib/stripe";


const PRICES = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY,
  yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY,
};

export async function POST(req) {
  try {
    const stripe = getStripe();
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { plan } = await req.json();
    const price = PRICES[plan];

    if (!price) {
      return NextResponse.json({ error: `Prix non configuré pour le plan ${plan}` }, { status: 400 });
    }

    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "https://mytradebook-jusderasins-projects.vercel.app";
    const site = origin.replace(/\/$/, "");

    // Lecture dans Neon
    const subscription = await getSubscription(user.id);
    let customerId = subscription?.stripe_customer_id;

    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (customer.deleted) customerId = null;
      } catch (e) {
        // Do not create duplicate customers on network/authentication failures.
        if (e.code !== "resource_missing") throw e;
        customerId = null;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;

      // Insertion / Mise à jour dans Neon
      await saveStripeCustomer(user.id, customerId);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price, quantity: 1 }],
      mode: "subscription",
      allow_promotion_codes: true, // <--- Ajouté ici pour réactiver le champ code promo
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
