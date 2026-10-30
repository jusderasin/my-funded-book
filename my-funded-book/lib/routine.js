// Routine hebdomadaire : quel type de compte on a le droit de trader chaque
// jour (ex. lundi/vendredi = challenges, mardi→jeudi = financés), plus des
// exceptions datées (jour de NFP = off). Stockée dans profiles.trading_routine :
// { days: { "1": { kind, note }, ... }, exceptions: { "YYYY-MM-DD": { kind, note } } }
// avec 0 = dimanche … 6 = samedi (Date#getDay).

export const ROUTINE_KINDS = ["challenge", "funded", "any", "off"];
export const ROUTINE_WEEK = [1, 2, 3, 4, 5, 6, 0]; // affichage lundi → dimanche

export const KIND_COLORS = {
  challenge: "#f59e0b",
  funded: "var(--prism-win)",
  any: "var(--prism-accent)",
  off: "var(--prism-muted2)",
};

const LABELS = {
  fr: { challenge: "Challenges", funded: "Financés", any: "Libre", off: "Off", none: "Non défini" },
  en: { challenge: "Challenges", funded: "Funded", any: "Any", off: "Off", none: "Not set" },
};
export const kindLabel = (kind, lang = "fr") => LABELS[lang === "en" ? "en" : "fr"][kind] || LABELS[lang === "en" ? "en" : "fr"].none;

export const DAY_NAMES = {
  fr: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};

const weekdayOf = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
};

export function readRoutine(profile) {
  const raw = profile?.trading_routine;
  const value = raw && typeof raw === "object" ? raw : {};
  return { days: value.days || {}, exceptions: value.exceptions || {} };
}

export const routineEnabled = (routine) =>
  Object.values(routine?.days || {}).some((d) => d?.kind) || Object.keys(routine?.exceptions || {}).length > 0;

// Règle du jour : l'exception datée l'emporte sur le jour de la semaine.
export function ruleFor(routine, iso) {
  const exception = routine?.exceptions?.[iso];
  if (exception?.kind) return { ...exception, exception: true };
  const day = routine?.days?.[String(weekdayOf(iso))];
  return day?.kind ? { ...day, exception: false } : null;
}

export const accountKind = (account) =>
  account?.type === "funded" || ["funded", "passed", "paid"].includes(account?.status) ? "funded" : "challenge";

// Un trade est « hors routine » quand le jour est off, ou quand son compte n'est
// pas du type prévu ce jour-là. Jour sans règle ou « libre » : jamais hors routine.
export function isOffRoutine(trade, accountsById, routine) {
  const rule = ruleFor(routine, trade?.date);
  if (!rule || rule.kind === "any") return false;
  if (rule.kind === "off") return true;
  const account = accountsById?.get?.(trade.account_id);
  if (!account) return false;
  return accountKind(account) !== rule.kind;
}

export function routineSummary(trades, accounts, routine) {
  const byId = new Map((accounts || []).map((a) => [a.id, a]));
  const res = { inCount: 0, inPnl: 0, inWins: 0, outCount: 0, outPnl: 0, outWins: 0 };
  (trades || []).forEach((t) => {
    const p = Number(t.pnl) || 0;
    if (isOffRoutine(t, byId, routine)) { res.outCount += 1; res.outPnl += p; if (p > 0) res.outWins += 1; }
    else { res.inCount += 1; res.inPnl += p; if (p > 0) res.inWins += 1; }
  });
  return res;
}
