import { todayISO } from "@/lib/format";
import { signedMoney } from "@/lib/accountHealth";

// ============================================================
//  Analyse d'un compte prop firm — 6 angles :
//  1. Trajectoire  2. Discipline  3. Edge
//  4. Fuites       5. Payout intel  6. Recos actionables
//
//  Toutes les fonctions sont pures. Le wrapper `analyzeAccount`
//  filtre les trades du compte et renvoie l'analyse complète.
// ============================================================

const WEEKDAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Parse ISO local (évite le décalage UTC en zone UTC−) → Date locale
function parseISO(dateStr) {
  const s = String(dateStr || "").slice(0, 10);
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function dayOfWeek(dateStr) {
  const dt = parseISO(dateStr);
  return dt ? dt.getDay() : null;
}

function daysBetween(iso1, iso2) {
  const d1 = parseISO(iso1);
  const d2 = parseISO(iso2);
  if (!d1 || !d2) return null;
  return Math.round((d2.getTime() - d1.getTime()) / 86400000);
}

// ---------- Groupement par jour de trading ----------

export function groupByDay(trades) {
  const byDay = {};
  for (const tr of trades) {
    const d = String(tr.date || "").slice(0, 10);
    if (!d) continue;
    if (!byDay[d]) byDay[d] = { date: d, trades: [], pnl: 0 };
    byDay[d].trades.push(tr);
    byDay[d].pnl += Number(tr.pnl) || 0;
  }
  return Object.values(byDay).sort((a, b) => (a.date < b.date ? -1 : 1));
}

// ---------- Edge (métriques de performance) ----------

export function computeEdgeMetrics(trades) {
  if (!trades.length) return null;
  const pnls = trades.map((t) => Number(t.pnl) || 0);
  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p < 0);
  const grossWin = wins.reduce((s, p) => s + p, 0);
  const grossLoss = Math.abs(losses.reduce((s, p) => s + p, 0));
  const avgWin = wins.length ? grossWin / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const winRate = pnls.length ? (wins.length / pnls.length) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;
  const expectancy = pnls.length ? pnls.reduce((s, p) => s + p, 0) / pnls.length : 0;
  const rr = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;

  let bestTrade = null;
  let worstTrade = null;
  for (const t of trades) {
    const p = Number(t.pnl) || 0;
    if (!bestTrade || p > (Number(bestTrade.pnl) || -Infinity)) bestTrade = t;
    if (!worstTrade || p < (Number(worstTrade.pnl) || Infinity)) worstTrade = t;
  }

  return {
    trades: trades.length,
    winCount: wins.length,
    lossCount: losses.length,
    winRate,
    avgWin,
    avgLoss,
    rr,
    profitFactor,
    expectancy,
    grossWin,
    grossLoss,
    bestTrade,
    worstTrade,
  };
}

// ---------- Trajectoire & phase ----------

export function computeTrajectory(days, health) {
  if (!days.length) return null;

  // Rythme all-time = PnL / jour de trading
  const avgPace = health.cum / days.length;
  // Rythme récent = moyenne des N derniers jours (plus pertinent pour la projection)
  const recentN = Math.min(5, days.length);
  const recent = days.slice(-recentN);
  const recentPace = recent.reduce((s, d) => s + d.pnl, 0) / recentN;

  // Projection : jours restants pour atteindre l'objectif au rythme récent (arrondi sup)
  let daysToTarget = null;
  if (health.target != null && health.cum < health.target && recentPace > 0) {
    daysToTarget = Math.ceil((health.target - health.cum) / recentPace);
  }

  // Projection cramé si rythme récent négatif
  let daysToBlown = null;
  if (health.maxDD != null && health.ddMargin > 0 && recentPace < 0) {
    daysToBlown = Math.ceil(health.ddMargin / Math.abs(recentPace));
  }

  // Streaks de jours gagnants / perdants
  let cur = 0;
  let maxWin = 0;
  let maxLoss = 0;
  for (const d of days) {
    if (d.pnl > 0) {
      cur = cur >= 0 ? cur + 1 : 1;
      if (cur > maxWin) maxWin = cur;
    } else if (d.pnl < 0) {
      cur = cur <= 0 ? cur - 1 : -1;
      if (Math.abs(cur) > maxLoss) maxLoss = Math.abs(cur);
    } else {
      cur = 0;
    }
  }

  // Meilleur jour / pire jour
  let bestDay = null;
  let worstDay = null;
  for (const d of days) {
    if (!bestDay || d.pnl > bestDay.pnl) bestDay = d;
    if (!worstDay || d.pnl < worstDay.pnl) worstDay = d;
  }

  return {
    tradingDays: days.length,
    avgPace,
    recentPace,
    recentN,
    daysToTarget,
    daysToBlown,
    maxWinStreak: maxWin,
    maxLossStreak: maxLoss,
    bestDay,
    worstDay,
  };
}

