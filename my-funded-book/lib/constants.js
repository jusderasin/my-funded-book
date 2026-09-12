export const FIRMS = {
  MFF: { n: "My Funded Futures", c: "#00d301" },
  Lucid: { n: "Lucid Trading", c: "#00d4a0" },
  Phidias: { n: "Phidias", c: "#ff66e4" },
  Topstep: { n: "Topstep", c: "#f5b301" },
  Apex: { n: "Apex Trader Funding", c: "#8b5cf6" },
  Alpha: { n: "Alpha Futures", c: "#4ea1ff" },
  Tradeify: { n: "Tradeify", c: "#00d4a0" },
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
  return em.e + " " + (lang === "en" ? em.en : em.fr);
};

// score 0-100 pour une émotion donnée (null si inconnue / non renseignée)
export const emotionScore = (k) => {
  const em = EMOTION_BY_KEY[k];
  return em ? em.score : null;
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
