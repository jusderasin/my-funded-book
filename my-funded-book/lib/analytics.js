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

// ---------------------------------------------------------------------------
// Equity Lab (vue façon PROTOS) : une ligne par trade avec tout ce qu'il faut
// pour la courbe, le panneau « trade inspecté » et la carte comportementale.
// ---------------------------------------------------------------------------

const ROLL = 20;

export function equityLab(trades, startBalance = 0) {
  let cum = 0; let cumR = 0; let peak = 0;
  const list = chrono(trades);
  const rows = list.map((t, i) => {
    const pnl = pnlOf(t); const r = rOf(t);
    cum += pnl; cumR += r; peak = Math.max(peak, cum);
    const win = list.slice(Math.max(0, i - ROLL + 1), i + 1);
    const rollExp = win.reduce((s, x) => s + rOf(x), 0) / win.length;
    return {
      i, trade: t, pnl, r, cum, cumR,
      equity: startBalance + cum,
      dd: cum - peak,
      dur: durationMin(t),
      plan: !!t.plan,
      size: Number(t.execution?.size) || null,
      rollExp,
      phase: win.length < 5 ? "WARMUP" : rollExp > 0.15 ? "EDGE +" : rollExp < -0.15 ? "EDGE −" : "FRAGILE",
    };
  });
  return rows;
}

// Résumé d'une fenêtre de trades (période visible).
export function windowStats(rows) {
  const n = rows.length;
  if (!n) return { n: 0, pnl: 0, exp: 0, wr: 0, pf: 0, maxDD: 0 };
  const pnl = rows.reduce((s, x) => s + x.pnl, 0);
  const gp = rows.filter((x) => x.pnl > 0).reduce((s, x) => s + x.pnl, 0);
  const gl = Math.abs(rows.filter((x) => x.pnl < 0).reduce((s, x) => s + x.pnl, 0));
  let c = 0; let pk = 0; let mdd = 0;
  rows.forEach((x) => { c += x.pnl; pk = Math.max(pk, c); mdd = Math.min(mdd, c - pk); });
  return { n, pnl, exp: rows.reduce((s, x) => s + x.r, 0) / n, wr: (rows.filter((x) => x.pnl > 0).length / n) * 100, pf: gl ? gp / gl : gp ? 99 : 0, maxDD: mdd };
}

// Sharpe annualisé sur le P&L journalier.
export function sharpe(trades) {
  const byDay = {};
  (trades || []).forEach((t) => { byDay[t.date] = (byDay[t.date] || 0) + pnlOf(t); });
  const v = Object.values(byDay);
  if (v.length < 3) return 0;
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
  return sd ? (m / sd) * Math.sqrt(252) : 0;
}

// Terrain de stabilité : espérance glissante (en R) pour plusieurs horizons × temps.
export const HORIZONS = [5, 10, 20, 40];
export function stabilitySurface(rows, cols = 40) {
  const n = rows.length;
  if (n < 6) return null;
  const step = Math.max(1, n / cols);
  const xs = [];
  for (let k = 0; k < Math.min(cols, n); k++) xs.push(Math.min(n - 1, Math.round(k * step)));
  const z = HORIZONS.map((h) => xs.map((i) => {
    const w = rows.slice(Math.max(0, i - h + 1), i + 1);
    return w.reduce((s, x) => s + x.r, 0) / w.length;
  }));
  const amp = Math.max(0.5, ...z.flat().map(Math.abs));
  return { xs, z, amp };
}

// Détecteurs anti-overfit / robustesse, à partir des lignes de l'Equity Lab.
export function detectors(rows, lang = "fr") {
  const en = lang === "en";
  const n = rows.length;
  const out = [];
  out.push({
    key: "sample", label: en ? "Sample size" : "Taille d'échantillon", value: n,
    level: n >= 100 ? "ok" : n >= 30 ? "warn" : "bad",
    text: n >= 100 ? (en ? "Large enough for a first diagnosis." : "Échantillon suffisant pour un pré-diagnostic.") : n >= 30 ? (en ? "Usable, but still noisy." : "Exploitable, mais encore bruité.") : (en ? "Too few trades: conclusions are fragile." : "Trop peu de trades : conclusions fragiles."),
  });
  if (n >= 10) {
    const half = Math.floor(n / 2);
    const a = rows.slice(0, half).reduce((s, x) => s + x.r, 0) / half;
    const b = rows.slice(half).reduce((s, x) => s + x.r, 0) / (n - half);
    out.push({
      key: "drift", label: en ? "1st half → 2nd half" : "1re moitié → 2e moitié", value: `${a.toFixed(2)} → ${b.toFixed(2)}R`,
      level: b >= a * 0.7 && b > 0 ? "ok" : b > 0 ? "warn" : "bad",
      text: b >= a ? (en ? "Your edge is holding or improving." : "Ton edge tient ou s'améliore.") : (en ? "Your expectancy is degrading over time." : "Ton espérance se dégrade avec le temps."),
    });
  }
  if (n >= ROLL) {
    const roll = rows.slice(ROLL - 1);
    const pos = (roll.filter((x) => x.rollExp > 0).length / roll.length) * 100;
    out.push({
      key: "persist", label: en ? "Edge persistence" : "Persistance de l'edge", value: `${pos.toFixed(0)}%`,
      level: pos >= 70 ? "ok" : pos >= 45 ? "warn" : "bad",
      text: en ? `Rolling ${ROLL}-trade expectancy is positive ${pos.toFixed(0)}% of the time.` : `Espérance glissante sur ${ROLL} trades positive ${pos.toFixed(0)}% du temps.`,
    });
  }
  const gains = rows.filter((x) => x.pnl > 0).map((x) => x.pnl).sort((p, q) => q - p);
  if (gains.length >= 5) {
    const top = Math.max(1, Math.round(gains.length * 0.1));
    const share = (gains.slice(0, top).reduce((s, v) => s + v, 0) / gains.reduce((s, v) => s + v, 0)) * 100;
    out.push({
      key: "conc", label: en ? "Gain concentration" : "Concentration des gains", value: `${share.toFixed(0)}%`,
      level: share <= 35 ? "ok" : share <= 55 ? "warn" : "bad",
      text: en ? `Your best ${top} trades make ${share.toFixed(0)}% of gross gains.` : `Tes ${top} meilleurs trades font ${share.toFixed(0)}% des gains bruts.`,
    });
  }
  if (n >= 5) {
    const planned = rows.filter((x) => x.plan); const off = rows.filter((x) => !x.plan);
    const e = (l) => (l.length ? l.reduce((s, x) => s + x.r, 0) / l.length : 0);
    if (planned.length && off.length) out.push({
      key: "plan", label: en ? "Plan vs off-plan" : "Plan vs hors plan", value: `${e(planned).toFixed(2)} / ${e(off).toFixed(2)}R`,
      level: e(planned) > e(off) ? "ok" : "warn",
      text: e(planned) > e(off) ? (en ? "Following your plan pays." : "Suivre ton plan paie.") : (en ? "Off-plan trades do as well: is your plan useful?" : "Hors plan aussi bon : ton plan sert-il vraiment ?"),
    });
  }
  return out;
}

