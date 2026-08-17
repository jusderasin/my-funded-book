import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const admin = createAdminSupabase();

  // 1) Couper la facturation : annuler un éventuel abonnement Stripe encore actif.
  try {
    const { data: sub } = await admin
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (sub?.stripe_subscription_id) {
      const stripe = getStripe();
      try {
        await stripe.subscriptions.cancel(sub.stripe_subscription_id);
      } catch (e) {
        // Déjà annulé côté Stripe -> on continue. Sinon on stoppe pour éviter une facturation fantôme.
        if (e?.code !== "resource_missing") {
          return NextResponse.json({ error: "stripe_cancel_failed" }, { status: 500 });
        }
      }
    }
  } catch (e) {
    return NextResponse.json({ error: "subscription_lookup_failed" }, { status: 500 });
  }

  // 2) Nettoyer les tables NON couvertes par la cascade auth.users.
  const orphanTables = ["bt_trades", "bt_sessions", "badge_unlocks"];
  for (const table of orphanTables) {
    const { error } = await admin.from(table).delete().eq("user_id", user.id);
    if (error) {
      return NextResponse.json({ error: `cleanup_failed:${table}` }, { status: 500 });
    }
  }

  // 3) Supprimer le compte auth -> cascade sur profiles, trades, accounts,
  //    subscriptions, certificates, expenses, playbooks, reviews.
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    return NextResponse.json({ error: "delete_user_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
