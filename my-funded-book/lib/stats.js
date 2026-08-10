// Toute la logique métier : dérive les KPI, l'Edge Score et les séries de graphiques
// à partir des trades bruts. Pure fonction, testable, sans effet de bord.

export function computeStats(trades, startingBalance = 600000) {
  const tr = trades || [];
  const wins = tr.filter((t) => t.pnl > 0);
  const losses = tr.filter((t) => t.pnl < 0);
  const net = tr.reduce((s, t) => s + Number(t.pnl || 0), 0);
  const gp = wins.reduce((s, t) => s + Number(t.pnl), 0);
  const gl = Math.abs(losses.reduce((s, t) => s + Number(t.pnl), 0));
  const wr = tr.length ? (wins.length / tr.length) * 100 : 0;
  const pf = gl > 0 ? gp / gl : gp > 0 ? 99 : 0;
  const avgW = wins.length ? gp / wins.length : 0;
  const avgL = losses.length ? gl / losses.length : 0;
  const wl = avgL > 0 ? avgW / avgL : avgW > 0 ? 3 : 0;

  // Agrégation par jour
  const byDay = {};
  tr.forEach((t) => {
    byDay[t.date] = (byDay[t.date] || 0) + Number(t.pnl || 0);
  });
  const days = Object.keys(byDay).sort();
  const greenDays = days.filter((d) => byDay[d] > 0).length;
  const dayWr = days.length ? (greenDays / days.length) * 100 : 0;

  // Courbe d'équité + drawdown
  let eq = startingBalance;
  let peak = eq;
  let maxDD = 0;
  const curve = [{ d: days[0] || "", eq }];
  const ddSeries = [0];
  days.forEach((d) => {
    eq += byDay[d];
    peak = Math.max(peak, eq);
    maxDD = Math.max(maxDD, peak - eq);
    curve.push({ d, eq });
    ddSeries.push(eq - peak);
  });
  const recovery = maxDD > 0 ? net / maxDD : net > 0 ? 3 : 0;

  // Edge score (6 axes normalisés 0-100)
  const clamp = (x) => Math.max(0, Math.min(100, x));
  const axes = {
    "Win %": clamp(wr),
    "Profit factor": clamp((pf / 3) * 100),
    "Avg win/loss": clamp((wl / 3) * 100),
    "Recovery factor": clamp((recovery / 3) * 100),
    "Max drawdown": clamp(100 - (maxDD / (gp || 1)) * 100),
    Consistency: clamp(dayWr),
  };
  const edge = Object.values(axes).reduce((a, b) => a + b, 0) / 6;

  // Streak de trades "plan respecté" en partant du plus récent
  const chrono = tr.slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  let streak = 0;
  for (const t of chrono) {
    if (t.plan) streak++;
    else break;
  }
  const planPct = tr.length ? (tr.filter((t) => t.plan).length / tr.length) * 100 : 0;

  // Cumul net par jour
  let cum = 0;
  const cumSeries = days.map((d) => {
    cum += byDay[d];
    return cum;
  });

  return {
    tr, wins, losses, net, gp, gl, wr, pf, avgW, avgL, wl,
    byDay, days, greenDays, dayWr, maxDD, recovery, axes, edge,
    streak, planPct, curve, ddSeries, cumSeries, startingBalance,
    balance: startingBalance + net,
  };
}

export function breakdownBy(trades, key) {
  const groups = {};
  (trades || []).forEach((t) => {
    let keys = [];
    if (key === "tag") keys = t.tags && t.tags.length ? t.tags : ["(sans tag)"];
    else keys = [t[key] || "—"];
    keys.forEach((k) => {
      groups[k] = groups[k] || { n: 0, w: 0, pnl: 0 };
      groups[k].n++;
      if (t.pnl > 0) groups[k].w++;
      groups[k].pnl += Number(t.pnl || 0);
    });
  });
  return Object.keys(groups)
    .sort((a, b) => groups[b].pnl - groups[a].pnl)
    .map((k) => ({ key: k, ...groups[k], wr: (groups[k].w / groups[k].n) * 100 }));
}
