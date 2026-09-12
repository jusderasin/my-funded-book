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
// tone : "green" (état constructif) | "red" (biais destructeur) | "yellow" (neutre / à surveiller)
// La clé (k) est stockée en base ; le libellé fr/en n'est que pour l'affichage.
export const EMOTIONS = [
  { k: "calm",      e: "😌", tone: "green",  fr: "Calme",     en: "Calm" },
  { k: "confident", e: "💪", tone: "green",  fr: "Confiant",  en: "Confident" },
  { k: "focused",   e: "🎯", tone: "green",  fr: "Focus",     en: "Focused" },
  { k: "fomo",      e: "🏃", tone: "red",    fr: "FOMO",      en: "FOMO" },
  { k: "fear",      e: "😨", tone: "red",    fr: "Peur",      en: "Fear" },
  { k: "revenge",   e: "🔥", tone: "red",    fr: "Revenge",   en: "Revenge" },
  { k: "tilt",      e: "🤯", tone: "red",    fr: "Tilt",      en: "Tilt" },
  { k: "bored",     e: "😴", tone: "yellow", fr: "Ennui",     en: "Bored" },
];

export const EMOTION_BY_KEY = EMOTIONS.reduce((m, x) => (m[x.k] = x, m), {});

export const emotionLabel = (k, lang = "fr") => {
  const em = EMOTION_BY_KEY[k];
  if (!em) return "";
  return em.e + " " + (lang === "en" ? em.en : em.fr);
};

export const gradeClass = (g) =>
  ({ "A+": "ap", A: "a", B: "b", C: "c", F: "f" }[g] || "b");

export const STATUS_LABEL = {
  active: ["cyan", "En cours"],
  passed: ["green", "Validé"],
  funded: ["green", "Funded"],
  failed: ["red", "Cramé"],
  paid: ["purple", "Payé"],
};
