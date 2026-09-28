export const APP_VERSION = "2.0";

export const FIRMS = {
  MFF: { n: "My Funded Futures", c: "#00d301" },
  Lucid: { n: "Lucid Trading", c: "#00d4a0" },
  Phidias: { n: "Phidias", c: "#ff66e4" },
  Topstep: { n: "Topstep", c: "#f5b301" },
  Apex: { n: "Apex Trader Funding", c: "#8b5cf6" },
  Alpha: { n: "Alpha Futures", c: "#4ea1ff" },
  Tradeify: { n: "Tradeify", c: "#00d4a0" },
  TPT: { n: "Take Profit Trader", c: "#22d3ee" },
  Autre: { n: "Autre", c: "#8a93a6" },
};

export const firmColor = (f) => (FIRMS[f] || FIRMS.Autre).c;

export const SESSIONS = ["NY AM", "NY PM", "London", "Asia"];
export const GRADES = ["A+", "A", "B", "C", "F"];
export const TAG_LIB = [
  "Chased",
  "FOMO entry",
  "Revenge",
  "Oversized",
  "Early",
  "Late",
  "A+ setup",
  "Perfect exec",
];

// --- Émotions ressenties au moment de l'entrée du trade ---
// tone  : "green" (état constructif) | "red" (biais destructeur) | "yellow" (neutre / à surveiller)
// score : 0-100, utilisé pour la vue "Psych" du calendrier (état mental du jour).
// La clé (k) est stockée en base ; le libellé fr/en n'est que pour l'affichage.
export const EMOTIONS = [
  { k: "calm",      e: "😌", tone: "green",  score: 80, fr: "Calme",     en: "Calm" },
  { k: "confident", e: "💪", tone: "green",  score: 92, fr: "Confiant",  en: "Confident" },
  { k: "focused",   e: "🎯", tone: "green",  score: 88, fr: "Focus",     en: "Focused" },
  { k: "fomo",      e: "🏃", tone: "red",    score: 25, fr: "FOMO",      en: "FOMO" },
  { k: "fear",      e: "😨", tone: "red",    score: 20, fr: "Peur",      en: "Fear" },
  { k: "revenge",   e: "🔥", tone: "red",    score: 8,  fr: "Revenge",   en: "Revenge" },
  { k: "tilt",      e: "🤯", tone: "red",    score: 5,  fr: "Tilt",      en: "Tilt" },
  { k: "bored",     e: "😴", tone: "yellow", score: 45, fr: "Ennui",     en: "Bored" },
];

export const EMOTION_BY_KEY = EMOTIONS.reduce((m, x) => (m[x.k] = x, m), {});

export const emotionLabel = (k, lang = "fr") => {
  const em = EMOTION_BY_KEY[k];
  if (!em) return "";
  return lang === "en" ? em.en : em.fr;
};

// score 0-100 pour une émotion donnée (null si inconnue / non renseignée)
export const emotionScore = (k) => {
  const em = EMOTION_BY_KEY[k];
  return em ? em.score : null;
};

// Score mental d'un trade, sur 100. Le nouveau check-in Psycho (1 à 5)
// est prioritaire : on moyenne état émotionnel, focus et confiance.
// Les anciennes entrées utilisant uniquement `emotion` restent compatibles.
export const tradeMentalScore = (trade) => {
  const psychology = trade?.psychology;
  const values = [psychology?.emotional, psychology?.focus, psychology?.confidence]
    .map(Number)
    .filter((value) => Number.isFinite(value) && value >= 1 && value <= 5);
  if (values.length) return (values.reduce((sum, value) => sum + value, 0) / values.length) * 20;
  return emotionScore(trade?.emotion);
};

// Spectre d'état mental (façon "Mental State Spectrum") — 4 paliers.
export const PSYCH_SPECTRUM = [
  { id: "low",     min: 0,  max: 35,  color: "var(--loss, #ff3b5c)", fr: "Faible",  en: "Low" },
  { id: "neutral", min: 35, max: 55,  color: "#f5b301",              fr: "Neutre",  en: "Neutral" },
  { id: "strong",  min: 55, max: 75,  color: "#7fd0ff",              fr: "Solide",  en: "Strong" },
  { id: "peak",    min: 75, max: 101, color: "var(--accent, #00d301)", fr: "Pic",   en: "Peak" },
];

