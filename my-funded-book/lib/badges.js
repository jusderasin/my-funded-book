"use client";

const TILT_TAGS = ["tilt", "revenge", "vengeance", "fomo", "overtrade", "surtrade"];

function maxStreak(arr, pred) {
  let cur = 0, max = 0;
  for (const x of arr) { if (pred(x)) { cur++; if (cur > max) max = cur; } else cur = 0; }
  return max;
}

function derive(ctx) {
  const trades = ctx.trades || [];
  const chrono = [...trades].sort((a, b) => {
    const da = a.date || "", db = b.date || "";
    if (da !== db) return da < db ? -1 : 1;
    const ca = a.created_at || "", cb = b.created_at || "";
    return ca < cb ? -1 : ca > cb ? 1 : 0;
  });

  const byDay = {};
  for (const t of chrono) byDay[t.date] = (byDay[t.date] || 0) + Number(t.pnl || 0);
  const days = Object.keys(byDay).sort();

  return {
    total: trades.length,
    planStreak: maxStreak(chrono, (t) => t.plan === true),
    whyCount: trades.filter((t) => t.why && String(t.why).trim()).length,
    calmStreak: maxStreak(chrono, (t) => !(t.tags || []).some((x) => TILT_TAGS.includes(String(x).toLowerCase()))),
    sumR: Math.round(chrono.reduce((a, t) => a + Number(t.r || 0), 0)),
    winStreak: maxStreak(chrono, (t) => Number(t.pnl) > 0),
    greenDayStreak: maxStreak(days, (d) => byDay[d] > 0),
    distinctDays: days.length,
    aPlusStreak: maxStreak(chrono, (t) => t.grade === "A+"),
    fundedCount: (ctx.accounts || []).filter((a) => a.type === "funded" || ["funded", "paid"].includes(a.status)).length,
    vetDays: ctx.profile?.created_at ? Math.max(0, Math.floor((ctx.now - new Date(ctx.profile.created_at).getTime()) / 86400000)) : 0,
    btCount: ctx.btCount || 0,
  };
}

