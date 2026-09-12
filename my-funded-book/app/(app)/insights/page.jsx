"use client";

import { useBook } from "@/components/BookProvider";
import NovaInsightCard from "@/components/NovaInsightCard";
import { fmtMoney } from "@/lib/format";

/**
 * Insights Page — AI-powered trading pattern analysis
 * Renders NOVA cards showing win patterns, risk alerts, behavioral insights
 *
 * File path: app/(app)/insights/page.jsx
 */

export default function InsightsPage() {
  const { stats: s, trades, t, lang } = useBook();
  const L = lang === "en" ? "en" : "fr";

  if (!trades || trades.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted2">{L === "en" ? "No trades yet. Start trading to see insights!" : "Aucun trade pour le moment."}</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // CALCULATE INSIGHTS
  // ─────────────────────────────────────────────────────────────────

  // 1. Win Rate & Performance Stats
  const totalTrades = trades.length;
  const winningTrades = trades.filter((t) => t.pnl > 0).length;
  const winRate = ((winningTrades / totalTrades) * 100).toFixed(0);
  const avgWin = totalTrades > 0
    ? trades
        .filter((t) => t.pnl > 0)
        .reduce((sum, t) => sum + t.pnl, 0) /
      Math.max(1, winningTrades)
    : 0;
  const avgLoss = totalTrades > 0
    ? trades
        .filter((t) => t.pnl < 0)
        .reduce((sum, t) => sum + t.pnl, 0) /
      Math.max(1, trades.filter((t) => t.pnl < 0).length)
    : 0;

  // 2. Recent performance (last 10 trades vs previous 10)
  const recentTrades = trades.slice(0, 10);
  const previousTrades = trades.slice(10, 20);
  const recentWinRate = (
    (recentTrades.filter((t) => t.pnl > 0).length / recentTrades.length) *
    100
  ).toFixed(0);
  const previousWinRate = (
    (previousTrades.filter((t) => t.pnl > 0).length / previousTrades.length) *
    100
  ).toFixed(0);
  const trendingUp = recentWinRate > previousWinRate;

  // 3. Largest winners & losers this week
  const aWeekAgo = new Date();
  aWeekAgo.setDate(aWeekAgo.getDate() - 7);
  const weeklyTrades = trades.filter((t) => new Date(t.date) > aWeekAgo);
  const bestTrade = weeklyTrades.length > 0
    ? weeklyTrades.reduce((max, t) => (t.pnl > max.pnl ? t : max))
    : null;
  const worstTrade = weeklyTrades.length > 0
    ? weeklyTrades.reduce((min, t) => (t.pnl < min.pnl ? t : min))
    : null;

  // 4. Consistency check
  // (s.pf est déjà calculé par computeStats — s.totalWins/s.totalLosses n'existent pas
  // sur l'objet stats, ce qui affichait toujours "—" auparavant)
  const profitFactor = Number.isFinite(s.pf) ? s.pf.toFixed(2) : "—";

  // 5. Risk metrics
  const currentDrawdown = s.maxDD || 0;
  const drawdownPct = (currentDrawdown / (s.balance || 1)) * 100;

  // ─────────────────────────────────────────────────────────────────
  // DERIVED STATUSES
  // ─────────────────────────────────────────────────────────────────

  // Risk status
  const isDrawdownHigh = Math.abs(drawdownPct) > 5;
  const hasDailyLosses = s.dailyLosses && s.dailyLosses.some((d) => d < -s.balance * 0.02);

  // Trending status
  const isProfitable = s.net > 0;
  const isTrendingUp = trendingUp && isProfitable;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="border-b border-line pb-6">
        <h1 className="text-2xl font-bold text-white mb-2">
          {L === "en" ? "Trading Insights" : "Insights de Trading"}
        </h1>
        <p className="text-muted">
          {L === "en"
            ? "AI-powered pattern analysis and recommendations"
            : "Analyse IA de vos patterns et recommandations"}
        </p>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* SECTION 1: CRITICAL ALERTS */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {(isDrawdownHigh || hasDailyLosses) && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted2">
            ⚠️ {L === "en" ? "Critical Alerts" : "Alertes Critiques"}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {isDrawdownHigh && (
              <NovaInsightCard
                icon="📉"
                statusLabel={L === "en" ? "High Drawdown" : "Drawdown Élevé"}
                statusColor="text-loss"
                title={L === "en" ? "Drawdown Risk" : "Risque de Drawdown"}
                metric1={{ label: L === "en" ? "Max DD" : "Max DD", value: fmtMoney(currentDrawdown), change: null }}
                metric2={{ label: "%", value: `${drawdownPct.toFixed(1)}%`, change: null }}
                metric3={{ label: L === "en" ? "Balance" : "Solde", value: fmtMoney(s.balance), change: null }}
                recommendation={
                  L === "en"
                    ? "Your drawdown exceeds 5% of account balance. Monitor closely and consider reducing position sizes."
                    : "Votre drawdown dépasse 5%. Réduisez les tailles de position et surveillez étroitement."
                }
                variant="critical"
              />
            )}

            {hasDailyLosses && (
              <NovaInsightCard
                icon="🛑"
                statusLabel={L === "en" ? "Action Required" : "Action Requise"}
                statusColor="text-loss"
                title={L === "en" ? "Daily Loss Limit" : "Limite Perte Quotidienne"}
                metric1={{ label: L === "en" ? "Rule" : "Règle", value: "2% max", change: null }}
                metric2={{ label: L === "en" ? "Days Broken" : "Jours Cassés", value: "—", change: null }}
                metric3={{ label: L === "en" ? "Adherence" : "Respect", value: `${s.planPct.toFixed(0)}%`, change: null }}
                recommendation={
                  L === "en"
                    ? "You've broken the 2% daily loss rule. Close for today and review your risk parameters."
                    : "Vous avez cassé la règle 2%. Fermez pour aujourd'hui et révisez vos paramètres."
                }
                variant="critical"
              />
            )}
          </div>
        </section>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* SECTION 2: SWEET SPOTS & OPPORTUNITIES */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted2">
          ✨ {L === "en" ? "Performance Insights" : "Insights de Performance"}
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Win Rate Overview */}
          <NovaInsightCard
            icon="📊"
            statusLabel={L === "en" ? "Overall" : "Global"}
            statusColor="text-accent"
            title={L === "en" ? "Win Rate & Profitability" : "Taux de Gain & Rentabilité"}
            metric1={{ label: L === "en" ? "Win Rate" : "Taux Gain", value: `${winRate}%`, change: null }}
            metric2={{ label: L === "en" ? "Profit Factor" : "Facteur Profit", value: profitFactor, change: null }}
            metric3={{ label: L === "en" ? "Total Trades" : "Total Trades", value: `${totalTrades}`, change: null }}
            recommendation={
              L === "en"
                ? `You have a ${winRate}% win rate with ${totalTrades} trades. Profit factor of ${profitFactor} indicates your winners are ${profitFactor > 1 ? "larger than" : "smaller than"} your losers.`
                : `Taux de ${winRate}% avec ${totalTrades} trades. Un facteur de profit de ${profitFactor} indique ${profitFactor > 1 ? "des gains plus grands que les pertes" : "des pertes plus grandes que les gains"}.`
            }
            variant="success"
          />

          {/* Recent Trend */}
          <NovaInsightCard
            icon={isTrendingUp ? "📈" : "📉"}
            statusLabel={isTrendingUp ? (L === "en" ? "Trending Up" : "En Hausse") : (L === "en" ? "Check Recent" : "Vérifier Récent")}
            statusColor={isTrendingUp ? "text-accent" : "text-loss"}
            title={L === "en" ? "Recent Performance" : "Performance Récente"}
            metric1={{ label: L === "en" ? "Last 10" : "10 Derniers", value: `${recentWinRate}%`, change: null }}
            metric2={{ label: L === "en" ? "Vs Previous" : "vs Précédent", value: `${previousWinRate}%`, change: recentWinRate > previousWinRate ? "↑" : "↓" }}
            metric3={{ label: L === "en" ? "Trend" : "Tendance", value: isTrendingUp ? "Positive" : "Check", change: null }}
            recommendation={
              L === "en"
                ? isTrendingUp
                  ? `Your recent 10 trades show ${recentWinRate}% win rate—an improvement from your previous streak. Keep this momentum!`
                  : `Your recent 10 trades show ${recentWinRate}% win rate. Review your last trades for improvement opportunities.`
                : isTrendingUp
                ? `Vos 10 derniers trades montrent ${recentWinRate}% de taux de gain. Maintenez cette dynamique!`
                : `Vos 10 derniers trades montrent ${recentWinRate}% de taux. Révisez pour améliorations.`
            }
            variant={isTrendingUp ? "success" : "warning"}
          />
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* SECTION 3: BEST & WORST TRADES */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {(bestTrade || worstTrade) && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted2">
            📌 {L === "en" ? "Weekly Extremes" : "Extrêmes de la Semaine"}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {bestTrade && (
              <NovaInsightCard
                icon="🏆"
                statusLabel={L === "en" ? "Winner" : "Gain"}
                statusColor="text-accent"
                title={`Best Trade: ${bestTrade.symbol}`}
                metric1={{ label: L === "en" ? "PnL" : "Gain", value: fmtMoney(bestTrade.pnl), change: null }}
                metric2={{ label: L === "en" ? "Date" : "Date", value: bestTrade.date.slice(5), change: null }}
                metric3={{ label: L === "en" ? "Type" : "Type", value: bestTrade.dir === "long" ? "LONG" : "SHORT", change: null }}
                recommendation={
                  L === "en"
                    ? `Your best trade this week was ${bestTrade.symbol} for ${fmtMoney(bestTrade.pnl)}. Analyze what made it work.`
                    : `Votre meilleur trade de la semaine: ${bestTrade.symbol} pour ${fmtMoney(bestTrade.pnl)}. Analyser ce qui a marché.`
                }
                variant="success"
              />
            )}

            {worstTrade && (
              <NovaInsightCard
                icon="⚠️"
                statusLabel={L === "en" ? "Lesson" : "Leçon"}
                statusColor="text-loss"
                title={`Worst Trade: ${worstTrade.symbol}`}
                metric1={{ label: L === "en" ? "PnL" : "Perte", value: fmtMoney(worstTrade.pnl), change: null }}
                metric2={{ label: L === "en" ? "Date" : "Date", value: worstTrade.date.slice(5), change: null }}
                metric3={{ label: L === "en" ? "Type" : "Type", value: worstTrade.dir === "long" ? "LONG" : "SHORT", change: null }}
                recommendation={
                  L === "en"
                    ? `Your largest loss this week was ${worstTrade.symbol} for ${fmtMoney(worstTrade.pnl)}. What went wrong? Was it execution, risk, or setup?`
                    : `Votre plus grosse perte: ${worstTrade.symbol} pour ${fmtMoney(worstTrade.pnl)}. Qu'est-ce qui s'est mal passé?`
                }
                variant="critical"
              />
            )}
          </div>
        </section>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* SECTION 4: CONSISTENCY & DISCIPLINE */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted2">
          🎯 {L === "en" ? "Discipline Score" : "Score de Discipline"}
        </h2>
        <div>
          <NovaInsightCard
            icon="📋"
            statusLabel={L === "en" ? "Playbook" : "Playbook"}
            statusColor={s.planPct >= 80 ? "text-accent" : s.planPct >= 50 ? "text-goldx" : "text-loss"}
            title={L === "en" ? "Playbook Adherence" : "Respect du Playbook"}
            metric1={{ label: L === "en" ? "Adherence" : "Respect", value: `${s.planPct.toFixed(0)}%`, change: null }}
            metric2={{ label: L === "en" ? "Green Days" : "Jours Verts", value: `${s.greenDays}`, change: null }}
            metric3={{ label: L === "en" ? "Streak" : "Série", value: `${s.streak}d`, change: null }}
            recommendation={
              L === "en"
                ? s.planPct >= 80
                  ? `Excellent discipline! You're following your playbook ${s.planPct.toFixed(0)}% of the time. Keep this up.`
                  : `Your playbook adherence is ${s.planPct.toFixed(0)}%. Review your rules and commit more carefully.`
                : s.planPct >= 80
                ? `Excellente discipline! Continuez à ce niveau.`
                : `Votre respect est à ${s.planPct.toFixed(0)}%. Révisez vos règles.`
            }
            variant={s.planPct >= 80 ? "success" : s.planPct >= 50 ? "warning" : "critical"}
          />
        </div>
      </section>
    </div>
  );
}
