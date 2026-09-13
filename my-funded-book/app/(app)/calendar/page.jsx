"use client";

import { useState } from "react";
import { useBook } from "@/components/BookProvider";
import { Calendar as PerformanceCalendar } from "@/components/charts";
import { emotionScore, psychBucket } from "@/lib/constants";
import { fmtMoney } from "@/lib/format";
import { CalendarDays, TrendingUp, Brain } from "lucide-react";

export default function CalendarPage() {
  const { lang, stats: s, trades } = useBook();
  const L = lang === "en" ? "en" : "fr";
  const [mode, setMode] = useState("pnl");
  const [month, setMonth] = useState(() => {
    const last = s.days[s.days.length - 1] || new Date().toISOString().slice(0, 10);
    const [y, m] = last.split("-");
    return { y: Number(y), m: Number(m) };
  });

  const tradesByDay = {};
  const psychTotals = {};
  trades.forEach((trade) => {
    tradesByDay[trade.date] = (tradesByDay[trade.date] || 0) + 1;
    const score = emotionScore(trade.emotion);
    if (score == null) return;
    if (!psychTotals[trade.date]) psychTotals[trade.date] = { total: 0, count: 0 };
    psychTotals[trade.date].total += score;
    psychTotals[trade.date].count += 1;
  });
  const psychByDay = Object.fromEntries(
    Object.entries(psychTotals).map(([day, value]) => [day, value.total / value.count])
  );

  const shiftMonth = (direction) => {
    setMonth((current) => {
      let nextMonth = current.m + direction;
      let nextYear = current.y;
      if (nextMonth < 1) { nextMonth = 12; nextYear -= 1; }
      if (nextMonth > 12) { nextMonth = 1; nextYear += 1; }
      return { y: nextYear, m: nextMonth };
    });
  };

  const psychBucketFn = (score) => {
    const bucket = psychBucket(score);
    return { color: bucket.color, label: L === "en" ? bucket.en : bucket.fr };
  };

  return (
    <div className="min-h-full bg-black p-4 text-white sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-prism-accent">
              {L === "en" ? "Trading journal" : "Journal de trading"}
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
              <CalendarDays className="h-5 w-5 text-prism-accent" />
              {L === "en" ? "Performance calendar" : "Calendrier de performance"}
            </h1>
            <p className="mt-1 text-xs text-prism-muted2">
              {L === "en" ? "Your P&L and mental state, day by day." : "Ton P&L et ton état mental, jour par jour."}
            </p>
          </div>
          <div className="flex rounded-xl border border-prism-line bg-prism-panel p-1">
            <ModeButton active={mode === "pnl"} onClick={() => setMode("pnl")} icon={<TrendingUp className="h-3.5 w-3.5" />}>P&amp;L</ModeButton>
            <ModeButton active={mode === "psych"} onClick={() => setMode("psych")} icon={<Brain className="h-3.5 w-3.5" />}>{L === "en" ? "Mindset" : "Mental"}</ModeButton>
          </div>
        </div>

        <section className="rounded-2xl border border-prism-line bg-prism-panel p-4 sm:p-6">
          <div className="mb-5 grid grid-cols-3 divide-x divide-prism-line rounded-xl border border-prism-line bg-black/20">
            <MiniMetric label="P&L net" value={fmtMoney(s.net)} tone={s.net >= 0 ? "text-prism-win" : "text-prism-loss"} />
            <MiniMetric label="Trades" value={String(trades.length)} />
            <MiniMetric label={L === "en" ? "Green days" : "Jours verts"} value={String(s.greenDays)} tone="text-prism-win" />
          </div>
          <PerformanceCalendar
            byDay={s.byDay}
            tradesByDay={tradesByDay}
            month={month}
            onShift={shiftMonth}
            t={(key) => key === "cal_trades" ? "trades" : "trade"}
            mode={mode}
            psychByDay={psychByDay}
            psychBucketFn={psychBucketFn}
          />
          <div className="mt-4 border-t border-prism-line pt-4 text-xs text-prism-muted2">
            {mode === "pnl"
              ? (L === "en" ? "Green cells are profitable days. Red cells are losing days." : "Les cases vertes sont positives ; les cases rouges sont négatives.")
              : (L === "en" ? "Mental state is calculated from the state selected when you log a trade." : "L’état mental est calculé à partir de celui choisi lors du log d’un trade.")}
          </div>
        </section>
      </div>
    </div>
  );
}

function ModeButton({ active, onClick, icon, children }) {
  return <button type="button" onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${active ? "bg-prism-accentDim text-prism-accent" : "text-prism-muted hover:text-white"}`}>{icon}{children}</button>;
}

function MiniMetric({ label, value, tone = "text-white" }) {
  return <div className="min-w-0 p-3 sm:p-4"><div className="truncate text-[10px] uppercase tracking-widest text-prism-muted2">{label}</div><div className={`mt-1 truncate font-mono text-base font-bold sm:text-xl ${tone}`}>{value}</div></div>;
}
