// Calculs de la page Analyse avancée et du récap mensuel.
// Fonctions pures : trades bruts en entrée, séries prêtes à dessiner en sortie.

import { chrono, durationMin, entryHour, heatmap, rHistogram, weekday } from "@/lib/reports";

const num = (v) => Number(v) || 0;
const pnlOf = (t) => (t?.outcome === "BE" ? 0 : num(t.pnl));
const rOf = (t) => (t?.outcome === "BE" ? 0 : num(t.r));

// Grille jour × heure pour la heatmap 3D (lundi → vendredi, + week-end s'il y a des trades).
export function heatGrid(trades) {
  const { cells, counted, minHour, maxHour } = heatmap(trades);
  const hasWeekend = Object.keys(cells).some((k) => Number(k.split("-")[0]) >= 5);
  const days = hasWeekend ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4];
  // Au moins 8 colonnes horaires autour des trades, sinon la scène 3D est écrasée.
  let lo = minHour; let hi = maxHour;
  while (hi - lo + 1 < 8) { if (lo > 0) lo -= 1; if (hi - lo + 1 < 8 && hi < 23) hi += 1; if (lo === 0 && hi === 23) break; }
  const hours = [];
  for (let h = lo; h <= hi; h++) hours.push(h);
  const maxAbs = Math.max(1, ...Object.values(cells).map((c) => Math.abs(c.pnl)));
  return { cells, counted, days, hours, maxAbs };
}

// Chaque trade en barre signée + équité cumulée par-dessus (vue « delta »).
export function tradeDelta(trades) {
  let cum = 0;
  return chrono(trades).map((t) => {
    cum += pnlOf(t);
    return { id: t.id, date: t.date, symbol: t.symbol, pnl: pnlOf(t), r: rOf(t), cum };
  });
}

// Distribution des R avec espérance, médiane et écart-type.
export function rDistribution(trades) {
  const rs = (trades || []).filter((t) => t.r != null && t.r !== "").map(rOf);
  const n = rs.length;
  const mean = n ? rs.reduce((a, b) => a + b, 0) / n : 0;
  const sorted = rs.slice().sort((a, b) => a - b);
  const median = n ? (n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2) : 0;
  const sd = n > 1 ? Math.sqrt(rs.reduce((s, r) => s + (r - mean) ** 2, 0) / (n - 1)) : 0;
  return { bins: rHistogram(trades), n, mean, median, sd };
}

// Équité et drawdown sous le plus haut, avec une limite optionnelle (max drawdown du compte).
export function drawdownCurve(trades, startBalance = 0) {
  let eq = startBalance;
  let peak = startBalance;
  let maxDD = 0;
  const points = [{ date: "", eq, dd: 0 }];
  chrono(trades).forEach((t) => {
    eq += pnlOf(t);
    peak = Math.max(peak, eq);
    maxDD = Math.max(maxDD, peak - eq);
    points.push({ date: t.date, eq, dd: eq - peak });
  });
  return { points, maxDD };
}

// Durée de détention contre R obtenu (nuage de points).
export function durationScatter(trades) {
  return (trades || [])
    .map((t) => ({ id: t.id, min: durationMin(t), r: rOf(t), pnl: pnlOf(t), symbol: t.symbol, date: t.date }))
    .filter((p) => p.min != null);
}

// Session × direction : P&L et win rate, pour les cartes de synthèse.
export function bestWindow(trades) {
  const grid = {};
  (trades || []).forEach((t) => {
    const h = entryHour(t); const d = weekday(t);
    if (h == null || d == null) return;
    const key = `${d}-${h}`;
    (grid[key] ||= { d, h, pnl: 0, n: 0 });
    grid[key].pnl += pnlOf(t);
    grid[key].n += 1;
  });
  const rows = Object.values(grid).filter((c) => c.n >= 2);
  if (!rows.length) return { best: null, worst: null };
  rows.sort((a, b) => b.pnl - a.pnl);
  return { best: rows[0], worst: rows[rows.length - 1].pnl < 0 ? rows[rows.length - 1] : null };
}

// Mois disponibles (AAAA-MM), du plus récent au plus ancien.
export function monthsOf(trades) {
  return [...new Set((trades || []).map((t) => String(t.date || "").slice(0, 7)).filter((m) => /^\d{4}-\d{2}$/.test(m)))].sort().reverse();
}

// Récap mensuel façon « Wrapped ».
export function monthlyRecap(trades, month) {
  const list = chrono((trades || []).filter((t) => String(t.date || "").startsWith(month)));
  if (!list.length) return null;
  const net = list.reduce((s, t) => s + pnlOf(t), 0);
  const wins = list.filter((t) => pnlOf(t) > 0);
  const best = list.reduce((a, t) => (pnlOf(t) > pnlOf(a) ? t : a), list[0]);
  const worst = list.reduce((a, t) => (pnlOf(t) < pnlOf(a) ? t : a), list[0]);
  const byDay = {};
  list.forEach((t) => { byDay[t.date] = (byDay[t.date] || 0) + pnlOf(t); });
  const days = Object.keys(byDay).sort();
  const greenDays = days.filter((d) => byDay[d] > 0).length;
  const bestDay = days.reduce((a, d) => (byDay[d] > byDay[a] ? d : a), days[0]);
  const planned = list.filter((t) => t.plan).length;
  // Plus longue série de jours verts consécutifs (jours tradés).
  let run = 0; let bestRun = 0;
  days.forEach((d) => { run = byDay[d] > 0 ? run + 1 : 0; bestRun = Math.max(bestRun, run); });
  const setups = {};
  list.forEach((t) => { if (t.setup) setups[t.setup] = (setups[t.setup] || 0) + pnlOf(t); });
  const topSetup = Object.entries(setups).sort((a, b) => b[1] - a[1])[0] || null;
  return {
    month,
    count: list.length,
    net,
    totalR: list.reduce((s, t) => s + rOf(t), 0),
    winRate: (wins.length / list.length) * 100,
    best,
    worst,
    days: days.length,
    greenDays,
    bestDay: { date: bestDay, pnl: byDay[bestDay] },
    planPct: (planned / list.length) * 100,
    greenStreak: bestRun,
    topSetup: topSetup ? { name: topSetup[0], pnl: topSetup[1] } : null,
    byDay,
  };
}
