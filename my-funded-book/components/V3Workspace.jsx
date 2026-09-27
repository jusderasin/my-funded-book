"use client";

import Link from "next/link";
import { ArrowUpRight, BarChart3, FlaskConical, Handshake, Sparkles } from "lucide-react";
import { useBook } from "@/components/BookProvider";

const ICONS = { optimize: BarChart3, simulation: FlaskConical, mentoring: Handshake, referral: Sparkles };

export default function V3Workspace({ kind }) {
  const { lang, scopedTrades } = useBook();
  const en = lang === "en";
  const Icon = ICONS[kind] || Sparkles;
  const copy = {
    optimize: { label: en ? "EDGE DISCOVERY" : "DÉCOUVERTE D'EDGE", title: en ? "Find the conditions that pay." : "Trouve les conditions qui paient.", body: en ? "Your trades are grouped by setup, session and instrument so your next decision starts with evidence." : "Tes trades sont regroupés par setup, session et instrument : ta prochaine décision part des preuves.", action: en ? "Open reports" : "Ouvrir les rapports", href: "/breakdown" },
    simulation: { label: en ? "SIMULATION LAB" : "LAB DE SIMULATION", title: en ? "Test the process before risk." : "Teste le process avant le risque.", body: en ? "Replay your journal assumptions and compare scenarios without changing your trading history." : "Compare tes scénarios sans modifier ton historique de trading.", action: en ? "Open backtest" : "Ouvrir le backtest", href: "/backtest" },
    mentoring: { label: en ? "MENTORING" : "MENTORING", title: en ? "Turn execution into a repeatable system." : "Transforme l'exécution en système répétable.", body: en ? "Use PRISM reviews to turn each session into one clear next action." : "Utilise les revues PRISM pour transformer chaque session en une action claire.", action: en ? "Open journal" : "Ouvrir le journal", href: "/journal" },
    referral: { label: en ? "REFERRAL" : "PARRAINAGE", title: en ? "Share the discipline." : "Partage la discipline.", body: en ? "Your referral space is ready. Invite only traders you would want beside you in the journal." : "Ton espace de parrainage est prêt. Invite les traders que tu voudrais avoir à tes côtés.", action: en ? "View leaderboard" : "Voir le classement", href: "/leaderboard" },
  }[kind];

  return <section className="min-h-full px-4 py-8 sm:px-8 lg:px-10 lg:py-12">
    <div className="mx-auto max-w-6xl">
      <p className="flex items-center gap-2 text-[10px] font-bold tracking-[.22em] text-prism-accent"><Icon className="h-4 w-4" />{copy.label}</p>
      <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-.055em] text-prism-text sm:text-5xl">{copy.title}</h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-prism-muted">{copy.body}</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[{ value: scopedTrades.length, label: en ? "trades available" : "trades disponibles" }, { value: new Set(scopedTrades.map((trade) => trade.setup || "—")).size, label: en ? "setups detected" : "setups détectés" }, { value: scopedTrades.filter((trade) => Number(trade.pnl) > 0).length, label: en ? "positive executions" : "exécutions positives" }].map((item) => <div key={item.label} className="rounded-lg border border-prism-line bg-prism-panel p-5"><div className="font-mono text-3xl font-bold text-prism-text">{item.value}</div><div className="mt-2 text-[10px] font-bold uppercase tracking-widest text-prism-muted2">{item.label}</div></div>)}
      </div>
      <div className="mt-4 rounded-lg border border-prism-line bg-prism-panel p-6 sm:p-8"><div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center"><div><div className="text-sm font-bold text-prism-text">{en ? "Workspace ready" : "Espace prêt"}</div><div className="mt-1 text-xs text-prism-muted">{en ? "The next V3 module connects to your live journal data." : "Le prochain module V3 se connecte à tes données de journal."}</div></div><Link href={copy.href} className="inline-flex items-center gap-2 rounded-md bg-prism-accent px-4 py-2.5 text-xs font-extrabold text-black">{copy.action}<ArrowUpRight className="h-4 w-4" /></Link></div></div>
    </div>
  </section>;
}
