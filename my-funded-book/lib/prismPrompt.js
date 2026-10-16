// Cerveau commun de PRISM : résumé chiffré des trades + prompt système.
// Utilisé côté serveur (Groq) et dans le navigateur (IA perso : Claude, OpenAI, Ollama…).
const num = (value) => Number(value) || 0;
const round = (value) => Math.round(value * 100) / 100;

function group(trades, keyOf) {
  const map = {};
  trades.forEach((trade) => {
    [].concat(keyOf(trade) ?? []).filter(Boolean).forEach((key) => {
      const row = (map[key] ||= { trades: 0, pnl: 0, wins: 0 });
      row.trades += 1;
      row.pnl += num(trade.pnl);
      if (num(trade.pnl) > 0) row.wins += 1;
    });
  });
  return Object.fromEntries(Object.entries(map)
    .sort((a, b) => b[1].trades - a[1].trades)
    .slice(0, 15)
    .map(([key, row]) => [key, { trades: row.trades, pnl: round(row.pnl), winRate: Math.round(row.wins / row.trades * 100) }]));
}

export function summarize(trades) {
  const pnls = trades.map((trade) => num(trade.pnl));
  const wins = pnls.filter((pnl) => pnl > 0);
  const losses = pnls.filter((pnl) => pnl < 0);
  const weekday = (trade) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(`${trade.date}T12:00:00`).getDay()];
  const tags = (trade) => Array.isArray(trade.tags) ? trade.tags : String(trade.tags || "").split(",").map((tag) => tag.trim());
  return {
    totalTrades: trades.length,
    netPnl: round(pnls.reduce((a, b) => a + b, 0)),
    winRate: trades.length ? Math.round(wins.length / trades.length * 100) : 0,
    avgWin: wins.length ? round(wins.reduce((a, b) => a + b, 0) / wins.length) : 0,
    avgLoss: losses.length ? round(losses.reduce((a, b) => a + b, 0) / losses.length) : 0,
    biggestLoss: losses.length ? Math.min(...losses) : 0,
    firstDate: trades.at(-1)?.date, lastDate: trades[0]?.date,
    bySetup: group(trades, (trade) => trade.setup),
    bySession: group(trades, (trade) => trade.session),
    byDirection: group(trades, (trade) => trade.dir),
    bySymbol: group(trades, (trade) => trade.symbol),
    byWeekday: group(trades, weekday),
    byTag: group(trades, tags),
    byEmotion: group(trades, (trade) => trade.emotion),
    byGrade: group(trades, (trade) => trade.grade),
    planFollowed: group(trades, (trade) => trade.plan ? "followed plan" : "broke plan"),
    recentTrades: trades.slice(0, 40).map((trade) => ({
      date: trade.date, session: trade.session, symbol: trade.symbol, dir: trade.dir, setup: trade.setup,
      r: trade.r, pnl: trade.pnl, plan: trade.plan, emotion: trade.emotion, tags: trade.tags,
      notes: String(trade.notes || trade.note || "").slice(0, 140) || undefined,
    })),
  };
}

export function buildSystemPrompt(trades, lang) {
  return [
    "You are PRISM, the trading-journal coach inside MyTradeBook, for futures prop-firm traders.",
    `Answer in ${lang === "en" ? "English" : "French (tutoiement)"}. Be direct, concrete and short: max ~180 words, bullet points welcome.`,
    "Base every claim ONLY on the JSON data below; quote the numbers (trades, P&L, win rate). If the sample is too small (< 10 trades in a bucket), say so.",
    "Focus on process: where the trader loses money, which setups/sessions/days/emotions cost them, rule breaks, and one or two actionable rules to apply next session.",
    "Never give buy/sell signals, price predictions or personalised investment advice. You analyse past behaviour only.",
    "If there are no trades, explain how to log or import trades (CSV import in the Trades page).",
    `DATA: ${JSON.stringify(summarize(trades || []))}`,
  ].join("\n");
}
