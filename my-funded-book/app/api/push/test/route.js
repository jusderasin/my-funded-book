import { NextResponse } from "next/server";
import webpush from "web-push";
import { createServerSupabase } from "@/lib/supabase/server";

function configured() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY;
}

export async function POST() {
  if (!configured()) return NextResponse.json({ error: "Les clés push Vercel ne sont pas encore configurées." }, { status: 503 });
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const { data: subscriptions, error } = await supabase.from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!subscriptions?.length) return NextResponse.json({ error: "Aucun téléphone n'est activé." }, { status: 400 });
  webpush.setVapidDetails("mailto:support@mytradebook.app", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const payload = JSON.stringify({ title: "MyTradeBook", body: "Notifications téléphone activées. Ton journal reste sous contrôle.", url: "/dashboard", tag: "push-test" });
  const results = await Promise.allSettled(subscriptions.map((item) => webpush.sendNotification({ endpoint: item.endpoint, keys: { p256dh: item.p256dh, auth: item.auth } }, payload)));
  const sent = results.filter((result) => result.status === "fulfilled").length;
  if (!sent) return NextResponse.json({ error: "Aucune notification n'a pu être envoyée." }, { status: 502 });
  return NextResponse.json({ ok: true, sent });
}
