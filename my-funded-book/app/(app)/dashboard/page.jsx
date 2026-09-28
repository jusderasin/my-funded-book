"use client";

import { useMemo } from "react";
import { Area } from "@/components/charts";
import { useBook } from "@/components/BookProvider";
import { Card, EmptyState, StatCard } from "@/components/prism/TerminalPrimitives";
import { fmtMoney, fmtR, frDate } from "@/lib/format";

const average = (xs) => xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : 0;

function metrics(trades, threshold) {
  const pnls = trades.map((t) => Number(t.pnl) || 0);
  const wins = pnls.filter((x) => x > threshold);
  const losses = pnls.filter((x) => x < -threshold);
  const byDate = new Map();
  trades.forEach((t) => byDate.set(t.date, (byDate.get(t.date) || 0) + (Number(t.pnl) || 0)));
  const daily = [...byDate.values()];
  const mean = average(daily);
  const std = Math.sqrt(average(daily.map((x) => (x - mean) ** 2)));
  const negatives = daily.filter((x) => x < 0);
  const downside = Math.sqrt(average(negatives.map((x) => (x - mean) ** 2)));
  const gain = average(wins);
  const loss = Math.abs(average(losses));
  const totalGain = wins.reduce((a, x) => a + x, 0);
  const totalLoss = Math.abs(losses.reduce((a, x) => a + x, 0));
  return {
    net: pnls.reduce((a, x) => a + x, 0),
    winRate: trades.length ? wins.length / trades.length * 100 : 0,
    profitFactor: totalLoss ? totalGain / totalLoss : totalGain ? Infinity : 0,
    gainLossRatio: loss ? gain / loss : 0,
    sharpe: std ? mean / std : 0,
    sortino: downside ? mean / downside : 0,
    breakEvens: pnls.filter((x) => Math.abs(x) <= threshold).length,
    averageR: average(trades.map((t) => Number(t.r) || 0)),
  };
}

function deltas(trades, threshold, lang) {
  const dates = [...new Set(trades.map((t) => t.date).filter(Boolean))].sort();
  if (dates.length < 2) return null;
  const earlier = metrics(trades.filter((t) => t.date === dates.at(-2)), threshold);
  const latest = metrics(trades.filter((t) => t.date === dates.at(-1)), threshold);
  const suffix = lang === "en" ? "vs last trading day" : "vs dernier jour tradé";
  return Object.fromEntries(Object.keys(latest).map((key) => {
    const oldValue = earlier[key];
    const value = latest[key];
    if (!Number.isFinite(value)) return [key, null];
    if (!Number.isFinite(oldValue) || oldValue === 0) return [key, `${value >= 0 ? "+" : ""}${value.toFixed(2)} ${suffix}`];
    const change = (value - oldValue) / Math.abs(oldValue) * 100;
    return [key, `${change >= 0 ? "+" : ""}${change.toFixed(0)}% ${suffix}`];
  }));
}

export default function DashboardPage() {
  const { scopedTrades: trades, scopedStats: stats, profile, lang } = useBook();
  const threshold = Number(profile?.be_threshold) || 0;
  const values = useMemo(() => metrics(trades, threshold), [trades, threshold]);
  const changes = useMemo(() => deltas(trades, threshold, lang), [trades, threshold, lang]);
  const L = lang === "en"
    ? { title: "Account details", subtitle: "Performance and trading metrics.", empty: "No trades yet", equity: "EQUITY CURVE", drawdown: "DRAWDOWN CURVE", chart: "NOT ENOUGH DATA FOR THE CHART", none: "No data for this period", ratio: "WIN / LOSS RATIO", avgR: "AVERAGE R:R" }
    : { title: "Détails du compte", subtitle: "Performance et métriques de trading.", empty: "Pas encore de trade", equity: "COURBE D'ÉQUITY", drawdown: "COURBE DE DRAWDOWN", chart: "PAS ASSEZ DE DONNÉES POUR LE GRAPHIQUE", none: "Aucune donnée sur cette période", ratio: "RATIO GAIN / PERTE", avgR: "R:R MOYEN" };
  const cards = [
    ["net", "NET P&L", fmtMoney(values.net), null, values.net < 0 ? "loss" : "gain"],
    ["winRate", "WIN RATE", `${values.winRate.toFixed(1)}%`, values.winRate],
    ["profitFactor", "PROFIT FACTOR", values.profitFactor === Infinity ? "∞" : values.profitFactor.toFixed(2), Math.min(values.profitFactor * 25, 100)],
    ["gainLossRatio", L.ratio, values.gainLossRatio.toFixed(2), Math.min(values.gainLossRatio * 40, 100)],
    ["sharpe", "SHARPE", values.sharpe.toFixed(2), Math.min(Math.abs(values.sharpe) * 25, 100), values.sharpe < 0 ? "loss" : "accent"],
    ["sortino", "SORTINO", values.sortino.toFixed(2), Math.min(Math.abs(values.sortino) * 25, 100), values.sortino < 0 ? "loss" : "accent"],
    ["breakEvens", "TRADES BE", String(values.breakEvens), trades.length ? values.breakEvens / trades.length * 100 : 0],
    ["averageR", L.avgR, fmtR(values.averageR), Math.min(Math.abs(values.averageR) * 25, 100), values.averageR < 0 ? "loss" : "accent"],
  ];
  return <main className="min-h-full bg-prism-bg p-5 sm:p-8"><header className="mb-7"><h1 className="text-3xl font-bold tracking-tight">{L.title}</h1><p className="mt-1 text-sm text-prism-muted">{L.subtitle}</p></header><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([key, label, value, ring, tone]) => <StatCard key={key} label={label} value={trades.length ? value : L.empty} ring={trades.length ? ring : null} sublabel={trades.length ? changes?.[key] : ""} tone={tone} />)}</section><section className="mt-5 space-y-5"><Curve label={L.equity} value={values.net} values={(stats.curve || []).map((x) => x.eq)} labels={(stats.curve || []).map((x) => frDate(x.d))} color="#22c55e" empty={L.chart} /><Curve label={L.drawdown} value={-(Number(stats.maxDD) || 0)} values={stats.ddSeries || []} labels={(stats.curve || []).map((x) => frDate(x.d))} color="#ef4444" empty={L.none} /></section></main>;
}

function Curve({ label, value, values, labels, color, empty }) {
  return <section><p className="mb-2 text-[10px] font-bold tracking-[.16em]" style={{ color }}>{label}</p><Card padding="p-6"><div className="mb-5 flex justify-end"><b className="font-mono text-sm" style={{ color }}>{fmtMoney(value)}</b></div>{values.length > 1 ? <Area values={values} labels={labels} color={color} fill={color} fmt={fmtMoney} /> : <EmptyState title={empty} />}</Card></section>;
}
