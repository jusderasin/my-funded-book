// Équipe PRISM : cinq agents spécialisés qui partagent le même cerveau
// (lib/prismPrompt.js) mais reçoivent chacun leur rôle, leurs données et
// leurs questions types. Utilisé côté serveur (Groq) et navigateur (IA perso).
import { accountHealth } from "@/lib/accountHealth";
import { PROP_RULES, accountRuleSet } from "@/lib/constants";

const num = (value) => Number(value) || 0;
const round = (value) => Math.round(value * 100) / 100;
const ACTIVE_STATUSES = ["active", "funded", "passed"];

export const AGENT_IDS = ["coach", "risk", "prop", "psy", "scribe"];

export const AGENTS = {
  coach: {
    name: "Nova",
    role: { fr: "Coach process", en: "Process coach" },
    blurb: { fr: "Relit tes trades et note ton exécution.", en: "Reviews your trades and grades your execution." },
    look: { skin: "#f1c7a5", hair: "#2b1d16", style: "bun", outfit: "#c6f432", glasses: false },
    suggestions: {
      fr: ["Où est-ce que je perds de l'argent ?", "Quel est mon meilleur setup ?", "Note mon process sur mes 10 derniers trades", "Donne-moi 2 règles pour ma prochaine session"],
      en: ["Where am I losing money?", "What is my best setup?", "Grade my process on my last 10 trades", "Give me 2 rules for my next session"],
    },
    persona: "You are Nova, the PROCESS COACH. Grade execution against the plan (plan followed, grade, tags), find the setups/sessions/days that cost money and give one or two concrete rules for the next session.",
  },
  risk: {
    name: "Atlas",
    role: { fr: "Gestion du risque", en: "Risk manager" },
    blurb: { fr: "Surveille drawdown, perte du jour et taille.", en: "Watches drawdown, daily loss and size." },
    look: { skin: "#c68a5e", hair: "#111111", style: "short", outfit: "#ef4444", glasses: false },
    suggestions: {
      fr: ["Combien je peux encore perdre sur chaque compte ?", "Quel est mon risque moyen par trade ?", "Est-ce que je risque trop après une perte ?", "Quelle taille max pour rester safe demain ?"],
      en: ["How much can I still lose on each account?", "What is my average risk per trade?", "Do I risk too much after a loss?", "What max size keeps me safe tomorrow?"],
    },
    persona: "You are Atlas, the RISK MANAGER. Use ACCOUNTS (drawdown margin, daily loss left, breach state) and the losses distribution. Always state the remaining drawdown and daily room in dollars and how many average losses that represents. Recommend a max risk per trade as a fraction of the remaining drawdown (e.g. 10–20 %). Be blunt when an account is close to breach.",
  },
  prop: {
    name: "Orion",
    role: { fr: "Expert prop firms", en: "Prop firm expert" },
    blurb: { fr: "Règles, objectifs, consistance, payouts : tout sur ta prop firm.", en: "Rules, targets, consistency, payouts: everything about your prop firm." },
    look: { skin: "#e8b48f", hair: "#5a3a22", style: "curly", outfit: "#38bdf8", glasses: true },
    suggestions: {
      fr: ["Où j'en suis sur mes comptes prop ?", "Explique-moi la règle de consistance de mon compte", "Drawdown EOD ou intraday : c'est quoi la différence ?", "Combien de jours avant mon prochain payout ?", "Quelle prop firm pour mon style ?"],
      en: ["Where do I stand on my prop accounts?", "Explain my account's consistency rule", "EOD vs intraday drawdown: what's the difference?", "How many days until my next payout?", "Which prop firm fits my style?"],
    },
    persona: [
      "You are Orion, the PROP FIRM EXPERT for futures prop firms (Topstep, Apex, Lucid, MFFU, Alpha Futures, Tradeify, Take Profit Trader, Phidias…).",
      "You explain rules clearly: profit target, max loss / trailing drawdown (end-of-day vs intraday vs static, and when the trail locks), daily loss limit, consistency rule (best day ≤ X % of total profit), minimum trading days, payout eligibility, evaluation vs funded phases, scaling, news and overnight restrictions, activation and reset fees.",
      "For the trader's own accounts use ACCOUNTS: say exactly where each one stands (profit vs target, drawdown margin, consistency: best day vs allowed share, payout eligibility and days left) and the fastest SAFE path to pass or to payout.",
      "Firm numbers: only quote numbers present in PROP_RULES or ACCOUNTS. PROP_RULES are indicative presets and may be outdated. For anything not in the data (exact payout split, fees, news policy, current promotions), say you are not certain and tell the trader to confirm on the firm's official help center before acting. Never invent a rule or a number.",
      "When asked to compare firms, compare on drawdown type, consistency, daily loss limit and target/max-loss ratio from PROP_RULES, and match it to the trader's own stats (win rate, biggest day share, average loss).",
    ].join(" "),
  },
  psy: {
    name: "Vega",
    role: { fr: "Mental & discipline", en: "Mindset & discipline" },
    blurb: { fr: "Repère le tilt, le revenge et le FOMO.", en: "Spots tilt, revenge and FOMO." },
    look: { skin: "#f5d0b5", hair: "#c2410c", style: "long", outfit: "#a78bfa", glasses: false },
    suggestions: {
      fr: ["Est-ce que je fais du revenge trading ?", "Comment je trade après une perte ?", "Quelles émotions me coûtent le plus ?", "Je trade trop certains jours ?"],
      en: ["Am I revenge trading?", "How do I trade after a loss?", "Which emotions cost me the most?", "Do I overtrade some days?"],
    },
    persona: "You are Vega, the MINDSET COACH. Use BEHAVIOUR (trades taken right after a loss the same day, overtrading days, emotion and tag stats like Revenge, FOMO, Chased). Name the pattern kindly but clearly, quote the numbers, and give one simple routine (stop rule, pause, checklist). You are not a therapist: no medical advice.",
  },
  scribe: {
    name: "Scribe",
    role: { fr: "Rapports & synthèse", en: "Reports & summary" },
    blurb: { fr: "Rédige ton bilan de la semaine ou du mois.", en: "Writes your weekly or monthly review." },
    look: { skin: "#d9a07a", hair: "#6b7280", style: "bald", outfit: "#f5b301", glasses: true },
    suggestions: {
      fr: ["Fais mon bilan de la semaine", "Fais mon bilan du mois", "Résume mes 3 meilleures et 3 pires journées", "Écris ma note de journal pour aujourd'hui"],
      en: ["Write my weekly review", "Write my monthly review", "Summarise my 3 best and 3 worst days", "Write today's journal note"],
    },
    persona: "You are Scribe, the REPORT WRITER. Produce clean, structured reviews with headings (## Résultats, ## Ce qui a marché, ## À corriger, ## Objectif suivant), numbers first, ready to paste into Obsidian or Notion. You may go up to ~300 words for a report.",
  },
};

