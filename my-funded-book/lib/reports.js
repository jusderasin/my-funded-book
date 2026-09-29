// Calculs purs pour la page Rapports : aucune dépendance React, aucune donnée
// inventée. Toutes les fonctions prennent une liste de trades (lignes réelles
// de `public.trades`) et renvoient des nombres ou des tableaux.

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const sum = (arr) => arr.reduce((s, v) => s + v, 0);
const avg = (arr) => (arr.length ? sum(arr) / arr.length : 0);
const norm = (v) => String(v ?? "").trim().toLowerCase();

export const pnlOf = (t) => num(t.pnl);
export const rOf = (t) => (t.outcome === "BE" ? 0 : num(t.r));

// Tri chronologique (date puis heure d'entrée puis création).
export function chrono(trades) {
  return [...(trades || [])].sort((a, b) =>
    String(a.date || "").localeCompare(String(b.date || "")) ||
    String(a.execution?.entry_time || "").localeCompare(String(b.execution?.entry_time || "")) ||
    String(a.created_at || "").localeCompare(String(b.created_at || ""))
  );
}

// Résultat d'un trade : "win" | "loss" | "be" (seuil BE du profil en $).
export function resultOf(t, beThreshold = 0) {
  if (t.outcome === "BE") return "be";
  const p = pnlOf(t);
  if (Math.abs(p) <= beThreshold) return "be";
  return p > 0 ? "win" : "loss";
}

/* ------------------------------------------------------------------ */
/*  Période & filtres                                                   */
/* ------------------------------------------------------------------ */

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Bornes [from, to] (YYYY-MM-DD, incluses) d'une période relative à `today`.
export function periodRange(period, today = new Date(), custom = {}) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (period === "week") {
    const day = (d.getDay() + 6) % 7; // lundi = 0
    const from = new Date(d); from.setDate(d.getDate() - day);
    return { from: iso(from), to: iso(d) };
  }
  if (period === "month") return { from: iso(new Date(d.getFullYear(), d.getMonth(), 1)), to: iso(d) };
  if (period === "quarter") return { from: iso(new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1)), to: iso(d) };
  if (period === "year") return { from: iso(new Date(d.getFullYear(), 0, 1)), to: iso(d) };
  if (period === "custom") return { from: custom.from || "", to: custom.to || "" };
  return { from: "", to: "" };
}

// Période précédente de même longueur (pour l'onglet Comparaison).
export function previousRange(period, today = new Date()) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (period === "week") {
    const day = (d.getDay() + 6) % 7;
    const end = new Date(d); end.setDate(d.getDate() - day - 1);
    const start = new Date(end); start.setDate(end.getDate() - 6);
    return { from: iso(start), to: iso(end) };
  }
  if (period === "quarter") {
    const q = Math.floor(d.getMonth() / 3) * 3;
    return { from: iso(new Date(d.getFullYear(), q - 3, 1)), to: iso(new Date(d.getFullYear(), q, 0)) };
  }
  if (period === "year") return { from: `${d.getFullYear() - 1}-01-01`, to: `${d.getFullYear() - 1}-12-31` };
  // mois par défaut
  return { from: iso(new Date(d.getFullYear(), d.getMonth() - 1, 1)), to: iso(new Date(d.getFullYear(), d.getMonth(), 0)) };
}

export function inRange(t, range) {
  if (!range) return true;
  if (range.from && String(t.date) < range.from) return false;
  if (range.to && String(t.date) > range.to) return false;
  return true;
}

// Filtres globaux ; comparaison insensible à la casse.
export function filterTrades(trades, filters = {}) {
  const { range, account, symbol, dir, setup, session, outcome } = filters;
  return (trades || []).filter((t) => {
    if (!inRange(t, range)) return false;
    if (account && t.account_id !== account) return false;
    if (symbol && norm(t.symbol) !== norm(symbol)) return false;
    if (dir && norm(t.dir) !== norm(dir)) return false;
    if (setup && norm(t.setup) !== norm(setup)) return false;
    if (session && norm(t.session) !== norm(session)) return false;
    if (outcome && t.outcome !== outcome) return false;
    return true;
  });
}

