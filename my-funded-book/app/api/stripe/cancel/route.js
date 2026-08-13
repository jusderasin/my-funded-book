import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const admin = createAdminSupabase();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("stripe_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sub?.stripe_subscription_id)
    return NextResponse.json({ error: "no subscription" }, { status: 400 });

  const stripe = getStripe();

  // Annulation à la fin de la période en cours : l'accès reste actif jusqu'au bout,
  // et l'abonnement ne se renouvelle pas.
  const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  // On reflète l'état immédiatement en base (le webhook confirmera de son côté).
  await admin
    .from("subscriptions")
    .update({ cancel_at_period_end: true })
    .eq("user_id", user.id);

  return NextResponse.json({
    ok: true,
    cancel_at_period_end: updated.cancel_at_period_end,
  });
}
