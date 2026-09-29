"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Activity, ArrowUpRight, CalendarDays, Crosshair, ShieldCheck, Target, TrendingDown, TrendingUp } from "lucide-react";
import { Area } from "@/components/charts";
import { useBook } from "@/components/BookProvider";
import { Card, EmptyState, ProgressBar, StatCard } from "@/components/prism/TerminalPrimitives";
import { fmtMoney, fmtR, frDate } from "@/lib/format";
import { computeStats } from "@/lib/stats";

const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

function calculateMetrics(trades, threshold) {
  const pnls = trades.map((trade) => Number(trade.pnl) || 0);
  const winners = pnls.filter((pnl) => pnl > threshold);
  const losers = pnls.filter((pnl) => pnl < -threshold);
  const dailyMap = new Map();
  trades.forEach((trade) => dailyMap.set(trade.date, (dailyMap.get(trade.date) || 0) + (Number(trade.pnl) || 0)));
  const daily = [...dailyMap.values()];
  const mean = average(daily);
  const deviation = Math.sqrt(average(daily.map((value) => (value - mean) ** 2)));
  const negativeDays = daily.filter((value) => value < 0);
  const downside = Math.sqrt(average(negativeDays.map((value) => (value - mean) ** 2)));
  const grossWin = winners.reduce((sum, value) => sum + value, 0);
  const grossLoss = Math.abs(losers.reduce((sum, value) => sum + value, 0));
  const avgWin = average(winners);
  const avgLoss = Math.abs(average(losers));
  return {
    net: pnls.reduce((sum, value) => sum + value, 0),
    winRate: trades.length ? winners.length / trades.length * 100 : 0,
    profitFactor: grossLoss ? grossWin / grossLoss : grossWin ? Infinity : 0,
    gainLossRatio: avgLoss ? avgWin / avgLoss : 0,
    sharpe: deviation ? mean / deviation : 0,
    sortino: downside ? mean / downside : 0,
    breakEvens: pnls.filter((pnl) => Math.abs(pnl) <= threshold).length,
    averageR: average(trades.map((trade) => Number(trade.r) || 0)),
  };
}

function calculateDeltas(trades, threshold, lang) {
  const dates = [...new Set(trades.map((trade) => trade.date).filter(Boolean))].sort();
  if (dates.length < 2) return null;
  const currentTrades = trades.filter((trade) => trade.date === dates.at(-1));
  const previousTrades = trades.filter((trade) => trade.date === dates.at(-2));
  const current = calculateMetrics(currentTrades, threshold);
  const previous = calculateMetrics(previousTrades, threshold);
  const suffix = lang === "en" ? "vs last trading day" : "vs dernier jour tradé";
  const unstable = ["profitFactor", "gainLossRatio", "sharpe", "sortino"];
  return Object.fromEntries(Object.keys(current).map((key) => {
    const value = current[key];
    const oldValue = previous[key];
    const unavailable = !Number.isFinite(value) || !Number.isFinite(oldValue)
      || (unstable.includes(key) && (currentTrades.length < 2 || previousTrades.length < 2))
      || (["profitFactor", "sharpe", "sortino"].includes(key) && (!value || !oldValue));
    if (unavailable) return [key, { text: "—", tone: "neutral" }];
    const difference = value - oldValue;
    const tone = difference > 0 ? "gain" : difference < 0 ? "loss" : "neutral";
    const sign = difference > 0 ? "+" : "";
    const display = key === "net" ? `${sign}${fmtMoney(difference)}` : key === "winRate" ? `${sign}${difference.toFixed(0)} pts` : `${sign}${difference.toFixed(2)}`;
    return [key, { text: `${display} ${suffix}`, tone }];
  }));
}

const rangeOptions = (lang) => [
  ["7", "7 j"], ["30", "30 j"], ["90", "90 j"], ["all", lang === "en" ? "All" : "Tout"],
];

