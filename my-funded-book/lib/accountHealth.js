import { todayISO } from "@/lib/format";

// Montant signé lisible : −$1 320 / $320
export function signedMoney(v) {
  const n = Number(v) || 0;
  const abs = Math.abs(Math.round(n)).toLocaleString("fr-FR");
  return (n < 0 ? "−$" : "$") + abs;
}

/**
 * Santé complète d'un compte prop firm à partir des trades loggés (PnL réalisé).
 * Indicateur — pas la valeur officielle de la prop firm (pas d'unrealized intraday).
 *
 * account : { id, firm, size, type, status, date, daily_loss_limit, max_drawdown,
 *             trailing_drawdown, profit_target,
 *             payout_min?, payout_cycle_days?, min_trading_days? }  (les 3 derniers optionnels)
 * allTrades   : tous les trades (on filtre sur account_id)
 * certificates: pour l'historique payout (type === "payout", matché par firm)
 * L : "fr" | "en"
 */
export function accountHealth(account, allTrades, certificates = [], L = "fr") {
  const en = L === "en";
  const size = Number(account.size) || 0;
  const dailyLimit = account.daily_loss_limit != null ? Number(account.daily_loss_limit) : null;
  const maxDD = account.max_drawdown != null ? Number(account.max_drawdown) : null;
  const trailing = account.trailing_drawdown !== false;
  const target = account.profit_target != null ? Number(account.profit_target) : null;

  // Règles payout optionnelles (colonnes ajoutées via migration)
  const payoutMin = account.payout_min != null ? Number(account.payout_min) : null;
  const cycleDays = account.payout_cycle_days != null ? Number(account.payout_cycle_days) : null;
  const minTradingDays = account.min_trading_days != null ? Number(account.min_trading_days) : null;

  const at = (allTrades || [])
    .filter((tr) => tr.account_id === account.id)
    .slice()
    .sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : (a.created_at || "") < (b.created_at || "") ? -1 : 1
    );

  let cum = 0;
  let peak = 0;
  const byDay = {};
  for (const tr of at) {
    const p = Number(tr.pnl) || 0;
    cum += p;
    if (cum > peak) peak = cum;
    byDay[tr.date] = (byDay[tr.date] || 0) + p;
  }
  const balance = size + cum;
  const highWater = size + peak;
  const tradingDays = Object.keys(byDay).length;

  // ----- Drawdown (trailing avec lock à la balance initiale, façon Apex ; sinon statique) -----
  let ddThreshold = null;
  let ddMargin = null;
  let ddMarginPct = null;
  if (maxDD != null) {
    ddThreshold = trailing ? Math.min(highWater - maxDD, size) : size - maxDD;
    ddMargin = balance - ddThreshold; // $ restants avant de cramer
    ddMarginPct = maxDD > 0 ? (ddMargin / maxDD) * 100 : null;
  }
  const breached = ddMargin != null && ddMargin <= 0;

  // ----- Daily loss (aujourd'hui) -----
  const today = todayISO();
  const todayPnl = byDay[today] || 0;
  let dailyUsed = null;
  let dailyLeft = null;
  let dailyPct = null;
  let dailyHit = false;
  if (dailyLimit != null) {
    dailyUsed = todayPnl < 0 ? -todayPnl : 0;
    dailyLeft = dailyLimit - dailyUsed;
    dailyPct = dailyLimit > 0 ? (dailyUsed / dailyLimit) * 100 : 0;
    dailyHit = dailyUsed >= dailyLimit && dailyLimit > 0;
  }

  // ----- Objectif de profit -----
  let targetPct = null;
  let targetReached = false;
  if (target != null && target > 0) {
    targetPct = Math.min(100, (cum / target) * 100);
    targetReached = cum >= target;
  }

  // ----- Payouts (historique via certificates type=payout, matché par firm) -----
  const payouts = (certificates || [])
    .filter((c) => c.type === "payout" && c.firm === account.firm)
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1)); // plus récent d'abord
  const payoutTotal = payouts.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const lastPayoutDate = payouts.length ? payouts[0].date : account.date || null;

  // ----- Éligibilité / countdown payout (funded uniquement) -----
  const isFunded = account.type === "funded" || account.status === "funded" || account.status === "passed";
  let daysSince = null;
  let daysToPayout = null;
  let payoutEligible = false;
  let profitOkForPayout = false;
  let minDaysLeft = 0;
  if (isFunded) {
    if (lastPayoutDate) daysSince = Math.floor((new Date(today) - new Date(lastPayoutDate)) / 86400000);
    profitOkForPayout = payoutMin != null ? cum >= payoutMin : target != null ? cum >= target : cum > 0;
    minDaysLeft = minTradingDays != null ? Math.max(0, minTradingDays - tradingDays) : 0;
    const daysOk = cycleDays != null ? daysSince != null && daysSince >= cycleDays : true;
    payoutEligible = profitOkForPayout && daysOk && minDaysLeft === 0 && !breached;
    if (cycleDays != null && daysSince != null) daysToPayout = Math.max(0, cycleDays - daysSince);
  }

  // ----- Alertes (courtes, bilingues) -----
  const alerts = [];
  if (breached) {
    alerts.push({ level: "danger", msg: en ? "🛑 Account blown — drawdown exceeded" : "🛑 Compte cramé — drawdown dépassé" });
  } else if (ddMargin != null && ddMargin <= maxDD * 0.2) {
    alerts.push({ level: "danger", msg: (en ? "⚠️ Only " : "⚠️ Plus que ") + signedMoney(ddMargin) + (en ? " before breach" : " avant breach") });
  } else if (ddMargin != null && ddMargin <= maxDD * 0.5) {
    alerts.push({ level: "warn", msg: (en ? "Low margin: " : "Marge faible : ") + signedMoney(ddMargin) + (en ? " to breach" : " avant breach") });
  }

  if (dailyHit) {
    alerts.push({ level: "danger", msg: en ? "🛑 Daily loss hit — stop for today" : "🛑 Daily loss atteint — stop aujourd'hui" });
  } else if (dailyPct != null && dailyPct >= 70) {
    alerts.push({ level: "warn", msg: (en ? "Day loss at " : "Perte du jour à ") + Math.round(dailyPct) + "% — " + signedMoney(dailyLeft) + (en ? " left" : " restant") });
  }

  if (isFunded) {
    if (payoutEligible) alerts.push({ level: "ok", msg: en ? "✅ Payout available" : "✅ Payout disponible" });
    else if (daysToPayout != null && daysToPayout > 0 && profitOkForPayout) alerts.push({ level: "warn", msg: (en ? "⏳ Withdrawal in " : "⏳ Retrait possible dans ") + daysToPayout + (en ? "d" : "j") });
    if (minDaysLeft > 0) alerts.push({ level: "info", msg: minDaysLeft + (en ? " trading day(s) left" : " jour(s) de trading min restant(s)") });
  } else if (targetReached && !breached) {
    alerts.push({ level: "ok", msg: en ? "✅ Target reached — ready to fund" : "✅ Objectif atteint — prêt à passer en funded" });
  }

  return {
    size, balance, highWater, cum, tradingDays,
    maxDD, trailing, ddThreshold, ddMargin, ddMarginPct, breached,
    dailyLimit, dailyUsed, dailyLeft, dailyPct, dailyHit, todayPnl,
    target, targetPct, targetReached,
    isFunded, payoutTotal, payoutCount: payouts.length, lastPayoutDate,
    payoutEligible, daysToPayout, minDaysLeft,
    wins: at.filter((tr) => (Number(tr.pnl) || 0) > 0).length,
    losses: at.filter((tr) => (Number(tr.pnl) || 0) < 0).length,
    trades: at.length,
    alerts,
  };
}
