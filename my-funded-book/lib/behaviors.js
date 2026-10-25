// Comportements détectés sans tag, comparateur de contextes et réponses chiffrées
// aux questions sur le journal. Tout est calculé sur les trades : rien n'est inventé.

import { chrono, durationMin, entryHour, weekday } from "@/lib/reports";

const num = (v) => Number(v) || 0;
const pnlOf = (t) => (t?.outcome === "BE" ? 0 : num(t.pnl));
const rOf = (t) => (t?.outcome === "BE" ? 0 : num(t.r));
const minutes = (hhmm) => { const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || "")); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const sum = (list, f) => list.reduce((s, x) => s + f(x), 0);
const median = (v) => { if (!v.length) return 0; const s = v.slice().sort((a, b) => a - b); const k = Math.floor(s.length / 2); return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };

export const DAY_NAMES = {
  fr: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
};

// ---------------------------------------------------------------------------
// Comportements
// ---------------------------------------------------------------------------

const REVENGE_MIN = 20; // réentrée moins de 20 min après une perte

export function detectBehaviors(trades, lang = "fr") {
  const en = lang === "en";
  const list = chrono(trades);
  const byDay = {};
  list.forEach((t) => (byDay[t.date] ||= []).push(t));
  const counts = Object.values(byDay).map((d) => d.length);
  const overLimit = Math.max(3, Math.ceil(median(counts) * 2));

  const hits = { revenge: [], overtrading: [], streak: [], offplan: [], stop: [], early: [] };
  Object.values(byDay).forEach((day) => {
    let lossRun = 0;
    day.forEach((t, i) => {
      const prev = day[i - 1];
      if (prev && pnlOf(prev) < 0) {
        const gap = minutes(t.execution?.entry_time) - minutes(prev.execution?.exit_time ?? prev.execution?.entry_time);
        const quick = Number.isFinite(gap) && gap >= 0 && gap <= REVENGE_MIN;
        const bigger = num(t.execution?.size) > num(prev.execution?.size) && num(prev.execution?.size) > 0;
        if (quick || bigger) hits.revenge.push(t);
      }
      if (lossRun >= 2) hits.streak.push(t);
      lossRun = pnlOf(t) < 0 ? lossRun + 1 : 0;
      if (i >= overLimit) hits.overtrading.push(t);
    });
  });
  list.forEach((t) => {
    if (!t.plan) hits.offplan.push(t);
    if (rOf(t) < -1.15) hits.stop.push(t);
    const mfe = num(t.execution?.mfe_r);
    if (mfe && rOf(t) > 0 && mfe - rOf(t) >= 1) hits.early.push(t);
  });

  const meta = {
    revenge: [en ? "Revenge trade" : "Trade de revanche", en ? `Re-entered less than ${REVENGE_MIN} min after a loss, or with a bigger size.` : `Réentrée moins de ${REVENGE_MIN} min après une perte, ou avec une taille plus grosse.`],
    streak: [en ? "After a losing streak" : "Après une série de pertes", en ? "Taken after 2 losses in a row the same day." : "Pris après 2 pertes d'affilée dans la journée."],
    overtrading: [en ? "Overtrading" : "Surtrading", en ? `Beyond trade #${overLimit} of the day (twice your usual pace).` : `Au-delà du ${overLimit}e trade de la journée (deux fois ton rythme habituel).`],
    offplan: [en ? "Off-plan" : "Hors plan", en ? "Trades you marked as not following your plan." : "Trades que tu as marqués hors plan."],
    stop: [en ? "Stop overrun" : "Stop dépassé", en ? "Lost more than 1R: the stop was moved or skipped." : "Perte de plus de 1R : le stop a été déplacé ou pas respecté."],
    early: [en ? "Exited too early" : "Sortie trop tôt", en ? "Winners where price offered at least 1R more (MFE)." : "Gagnants où le prix offrait au moins 1R de plus (MFE)."],
  };
  return Object.entries(hits)
    .filter(([, l]) => l.length)
    .map(([key, l]) => ({
      key, label: meta[key][0], text: meta[key][1], count: l.length,
      r: key === "early" ? -sum(l, (t) => num(t.execution?.mfe_r) - rOf(t)) : sum(l, rOf),
      pnl: key === "early" ? null : sum(l, pnlOf),
      ids: l.map((t) => t.id),
    }))
    .sort((a, b) => a.r - b.r);
}

