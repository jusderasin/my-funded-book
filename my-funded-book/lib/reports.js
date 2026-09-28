// Calculs purs pour les rapports : aucune dépendance React ni donnée simulée.
export function filterTrades(trades, filters) {
  const { account, symbol, dir, setup, session, outcome } = filters;
  return (trades || []).filter((trade) => {
    if (account && trade.account_id !== account) return false;
    if (symbol && trade.symbol !== symbol) return false;
    if (dir && trade.dir !== dir) return false;
    if (setup && trade.setup !== setup) return false;
    if (session && trade.session !== session) return false;
    if (outcome && trade.outcome !== outcome) return false;
    return true;
  });
}

export function dailyPnL(trades) {
  const result = {};
  (trades || []).forEach((trade) => {
    if (!trade.date) return;
    result[trade.date] = (result[trade.date] || 0) + (Number(trade.pnl) || 0);
  });
  return result;
}

export function reportKpis(trades) {
  const list = trades || [];
  const pnl = list.map((trade) => Number(trade.pnl) || 0);
  const r = list.map((trade) => Number(trade.r) || 0);
  const wins = pnl.filter((value) => value > 0);
  const losses = pnl.filter((value) => value < 0);
  const grossProfit = wins.reduce((sum, value) => sum + value, 0);
  const grossLoss = Math.abs(losses.reduce((sum, value) => sum + value, 0));
  const byDay = dailyPnL(list);
  const days = Object.values(byDay);
  const mean = days.length ? days.reduce((sum, value) => sum + value, 0) / days.length : 0;
  const std = Math.sqrt(days.length ? days.reduce((sum, value) => sum + (value - mean) ** 2, 0) / days.length : 0);
  const negatives = days.filter((value) => value < 0);
  const downside = Math.sqrt(negatives.length ? negatives.reduce((sum, value) => sum + (value - mean) ** 2, 0) / negatives.length : 0);
  let equity = 0; let peak = 0; let maxDrawdown = 0;
  const equityCurve = [...list].sort((a, b) => String(a.date).localeCompare(String(b.date))).map((trade) => {
    equity += Number(trade.pnl) || 0; peak = Math.max(peak, equity); maxDrawdown = Math.max(maxDrawdown, peak - equity); return equity;
  });
  return { n: list.length, net: pnl.reduce((sum, value) => sum + value, 0), rTotal: r.reduce((sum, value) => sum + value, 0), winRate: list.length ? wins.length / list.length * 100 : 0, profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit ? Infinity : 0, expectancyDollar: list.length ? pnl.reduce((sum, value) => sum + value, 0) / list.length : 0, expectancyR: list.length ? r.reduce((sum, value) => sum + value, 0) / list.length : 0, avgWin: wins.length ? grossProfit / wins.length : 0, avgLoss: losses.length ? grossLoss / losses.length : 0, biggestWin: Math.max(0, ...pnl), biggestLoss: Math.min(0, ...pnl), maxDrawdown, sharpe: std ? mean / std : 0, sortino: downside ? mean / downside : 0, greenDays: days.filter((value) => value > 0).length, redDays: days.filter((value) => value < 0).length, equityCurve, byDay };
}

export function tradesToCsv(trades) {
  const columns = ["date", "symbol", "dir", "session", "setup", "outcome", "r", "pnl", "plan"];
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [columns.join(","), ...(trades || []).map((trade) => columns.map((key) => escape(trade[key])).join(","))].join("\n");
}