export default function DashboardPage() {
  const { scopedTrades, activeAccount, profile, lang } = useBook();
  const [range, setRange] = useState("all");
  const isEnglish = lang === "en";
  const copy = isEnglish ? {
    eyebrow: "TRADING COMMAND CENTER", title: "Dashboard", subtitle: "A clear read on your process, performance and risk.",
    all: "All accounts", equity: "EQUITY MOMENTUM", drawdown: "DRAWDOWN CONTROL", noTrades: "No trades yet", recent: "LATEST EXECUTIONS",
    discipline: "PROCESS DISCIPLINE", objective: "ACCOUNT OBJECTIVE", sessions: "SESSION MAP", calendar: "MONTHLY P&L", health: "TODAY'S READ",
    withinPlan: "of executions followed the plan", openJournal: "Open journal", viewAccount: "Open account", chartEmpty: "Log at least two trades to reveal your curve.",
  } : {
    eyebrow: "POSTE DE PILOTAGE", title: "Dashboard", subtitle: "Une lecture nette de ton processus, de ta performance et de ton risque.",
    all: "Tous les comptes", equity: "MOMENTUM D'ÉQUITY", drawdown: "CONTRÔLE DU DRAWDOWN", noTrades: "Pas encore de trade", recent: "DERNIÈRES EXÉCUTIONS",
    discipline: "DISCIPLINE DU PROCESS", objective: "OBJECTIF DU COMPTE", sessions: "CARTE DES SESSIONS", calendar: "P&L DU MOIS", health: "LECTURE DU JOUR",
    withinPlan: "des exécutions ont respecté le plan", openJournal: "Ouvrir le journal", viewAccount: "Voir le compte", chartEmpty: "Logue au moins deux trades pour révéler ta courbe.",
  };

  const trades = useMemo(() => {
    if (range === "all") return scopedTrades;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(range));
    return scopedTrades.filter((trade) => new Date(`${trade.date}T00:00:00`) >= cutoff);
  }, [range, scopedTrades]);
  const stats = useMemo(() => computeStats(trades, Number(activeAccount?.size) || Number(profile?.starting_balance) || 0), [trades, activeAccount, profile]);
  const threshold = Number(profile?.be_threshold) || 0;
  const metrics = useMemo(() => calculateMetrics(trades, threshold), [trades, threshold]);
  const deltas = useMemo(() => calculateDeltas(trades, threshold, lang), [trades, threshold, lang]);
  const planRate = trades.length ? Math.round(trades.filter((trade) => trade.plan).length / trades.length * 100) : 0;
  const scopeName = activeAccount?.note || activeAccount?.firm || copy.all;
  const sessionRows = ["Asia", "London", "NY AM", "NY PM"].map((session) => ({
    session,
    pnl: trades.filter((trade) => trade.session === session).reduce((sum, trade) => sum + (Number(trade.pnl) || 0), 0),
  }));
  const largestSession = Math.max(1, ...sessionRows.map((row) => Math.abs(row.pnl)));
  const cardRows = [
    ["net", "NET P&L", fmtMoney(metrics.net), null, metrics.net < 0 ? "loss" : "gain"],
    ["winRate", "WIN RATE", `${metrics.winRate.toFixed(1)}%`, metrics.winRate],
    ["profitFactor", "PROFIT FACTOR", metrics.profitFactor === Infinity ? "∞" : metrics.profitFactor.toFixed(2), Math.min(metrics.profitFactor * 25, 100)],
    ["gainLossRatio", isEnglish ? "WIN / LOSS RATIO" : "RATIO GAIN / PERTE", metrics.gainLossRatio.toFixed(2), Math.min(metrics.gainLossRatio * 40, 100)],
    ["sharpe", "SHARPE", metrics.sharpe.toFixed(2), Math.min(Math.abs(metrics.sharpe) * 25, 100), metrics.sharpe < 0 ? "loss" : "accent"],
    ["sortino", "SORTINO", metrics.sortino.toFixed(2), Math.min(Math.abs(metrics.sortino) * 25, 100), metrics.sortino < 0 ? "loss" : "accent"],
    ["breakEvens", "TRADES BE", String(metrics.breakEvens), trades.length ? metrics.breakEvens / trades.length * 100 : 0],
    ["averageR", "R:R MOYEN", fmtR(metrics.averageR), Math.min(Math.abs(metrics.averageR) * 25, 100), metrics.averageR < 0 ? "loss" : "accent"],
  ];

  return (
    <main className="min-h-full bg-prism-bg px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-6 flex flex-col justify-between gap-5 border-b border-prism-line pb-6 lg:flex-row lg:items-end">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[10px] font-bold tracking-[.2em] text-prism-accent"><Activity className="h-3.5 w-3.5" />{copy.eyebrow}</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{copy.title}</h1>
            <p className="mt-2 max-w-xl text-sm text-prism-muted">{copy.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-prism-line bg-prism-panel px-3 py-2 text-xs font-semibold text-prism-text">{scopeName}</span>
            <div className="grid grid-cols-4 gap-1 rounded-lg border border-prism-line bg-prism-panel p-1">{rangeOptions(lang).map(([value, label]) => <button key={value} type="button" onClick={() => setRange(value)} className={`rounded-md px-3 py-2 text-[10px] font-bold uppercase tracking-[.1em] transition ${range === value ? "bg-prism-accent text-black shadow-[0_0_22px_rgba(6,182,212,.2)]" : "text-prism-muted hover:bg-prism-panel2 hover:text-prism-text"}`}>{label}</button>)}</div>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[1.7fr_.8fr]">
          <Card padding="p-0" className="group relative overflow-hidden border-prism-line bg-[radial-gradient(circle_at_80%_0%,rgba(34,197,94,.14),transparent_36%),var(--prism-panel)] transition duration-300 hover:-translate-y-0.5 hover:border-prism-win/50">
            <div className="flex items-start justify-between gap-4 p-5 sm:p-6"><div><p className="text-[10px] font-bold tracking-[.16em] text-prism-win">{copy.equity}</p><p className="mt-3 font-mono text-3xl font-bold sm:text-4xl">{fmtMoney(metrics.net)}</p><p className="mt-2 text-xs text-prism-muted">{trades.length} {isEnglish ? "executions in scope" : "exécutions dans ce contexte"}</p></div><span className="grid h-10 w-10 place-items-center rounded-xl border border-prism-win/30 bg-prism-win/10 text-prism-win"><TrendingUp className="h-5 w-5" /></span></div>
            <div className="px-3 pb-3 sm:px-6 sm:pb-5">{stats.curve.length > 2 ? <Area values={stats.curve.map((point) => point.eq)} labels={stats.curve.map((point) => frDate(point.d))} color="#22c55e" fill="#22c55e" fmt={fmtMoney} /> : <EmptyState title={copy.noTrades}>{copy.chartEmpty}</EmptyState>}</div>
          </Card>
          <Card padding="p-6" className="relative overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:border-prism-accent/50">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-prism-accent/10 blur-2xl" />
            <p className="text-[10px] font-bold tracking-[.16em] text-prism-accent">{copy.health}</p>
            <div className="mt-7 flex items-end justify-between"><div><p className="font-mono text-5xl font-bold">{planRate}<span className="text-xl text-prism-muted">%</span></p><p className="mt-2 max-w-[14rem] text-xs leading-5 text-prism-muted">{copy.withinPlan}</p></div><ShieldCheck className={`h-12 w-12 ${planRate >= 80 ? "text-prism-win" : "text-amber-300"}`} /></div>
            <div className="mt-7"><ProgressBar value={planRate} tone={planRate >= 80 ? "gain" : "warn"} /></div>
            <Link href="/journal" className="mt-6 inline-flex items-center gap-1 text-xs font-bold text-prism-accent hover:underline">{copy.openJournal}<ArrowUpRight className="h-3.5 w-3.5" /></Link>
          </Card>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">{cardRows.map(([key, label, value, ring, tone]) => <div key={key} className="transition duration-200 hover:-translate-y-1"><StatCard label={label} value={trades.length ? value : "—"} ring={trades.length ? ring : null} sublabel={trades.length ? deltas?.[key] : copy.noTrades} tone={tone} /></div>)}</section>

        <section className="mt-7 grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
          <CurvePanel label={copy.drawdown} value={-(Number(stats.maxDD) || 0)} values={stats.ddSeries} labels={stats.curve.map((point) => frDate(point.d))} color="#ef4444" empty={copy.chartEmpty} />
          <Card padding="p-5" className="transition hover:border-prism-line2">
            <p className="mb-5 flex items-center gap-2 text-[10px] font-bold tracking-[.16em] text-prism-accent"><CalendarDays className="h-3.5 w-3.5" />{copy.calendar}</p>
            <MonthGrid byDay={stats.byDay || {}} />
          </Card>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-3">
          <Card padding="p-5" className="transition hover:border-prism-line2"><p className="mb-4 text-[10px] font-bold tracking-[.16em] text-prism-accent">{copy.recent}</p>{trades.length ? trades.slice(0, 5).map((trade) => <Link key={trade.id} href={`/journal?edit=${trade.id}`} className="group flex items-center justify-between border-b border-prism-line py-3 text-xs last:border-0"><span><b className="text-prism-text">{trade.symbol || "—"} · {String(trade.dir || "—").toUpperCase()}</b><small className="ml-2 text-prism-muted">{frDate(trade.date)}</small></span><b className={`${Number(trade.pnl) < 0 ? "text-prism-loss" : "text-prism-win"} group-hover:underline`}>{fmtMoney(Number(trade.pnl) || 0)}</b></Link>) : <p className="text-sm text-prism-muted">{copy.noTrades}</p>}</Card>
          <Card padding="p-5" className="transition hover:border-prism-line2"><p className="mb-4 flex items-center gap-2 text-[10px] font-bold tracking-[.16em] text-prism-accent"><Crosshair className="h-3.5 w-3.5" />{copy.sessions}</p><div className="space-y-4">{sessionRows.map((row) => <div key={row.session}><div className="mb-1.5 flex justify-between text-xs"><span className="text-prism-muted">{row.session}</span><b className={row.pnl < 0 ? "text-prism-loss" : "text-prism-win"}>{fmtMoney(row.pnl)}</b></div><div className="h-1.5 overflow-hidden rounded-full bg-prism-panel2"><div className={row.pnl < 0 ? "h-full bg-prism-loss" : "h-full bg-prism-accent"} style={{ width: `${Math.max(3, Math.abs(row.pnl) / largestSession * 100)}%` }} /></div></div>)}</div></Card>
          <Card padding="p-5" className="relative overflow-hidden transition hover:border-prism-line2"><div className="absolute -right-6 bottom-0 h-24 w-24 rounded-full bg-prism-accent/10 blur-xl" /><p className="flex items-center gap-2 text-[10px] font-bold tracking-[.16em] text-prism-accent"><Target className="h-3.5 w-3.5" />{copy.objective}</p>{activeAccount ? <><p className="mt-6 font-mono text-3xl font-bold">{fmtMoney(Number(activeAccount.profit_target) || 0)}</p><p className="mt-2 text-xs text-prism-muted">{activeAccount.note || activeAccount.firm}</p><Link href={`/accounts/${activeAccount.id}`} className="mt-6 inline-flex items-center gap-1 text-xs font-bold text-prism-accent hover:underline">{copy.viewAccount}<ArrowUpRight className="h-3.5 w-3.5" /></Link></> : <p className="mt-6 text-sm leading-6 text-prism-muted">{isEnglish ? "Choose an account in the sidebar to track its rules and target." : "Sélectionne un compte dans la sidebar pour suivre ses règles et son objectif."}</p>}</Card>
        </section>
      </div>
    </main>
  );
}