// Score de robustesse 0-100 (moyenne des détecteurs).
export function robustness(dets) {
  if (!dets.length) return 0;
  const pts = { ok: 100, warn: 55, bad: 15 };
  return Math.round(dets.reduce((s, d) => s + pts[d.level], 0) / dets.length);
}

// Thèmes à l'essai sur la page Analyse : variables posées sur le conteneur de la page.
const MONO = {
  "--prism-bg": "#000000", "--prism-surface": "#030303", "--prism-panel": "#070707", "--prism-panel2": "#111111",
  "--prism-line": "rgba(255,255,255,0.10)", "--prism-line2": "rgba(255,255,255,0.16)",
  "--prism-text": "#ffffff", "--prism-muted": "#a3a3a3", "--prism-muted2": "#6b6b6b",
  "--prism-accent": "#ffffff", "--prism-accent-soft": "#e5e5e5", "--prism-accent-dim": "rgba(255,255,255,0.08)",
  "--prism-win": "#f5f5f5", "--prism-loss": "#7c7c7c",
  "--accent": "#ffffff", "--loss": "#7c7c7c", "--line": "rgba(255,255,255,0.10)", "--panel2": "#111111", "--muted": "#a3a3a3",
};
// Gris clair façon LIQUID : fond argent, cartes blanches, texte noir.
const LIQUID = {
  "--prism-bg": "#dcdce0", "--prism-surface": "#e9e9ec", "--prism-panel": "#f4f4f6", "--prism-panel2": "#ffffff",
  "--prism-line": "rgba(0,0,0,0.08)", "--prism-line2": "rgba(0,0,0,0.14)",
  "--prism-text": "#0b0b0c", "--prism-muted": "#55555c", "--prism-muted2": "#86868e",
  "--prism-accent": "#0b0b0c", "--prism-accent-soft": "#2a2a2e", "--prism-accent-dim": "rgba(0,0,0,0.06)",
  "--prism-win": "#0b0b0c", "--prism-loss": "#a3a3ab",
  "--accent": "#0b0b0c", "--loss": "#a3a3ab", "--line": "rgba(0,0,0,0.10)", "--panel2": "#e4e4e8", "--muted": "#55555c",
  colorScheme: "light",
};
// Bleu nuit façon Caba : graphiques bleu (gain) et violet (perte).
const CABA = {
  "--prism-bg": "#04060e", "--prism-surface": "#070a16", "--prism-panel": "#0a0e1d", "--prism-panel2": "#11173a",
  "--prism-line": "rgba(124,140,255,0.13)", "--prism-line2": "rgba(124,140,255,0.22)",
  "--prism-text": "#eef1ff", "--prism-muted": "#9aa3c7", "--prism-muted2": "#626b92",
  "--prism-accent": "#7c5cff", "--prism-accent-soft": "#a78bfa", "--prism-accent-dim": "rgba(124,92,255,0.15)",
  "--prism-win": "#4f8bff", "--prism-loss": "#b14cff",
  "--lab-line": "#6ea0ff",
  "--accent": "#7c5cff", "--loss": "#b14cff", "--line": "rgba(124,140,255,0.13)", "--panel2": "#11173a", "--muted": "#9aa3c7",
};
export const LAB_THEMES = [
  { id: "classic", fr: "Classique", en: "Classic", vars: null, card: "graphite", swatch: "var(--prism-accent)" },
  { id: "mono", fr: "Noir & blanc", en: "Black & white", vars: MONO, card: "mono", swatch: "linear-gradient(90deg,#fff 50%,#000 50%)" },
  { id: "liquid", fr: "Liquid", en: "Liquid", vars: LIQUID, card: "graphite", swatch: "linear-gradient(135deg,#f4f4f6,#9a9aa2)" },
  { id: "caba", fr: "Caba", en: "Caba", vars: CABA, card: "caba", swatch: "linear-gradient(135deg,#4f8bff,#b14cff)" },
];
export const MONO_VARS = MONO;