// Capture des gains : R réalisé / R offert (MFE) sur les trades qui ont un MFE.
export function captureStats(trades) {
  const withMfe = (trades || []).filter((t) => num(t.execution?.mfe_r) > 0);
  if (!withMfe.length) return null;
  const offered = sum(withMfe, (t) => num(t.execution.mfe_r));
  const realized = sum(withMfe, (t) => Math.max(0, rOf(t)));
  const withMae = (trades || []).filter((t) => t.execution?.mae_r != null && t.execution.mae_r !== "");
  return {
    n: withMfe.length,
    efficiency: offered ? (realized / offered) * 100 : 0,
    leftR: offered - realized,
    avgMae: withMae.length ? sum(withMae, (t) => num(t.execution.mae_r)) / withMae.length : null,
  };
}

// ---------------------------------------------------------------------------
// Contextes (comparateur et questions)
// ---------------------------------------------------------------------------

export function dimensions(lang = "fr") {
  const en = lang === "en";
  const days = DAY_NAMES[en ? "en" : "fr"];
  return [
    { id: "session", label: "Session", of: (t) => t.session || null },
    { id: "setup", label: en ? "Setup" : "Setup", of: (t) => t.setup || null },
    { id: "weekday", label: en ? "Weekday" : "Jour", of: (t) => { const d = weekday(t); return d == null ? null : days[d]; }, order: (k) => days.indexOf(k) },
    { id: "hour", label: en ? "Entry hour" : "Heure d'entrée", of: (t) => { const h = entryHour(t); return h == null ? null : `${String(h).padStart(2, "0")}h`; }, order: (k) => parseInt(k, 10) },
    { id: "symbol", label: en ? "Instrument" : "Instrument", of: (t) => t.symbol || null },
    { id: "dir", label: "Direction", of: (t) => (t.dir ? String(t.dir).toUpperCase() : null) },
    { id: "plan", label: en ? "Plan" : "Plan", of: (t) => (t.plan ? (en ? "Plan followed" : "Plan respecté") : (en ? "Off-plan" : "Hors plan")) },
    { id: "duration", label: en ? "Duration" : "Durée", of: (t) => { const m = durationMin(t); return m == null ? null : m < 5 ? "< 5 min" : m < 15 ? "5–15 min" : m < 60 ? "15–60 min" : "> 1 h"; } },
  ];
}

export function contextStats(list) {
  const n = list.length;
  const wins = list.filter((t) => pnlOf(t) > 0);
  const gp = sum(wins, pnlOf); const gl = Math.abs(sum(list.filter((t) => pnlOf(t) < 0), pnlOf));
  let c = 0; let pk = 0; let dd = 0;
  const curve = [0];
  chrono(list).forEach((t) => { c += rOf(t); pk = Math.max(pk, c); dd = Math.min(dd, c - pk); curve.push(c); });
  return {
    n, net: sum(list, pnlOf), totalR: sum(list, rOf), avgR: n ? sum(list, rOf) / n : 0,
    wr: n ? (wins.length / n) * 100 : 0, pf: gl ? gp / gl : gp ? 99 : 0, maxDDR: dd, curve,
  };
}

export function groupValues(trades, dim) {
  const map = {};
  (trades || []).forEach((t) => { const k = dim.of(t); if (k) (map[k] ||= []).push(t); });
  const keys = Object.keys(map);
  keys.sort(dim.order ? (a, b) => dim.order(a) - dim.order(b) : (a, b) => map[b].length - map[a].length);
  return keys.map((k) => ({ key: k, trades: map[k], stats: contextStats(map[k]) }));
}

// ---------------------------------------------------------------------------
// Questions en langage naturel -> réponse calculée
// ---------------------------------------------------------------------------

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
// Le texte contient-il ce mot (ou groupe de mots) entier ?
const hasWord = (text, word) => {
  const i = text.indexOf(word);
  if (i < 0) return false;
  const before = text[i - 1]; const after = text[i + word.length];
  const sep = (c) => c == null || !/[a-z0-9]/.test(c);
  return sep(before) && sep(after);
};