// ---------- Discipline & risque ----------

export function computeDiscipline(days, health) {
  // Nb fois où le daily loss a été touché ou frôlé
  const dailyLimit = health.dailyLimit;
  let dailyTouched = 0;
  let dailyNearMiss = 0;
  if (dailyLimit != null && dailyLimit > 0) {
    for (const d of days) {
      if (d.pnl < 0) {
        const used = Math.abs(d.pnl);
        if (used >= dailyLimit) dailyTouched++;
        else if (used >= dailyLimit * 0.7) dailyNearMiss++;
      }
    }
  }

  // Consistency rule (Apex-style, 30%) — le meilleur jour ne doit pas dépasser 30% du profit total
  let consistencyRule = null;
  if (health.cum > 0) {
    let bestDay = null;
    for (const d of days) if (!bestDay || d.pnl > bestDay.pnl) bestDay = d;
    if (bestDay && bestDay.pnl > 0) {
      const pct = (bestDay.pnl / health.cum) * 100;
      consistencyRule = {
        bestDay,
        bestDayPct: pct,
        threshold: 30,
        passed: pct <= 30,
      };
    }
  }

  // Overtrading : jours avec > N trades vs le reste
  const overThreshold = 5;
  const overDays = days.filter((d) => d.trades.length > overThreshold);
  const normalDays = days.filter((d) => d.trades.length <= overThreshold);
  const overtrading = {
    threshold: overThreshold,
    overCount: overDays.length,
    overAvgPnl: overDays.length ? overDays.reduce((s, d) => s + d.pnl, 0) / overDays.length : 0,
    normalAvgPnl: normalDays.length ? normalDays.reduce((s, d) => s + d.pnl, 0) / normalDays.length : 0,
  };

  return { dailyTouched, dailyNearMiss, consistencyRule, overtrading };
}

// ---------- Fuites (weekday, emotion, symbol, direction, plan) ----------

