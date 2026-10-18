import { AGENTS, agentContext } from "@/lib/prismAgents";
import { advancedStats, isMissed, missedSummary, mistakesOf } from "@/lib/journalKit";

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

export function summarize(allTrades) {
  const missed = (allTrades || []).filter(isMissed);
  const trades = (allTrades || []).filter((trade) => !isMissed(trade));
  const advanced = advancedStats(trades);
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
    expectancyPerTrade: round(advanced.expectancy),
    expectancyR: round(advanced.expectancyR),
    maxDrawdown: round(advanced.maxDrawdown),
    firstVsLaterTradeOfDay: Object.fromEntries(Object.entries(advanced.rank).map(([key, row]) => [key, { trades: row.trades, pnl: round(row.pnl), winRate: row.trades ? Math.round(row.wins / row.trades * 100) : 0 }])),
    mistakes: group(trades, mistakesOf),
    missedTrades: missedSummary(missed),
    planFollowed: group(trades, (trade) => trade.plan ? "followed plan" : "broke plan"),
    recentTrades: trades.slice(0, 40).map((trade) => ({
      date: trade.date, session: trade.session, symbol: trade.symbol, dir: trade.dir, setup: trade.setup,
      r: trade.r, pnl: trade.pnl, plan: trade.plan, grade: trade.grade, emotion: trade.emotion, tags: trade.tags,
      notes: String(trade.why || trade.notes || "").slice(0, 160) || undefined,
    })),
  };
}

export function buildSystemPrompt(trades, lang, { agent = "coach", accounts = [], certificates = [] } = {}) {
  const meta = AGENTS[agent] || AGENTS.coach;
  const extra = agentContext(agent, { trades: (trades || []).filter((trade) => !isMissed(trade)), accounts, certificates, lang });
  return [
    "You are part of PRISM, the AI team inside MyTradeBook, a trading journal for futures prop-firm traders.",
    meta.persona,
    `Answer in ${lang === "en" ? "English" : "French (tutoiement)"}. Be direct, concrete and short: max ~180 words unless you write a report, bullet points welcome.`,
    "Base every claim about the trader ONLY on the JSON data below; quote the numbers (trades, P&L, win rate, dollars). If the sample is too small (< 10 trades in a bucket), say so.",
    "Never give buy/sell signals, price predictions or personalised investment advice. You analyse past behaviour and rules only.",
    "missedTrades are setups the trader saw but did not take (hypothetical P&L, excluded from all stats): use them to talk about hesitation or good discipline. mistakes groups trades by execution-mistake tag (cost = pnl).",
    "If there are no trades, explain how to log or import trades (CSV import in the Trades page).",
    `DATA: ${JSON.stringify(summarize(trades || []))}`,
    ...Object.entries(extra).map(([key, value]) => `${key}: ${JSON.stringify(value)}`),
  ].join("\n");
}
