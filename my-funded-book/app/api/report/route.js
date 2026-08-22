import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

function fromDate(period) {
  const d = new Date();
  if (period === "week") d.setDate(d.getDate() - 7);
  else if (period === "month") d.setMonth(d.getMonth() - 1);
  else if (period === "year") d.setFullYear(d.getFullYear() - 1);
  else return null;
  return d.toISOString().slice(0, 10);
}

const num = (v) => Number(v) || 0;

function calcStats(trades) {
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

  const from = fromDate(period);
  let q = supabase.from("trades").select("*").eq("user_id", user.id).order("date");
  if (from) q = q.gte("date", from);
  const { data: trades, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!trades || trades.length === 0) return NextResponse.json({ error: "no_trades" }, { status: 400 });

  const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
  const name = profile?.name || "Trader";
  const stats = calcStats(trades);

  // --- Agrégats pour les graphiques ---
  const sessAgg = {}, setupAgg = {}, tagCounts = {};
  const outcomes = { TP: 0, SL: 0, BE: 0, none: 0 };
  trades.forEach((t) => {
    const sess = t.session || "N/A";
    if (!sessAgg[sess]) sessAgg[sess] = { session: sess, total: 0, wins: 0, r: 0 };
    sessAgg[sess].total++; sessAgg[sess].r += num(t.r);
    if (num(t.pnl) > 0) sessAgg[sess].wins++;

    const st = t.setup || "Sans setup";
    if (!setupAgg[st]) setupAgg[st] = { setup: st, total: 0, wins: 0, r: 0 };
    setupAgg[st].total++; setupAgg[st].r += num(t.r);
    if (num(t.pnl) > 0) setupAgg[st].wins++;

    (Array.isArray(t.tags) ? t.tags : []).forEach((tag) => { tagCounts[tag] = (tagCounts[tag] || 0) + 1; });

    if (t.outcome === "TP") outcomes.TP++;
    else if (t.outcome === "SL") outcomes.SL++;
    else if (t.outcome === "BE") outcomes.BE++;
    else outcomes.none++;
  });

  const round1 = (n) => Math.round(n * 10) / 10;
  const bySession = Object.values(sessAgg).map((d) => ({ ...d, r: round1(d.r), wr: d.total ? Math.round((d.wins / d.total) * 100) : 0 }));
  const bySetup = Object.values(setupAgg).map((d) => ({ ...d, r: round1(d.r), wr: d.total ? Math.round((d.wins / d.total) * 100) : 0 }));

  let cum = 0;
  const cumulative = [...trades]
    .sort((a, b) => (a.date + (a.created_at || "")).localeCompare(b.date + (b.created_at || "")))
    .map((t) => { cum += num(t.r); return { date: t.date, cumR: round1(cum) }; });

  const offPlan = trades.filter((t) => t.plan === false);
  let maxLossStreak = 0, cur = 0;
  [...trades]
    .sort((a, b) => (a.date + (a.created_at || "")).localeCompare(b.date + (b.created_at || "")))
    .forEach((t) => { if (num(t.pnl) < 0) { cur++; maxLossStreak = Math.max(maxLossStreak, cur); } else cur = 0; });

  const periodLabel = period === "week" ? "les 7 derniers jours"
    : period === "month" ? "le dernier mois"
    : period === "year" ? "la dernière année" : "tout l'historique";

  const prompt = `Tu es un coach de trading professionnel de très haut niveau. Analyse en profondeur les données du trader ${name} sur ${periodLabel}.

# STATISTIQUES
- Total : ${stats.total} trades (${stats.wins}W · ${stats.losses}L · ${stats.bes}BE)
- Win Rate : ${stats.wr}% · Profit Factor : ${stats.pf} · Expectancy : ${stats.exp}R/trade
- Total R : ${stats.totalR}R · PnL : $${stats.totalPnl} · Max Drawdown : ${stats.maxDd}R
- Jours verts/rouges : ${stats.greenDays}/${stats.redDays} · Pire série de pertes : ${maxLossStreak}
- Trades HORS PLAN : ${offPlan.length}/${stats.total}
- Sorties : ${outcomes.TP} en TP (take profit), ${outcomes.SL} en SL (stop loss), ${outcomes.BE} en break-even, ${outcomes.none} non renseignées

# PAR SESSION
${bySession.map((d) => `- ${d.session} : ${d.total} trades, ${d.wr}% WR, ${d.r >= 0 ? "+" : ""}${d.r}R`).join("\n")}

# PAR SETUP
${bySetup.map((d) => `- ${d.setup} : ${d.total} trades, ${d.wr}% WR, ${d.r >= 0 ? "+" : ""}${d.r}R`).join("\n")}

# TAGS (comportement)
${Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).map(([tag, c]) => `- ${tag} : ${c} fois`).join("\n") || "- Aucun tag"}

---

Rédige un rapport d'analyse COMPLET, PRO et PERSONNALISÉ en français pour ${name}, avec ces sections :

1. RÉSUMÉ EXÉCUTIF (3-4 phrases percutantes)
2. POINTS FORTS (chiffrés)
3. POINTS D'AMÉLIORATION (chiffrés, avec l'impact)
4. ANALYSE PAR SESSION (meilleures/pires + recos)
5. ANALYSE PAR SETUP (lequel garder, lequel couper)
6. GESTION DES SORTIES (interprète le ratio TP/SL/BE : sors-tu trop tôt ? laisses-tu courir ?)
7. ANALYSE COMPORTEMENTALE (exploite les tags : FOMO, revenge, oversized… quel schéma se répète et comment le corriger)
8. DISCIPLINE (respect du plan : ${offPlan.length} hors-plan)
9. PLAN D'ACTION (3-5 actions concrètes, priorisées)
10. OBJECTIF CHIFFRÉ pour la prochaine période

Règles : direct, honnête, chiffré. Tu parles à ${name}. N'invente aucune donnée. Utilise du gras (**...**) pour les chiffres clés. Pas de tableaux markdown, uniquement des listes à puces.`;

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
  return NextResponse.json({
    ok: true, report, stats, period, n_trades: trades.length,
    bySession, bySetup, outcomes, cumulative,
  });
}