// Bucket + couleur pour un score donné (utilisé par la vue Psych du calendrier).
export const psychBucket = (score) =>
  PSYCH_SPECTRUM.find((b) => score >= b.min && score < b.max) || PSYCH_SPECTRUM[1];

export const gradeClass = (g) =>
  ({ "A+": "ap", A: "a", B: "b", C: "c", F: "f" }[g] || "b");

export const STATUS_LABEL = {
  active: ["cyan", "En cours"],
  passed: ["green", "Validé"],
  funded: ["green", "Funded"],
  failed: ["red", "Cramé"],
  paid: ["purple", "Payé"],
};

// ---------------------------------------------------------------------------
// Règles prop firm pré-remplies par le wizard de création de compte.
// Indicatif : les firms changent leurs règles régulièrement, l'utilisateur
// peut tout corriger dans le wizard (étape Phase) ou via "Éditer" ensuite.
//   target      : objectif de profit en évaluation ($)
//   mll         : max loss / drawdown max ($)
//   dll         : perte max journalière ($) ou null
//   dd          : type de drawdown — "eod" | "intraday" | "static"
//   lock        : offset de verrouillage du trailing au-dessus du solde initial
//   consistency : meilleur jour ≤ X % du profit total (évaluation), ou null
//   fundedConsistency : idem en funded, ou null
// ---------------------------------------------------------------------------
const size4 = (t25, m25, t50, m50, t100, m100, t150, m150) => ({
  25000: { target: t25, mll: m25 },
  50000: { target: t50, mll: m50 },
  100000: { target: t100, mll: m100 },
  150000: { target: t150, mll: m150 },
});

export const PROP_RULES = {
  Lucid: {
    label: "Lucid Trading",
    programs: {
      LucidFlex: { dd: "eod", lock: 100, dll: null, consistency: 50, fundedConsistency: null, sizes: size4(1250, 1000, 3000, 2000, 6000, 3000, 9000, 4500) },
    },
  },
  Apex: {
    label: "Apex Trader Funding",
    programs: {
      "Apex Eval": { dd: "intraday", lock: 0, dll: null, consistency: null, fundedConsistency: 30, sizes: size4(1500, 1500, 3000, 2500, 6000, 3000, 9000, 5000) },
    },
  },
  TPT: {
    label: "Take Profit Trader",
    programs: {
      "PRO Test": {
        dd: "eod", lock: 0, dll: null, consistency: 50, fundedConsistency: null,
        sizes: { 25000: { target: 1500, mll: 1500 }, 50000: { target: 3000, mll: 2000 }, 75000: { target: 4500, mll: 2500 }, 100000: { target: 6000, mll: 3000 }, 150000: { target: 9000, mll: 4500 } },
      },
    },
  },
  MFF: {
    label: "MFFU",
    programs: {
      Core: { dd: "eod", lock: 0, dll: null, consistency: 50, fundedConsistency: null, sizes: { 50000: { target: 3000, mll: 2000 }, 100000: { target: 6000, mll: 3000 }, 150000: { target: 9000, mll: 4500 } } },
    },
  },
  Topstep: {
    label: "Topstep",
    programs: {
      "Trading Combine": {
        dd: "eod", lock: 0, consistency: 50, fundedConsistency: null,
        sizes: { 50000: { target: 3000, mll: 2000, dll: 1000 }, 100000: { target: 6000, mll: 3000, dll: 2000 }, 150000: { target: 9000, mll: 4500, dll: 3000 } },
      },
    },
  },
};

// Règles effectives d'un compte existant (consistance non stockée en base).
export function accountRuleSet(account) {
  const funded0 = account?.type === "funded" || account?.status === "funded" || account?.status === "passed";
  const storedPhase = account?.progress?.consistency_phase;
  const stored = storedPhase && storedPhase === (funded0 ? "funded" : "eval") ? account.progress.consistency : undefined;
  const firm = PROP_RULES[account?.firm];
  const program = firm ? Object.values(firm.programs)[0] : null;
  const funded = account?.type === "funded" || account?.status === "funded" || account?.status === "passed";
  const preset = program ? (funded ? program.fundedConsistency : program.consistency) : null;
  return { consistency: stored != null ? Number(stored) : preset ?? null };
}