function CurvePanel({ label, value, values, labels, color, empty }) {
  return <Card padding="p-5 sm:p-6" className="group overflow-hidden transition duration-300 hover:border-prism-loss/50"><div className="mb-5 flex items-center justify-between"><p className="flex items-center gap-2 text-[10px] font-bold tracking-[.16em]" style={{ color }}><TrendingDown className="h-3.5 w-3.5" />{label}</p><b className="font-mono text-sm" style={{ color }}>{fmtMoney(value)}</b></div>{values.length > 2 ? <Area values={values} labels={labels} color={color} fill={color} fmt={fmtMoney} /> : <EmptyState title="DRAWNDOWN">{empty}</EmptyState>}</Card>;
}

function MonthGrid({ byDay }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const first = new Date(year, month, 1).getDay();
  const dayCount = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: first + dayCount }, (_, index) => index < first ? null : index - first + 1);
  return <div className="grid grid-cols-7 gap-1.5">{["D", "L", "M", "M", "J", "V", "S"].map((day, index) => <span key={`${day}-${index}`} className="pb-1 text-center text-[9px] font-bold text-prism-muted2">{day}</span>)}{cells.map((day, index) => { if (!day) return <i key={`empty-${index}`} />; const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; const pnl = byDay[key]; const style = pnl > 0 ? "border-prism-win/30 bg-prism-win/10 text-prism-win" : pnl < 0 ? "border-prism-loss/30 bg-prism-loss/10 text-prism-loss" : "border-prism-line bg-prism-panel2 text-prism-muted"; return <Link key={key} href={`/journal?date=${key}`} className={`min-h-11 rounded-md border p-1 text-center text-[9px] transition hover:-translate-y-0.5 ${style}`}><span>{day}</span>{pnl != null && <b className="mt-1 block font-mono text-[8px]">{Math.round(pnl)}</b>}</Link>; })}</div>;
}