const METRICS = [
  { id: "wr", words: ["win rate", "winrate", "taux de reussite", "pourcentage", "% de gain", "reussite"], fr: "Win rate", en: "Win rate", fmt: (s) => `${s.wr.toFixed(0)}%` },
  { id: "avgR", words: ["r moyen", "average r", "moyenne", "expectancy", "esperance", "avg r"], fr: "R moyen", en: "Average R", fmt: (s) => `${s.avgR >= 0 ? "+" : ""}${s.avgR.toFixed(2)}R` },
  { id: "totalR", words: ["r total", "total r", "en r", " r "], fr: "R total", en: "Total R", fmt: (s) => `${s.totalR >= 0 ? "+" : ""}${s.totalR.toFixed(1)}R` },
  { id: "net", words: ["p&l", "pnl", "argent", "dollars", "$", "gagne", "perds", "perd", "money", "profit"], fr: "P&L", en: "P&L", fmt: (s) => `${s.net >= 0 ? "+" : "-"}$${Math.abs(s.net).toFixed(0)}` },
  { id: "n", words: ["combien de trades", "nombre", "how many"], fr: "Trades", en: "Trades", fmt: (s) => String(s.n) },
];

const DIM_WORDS = {
  session: ["session", "londres", "london", "new york", "ny", "asie", "asia"],
  setup: ["setup", "strategie", "strategy", "modele"],
  weekday: ["jour", "day", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "monday", "tuesday", "wednesday", "thursday", "friday", "semaine"],
  hour: ["heure", "hour", "matin", "apres-midi", "morning", "afternoon"],
  symbol: ["symbole", "instrument", "actif", "paire", "symbol", "pair"],
  dir: ["long", "short", "direction", "achat", "vente"],
  plan: ["plan", "hors plan", "regles", "rules"],
  duration: ["duree", "duration", "temps en position", "minutes"],
};

export const SUGGESTIONS = {
  fr: ["Mon win rate le lundi vs le vendredi ?", "Où je perds le plus ?", "Mon R moyen par session ?", "Sur quels setups je gagne vraiment ?", "Combien je perds hors plan ?", "Mon P&L par heure d'entrée ?"],
  en: ["My win rate on Monday vs Friday?", "Where do I lose the most?", "My average R by session?", "Which setups really make money?", "How much do I lose off-plan?", "My P&L by entry hour?"],
};

