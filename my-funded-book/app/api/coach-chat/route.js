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
  const host = (process.env.OLLAMA_HOST || "http://127.0.0.1:11434").replace(/\/$/, "");
  const response = await fetch(`${host}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: process.env.OLLAMA_MODEL || "qwen3:8b", stream: false, options: { temperature: 0.55, num_predict: 700 }, messages: [{ role: "system", content: `Tu es PRISM, un coach de trading. Reste bref, concret et n'offre jamais de conseil financier ni de signal. Journal actuel: ${list.length} trades, P&L ${net}$, ${totalR}R.` }, ...history, { role: "user", content: message }] }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return NextResponse.json({ error: "ollama_unavailable" }, { status: 503 });
  return NextResponse.json({ reply: data?.message?.content || "Je n'ai pas pu répondre." });
}
