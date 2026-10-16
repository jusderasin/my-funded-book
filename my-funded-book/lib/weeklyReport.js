// Rapport hebdo PRISM : calcul déterministe (pas d'appel IA) sur la dernière
// semaine lundi → dimanche. Partagé entre la carte du dashboard et le cron
// du dimanche qui envoie la notification.

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Semaine affichée : la semaine en cours le dimanche (jour du rapport),
// sinon la dernière semaine terminée.
export function reportWeek(now = new Date()) {
  const day = now.getDay();
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (day === 0 ? 0 : day));
  const monday = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() - 6);
  return { start: iso(monday), end: iso(sunday) };
}

function shift(range, days) {
  const move = (value) => { const [y, m, d] = value.split("-").map(Number); return iso(new Date(y, m - 1, d + days)); };
  return { start: move(range.start), end: move(range.end) };
}

const sum = (list) => list.reduce((total, trade) => total + (Number(trade.pnl) || 0), 0);
const tagsOf = (trade) => (Array.isArray(trade.tags) ? trade.tags : String(trade.tags || "").split(",")).map((tag) => String(tag).trim()).filter(Boolean);

function groupPnl(list, keyOf) {
  const map = {};
  list.forEach((trade) => {
    const key = keyOf(trade);
    if (!key) return;
    map[key] ||= { key, count: 0, pnl: 0, wins: 0 };
    map[key].count += 1;
    map[key].pnl += Number(trade.pnl) || 0;
    if ((Number(trade.pnl) || 0) > 0) map[key].wins += 1;
  });
  return Object.values(map).sort((a, b) => b.pnl - a.pnl);
}

export function weeklyReport(trades, now = new Date(), lang = "fr") {
  const en = lang === "en";
  const week = reportWeek(now);
  const prev = shift(week, -7);
  const inRange = (range) => (trade) => trade.date >= range.start && trade.date <= range.end;
  const list = (trades || []).filter(inRange(week));
  const before = (trades || []).filter(inRange(prev));
  const net = sum(list);
  const wins = list.filter((trade) => (Number(trade.pnl) || 0) > 0).length;
  const totalR = list.reduce((total, trade) => total + (Number(trade.r) || 0), 0);
  const setups = groupPnl(list, (trade) => trade.setup || null);
  const sessions = groupPnl(list, (trade) => trade.session || null);
  const days = groupPnl(list, (trade) => trade.date);
  const broken = list.filter((trade) => trade.plan === false);
  const brokenCost = sum(broken.filter((trade) => (Number(trade.pnl) || 0) < 0));

  // Erreurs répétées : tags qui reviennent sur les trades perdants ou hors plan.
  const errorCounts = {};
  list.filter((trade) => (Number(trade.pnl) || 0) < 0 || trade.plan === false).forEach((trade) => tagsOf(trade).forEach((tag) => { errorCounts[tag] = (errorCounts[tag] || 0) + 1; }));
  const errors = Object.entries(errorCounts).filter(([, count]) => count >= 2).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([tag, count]) => ({ tag, count }));
  if (broken.length >= 2) errors.unshift({ tag: en ? "Plan broken" : "Plan non respecté", count: broken.length, cost: brokenCost });

  // Une seule règle concrète pour la semaine suivante, par ordre de priorité.
  const worstSetup = setups.length > 1 ? setups[setups.length - 1] : null;
  const worstSession = sessions.length > 1 ? sessions[sessions.length - 1] : null;
  const worstDay = days.length ? days[days.length - 1] : null;
  let rule = null;
  if (broken.length >= 2 && brokenCost < 0) rule = en ? `Only take trades that tick your checklist: rule breaks cost you ${Math.round(-brokenCost)}$ this week.` : `Ne prends que les trades qui cochent ta checklist : les sorties de plan t'ont coûté ${Math.round(-brokenCost)}$ cette semaine.`;
  else if (worstDay && worstDay.pnl < 0 && list.filter((trade) => trade.date === worstDay.key).length >= 3) rule = en ? "Stop for the day after 2 losses in a row." : "Arrête la journée après 2 pertes d'affilée.";
  else if (worstSetup && worstSetup.pnl < 0 && worstSetup.count >= 2) rule = en ? `Pause ${worstSetup.key} next week (${worstSetup.count} trades, ${Math.round(worstSetup.pnl)}$).` : `Mets ${worstSetup.key} en pause la semaine prochaine (${worstSetup.count} trades, ${Math.round(worstSetup.pnl)}$).`;
  else if (worstSession && worstSession.pnl < 0 && worstSession.count >= 2) rule = en ? `Stop trading ${worstSession.key}: it's your losing session this week.` : `Ne trade plus en ${worstSession.key} : c'est ta session perdante de la semaine.`;
  else if (list.length) rule = en ? "Keep the same process: size stays the same, journal every trade." : "Garde le même process : même taille, journalise chaque trade.";

  return {
    week, count: list.length, net, totalR,
    winRate: list.length ? Math.round((wins / list.length) * 100) : 0,
    prevNet: sum(before), prevCount: before.length,
    bestSetup: setups[0] && setups[0].pnl > 0 ? setups[0] : null,
    worstSetup: worstSetup && worstSetup.pnl < 0 ? worstSetup : null,
    bestDay: days[0] && days[0].pnl > 0 ? days[0] : null,
    errors, rule, planRate: list.length ? Math.round(((list.length - broken.length) / list.length) * 100) : 0,
  };
}