// Comportement : trades pris juste après une perte le même jour, journées chargées.
export function behaviour(trades) {
  const byDay = {};
  [...trades].sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.created_at || "").localeCompare(String(b.created_at || "")))
    .forEach((trade) => (byDay[trade.date] ||= []).push(trade));
  const afterLoss = [];
  const dayCounts = [];
  Object.values(byDay).forEach((list) => {
    dayCounts.push(list.length);
    list.forEach((trade, index) => { if (index > 0 && num(list[index - 1].pnl) < 0) afterLoss.push(trade); });
  });
  const stat = (list) => ({ trades: list.length, pnl: round(list.reduce((sum, trade) => sum + num(trade.pnl), 0)), winRate: list.length ? Math.round(list.filter((trade) => num(trade.pnl) > 0).length / list.length * 100) : 0 });
  const avgPerDay = dayCounts.length ? dayCounts.reduce((a, b) => a + b, 0) / dayCounts.length : 0;
  const busyDays = Object.entries(byDay).filter(([, list]) => list.length >= Math.max(3, Math.ceil(avgPerDay * 1.8)));
  return {
    tradesAfterALossSameDay: stat(afterLoss),
    allTrades: stat(trades),
    avgTradesPerDay: round(avgPerDay),
    overtradingDays: busyDays.slice(0, 10).map(([date, list]) => ({ date, ...stat(list) })),
  };
}

