import { NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminSupabase } from "@/lib/supabase/server";
import { weeklyReport, reportWeek } from "@/lib/weeklyReport";

export const dynamic = "force-dynamic";

// Dimanche soir : notification push « ton rapport hebdo est prêt » avec les
// chiffres clés de la semaine. Le rapport complet est calculé dans l'app.
export async function GET(request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "Push is not configured" }, { status: 503 });
  }

  const admin = createAdminSupabase();
  const { data: subscriptions } = await admin.from("push_subscriptions").select("user_id,endpoint,p256dh,auth");
  const userIds = [...new Set((subscriptions || []).map((subscription) => subscription.user_id))];
  if (!userIds.length) return NextResponse.json({ ok: true, sent: 0 });

  // Uniquement les trades de la semaine écoulée (et la précédente pour la comparaison).
  const week = reportWeek(new Date());
  const [y, m, d] = week.start.split("-").map(Number);
  const from = new Date(y, m - 1, d - 7);
  const fromIso = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-${String(from.getDate()).padStart(2, "0")}`;
  const { data: trades } = await admin.from("trades").select("user_id,date,pnl,r,setup,session,tags,plan").in("user_id", userIds).gte("date", fromIso);

  webpush.setVapidDetails("mailto:support@mytradebook.app", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  let sent = 0;
  for (const userId of userIds) {
    const report = weeklyReport((trades || []).filter((trade) => trade.user_id === userId), new Date(), "fr");
    if (!report.count) continue;
    const money = `${report.net >= 0 ? "+" : "-"}$${Math.abs(Math.round(report.net))}`;
    const body = [
      `${report.count} trades · ${money} · WR ${report.winRate}%`,
      report.bestSetup ? `Top setup : ${report.bestSetup.key}` : null,
      report.rule ? `Règle : ${report.rule}` : null,
    ].filter(Boolean).join("\n");
    const payload = JSON.stringify({ title: "PRISM · ton rapport hebdo est prêt", body, url: "/dashboard", tag: `weekly-${userId}-${week.end}` });
    const targets = (subscriptions || []).filter((subscription) => subscription.user_id === userId);
    const results = await Promise.allSettled(targets.map((subscription) => webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload)));
    sent += results.filter((result) => result.status === "fulfilled").length;
  }
  return NextResponse.json({ ok: true, sent });
}
