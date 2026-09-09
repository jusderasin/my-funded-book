import { NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase/server";
import { getSubscription, deleteSubscription } from "@/lib/subscriptions";
import { stopAccountBilling } from "@/lib/billing";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // Never interpret an unavailable billing database as "no subscription".
  try {
    await stopAccountBilling(await getSubscription(user.id));
  } catch (error) {
    console.error("Account billing shutdown failed:", error);
    return NextResponse.json({ error: "billing_shutdown_failed" }, { status: 503 });
  }

  const admin = createAdminSupabase();
  const orphanTables = ["bt_trades", "bt_sessions", "badge_unlocks"];
  for (const table of orphanTables) {
    const { error } = await admin.from(table).delete().eq("user_id", user.id);
    if (error) return NextResponse.json({ error: `cleanup_failed:${table}` }, { status: 500 });
  }

  // Stripe has confirmed cancellation. Remove the Neon mapping before auth:
  // failures here leave the user able to retry; late webhooks cannot recreate it.
  try {
    await deleteSubscription(user.id);
  } catch (error) {
    console.error("Billing cleanup failed:", error);
    return NextResponse.json({ error: "billing_cleanup_failed" }, { status: 503 });
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) return NextResponse.json({ error: "delete_user_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