export const BADGES = [
  { id: "premier_sang", cat: "meta", emblem: "spark", unit: "trade", thresholds: [1], metric: (d) => d.total,
    name: { fr: "Premier sang", en: "First blood" }, desc: { fr: "Ton tout premier trade loggé", en: "Your very first logged trade" } },
  { id: "centurion", cat: "meta", emblem: "hash", unit: "trades", thresholds: [10, 50, 200, 500, 1000], metric: (d) => d.total,
    name: { fr: "Centurion", en: "Centurion" }, desc: { fr: "Nombre total de trades loggés", en: "Total trades logged" } },
  { id: "plan_de_fer", cat: "process", emblem: "shield", unit: "d'affilée", thresholds: [5, 15, 30, 60, 120], metric: (d) => d.planStreak,
    name: { fr: "Plan de fer", en: "Iron plan" }, desc: { fr: "Trades \u00ab plan respect\u00e9 \u00bb d'affil\u00e9e", en: "Plan-followed trades in a row" } },
  { id: "journaliste", cat: "process", emblem: "lines", unit: "WHY", thresholds: [5, 25, 75, 200, 500], metric: (d) => d.whyCount,
    name: { fr: "Journaliste", en: "Journalist" }, desc: { fr: "Trades avec le WHY rempli", en: "Trades with the WHY written" } },
  { id: "sang_froid", cat: "process", emblem: "drop", unit: "d'affilée", thresholds: [3, 7, 14, 30, 60], metric: (d) => d.calmStreak,
    name: { fr: "Sang-froid", en: "Cold blood" }, desc: { fr: "Trades sans tag tilt/revenge d'affil\u00e9e", en: "Trades with no tilt/revenge tag in a row" } },
  { id: "machine_r", cat: "perf", emblem: "R", unit: "R", thresholds: [10, 25, 50, 100, 250], metric: (d) => d.sumR,
    name: { fr: "Machine \u00e0 R", en: "R machine" }, desc: { fr: "Cumul de R sur tes trades", en: "Cumulative R across your trades" } },
  { id: "sniper", cat: "perf", emblem: "target", unit: "gains", thresholds: [3, 5, 8, 12, 20], metric: (d) => d.winStreak,
    name: { fr: "Sniper", en: "Sniper" }, desc: { fr: "Trades gagnants d'affil\u00e9e", en: "Winning trades in a row" } },
  { id: "serie_verte", cat: "perf", emblem: "flame", unit: "jours", thresholds: [3, 5, 10, 20, 40], metric: (d) => d.greenDayStreak,
    name: { fr: "S\u00e9rie verte", en: "Green streak" }, desc: { fr: "Jours verts cons\u00e9cutifs", en: "Consecutive green days" } },
  { id: "backtester", cat: "meta", emblem: "flask", unit: "sessions", thresholds: [1, 3, 10, 25, 50], metric: (d) => d.btCount,
    name: { fr: "Backtester", en: "Backtester" }, desc: { fr: "Sessions de backtest cr\u00e9\u00e9es", en: "Backtest sessions created" } },
  { id: "funded", cat: "prop", emblem: "bank", unit: "comptes", thresholds: [1, 2, 3, 5, 10], metric: (d) => d.fundedCount,
    name: { fr: "Funded", en: "Funded" }, desc: { fr: "Comptes financ\u00e9s obtenus", en: "Funded accounts earned" } },
  { id: "rituel", cat: "process", emblem: "calendar", unit: "jours", thresholds: [5, 20, 50, 120, 250], metric: (d) => d.distinctDays,
    name: { fr: "Rituel", en: "Ritual" }, desc: { fr: "Jours de trading distincts", en: "Distinct trading days" } },
  { id: "veteran", cat: "meta", emblem: "hourglass", unit: "j", thresholds: [30, 90, 180, 365, 730], metric: (d) => d.vetDays,
    name: { fr: "V\u00e9t\u00e9ran", en: "Veteran" }, desc: { fr: "Anciennet\u00e9 de ton compte", en: "Your account age" } },
  { id: "perfectionniste", cat: "perf", emblem: "star", unit: "A+ d'affilée", thresholds: [3, 5, 10, 20, 40], metric: (d) => d.aPlusStreak,
    name: { fr: "Perfectionniste", en: "Perfectionist" }, desc: { fr: "Trades not\u00e9s A+ d'affil\u00e9e", en: "A+ graded trades in a row" } },
];

export const TIER_NAMES = [
  { fr: "\u2014", en: "\u2014" },
  { fr: "D\u00e9butant", en: "Novice" },
  { fr: "Confirm\u00e9", en: "Skilled" },
  { fr: "Expert", en: "Expert" },
  { fr: "Ma\u00eetre", en: "Master" },
  { fr: "L\u00e9gende", en: "Legend" },
];

function tierOf(value, thresholds) {
  let t = 0;
  for (const th of thresholds) { if (value >= th) t++; else break; }
  return t;
}

export function computeBadges(ctx) {
  const d = derive({ ...ctx, now: ctx.now || Date.now() });
  return BADGES.map((b) => {
    const value = b.metric(d);
    const tier = tierOf(value, b.thresholds);
    const maxTier = b.thresholds.length;
    const maxed = tier >= maxTier;
    const nextThreshold = maxed ? null : b.thresholds[tier];
    const prevBase = tier === 0 ? 0 : b.thresholds[tier - 1];
    const progress = maxed ? 1 : Math.max(0, Math.min(1, (value - prevBase) / (nextThreshold - prevBase)));
    return {
      id: b.id, cat: b.cat, emblem: b.emblem, unit: b.unit, name: b.name, desc: b.desc,
      value, tier, maxTier, maxed, nextThreshold, progress, unlocked: tier >= 1,
    };
  });
}

export function badgeSummary(list) {
  const unlocked = list.filter((b) => b.unlocked).length;
  const totalTiers = list.reduce((a, b) => a + b.maxTier, 0);
  const earnedTiers = list.reduce((a, b) => a + b.tier, 0);
  return { unlocked, total: list.length, totalTiers, earnedTiers };
}