// Valeurs distinctes d'un champ (pour remplir les listes déroulantes).
export function distinct(trades, key) {
  const seen = new Map();
  (trades || []).forEach((t) => {
    const v = String(t[key] ?? "").trim();
    if (v && !seen.has(v.toLowerCase())) seen.set(v.toLowerCase(), v);
  });
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

/* ------------------------------------------------------------------ */
/*  KPI                                                                 */
/* ------------------------------------------------------------------ */

export function dailyPnL(trades) {
  const out = {};
  (trades || []).forEach((t) => {
    if (!t.date) return;
    out[t.date] = (out[t.date] || 0) + pnlOf(t);
  });
  return out;
}

function streaks(results) {
  let bestWin = 0; let bestLoss = 0; let w = 0; let l = 0;
  results.forEach((r) => {
    if (r === "win") { w += 1; l = 0; } else if (r === "loss") { l += 1; w = 0; } else { w = 0; l = 0; }
    bestWin = Math.max(bestWin, w); bestLoss = Math.max(bestLoss, l);
  });
  return { bestWin, bestLoss };
}

// Courbe d'equity et drawdown, trade par trade.
export function equitySeries(trades, startBalance = 0) {
  let eq = 0; let peak = 0; let maxDD = 0; let maxDDPct = 0;
  const points = chrono(trades).map((t) => {
    eq += pnlOf(t);
    peak = Math.max(peak, eq);
    const dd = peak - eq;
    maxDD = Math.max(maxDD, dd);
    const base = startBalance + peak;
    if (base > 0) maxDDPct = Math.max(maxDDPct, (dd / base) * 100);
    return { date: t.date, eq, dd: -dd };
  });
  return { points, maxDD, maxDDPct };
}

export function kpis(trades, { beThreshold = 0, startBalance = 0 } = {}) {
  const list = chrono(trades);
  const pnl = list.map(pnlOf);
  const rs = list.map(rOf);
  const results = list.map((t) => resultOf(t, beThreshold));
  const wins = pnl.filter((_, i) => results[i] === "win");
  const losses = pnl.filter((_, i) => results[i] === "loss");
  const gp = sum(wins);
  const gl = Math.abs(sum(losses));
  const days = Object.values(dailyPnL(list));
  const mean = avg(days);
  const std = Math.sqrt(avg(days.map((v) => (v - mean) ** 2)));
  const neg = days.filter((v) => v < 0);
  const downside = Math.sqrt(neg.length ? sum(neg.map((v) => v ** 2)) / days.length : 0);
  const { maxDD, maxDDPct } = equitySeries(list, startBalance);
  const { bestWin, bestLoss } = streaks(results);
  const decided = wins.length + losses.length;
  return {
    n: list.length,
    net: sum(pnl),
    rTotal: sum(rs),
    wins: wins.length,
    losses: losses.length,
    bes: results.filter((r) => r === "be").length,
    winRate: decided ? (wins.length / decided) * 100 : 0,
    profitFactor: gl ? gp / gl : gp ? Infinity : 0,
    expectancy: list.length ? sum(pnl) / list.length : 0,
    expectancyR: list.length ? sum(rs) / list.length : 0,
    avgWin: wins.length ? gp / wins.length : 0,
    avgLoss: losses.length ? gl / losses.length : 0,
    avgWinR: avg(rs.filter((_, i) => results[i] === "win")),
    avgLossR: avg(rs.filter((_, i) => results[i] === "loss")),
    best: pnl.length ? Math.max(...pnl) : 0,
    worst: pnl.length ? Math.min(...pnl) : 0,
    maxDD,
    maxDDPct,
    sharpe: days.length > 1 && std ? mean / std : null,
    sortino: days.length > 1 && downside ? mean / downside : null,
    days: days.length,
    greenDays: days.filter((v) => v > 0).length,
    redDays: days.filter((v) => v < 0).length,
    bestWinStreak: bestWin,
    bestLossStreak: bestLoss,
  };
}

// Statistiques compactes d'un groupe (tableaux par setup, session, etc.).
export function groupStats(trades, beThreshold = 0) {
  const k = kpis(trades, { beThreshold });
  const pnl = trades.map(pnlOf);
  return { n: k.n, winRate: k.winRate, profitFactor: k.profitFactor, expectancyR: k.expectancyR, rTotal: k.rTotal, net: k.net, best: pnl.length ? Math.max(...pnl) : 0, worst: pnl.length ? Math.min(...pnl) : 0 };
}

export function groupBy(trades, keyFn, beThreshold = 0) {
  const map = new Map();
  (trades || []).forEach((t) => {
    const keys = [].concat(keyFn(t)).filter((k) => k !== null && k !== undefined && k !== "");
    keys.forEach((k) => { if (!map.has(k)) map.set(k, []); map.get(k).push(t); });
  });
  return [...map.entries()].map(([key, list]) => ({ key, trades: list, ...groupStats(list, beThreshold) }));
}

/* ------------------------------------------------------------------ */
/*  Temps                                                               */
/* ------------------------------------------------------------------ */

const minutesOf = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || ""));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
export const entryHour = (t) => {
  const m = minutesOf(t.execution?.entry_time);
  return m == null ? null : Math.floor(m / 60);
};
// Jour de semaine : 0 = lundi … 6 = dimanche.
export const weekday = (t) => {
  if (!t.date) return null;
  const d = new Date(`${t.date}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : (d.getDay() + 6) % 7;
};

// Durée en minutes (entrée → sortie). Les trades swing (end_date) sont exclus.
export function durationMin(t) {
  const ex = t.execution || {};
  if (ex.end_date && ex.end_date !== t.date) return null;
  const a = minutesOf(ex.entry_time);
  const b = minutesOf(ex.exit_time);
  if (a == null || b == null || b < a) return null;
  return b - a;
}

export function heatmap(trades) {
  const cells = {};
  let counted = 0;
  (trades || []).forEach((t) => {
    const h = entryHour(t); const d = weekday(t);
    if (h == null || d == null) return;
    counted += 1;
    const key = `${d}-${h}`;
    if (!cells[key]) cells[key] = { pnl: 0, n: 0 };
    cells[key].pnl += pnlOf(t); cells[key].n += 1;
  });
  const hours = Object.keys(cells).map((k) => Number(k.split("-")[1]));
  return { cells, counted, minHour: hours.length ? Math.min(...hours) : 0, maxHour: hours.length ? Math.max(...hours) : 23 };
}

export const DURATION_BUCKETS = [
  { key: "<2", max: 2, fr: "< 2 min", en: "< 2 min" },
  { key: "2-5", max: 5, fr: "2–5 min", en: "2–5 min" },
  { key: "5-15", max: 15, fr: "5–15 min", en: "5–15 min" },
  { key: "15-30", max: 30, fr: "15–30 min", en: "15–30 min" },
  { key: "30-60", max: 60, fr: "30–60 min", en: "30–60 min" },
  { key: "60+", max: Infinity, fr: "> 1 h", en: "> 1 h" },
];
export const durationBucket = (t) => {
  const m = durationMin(t);
  if (m == null) return null;
  return DURATION_BUCKETS.find((b) => m < b.max)?.key ?? null;
};

/* ------------------------------------------------------------------ */
/*  Risque                                                              */
/* ------------------------------------------------------------------ */

// Histogramme des R par tranches de 0,5R (bornées à [-3 ; +5]).
export function rHistogram(trades) {
  const bins = [];
  for (let x = -3; x < 5; x += 0.5) bins.push({ from: x, to: x + 0.5, n: 0 });
  (trades || []).forEach((t) => {
    const r = Math.max(-3, Math.min(4.99, rOf(t)));
    const i = Math.floor((r + 3) / 0.5);
    if (bins[i]) bins[i].n += 1;
  });
  return bins;
}

// Profit prévu vs réalisé (trades gagnants ayant un profit prévu).
export function plannedVsRealized(trades) {
  const rows = (trades || [])
    .filter((t) => num(t.execution?.planned_profit) > 0 && pnlOf(t) > 0)
    .map((t) => ({ t, planned: num(t.execution.planned_profit), realized: pnlOf(t), eff: (pnlOf(t) / num(t.execution.planned_profit)) * 100 }));
  return { rows, efficiency: avg(rows.map((r) => r.eff)) };
}

// Périodes de drawdown sur la courbe journalière.
export function drawdownPeriods(trades) {
  const byDay = dailyPnL(trades);
  const dates = Object.keys(byDay).sort();
  let eq = 0; let peak = 0; let peakDate = null; let current = null;
  const periods = [];
  dates.forEach((d) => {
    eq += byDay[d];
    if (eq >= peak) {
      if (current) { current.recovered = d; periods.push(current); current = null; }
      peak = eq; peakDate = d;
    } else {
      if (!current) current = { start: peakDate || d, trough: d, depth: 0, recovered: null, days: 0 };
      if (peak - eq > current.depth) { current.depth = peak - eq; current.trough = d; }
      current.days += 1;
    }
  });
  if (current) periods.push(current);
  return periods.sort((a, b) => b.depth - a.depth);
}

// Probabilité de ruine (formule classique à gain/perte fixes) :
// P = ((1 - edge) / (1 + edge)) ^ unités, edge = WR·payoff - (1-WR) ramené à [−1 ; 1].
// `units` = nombre de pertes moyennes que le compte peut encaisser.
export function riskOfRuin(winRate, payoff, units) {
  const p = winRate / 100;
  if (!(units > 0) || !(payoff > 0) || p <= 0) return null;
  const edge = (p * (payoff + 1) - 1) / payoff;
  if (edge <= 0) return 100;
  if (edge >= 1) return 0;
  return Math.min(100, Math.pow((1 - edge) / (1 + edge), units) * 100);
}

/* ------------------------------------------------------------------ */
/*  Discipline                                                          */
/* ------------------------------------------------------------------ */

// Performance du trade suivant après N pertes consécutives (dans la journée).
export function afterLosses(trades, beThreshold = 0) {
  const out = { 1: [], 2: [], 3: [] };
  const byDay = new Map();
  chrono(trades).forEach((t) => { if (!byDay.has(t.date)) byDay.set(t.date, []); byDay.get(t.date).push(t); });
  byDay.forEach((list) => {
    let run = 0;
    list.forEach((t) => {
      if (run >= 1) out[Math.min(run, 3)].push(t);
      const r = resultOf(t, beThreshold);
      run = r === "loss" ? run + 1 : 0;
    });
  });
  return [1, 2, 3].map((k) => ({ key: k, trades: out[k], ...groupStats(out[k], beThreshold) }));
}

// Rang du trade dans sa journée (1er, 2e, 3e, 4e+).
export function tradeIndexInDay(trades) {
  const idx = new Map();
  const byDay = new Map();
  chrono(trades).forEach((t) => { if (!byDay.has(t.date)) byDay.set(t.date, []); byDay.get(t.date).push(t); });
  byDay.forEach((list) => list.forEach((t, i) => idx.set(t, Math.min(i + 1, 4))));
  return (t) => idx.get(t) ?? null;
}

export function tradesToCsv(trades) {
  const columns = ["date", "symbol", "dir", "session", "setup", "outcome", "r", "pnl", "grade", "plan", "tags", "entry_time", "exit_time", "why"];
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const value = (t, key) => {
    if (key === "tags") return (t.tags || []).join(" | ");
    if (key === "entry_time" || key === "exit_time") return t.execution?.[key] || "";
    return t[key];
  };
  return [columns.join(","), ...chrono(trades).map((t) => columns.map((k) => escape(value(t, k))).join(","))].join("\n");
}
