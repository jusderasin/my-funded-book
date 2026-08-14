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
    name: { fr: "Premier sang", en: "First blood" }, desc: { fr: "Ton tout premier trade loggé", en: "Your very first logged trade" },
    how: { fr: "Logge ton tout premier trade depuis le bouton \u00ab Log trade \u00bb.", en: "Log your very first trade from the \u00ab Log trade \u00bb button." } },
  { id: "centurion", cat: "meta", emblem: "hash", unit: "trades", thresholds: [10, 50, 200, 500, 1000], metric: (d) => d.total,
    name: { fr: "Centurion", en: "Centurion" }, desc: { fr: "Nombre total de trades loggés", en: "Total trades logged" },
    how: { fr: "Continue de logger tous tes trades. Chaque trade enregistr\u00e9 fait monter ce badge.", en: "Keep logging every trade. Each one raises this badge." } },
  { id: "plan_de_fer", cat: "process", emblem: "shield", unit: "d'affilée", thresholds: [5, 15, 30, 60, 120], metric: (d) => d.planStreak,
    name: { fr: "Plan de fer", en: "Iron plan" }, desc: { fr: "Trades \u00ab plan respect\u00e9 \u00bb d'affil\u00e9e", en: "Plan-followed trades in a row" },
    how: { fr: "Mets \u00ab Plan respect\u00e9 : Oui \u00bb sur des trades cons\u00e9cutifs. Un seul \u00ab Non \u00bb remet la s\u00e9rie \u00e0 z\u00e9ro.", en: "Set \u00ab Plan followed: Yes \u00bb on consecutive trades. A single \u00ab No \u00bb resets the streak." } },
  { id: "journaliste", cat: "process", emblem: "lines", unit: "WHY", thresholds: [5, 25, 75, 200, 500], metric: (d) => d.whyCount,
    name: { fr: "Journaliste", en: "Journalist" }, desc: { fr: "Trades avec le WHY rempli", en: "Trades with the WHY written" },
    how: { fr: "Remplis le champ WHY (pourquoi ce trade) \u00e0 chaque log. Le total grimpe \u00e0 vie.", en: "Fill the WHY field on each log. The total grows for life." } },
  { id: "sang_froid", cat: "process", emblem: "drop", unit: "d'affilée", thresholds: [3, 7, 14, 30, 60], metric: (d) => d.calmStreak,
    name: { fr: "Sang-froid", en: "Cold blood" }, desc: { fr: "Trades sans tag tilt/revenge d'affil\u00e9e", en: "Trades with no tilt/revenge tag in a row" },
    how: { fr: "\u00c9vite les tags tilt, revenge, fomo, overtrade sur tes trades. La s\u00e9rie casse au premier tag de ce type.", en: "Avoid tilt, revenge, fomo, overtrade tags. The streak breaks on the first such tag." } },
  { id: "machine_r", cat: "perf", emblem: "R", unit: "R", thresholds: [10, 25, 50, 100, 250], metric: (d) => d.sumR,
    name: { fr: "Machine \u00e0 R", en: "R machine" }, desc: { fr: "Cumul de R sur tes trades", en: "Cumulative R across your trades" },
    how: { fr: "Accumule du R positif. Renseigne le champ R de chaque trade \u2014 le total se cumule.", en: "Stack positive R. Fill the R field on each trade \u2014 it accumulates." } },
  { id: "sniper", cat: "perf", emblem: "target", unit: "gains", thresholds: [3, 5, 8, 12, 20], metric: (d) => d.winStreak,
    name: { fr: "Sniper", en: "Sniper" }, desc: { fr: "Trades gagnants d'affil\u00e9e", en: "Winning trades in a row" },
    how: { fr: "Encha\u00eene des trades gagnants (PnL positif). Une perte remet la s\u00e9rie \u00e0 z\u00e9ro.", en: "Chain winning trades (positive PnL). A loss resets the streak." } },
  { id: "serie_verte", cat: "perf", emblem: "flame", unit: "jours", thresholds: [3, 5, 10, 20, 40], metric: (d) => d.greenDayStreak,
    name: { fr: "S\u00e9rie verte", en: "Green streak" }, desc: { fr: "Jours verts cons\u00e9cutifs", en: "Consecutive green days" },
    how: { fr: "Termine tes journ\u00e9es de trading en positif, plusieurs jours d'affil\u00e9e.", en: "End your trading days positive, several days in a row." } },
  { id: "backtester", cat: "meta", emblem: "flask", unit: "sessions", thresholds: [1, 3, 10, 25, 50], metric: (d) => d.btCount,
    name: { fr: "Backtester", en: "Backtester" }, desc: { fr: "Sessions de backtest cr\u00e9\u00e9es", en: "Backtest sessions created" },
    how: { fr: "Cr\u00e9e des sessions dans l'onglet Backtest pour tester tes strat\u00e9gies sur l'historique.", en: "Create sessions in the Backtest tab to test your strategies on history." } },
  { id: "funded", cat: "prop", emblem: "bank", unit: "comptes", thresholds: [1, 2, 3, 5, 10], metric: (d) => d.fundedCount,
    name: { fr: "Funded", en: "Funded" }, desc: { fr: "Comptes financ\u00e9s obtenus", en: "Funded accounts earned" },
    how: { fr: "Ajoute tes comptes financ\u00e9s dans l'onglet Comptes (type \u00ab Funded \u00bb ou statut Funded).", en: "Add your funded accounts in the Accounts tab (type \u00ab Funded \u00bb or Funded status)." } },
  { id: "rituel", cat: "process", emblem: "calendar", unit: "jours", thresholds: [5, 20, 50, 120, 250], metric: (d) => d.distinctDays,
    name: { fr: "Rituel", en: "Ritual" }, desc: { fr: "Jours de trading distincts", en: "Distinct trading days" },
    how: { fr: "Logge au moins un trade par jour de trading. Ce badge compte tes jours actifs distincts.", en: "Log at least one trade per trading day. This badge counts your distinct active days." } },
  { id: "veteran", cat: "meta", emblem: "hourglass", unit: "j", thresholds: [30, 90, 180, 365, 730], metric: (d) => d.vetDays,
    name: { fr: "V\u00e9t\u00e9ran", en: "Veteran" }, desc: { fr: "Anciennet\u00e9 de ton compte", en: "Your account age" },
    how: { fr: "Il suffit de rester ! Ce badge monte tout seul avec l'anciennet\u00e9 de ton compte.", en: "Just stick around! This badge rises on its own with your account age." } },
  { id: "perfectionniste", cat: "perf", emblem: "star", unit: "A+ d'affilée", thresholds: [3, 5, 10, 20, 40], metric: (d) => d.aPlusStreak,
    name: { fr: "Perfectionniste", en: "Perfectionist" }, desc: { fr: "Trades not\u00e9s A+ d'affil\u00e9e", en: "A+ graded trades in a row" },
    how: { fr: "Note tes trades A+ (ex\u00e9cution parfaite) plusieurs fois d'affil\u00e9e, sans grade inf\u00e9rieur entre.", en: "Grade your trades A+ (perfect execution) several times in a row." } },
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
      id: b.id, cat: b.cat, emblem: b.emblem, unit: b.unit, name: b.name, desc: b.desc, how: b.how,
      thresholds: b.thresholds,
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
