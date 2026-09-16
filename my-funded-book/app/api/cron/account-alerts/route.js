import { NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminSupabase } from "@/lib/supabase/server";
import { accountHealth } from "@/lib/accountHealth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "Push is not configured" }, { status: 503 });
  }

  const admin = createAdminSupabase();
  const [{ data: profiles }, { data: accounts }, { data: trades }, { data: certificates }, { data: subscriptions }] = await Promise.all([
    admin.from("profiles").select("id,notification_settings"),
    admin.from("accounts").select("*"),
    admin.from("trades").select("*"),
    admin.from("certificates").select("*"),
    admin.from("push_subscriptions").select("user_id,endpoint,p256dh,auth"),
  ]);
  webpush.setVapidDetails("mailto:support@mytradebook.app", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

  let sent = 0;
  for (const profile of profiles || []) {
    const preferences = { risk: true, payout: true, ...(profile.notification_settings || {}) };
    const userAccounts = (accounts || []).filter((account) => account.user_id === profile.id);
    const userTrades = (trades || []).filter((trade) => trade.user_id === profile.id);
    const messages = userAccounts.flatMap((account) => {
      const health = accountHealth(account, userTrades, certificates || [], "fr");
      const isFunded = account.type === "funded" || account.status === "funded" || account.status === "passed";
      const alerts = [];
      if (preferences.payout && isFunded && health.payoutEligible) alerts.push(`Payout disponible · ${account.firm}`);
      if (preferences.payout && !isFunded && health.targetReached && !health.breached) alerts.push(`Compte validé · ${account.firm}`);
      if (preferences.risk) alerts.push(...health.alerts.filter((alert) => alert.level === "danger" || alert.level === "warn").map((alert) => `${account.firm} · ${alert.msg}`));
      return alerts;
    }).slice(0, 2);
    if (!messages.length) continue;
    const payload = JSON.stringify({ title: "MyTradeBook · alerte compte", body: messages.join("\n"), url: "/accounts", tag: `account-alerts-${profile.id}` });
    const userSubscriptions = (subscriptions || []).filter((subscription) => subscription.user_id === profile.id);
    const results = await Promise.allSettled(userSubscriptions.map((subscription) => webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload)));
    sent += results.filter((result) => result.status === "fulfilled").length;
  }
  return NextResponse.json({ ok: true, sent });
}
