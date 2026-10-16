"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, CalendarCheck, Sparkles, Trophy } from "lucide-react";
import { weeklyReport } from "@/lib/weeklyReport";
import { fmtMoney, frDate } from "@/lib/format";

export default function WeeklyReportCard({ trades, lang = "fr", prismHref = "/prism" }) {
  const en = lang === "en";
  const report = useMemo(() => weeklyReport(trades, new Date(), lang), [trades, lang]);
  const delta = report.net - report.prevNet;
  const question = en
    ? `Analyse my week from ${report.week.start} to ${report.week.end}: what should I fix first?`
    : `Analyse ma semaine du ${frDate(report.week.start)} au ${frDate(report.week.end)} : qu'est-ce que je dois corriger en priorité ?`;

  return (
    <section className="term-panel overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-prism-line px-4 py-3">
        <p className="term-title flex items-center gap-2 text-lg"><CalendarCheck className="h-4 w-4 text-prism-accent" />{en ? "Weekly report" : "Rapport de la semaine"}</p>
        <span className="font-mono text-[10px] text-prism-muted">{frDate(report.week.start).slice(0, 5)} → {frDate(report.week.end).slice(0, 5)}</span>
      </header>
      {!report.count ? (
        <p className="px-4 py-6 text-sm text-prism-muted">{en ? "No trade logged this week. Your report fills itself as you journal." : "Aucun trade cette semaine. Le rapport se remplit tout seul quand tu journalises."}</p>
      ) : (
        <div className="grid gap-px bg-prism-line md:grid-cols-[1.1fr_1fr_1fr]">
          <div className="bg-prism-panel p-4">
            <p className={`term-title text-3xl ${report.net >= 0 ? "text-prism-accent" : "text-prism-loss"}`}>{fmtMoney(report.net, true)}</p>
            <p className="mt-1 font-mono text-[11px] text-prism-muted">{report.count} trades · WR {report.winRate}% · {report.totalR >= 0 ? "+" : ""}{report.totalR.toFixed(1)}R · {en ? "plan" : "plan"} {report.planRate}%</p>
            {report.prevCount > 0 && <p className={`mt-1 font-mono text-[10px] ${delta >= 0 ? "text-prism-win" : "text-prism-loss"}`}>{delta >= 0 ? "▲" : "▼"} {fmtMoney(Math.abs(delta))} {en ? "vs last week" : "vs semaine dernière"}</p>}
          </div>
          <div className="space-y-2 bg-prism-panel p-4 text-xs">
            <p className="text-[10px] font-bold tracking-[.14em] text-prism-muted">{en ? "WHAT WORKED" : "CE QUI A MARCHÉ"}</p>
            {report.bestSetup ? <p className="flex items-center gap-2"><Trophy className="h-3.5 w-3.5 shrink-0 text-prism-accent" /><span className="min-w-0 truncate"><b>{report.bestSetup.key}</b> <span className="font-mono text-prism-win">{fmtMoney(report.bestSetup.pnl, true)}</span> <span className="text-prism-muted">· {report.bestSetup.count} trades</span></span></p> : <p className="text-prism-muted">—</p>}
            {report.bestDay && <p className="text-prism-muted">{en ? "Best day" : "Meilleur jour"} : {frDate(report.bestDay.key).slice(0, 5)} · <span className="font-mono text-prism-win">{fmtMoney(report.bestDay.pnl, true)}</span></p>}
          </div>
          <div className="space-y-2 bg-prism-panel p-4 text-xs">
            <p className="text-[10px] font-bold tracking-[.14em] text-prism-muted">{en ? "REPEATED MISTAKES" : "ERREURS RÉPÉTÉES"}</p>
            {report.errors.length ? report.errors.map((error) => (
              <p key={error.tag} className="flex items-center gap-2"><AlertTriangle className="h-3.5 w-3.5 shrink-0 text-prism-loss" /><span className="min-w-0 truncate">{error.tag} <span className="font-mono text-prism-muted">×{error.count}{error.cost ? ` · ${fmtMoney(error.cost)}` : ""}</span></span></p>
            )) : <p className="text-prism-muted">{en ? "Nothing repeated — clean week." : "Rien de répété — semaine propre."}</p>}
          </div>
        </div>
      )}
      {report.rule && (
        <div className="flex flex-col gap-3 border-t border-prism-line px-4 py-3 sm:flex-row sm:items-center">
          <p className="min-w-0 flex-1 text-sm"><span className="mr-2 font-mono text-[10px] font-bold tracking-[.14em] text-prism-accent">{en ? "RULE FOR NEXT WEEK" : "RÈGLE DE LA SEMAINE"}</span>{report.rule}</p>
          <Link href={`${prismHref}?q=${encodeURIComponent(question)}`} className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md border border-prism-accent/50 px-3 py-2 text-[11px] font-bold text-prism-accent hover:bg-prism-accentDim"><Sparkles className="h-3.5 w-3.5" />{en ? "Dig deeper with PRISM" : "Creuser avec PRISM"}<ArrowUpRight className="h-3.5 w-3.5" /></Link>
        </div>
      )}
    </section>
  );
}
