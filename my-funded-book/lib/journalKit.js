// Outils du journal partagés par l'app, PRISM et le dashboard.
// Pas de nouvelle colonne en base : un trade raté et les erreurs sont portés
// par le tableau `tags` existant.

// Tag réservé : setup valide que le trader n'a pas pris (ou a laissé filer).
// Son P&L est hypothétique et il est exclu de toutes les statistiques réelles.
export const MISSED_TAG = "Missed";
export const isMissed = (trade) => Array.isArray(trade?.tags) && trade.tags.includes(MISSED_TAG);

// Erreurs d'exécution : liste fermée pour pouvoir les compter.
export const MISTAKE_TAGS = [
  "Early", "Late", "Chased", "FOMO entry", "Revenge", "Oversized",
  "Pas de retest", "Stop trop serré", "Stop hors plan", "Sortie anticipée", "Hors fenêtre", "Hors plan",
];
const MISTAKE_SET = new Set(MISTAKE_TAGS.map((tag) => tag.toLowerCase()));
export const isMistakeTag = (tag) => MISTAKE_SET.has(String(tag).toLowerCase());
export const mistakesOf = (trade) => (Array.isArray(trade?.tags) ? trade.tags : []).filter(isMistakeTag);

// « À revoir » : trade réel sans capture ou sans note un minimum rédigée.
export const needsReview = (trade) => !isMissed(trade) && (!trade?.screenshot_url || String(trade?.why || "").trim().length < 25);

export const NOTE_TEMPLATES = {
  execution: {
    fr: { label: "Revue d'exécution", text: "Ce que j'ai vu :\nPourquoi j'entre (chemin du plan) :\nCe que j'ai fait (entrée, stop, sortie) :\nErreur principale :\nJe le reprendrais ? Oui / Non — pourquoi :\n" },
    en: { label: "Execution review", text: "What I saw:\nWhy I entered (plan path):\nWhat I did (entry, stop, exit):\nMain mistake:\nWould I take it again? Yes / No — why:\n" },
  },
  loss: {
    fr: { label: "Récap de perte", text: "Le setup était-il valide ? Oui / Non\nLa perte vient du marché ou de moi :\nRègle cassée :\nCe que je fais différemment demain :\n" },
    en: { label: "Loss recap", text: "Was the setup valid? Yes / No\nThe loss came from the market or from me:\nRule broken:\nWhat I do differently tomorrow:\n" },
  },
  missed: {
    fr: { label: "Trade raté", text: "Setup vu :\nPourquoi je ne l'ai pas pris (peur, hésitation, hors fenêtre, pas armé) :\nC'était le bon choix ? Oui / Non\nRésultat qu'il aurait donné :\n" },
    en: { label: "Missed trade", text: "Setup seen:\nWhy I didn't take it (fear, hesitation, out of window, not armed):\nWas it the right call? Yes / No\nResult it would have given:\n" },
  },
  weekly: {
    fr: { label: "Revue de la semaine", text: "Résultat de la semaine :\nMeilleur trade et pourquoi :\nErreur qui revient :\nUne seule règle pour la semaine prochaine :\n" },
    en: { label: "Weekly review", text: "Result of the week:\nBest trade and why:\nRecurring mistake:\nOne rule for next week:\n" },
  },
};

const num = (value) => Number(value) || 0;

function sortChrono(trades) {
  return [...trades].sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.created_at || "").localeCompare(String(b.created_at || "")));
}

// Statistiques avancées sur les trades réels (les ratés doivent déjà être exclus).
export function advancedStats(trades) {
  const pnls = trades.map((trade) => num(trade.pnl));
  const n = trades.length;
  const expectancy = n ? pnls.reduce((a, b) => a + b, 0) / n : 0;
  const expectancyR = n ? trades.reduce((sum, trade) => sum + num(trade.r), 0) / n : 0;

  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  sortChrono(trades).forEach((trade) => {
    equity += num(trade.pnl);
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
  });

  // 1er trade du jour contre les suivants.
  const byDay = {};
  sortChrono(trades).forEach((trade) => (byDay[trade.date] ||= []).push(trade));
  const bucket = () => ({ trades: 0, pnl: 0, wins: 0 });
  const rank = { first: bucket(), second: bucket(), later: bucket() };
  Object.values(byDay).forEach((list) => list.forEach((trade, index) => {
    const row = rank[index === 0 ? "first" : index === 1 ? "second" : "later"];
    row.trades += 1;
    row.pnl += num(trade.pnl);
    if (num(trade.pnl) > 0) row.wins += 1;
  }));

  // P&L par heure d'entrée si l'heure est renseignée (champ execution.entry_time).
  const byHour = {};
  trades.forEach((trade) => {
    const time = trade.execution?.entry_time || trade.entry_time;
    const hour = /^\d{1,2}:/.test(String(time || "")) ? String(time).split(":")[0].padStart(2, "0") : null;
    if (!hour) return;
    const row = (byHour[hour] ||= bucket());
    row.trades += 1;
    row.pnl += num(trade.pnl);
    if (num(trade.pnl) > 0) row.wins += 1;
  });

  // Coût des erreurs : P&L cumulé des trades portant chaque erreur.
  const mistakes = {};
  trades.forEach((trade) => mistakesOf(trade).forEach((tag) => {
    const row = (mistakes[tag] ||= bucket());
    row.trades += 1;
    row.pnl += num(trade.pnl);
    if (num(trade.pnl) > 0) row.wins += 1;
  }));

  return { expectancy, expectancyR, maxDrawdown, rank, byHour, mistakes };
}

export function missedSummary(missed) {
  const pnl = missed.reduce((sum, trade) => sum + num(trade.pnl), 0);
  return { count: missed.length, hypotheticalPnl: Math.round(pnl * 100) / 100, wouldHaveWon: missed.filter((trade) => num(trade.pnl) > 0).length };
}
