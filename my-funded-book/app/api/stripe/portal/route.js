import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSubscription } from "@/lib/subscriptions";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const sub = await getSubscription(user.id);
    if (!sub?.stripe_customer_id) {
      return NextResponse.json({ error: "no customer" }, { status: 400 });
    }
    const site = process.env.NEXT_PUBLIC_SITE_URL;
    if (!site) throw new Error("NEXT_PUBLIC_SITE_URL is not configured.");
    const session = await getStripe().billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${site.replace(/\/$/, "")}/settings`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Billing portal failed:", error);
    return NextResponse.json({ error: "billing_portal_failed" }, { status: 503 });
  }
}