export function computeLeaks(trades, L = "fr") {
  const weekdays = L === "en" ? WEEKDAYS_EN : WEEKDAYS_FR;

  // Par jour de la semaine
  const byWeekday = {};
  for (const tr of trades) {
    const dow = dayOfWeek(tr.date);
    if (dow == null) continue;
    if (!byWeekday[dow]) byWeekday[dow] = { dow, label: weekdays[dow], pnl: 0, count: 0, wins: 0 };
    const p = Number(tr.pnl) || 0;
    byWeekday[dow].pnl += p;
    byWeekday[dow].count++;
    if (p > 0) byWeekday[dow].wins++;
  }
  const weekdayStats = Object.values(byWeekday)
    .map((w) => ({ ...w, winRate: w.count ? (w.wins / w.count) * 100 : 0, avgPnl: w.count ? w.pnl / w.count : 0 }))
    .sort((a, b) => a.dow - b.dow);

  // Par émotion
  const byEmotion = {};
  for (const tr of trades) {
    const e = tr.emotion;
    if (!e || e === "none") continue;
    if (!byEmotion[e]) byEmotion[e] = { emotion: e, pnl: 0, count: 0, wins: 0 };
    const p = Number(tr.pnl) || 0;
    byEmotion[e].pnl += p;
    byEmotion[e].count++;
    if (p > 0) byEmotion[e].wins++;
  }
  const emotionStats = Object.values(byEmotion)
    .map((e) => ({ ...e, winRate: e.count ? (e.wins / e.count) * 100 : 0, avgPnl: e.count ? e.pnl / e.count : 0 }))
    .sort((a, b) => a.pnl - b.pnl);

  // Par symbol
  const bySymbol = {};
  for (const tr of trades) {
    const s = tr.symbol || "—";
    if (!bySymbol[s]) bySymbol[s] = { symbol: s, pnl: 0, count: 0, wins: 0 };
    const p = Number(tr.pnl) || 0;
    bySymbol[s].pnl += p;
    bySymbol[s].count++;
    if (p > 0) bySymbol[s].wins++;
  }
  const symbolStats = Object.values(bySymbol)
    .map((s) => ({ ...s, winRate: s.count ? (s.wins / s.count) * 100 : 0 }))
    .sort((a, b) => b.pnl - a.pnl);

  // Par direction
  const dirs = { long: { count: 0, wins: 0, pnl: 0 }, short: { count: 0, wins: 0, pnl: 0 } };
  for (const tr of trades) {
    const d = tr.direction || tr.side;
    if (d !== "long" && d !== "short") continue;
    const p = Number(tr.pnl) || 0;
    dirs[d].pnl += p;
    dirs[d].count++;
    if (p > 0) dirs[d].wins++;
  }
  const directionStats = {
    long: dirs.long.count ? { ...dirs.long, winRate: (dirs.long.wins / dirs.long.count) * 100 } : null,
    short: dirs.short.count ? { ...dirs.short, winRate: (dirs.short.wins / dirs.short.count) * 100 } : null,
  };

  // In-plan vs off-plan (safe si champ absent)
  let planStats = null;
  const hasPlanField = trades.some((t) => t.in_plan !== undefined && t.in_plan !== null);
  if (hasPlanField) {
    const bucket = (list) => ({
      count: list.length,
      pnl: list.reduce((s, t) => s + (Number(t.pnl) || 0), 0),
      avgPnl: list.length ? list.reduce((s, t) => s + (Number(t.pnl) || 0), 0) / list.length : 0,
      wins: list.filter((t) => (Number(t.pnl) || 0) > 0).length,
      winRate: list.length ? (list.filter((t) => (Number(t.pnl) || 0) > 0).length / list.length) * 100 : 0,
    });
    planStats = {
      inPlan: bucket(trades.filter((t) => t.in_plan === true)),
      offPlan: bucket(trades.filter((t) => t.in_plan === false)),
    };
  }

  return { weekdayStats, emotionStats, symbolStats, directionStats, planStats };
}

// ---------- Payout intelligence (funded uniquement) ----------

