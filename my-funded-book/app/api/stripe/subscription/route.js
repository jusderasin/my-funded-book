import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSubscription } from "@/lib/subscriptions";
import { getBillingSummary } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "unauthenticated" }, { status: 401, headers });
  try {
    const subscription = await getBillingSummary(await getSubscription(user.id));
    return NextResponse.json({ subscription }, { headers });
  } catch (error) {
    console.error("Subscription lookup failed:", error);
    return NextResponse.json({ error: "subscription_lookup_failed" }, { status: 503, headers });
  }
}