export function answerQuestion(question, trades, lang = "fr") {
  const en = lang === "en";
  const q = ` ${norm(question)} `;
  const dims = dimensions(lang);
  const list = (trades || []).filter(Boolean);
  if (!list.length) return { kind: "empty", text: en ? "No trades to analyse yet." : "Pas encore de trades à analyser." };

  let metric = METRICS.find((m) => m.words.some((w) => q.includes(w))) || null;

  // Où je perds / gagne le plus : on balaie toutes les dimensions.
  const worst = /(perd|perte|lose|losing|saigne|leak|fuite)/.test(q) && /(plus|most|le plus|where|ou )/.test(q);
  const best = /(gagne|win|meilleur|best|vraiment|really)/.test(q) && !worst && !metric?.id?.startsWith("wr");

  // Valeurs citées explicitement (ex. lundi vs vendredi, Londres vs New York).
  let dim = null;
  const mentioned = [];
  for (const d of dims) {
    const values = groupValues(list, d);
    const found = values.filter((v) => { const k = norm(v.key); return k.length > 1 && hasWord(q, k); });
    if (found.length >= 1 && (!dim || found.length > mentioned.length)) { dim = d; mentioned.splice(0, mentioned.length, ...found); }
  }
  if (!dim || mentioned.length < 2) {
    const byWord = dims.find((d) => DIM_WORDS[d.id].some((w) => q.includes(` ${w}`) || q.includes(`${w} `)));
    if (byWord && (!dim || mentioned.length < 2)) { if (!dim || dim.id !== byWord.id) mentioned.length = 0; dim = byWord; }
  }

  if (worst || best) {
    const m = metric && metric.id !== "n" ? metric : METRICS.find((x) => x.id === (worst ? "net" : "avgR"));
    const pool = (dim ? [dim] : dims).flatMap((d) => groupValues(list, d).filter((v) => v.stats.n >= 3).map((v) => ({ ...v, dim: d })));
    if (!pool.length) return { kind: "empty", text: en ? "Not enough trades per context (3 minimum)." : "Pas assez de trades par contexte (3 minimum)." };
    const val = (v) => (m.id === "net" ? v.stats.net : m.id === "wr" ? v.stats.wr : v.stats.avgR);
    pool.sort((a, b) => (worst ? val(a) - val(b) : val(b) - val(a)));
    const top = pool.slice(0, 3);
    return {
      kind: "ranking", metric: m,
      title: worst ? (val(top[0]) < 0 ? (en ? "Where you lose the most" : "Là où tu perds le plus") : (en ? "No losing context: your weakest ones" : "Aucun contexte perdant : tes moins rentables")) : (en ? "Where your edge is" : "Là où est ton edge"),
      rows: top.map((v) => ({ label: `${v.dim.label} · ${v.key}`, value: m.fmt(v.stats), sub: `${v.stats.n} trades · WR ${v.stats.wr.toFixed(0)}%`, tone: val(v) >= 0 && !worst ? "win" : "loss" })),
      basis: list.length,
    };
  }

  if (!dim) return { kind: "unknown" };
  metric ||= METRICS.find((m) => m.id === "avgR");
  const groups = groupValues(list, dim);
  const shown = mentioned.length >= 2 ? groups.filter((g) => mentioned.some((m) => m.key === g.key)) : groups.slice(0, 8);
  return {
    kind: mentioned.length >= 2 ? "compare" : "table", metric,
    title: `${en ? metric.en : metric.fr} · ${dim.label}`,
    rows: shown.map((g) => ({ label: g.key, value: metric.fmt(g.stats), sub: `${g.stats.n} trades`, tone: (metric.id === "wr" ? g.stats.wr >= 50 : g.stats.net >= 0) ? "win" : "loss" })),
    basis: list.length,
  };
}

// ---------------------------------------------------------------------------
// Récap vocal : transcription -> champs du bilan du jour + note
// ---------------------------------------------------------------------------

export function parseVoiceRecap(text, lang = "fr") {
  const t = norm(text);
  let respected = null;
  if (/(pas|non|jamais) (respecte|suivi)|hors plan|sorti du plan|didn'?t follow|off.?plan|broke (my )?(plan|rules)/.test(t)) respected = false;
  else if (/(respecte|suivi) (le|mon) plan|plan respecte|followed (my|the) plan|stuck to (my|the) plan/.test(t)) respected = true;
  let mindset = null;
  if (/(tilt|enerve|rage|frustre|revenge|revanche)/.test(t)) mindset = "tilt";
  else if (/(stress|tendu|nerveux|anxi|tense|pression)/.test(t)) mindset = "tense";
  else if (/(calme|serein|zen|focus|concentre|calm|relaxed)/.test(t)) mindset = "calm";
  else if (/(neutre|normal|ok |neutral)/.test(t)) mindset = "neutral";
  const sentences = String(text).split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  const pick = (re) => sentences.find((s) => re.test(norm(s)));
  const lesson = pick(/(lecon|appris|retenir|retiens|erreur|lesson|learned|mistake)/) || null;
  const intention = pick(/(demain|prochaine|la prochaine fois|je vais|tomorrow|next time|i will)/) || null;
  return { respected_plan: respected, mindset, lesson: lesson || (sentences.length ? String(text).slice(0, 500) : null), intention };
}

// Note du jour A–D : plan respecté et R du jour.
export function dayGrade(dayTrades) {
  if (!dayTrades.length) return null;
  const plan = dayTrades.filter((t) => t.plan).length / dayTrades.length;
  const r = sum(dayTrades, rOf);
  const score = plan * 70 + Math.max(-30, Math.min(30, r * 10));
  return score >= 75 ? "A" : score >= 55 ? "B" : score >= 35 ? "C" : "D";
}