export function computePayoutIntel(account, certificates, health, trajectory) {
  if (!health.isFunded) return null;

  const payouts = (certificates || [])
    .filter((c) => c.type === "payout" && c.firm === account.firm)
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1)); // ancien → récent

  if (!payouts.length) {
    let projected = null;
    if (trajectory && trajectory.recentPace > 0 && health.target != null && health.cum < health.target) {
      const days = Math.ceil((health.target - health.cum) / trajectory.recentPace);
      projected = { days, amount: health.target - health.cum };
    }
    return { payouts: [], count: 0, total: 0, avg: 0, stddev: 0, cv: 0, avgFreq: null, projected };
  }

  const total = payouts.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const avg = total / payouts.length;

  // Régularité : coefficient de variation
  const variance = payouts.reduce((s, p) => s + Math.pow((Number(p.amount) || 0) - avg, 2), 0) / payouts.length;
  const stddev = Math.sqrt(variance);
  const cv = avg > 0 ? (stddev / avg) * 100 : 0;

  // Fréquence moyenne entre payouts
  let avgFreq = null;
  if (payouts.length > 1) {
    let totalGap = 0;
    let gaps = 0;
    for (let i = 1; i < payouts.length; i++) {
      const g = daysBetween(payouts[i - 1].date, payouts[i].date);
      if (g != null) {
        totalGap += g;
        gaps++;
      }
    }
    avgFreq = gaps ? Math.round(totalGap / gaps) : null;
  }

  // Prochain payout projeté
  let projected = null;
  if (avgFreq != null && payouts.length) {
    const lastDate = payouts[payouts.length - 1].date;
    const daysSince = daysBetween(lastDate, todayISO());
    const daysUntilNext = daysSince != null ? Math.max(0, avgFreq - daysSince) : avgFreq;
    projected = { days: daysUntilNext, amount: avg };
  }

  return { payouts, count: payouts.length, total, avg, stddev, cv, avgFreq, projected };
}

// ---------- Recos actionables ----------

