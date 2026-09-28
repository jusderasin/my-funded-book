"use client";

import { useMemo } from "react";
import { Area } from "@/components/charts";
import { useBook } from "@/components/BookProvider";
import { Card, EmptyState, StatCard } from "@/components/prism/TerminalPrimitives";
import { fmtMoney, fmtR, frDate } from "@/lib/format";

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function metricData(trades, threshold) {
  const pnl = trades.map((trade) => Number(trade.pnl) || 0);
  const winners = pnl.filter((value) => value > threshold);
  const losers = pnl.filter((value) => value < -threshold);
  const breakEvens = pnl.filter((value) => Math.abs(value) <= threshold);
  const gains = winners.reduce((sum, value) => sum + value, 0);
  const losses = Math.abs(losers.reduce((sum, value) => sum + value, 0));
  const returns = pnl.map((value, index) => index ? value - pnl[index - 1] : value);
  const mean = average(returns);
  const deviation = Math.sqrt(average(returns.map((value) => (value - mean) ** 2)));
  const downside = Math.sqrt(average(returns.filter((value) => value < 0).map((value) => value ** 2)));
  const avgGain = average(winners);
  const avgLoss = Math.abs(average(losers));
  const rValues = trades.map((trade) => Number(trade.r) || 0);

  return {
    net: pnl.reduce((sum, value) => sum + value, 0),
    winRate: trades.length ? (winners.length / trades.length) * 100 : 0,
    profitFactor: losses ? gains / losses : gains ? Infinity : 0,
    gainLossRatio: avgLoss ? avgGain / avgLoss : 0,
    sharpe: deviation ? mean / deviation : 0,
    sortino: downside ? mean / downside : 0,
    breakEvens: breakEvens.length,
    averageR: average(rValues),
  };
}

function comparison(trades) {
  const dates = [...new Set(trades.map((trade) => trade.date))].sort();
  if (dates.length < 2) return "— vs dernier jour tradé";
  const previous = trades.filter((trade) => trade.date === dates.at(-2)).reduce((sum, trade) => sum + (Number(trade.pnl) || 0), 0);
  const current = trades.filter((trade) => trade.date === dates.at(-1)).reduce((sum, trade) => sum + (Number(trade.pnl) || 0), 0);
  const delta = previous ? ((current - previous) / Math.abs(previous)) * 100 : 0;
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(0)}% vs dernier jour tradé`;
}

export default function DashboardPage() {
  const { scopedTrades: trades, scopedStats: s, profile } = useBook();
  const threshold = Number(profile?.be_threshold) || 0;
  const metrics = useMemo(() => metricData(trades, threshold), [trades, threshold]);
  const sublabel = comparison(trades);
  const hasTrades = trades.length > 0;
  const cards = [
    ["NET P&L", fmtMoney(metrics.net), null],
    ["WIN RATE", `${metrics.winRate.toFixed(1)}%`, metrics.winRate],
    ["PROFIT FACTOR", metrics.profitFactor === Infinity ? "∞" : metrics.profitFactor.toFixed(2), Math.min(metrics.profitFactor * 25, 100)],
    ["RATIO GAIN / PERTE", metrics.gainLossRatio.toFixed(2), Math.min(metrics.gainLossRatio * 40, 100)],
    ["SHARPE", metrics.sharpe.toFixed(2), Math.min(Math.max(metrics.sharpe * 25, 0), 100)],
    ["SORTINO", metrics.sortino.toFixed(2), Math.min(Math.max(metrics.sortino * 25, 0), 100)],
    ["TRADES BE", String(metrics.breakEvens), trades.length ? (metrics.breakEvens / trades.length) * 100 : 0],
    ["R:R MOYEN", fmtR(metrics.averageR), Math.min(Math.max(metrics.averageR * 25, 0), 100)],
  ];

  return (
    <main className="min-h-full bg-prism-bg p-5 sm:p-8">
      <header className="mb-7">
        <p className="text-[10px] font-bold uppercase tracking-[.18em] text-prism-accent">Account analytics</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Détails du compte</h1>
        <p className="mt-1 text-sm text-prism-muted">Performance et métriques de trading.</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, ring]) => (
          <StatCard
            key={label}
            label={label}
            value={hasTrades ? value : "No trades yet"}
            ring={hasTrades ? ring : null}
            sublabel={hasTrades ? sublabel : ""}
            tone={label === "NET P&L" && metrics.net < 0 ? "loss" : "gain"}
          />
        ))}
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <CurveCard
          label="EQUITY CURVE"
          value={metrics.net}
          values={(s.curve || []).map((point) => point.eq)}
          labels={(s.curve || []).map((point) => frDate(point.d))}
          color="#22c55e"
          empty="PAS ASSEZ DE DONNÉES POUR LE GRAPHIQUE"
        />
        <CurveCard
          label="DRAWDOWN CURVE"
          value={-(Number(s.maxDD) || 0)}
          values={s.ddSeries || []}
          labels={(s.curve || []).map((point) => frDate(point.d))}
          color="#ef4444"
          empty="Aucune donnée sur cette période"
        />
      </section>
    </main>
  );
}

function CurveCard({ label, value, values, labels, color, empty }) {
  const enoughData = values.length > 1;
  return (
    <Card padding="p-6">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-[.16em]" style={{ color }}>{label}</p>
        <b className="font-mono text-sm" style={{ color }}>{fmtMoney(value)}</b>
      </div>
      {enoughData ? <Area values={values} labels={labels} color={color} fill={color} fmt={fmtMoney} /> : <EmptyState title={empty} />}
    </Card>
  );
}
