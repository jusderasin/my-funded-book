import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// PRISM — coach IA. Lit les trades de l'utilisateur (RLS : uniquement les siens),
// en fait un résumé chiffré, et demande au modèle Groq une réponse en clair.
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const MAX_TURNS = 12;

const num = (value) => Number(value) || 0;
const round = (value) => Math.round(value * 100) / 100;

function group(trades, keyOf) {
  const map = {};
  trades.forEach((trade) => {
    [].concat(keyOf(trade) ?? []).filter(Boolean).forEach((key) => {
      const row = (map[key] ||= { trades: 0, pnl: 0, wins: 0 });
      row.trades += 1;
      row.pnl += num(trade.pnl);
      if (num(trade.pnl) > 0) row.wins += 1;
    });
  });
  return Object.fromEntries(Object.entries(map)
    .sort((a, b) => b[1].trades - a[1].trades)
    .slice(0, 15)
    .map(([key, row]) => [key, { trades: row.trades, pnl: round(row.pnl), winRate: Math.round(row.wins / row.trades * 100) }]));
}

function summarize(trades) {
  const pnls = trades.map((trade) => num(trade.pnl));
  const wins = pnls.filter((pnl) => pnl > 0);
  const losses = pnls.filter((pnl) => pnl < 0);
  const weekday = (trade) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(`${trade.date}T12:00:00`).getDay()];
  const tags = (trade) => Array.isArray(trade.tags) ? trade.tags : String(trade.tags || "").split(",").map((tag) => tag.trim());
  return {
    totalTrades: trades.length,
    netPnl: round(pnls.reduce((a, b) => a + b, 0)),
    winRate: trades.length ? Math.round(wins.length / trades.length * 100) : 0,
    avgWin: wins.length ? round(wins.reduce((a, b) => a + b, 0) / wins.length) : 0,
    avgLoss: losses.length ? round(losses.reduce((a, b) => a + b, 0) / losses.length) : 0,
    biggestLoss: losses.length ? Math.min(...losses) : 0,
    firstDate: trades.at(-1)?.date, lastDate: trades[0]?.date,
    bySetup: group(trades, (trade) => trade.setup),
    bySession: group(trades, (trade) => trade.session),
    byDirection: group(trades, (trade) => trade.dir),
    bySymbol: group(trades, (trade) => trade.symbol),
    byWeekday: group(trades, weekday),
    byTag: group(trades, tags),
    byEmotion: group(trades, (trade) => trade.emotion),
    byGrade: group(trades, (trade) => trade.grade),
    planFollowed: group(trades, (trade) => trade.plan ? "followed plan" : "broke plan"),
    recentTrades: trades.slice(0, 40).map((trade) => ({
      date: trade.date, session: trade.session, symbol: trade.symbol, dir: trade.dir, setup: trade.setup,
      r: trade.r, pnl: trade.pnl, plan: trade.plan, emotion: trade.emotion, tags: trade.tags,
      notes: String(trade.notes || trade.note || "").slice(0, 140) || undefined,
    })),
  };
}

export async function POST(request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "PRISM n'est pas encore configuré (GROQ_API_KEY manquante)." }, { status: 503 });
  }
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Même règle que le paywall de l'app : seuls les abonnés actifs consomment le quota IA.
  const { data: sub } = await supabase.from("subscriptions").select("status, current_period_end").eq("user_id", user.id).maybeSingle();
  const active = sub && ["active", "trialing"].includes(sub.status) && (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
  if (!active) return NextResponse.json({ error: "subscription_required" }, { status: 402 });

  const body = await request.json().catch(() => ({}));
  const lang = body.lang === "en" ? "en" : "fr";
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((message) => ["user", "assistant"].includes(message?.role) && typeof message.content === "string")
    .slice(-MAX_TURNS)
    .map((message) => ({ role: message.role, content: message.content.slice(0, 2000) }));
  if (!messages.length || messages.at(-1).role !== "user") return NextResponse.json({ error: "empty" }, { status: 400 });

  const { data: trades, error } = await supabase.from("trades").select("*").order("date", { ascending: false }).limit(1500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const system = [
    "You are PRISM, the trading-journal coach inside MyTradeBook, for futures prop-firm traders.",
    `Answer in ${lang === "en" ? "English" : "French (tutoiement)"}. Be direct, concrete and short: max ~180 words, bullet points welcome.`,
    "Base every claim ONLY on the JSON data below; quote the numbers (trades, P&L, win rate). If the sample is too small (< 10 trades in a bucket), say so.",
    "Focus on process: where the trader loses money, which setups/sessions/days/emotions cost them, rule breaks, and one or two actionable rules to apply next session.",
    "Never give buy/sell signals, price predictions or personalised investment advice. You analyse past behaviour only.",
    "If there are no trades, explain how to log or import trades (CSV import in the Trades page).",
    `DATA: ${JSON.stringify(summarize(trades || []))}`,
  ].join("\n");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, temperature: 0.3, max_tokens: 700, messages: [{ role: "system", content: system }, ...messages] }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("PRISM groq error", response.status, detail.slice(0, 300));
    return NextResponse.json({ error: response.status === 429 ? "PRISM est très sollicité, réessaie dans une minute." : "PRISM est indisponible pour le moment." }, { status: 502 });
  }
  const json = await response.json();
  return NextResponse.json({ reply: json.choices?.[0]?.message?.content?.trim() || "…" });
}
