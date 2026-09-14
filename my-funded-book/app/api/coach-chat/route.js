import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
export const runtime = "nodejs";
const clean = (value) => String(value || "").trim().slice(0, 2000);
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const message = clean(body.message);
  if (!message) return NextResponse.json({ error: "missing_message" }, { status: 400 });
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { data: trades } = await supabase.from("trades").select("pnl,r").eq("user_id", user.id).limit(100);
  const list = trades || [];
  const net = list.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0);
  const totalR = list.reduce((sum, trade) => sum + Number(trade.r || 0), 0);
  const history = Array.isArray(body.history) ? body.history.slice(-8).map((item) => ({ role: item?.role === "assistant" ? "assistant" : "user", content: clean(item?.content) })).filter((item) => item.content) : [];
  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "missing_groq_key" }, { status: 503 });
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` }, body: JSON.stringify({ model: "openai/gpt-oss-120b", max_tokens: 500, temperature: 0.55, messages: [{ role: "system", content: `Tu t'appelles PRISM. Tu es le coach intégré de MyTradeBook. Reste bref, concret et n'offre jamais de conseil financier ni de signal. Journal actuel: ${list.length} trades, P&L ${net}$, ${totalR}R. Réponds en français, avec au maximum 2 titres courts en gras et 3 puces par titre. Utilise uniquement des retours à la ligne et des puces "- ". N'utilise jamais de tableau Markdown, de caractère "|", ni de long paragraphe.` }, ...history, { role: "user", content: message }] }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return NextResponse.json({ error: data?.error?.message || "coach_unavailable" }, { status: response.status });
  return NextResponse.json({ reply: data?.choices?.[0]?.message?.content || "Je n'ai pas pu répondre." });
}