export function computeRecos(trajectory, discipline, leaks, health, L = "fr") {
  const en = L === "en";
  const recos = [];

  // 1. Jour de la semaine perdant
  const worstWeekday = leaks.weekdayStats
    .filter((w) => w.count >= 3)
    .slice()
    .sort((a, b) => a.pnl - b.pnl)[0];
  if (worstWeekday && worstWeekday.pnl < -50 && worstWeekday.avgPnl < 0) {
    recos.push({
      impact: Math.abs(worstWeekday.pnl),
      msg: en
        ? `You lose ${signedMoney(worstWeekday.avgPnl)}/trade on average on ${worstWeekday.label} (${worstWeekday.count} trades, ${Math.round(worstWeekday.winRate)}% WR) — consider skipping this day.`
        : `Tu perds ${signedMoney(worstWeekday.avgPnl)}/trade en moyenne le ${worstWeekday.label} (${worstWeekday.count} trades, ${Math.round(worstWeekday.winRate)}% WR) — envisage de skipper cette journée.`,
    });
  }

  // 2. Émotion coûteuse (la pire = la plus en bas de la liste triée par pnl asc)
  const worstEmotion = leaks.emotionStats.filter((e) => e.count >= 3)[0];
  if (worstEmotion && worstEmotion.pnl < -50) {
    const lossRate = Math.round(100 - worstEmotion.winRate);
    recos.push({
      impact: Math.abs(worstEmotion.pnl),
      msg: en
        ? `${lossRate}% of your "${worstEmotion.emotion}" trades lose (${signedMoney(worstEmotion.pnl)} total) — check your state before entering.`
        : `${lossRate}% de tes trades "${worstEmotion.emotion}" perdent (${signedMoney(worstEmotion.pnl)} au total) — check ton état avant d'entrer.`,
    });
  }

  // 3. In-plan vs off-plan (mega insight)
  if (leaks.planStats && leaks.planStats.inPlan.count && leaks.planStats.offPlan.count) {
    const delta = leaks.planStats.inPlan.avgPnl - leaks.planStats.offPlan.avgPnl;
    if (delta > 30 && leaks.planStats.offPlan.avgPnl < 0) {
      recos.push({
        impact: Math.abs(leaks.planStats.offPlan.pnl),
        msg: en
          ? `In-plan expectancy: ${signedMoney(leaks.planStats.inPlan.avgPnl)}/trade vs off-plan ${signedMoney(leaks.planStats.offPlan.avgPnl)}/trade — stick to your playbook.`
          : `Expectancy in-plan : ${signedMoney(leaks.planStats.inPlan.avgPnl)}/trade vs off-plan ${signedMoney(leaks.planStats.offPlan.avgPnl)}/trade — colle à ton playbook.`,
      });
    }
  }

  // 4. Overtrading
  const ot = discipline.overtrading;
  if (ot.overCount >= 3 && ot.overAvgPnl < ot.normalAvgPnl - 30) {
    recos.push({
      impact: Math.abs((ot.normalAvgPnl - ot.overAvgPnl) * ot.overCount),
      msg: en
        ? `Days with >${ot.threshold} trades average ${signedMoney(ot.overAvgPnl)} vs normal days ${signedMoney(ot.normalAvgPnl)} — cap your trade count.`
        : `Jours avec >${ot.threshold} trades : ${signedMoney(ot.overAvgPnl)} en moyenne vs jours normaux ${signedMoney(ot.normalAvgPnl)} — plafonne le nombre de trades par jour.`,
    });
  }

  // 5. Daily loss touché souvent
  if (discipline.dailyTouched >= 2) {
    const softStop = Math.round((health.dailyLimit || 0) * 0.5);
    recos.push({
      impact: discipline.dailyTouched * (health.dailyLimit || 0),
      msg: en
        ? `You hit the daily loss ${discipline.dailyTouched} times — a hard stop at -$${softStop} would have saved sessions.`
        : `Tu as touché le daily loss ${discipline.dailyTouched} fois — un hard stop à -$${softStop} de perte aurait sauvé des sessions.`,
    });
  }

  // 6. Symbol perdant
  const worstSymbol = leaks.symbolStats.filter((s) => s.count >= 3 && s.symbol !== "—").slice().sort((a, b) => a.pnl - b.pnl)[0];
  if (worstSymbol && worstSymbol.pnl < -100) {
    recos.push({
      impact: Math.abs(worstSymbol.pnl),
      msg: en
        ? `${worstSymbol.symbol} costs you ${signedMoney(worstSymbol.pnl)} across ${worstSymbol.count} trades (${Math.round(worstSymbol.winRate)}% WR) — consider dropping it.`
        : `${worstSymbol.symbol} te coûte ${signedMoney(worstSymbol.pnl)} sur ${worstSymbol.count} trades (${Math.round(worstSymbol.winRate)}% WR) — envisage de l'écarter.`,
    });
  }

  // 7. Longest losing streak
  if (trajectory && trajectory.maxLossStreak >= 4) {
    recos.push({
      impact: 50, // impact symbolique, priorité basse
      msg: en
        ? `${trajectory.maxLossStreak} losing days in a row max — set a cool-down rule (day off after 2 losing days).`
        : `${trajectory.maxLossStreak} jours perdants d'affilée max — pose une règle cool-down (jour off après 2 jours perdants).`,
    });
  }

  return recos.sort((a, b) => b.impact - a.impact).slice(0, 3);
}

// ---------- Courbe d'équité cumulée (pour rendu SVG) ----------

export function equityCurve(days, size) {
  let cum = 0;
  const points = [{ date: null, balance: size, cum: 0 }];
  for (const d of days) {
    cum += d.pnl;
    points.push({ date: d.date, balance: size + cum, cum });
  }
  return points;
}

// ---------- Wrapper : analyse complète d'un compte ----------

export function analyzeAccount(account, allTrades, certificates, health, L = "fr") {
  const trades = (allTrades || []).filter((t) => t.account_id === account.id);
  if (!trades.length) return null;

  const days = groupByDay(trades);
  const edge = computeEdgeMetrics(trades);
  const trajectory = computeTrajectory(days, health);
  const discipline = computeDiscipline(days, health);
  const leaks = computeLeaks(trades, L);
  const payoutIntel = computePayoutIntel(account, certificates, health, trajectory);
  const recos = computeRecos(trajectory, discipline, leaks, health, L);
  const curve = equityCurve(days, health.size);

  return { trades, days, edge, trajectory, discipline, leaks, payoutIntel, recos, curve };
}
