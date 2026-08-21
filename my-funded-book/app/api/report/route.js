import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

function fromDate(period) {
  const d = new Date();
  if (period === "week") d.setDate(d.getDate() - 7);
  else if (period === "month") d.setMonth(d.getMonth() - 1);
  else if (period === "year") d.setFullYear(d.getFullYear() - 1);
  else return null; // "all" -> tout l'historique
  return d.toISOString().slice(0, 10);
}

function calcStats(trades) {
  const num = (v) => Number(v) || 0;
  const wins = trades.filter((t) => num(t.pnl) > 0);
  const losses = trades.filter((t) => num(t.pnl) < 0);
  const bes = trades.filter((t) => num(t.pnl) === 0);
  const total = trades.length;
  const wr = total ? ((wins.length / total) * 100).toFixed(1) : "0";
  const sumR = trades.reduce((s, t) => s + num(t.r), 0);
  const winR = wins.reduce((s, t) => s + num(t.r), 0);
  const lossR = Math.abs(losses.reduce((s, t) => s + num(t.r), 0));
  const pf = lossR > 0 ? (winR / lossR).toFixed(2) : wins.length ? "∞" : "0.0";
  const totalPnl = trades.reduce((s, t) => s + num(t.pnl), 0);
  const exp = total ? (sumR / total).toFixed(2) : "0";

  let peak = 0, cum = 0, maxDd = 0;
  [...trades]
    .sort((a, b) => (a.date + (a.created_at || "")).localeCompare(b.date + (b.created_at || "")))
    .forEach((t) => { cum += num(t.r); if (cum > peak) peak = cum; const dd = peak - cum; if (dd > maxDd) maxDd = dd; });

  const byDay = {};
  trades.forEach((t) => { byDay[t.date] = (byDay[t.date] || 0) + num(t.pnl); });
  const greenDays = Object.values(byDay).filter((v) => v > 0).length;
  const redDays = Object.values(byDay).filter((v) => v < 0).length;

  return {
    total, wins: wins.length, losses: losses.length, bes: bes.length,
    wr, pf, totalR: sumR.toFixed(1), totalPnl: totalPnl.toFixed(0),
    exp, maxDd: maxDd.toFixed(1), greenDays, redDays,
  };
}

export async function POST(req) {
  const { period = "month" } = await req.json().catch(() => ({}));
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const key = process.env.GROQ_API_KEY;
  if (!key) return NextResponse.json({ error: "missing_groq_key" }, { status: 500 });

  // Trades de la période (RLS : l'utilisateur ne lit que les siens)
  const from = fromDate(period);
  let q = supabase.from("trades").select("*").eq("user_id", user.id).order("date");
  if (from) q = q.gte("date", from);
  const { data: trades, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!trades || trades.length === 0) return NextResponse.json({ error: "no_trades" }, { status: 400 });

  const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
  const name = profile?.name || "Trader";
  const stats = calcStats(trades);
  const num = (v) => Number(v) || 0;

  // Agrégats
  const bySession = {}, bySetup = {}, tagCounts = {};
  trades.forEach((t) => {
    const sess = t.session || "N/A";
    if (!bySession[sess]) bySession[sess] = { wins: 0, losses: 0, r: 0, total: 0 };
    bySession[sess].total++; bySession[sess].r += num(t.r);
    if (num(t.pnl) > 0) bySession[sess].wins++; else if (num(t.pnl) < 0) bySession[sess].losses++;

    const st = t.setup || "Sans setup";
    if (!bySetup[st]) bySetup[st] = { wins: 0, total: 0, r: 0 };
    bySetup[st].total++; bySetup[st].r += num(t.r);
    if (num(t.pnl) > 0) bySetup[st].wins++;

    (Array.isArray(t.tags) ? t.tags : []).forEach((tag) => { tagCounts[tag] = (tagCounts[tag] || 0) + 1; });
  });

  const offPlan = trades.filter((t) => t.plan === false);
  let maxLossStreak = 0, cur = 0;
  [...trades]
    .sort((a, b) => (a.date + (a.created_at || "")).localeCompare(b.date + (b.created_at || "")))
    .forEach((t) => { if (num(t.pnl) < 0) { cur++; maxLossStreak = Math.max(maxLossStreak, cur); } else cur = 0; });

  const periodLabel = period === "week" ? "les 7 derniers jours"
    : period === "month" ? "le dernier mois"
    : period === "year" ? "la dernière année" : "tout l'historique";

  const prompt = `Tu es un coach de trading professionnel expert. Voici les données du trader ${name} sur ${periodLabel}.

# PROFIL
- Instrument principal : MNQ/NQ (Futures)

# STATISTIQUES CLÉS
- Total trades : ${stats.total} (${stats.wins}W · ${stats.losses}L · ${stats.bes}BE)
- Win Rate : ${stats.wr}%
- Profit Factor : ${stats.pf}
- Total R : ${stats.totalR}R
- PnL Total : $${stats.totalPnl}
- Max Drawdown : ${stats.maxDd}R
- Expectancy : ${stats.exp}R/trade
- Jours verts / rouges : ${stats.greenDays} / ${stats.redDays}
- Série max de pertes consécutives : ${maxLossStreak}
- Trades pris HORS PLAN : ${offPlan.length} / ${stats.total}

# PERFORMANCE PAR SESSION
${Object.entries(bySession).map(([s, d]) => `- ${s} : ${d.total} trades, ${d.total > 0 ? Math.round((d.wins / d.total) * 100) : 0}% WR, ${d.r >= 0 ? "+" : ""}${d.r.toFixed(1)}R`).join("\n") || "- Non renseigné"}

# PERFORMANCE PAR SETUP
${Object.entries(bySetup).map(([s, d]) => `- ${s} : ${d.total} trades, ${d.total > 0 ? Math.round((d.wins / d.total) * 100) : 0}% WR, ${d.r >= 0 ? "+" : ""}${d.r.toFixed(1)}R`).join("\n") || "- Aucun setup renseigné"}

# TAGS LES PLUS FRÉQUENTS
${Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag, c]) => `- ${tag} : ${c} fois`).join("\n") || "- Aucun tag"}

---

Génère un rapport d'analyse de trading COMPLET, PROFESSIONNEL et PERSONNALISÉ en français pour ${name}. Structure ton rapport avec ces sections :

1. RÉSUMÉ EXÉCUTIF (3-4 phrases percutantes)
2. POINTS FORTS (ce qui marche, avec chiffres précis)
3. POINTS D'AMÉLIORATION (problèmes identifiés avec exemples chiffrés)
4. ANALYSE PAR SESSION (meilleures/pires sessions avec recommandations)
5. ANALYSE PAR SETUP (quel setup performe, lequel éviter)
6. DISCIPLINE (respect du plan : ${offPlan.length} trades hors-plan — impact et correctifs)
7. RECOMMANDATIONS CONCRÈTES (3-5 actions à mettre en place immédiatement)
8. OBJECTIF POUR LA PROCHAINE PÉRIODE

Sois direct, honnête, chiffré. Tu parles directement à ${name}. N'invente aucune donnée : base-toi uniquement sur les chiffres fournis.`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4000,
      temperature: 0.7,
    }),
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data?.error?.message || "groq_error" }, { status: 500 });

  const report = data.choices?.[0]?.message?.content || "";
  return NextResponse.json({ ok: true, report, stats, period, n_trades: trades.length });
}