export function accountsSnapshot(accounts = [], trades = [], certificates = [], lang = "fr") {
  return accounts.filter((account) => ACTIVE_STATUSES.includes(account.status)).slice(0, 12).map((account) => {
    const health = accountHealth(account, trades, certificates, lang);
    const consistency = accountRuleSet(account).consistency;
    const bestDay = Math.max(0, ...Object.values(health.byDay || {}).map(num));
    return {
      firm: account.firm, label: account.note || account.firm, size: num(account.size), phase: health.isFunded ? "funded" : "evaluation", status: account.status,
      pnl: round(health.cum), target: health.target || null, targetPct: health.target ? Math.round(health.targetPct) : null,
      drawdownType: health.trailingType, maxDrawdown: health.maxDD, drawdownMargin: health.ddMargin == null ? null : round(health.ddMargin), drawdownLocked: !!health.ddLocked, breached: !!health.breached,
      dailyLossLimit: health.dailyLimit || null, dailyLossLeft: health.dailyLimit ? round(health.dailyLeft) : null,
      consistencyRulePct: consistency, bestDay: round(bestDay), bestDaySharePct: health.cum > 0 ? Math.round(bestDay / health.cum * 100) : null,
      tradingDays: health.tradingDays, payoutEligible: health.isFunded ? !!health.payoutEligible : undefined, daysToPayout: health.isFunded ? health.daysToPayout ?? null : undefined,
      payoutsReceived: health.payoutCount || 0,
    };
  });
}

// Une ligne de statut calculée sans IA, affichée sur la carte de chaque agent.
export function agentBriefing(id, { trades = [], accounts = [], certificates = [], lang = "fr" }) {
  const en = lang === "en";
  if (!trades.length && id !== "prop") return en ? "Waiting for your first trades." : "En attente de tes premiers trades.";
  if (id === "coach") {
    const last = trades.slice(0, 10);
    const plan = Math.round(last.filter((trade) => trade.plan).length / last.length * 100);
    return en ? `Plan followed on ${plan}% of your last ${last.length} trades.` : `Plan respecté sur ${plan} % de tes ${last.length} derniers trades.`;
  }
  if (id === "risk" || id === "prop") {
    const snap = accountsSnapshot(accounts, trades, certificates, lang);
    if (!snap.length) return en ? "No active prop account yet." : "Aucun compte prop actif.";
    if (id === "risk") {
      const tight = snap.filter((account) => account.drawdownMargin != null).sort((a, b) => a.drawdownMargin - b.drawdownMargin)[0];
      if (!tight) return en ? `${snap.length} account(s), add their max drawdown to track risk.` : `${snap.length} compte(s) : ajoute leur drawdown max pour suivre le risque.`;
      return en ? `Tightest: ${tight.label}, $${Math.round(tight.drawdownMargin)} drawdown left.` : `Plus serré : ${tight.label}, ${Math.round(tight.drawdownMargin)} $ de drawdown restant.`;
    }
    const evalAcc = snap.find((account) => account.phase === "evaluation" && account.targetPct != null);
    if (evalAcc) return en ? `${evalAcc.label}: ${evalAcc.targetPct}% of the target.` : `${evalAcc.label} : ${evalAcc.targetPct} % de l'objectif.`;
    return en ? `${snap.length} funded account(s) followed.` : `${snap.length} compte(s) financé(s) suivi(s).`;
  }
  if (id === "psy") {
    const b = behaviour(trades).tradesAfterALossSameDay;
    if (!b.trades) return en ? "No trade taken right after a loss. Clean." : "Aucun trade pris juste après une perte. Propre.";
    return en ? `After a loss: ${b.trades} trades, ${b.winRate}% win rate.` : `Après une perte : ${b.trades} trades, ${b.winRate} % de réussite.`;
  }
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const week = trades.filter((trade) => String(trade.date) >= weekAgo);
  const pnl = Math.round(week.reduce((sum, trade) => sum + num(trade.pnl), 0));
  return en ? `7 days: ${week.length} trades, ${pnl >= 0 ? "+" : ""}$${pnl}.` : `7 jours : ${week.length} trades, ${pnl >= 0 ? "+" : ""}${pnl} $.`;
}

// Données additionnelles injectées dans le prompt selon l'agent.
export function agentContext(id, { trades = [], accounts = [], certificates = [], lang = "fr" }) {
  const extra = {};
  if (id === "risk" || id === "prop") extra.ACCOUNTS = accountsSnapshot(accounts, trades, certificates, lang);
  if (id === "prop") extra.PROP_RULES = PROP_RULES;
  if (id === "psy" || id === "risk") extra.BEHAVIOUR = behaviour(trades);
  return extra;
}
