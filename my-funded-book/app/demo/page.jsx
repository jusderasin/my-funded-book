"use client";

// Démo publique : les vraies pages Dashboard et Journal, alimentées par des
// trades fictifs (DemoProvider). Aucun compte, aucune écriture en base.

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, LayoutDashboard, NotebookPen } from "lucide-react";
import { DemoProvider } from "@/components/DemoProvider";
import BrandMark from "@/components/BrandMark";
import DashboardPage from "../(app)/dashboard/page";
import JournalPage from "../(app)/journal/page";

const TABS = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["journal", "Journal", NotebookPen],
];

export default function DemoPage() {
  const [tab, setTab] = useState("dashboard");
  return (
    <DemoProvider>
      <div className="app-shell min-h-[100dvh] overflow-x-clip bg-prism-bg font-sans text-prism-text antialiased">
        <header className="sticky top-0 z-40 border-b border-prism-line bg-black/85 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
            <Link href="/welcome" className="shrink-0"><BrandMark compact /></Link>
            <p className="hidden min-w-0 flex-1 truncate text-center font-mono text-[11px] text-prism-muted md:block">
              <span className="mr-2 rounded bg-prism-accent px-1.5 py-0.5 text-[9px] font-extrabold tracking-[.12em] text-black">DÉMO</span>
              Données fictives · tout est cliquable · rien n&apos;est enregistré
            </p>
            <Link href="/login?tab=signup" className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-prism-accent px-3 text-[11px] font-extrabold tracking-[.1em] text-black shadow-[0_0_24px_rgba(198,244,50,.35)]">
              ESSAI GRATUIT <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <nav className="flex gap-1 px-4 pb-2 sm:px-6">
            {TABS.map(([id, label, Icon]) => (
              <button key={id} type="button" onClick={() => { setTab(id); window.scrollTo({ top: 0 }); }} className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[11px] font-bold tracking-[.12em] ${tab === id ? "bg-prism-accentDim text-prism-accent" : "text-prism-muted hover:text-prism-text"}`}>
                <Icon className="h-3.5 w-3.5" />{label.toUpperCase()}
              </button>
            ))}
            <span className="ml-auto self-center font-mono text-[10px] text-prism-muted2 md:hidden">DÉMO · données fictives</span>
          </nav>
        </header>
        {tab === "dashboard" ? <DashboardPage /> : <JournalPage />}
        <section className="border-t border-prism-line px-4 py-10 text-center">
          <p className="term-title text-3xl">Ton propre journal, <span className="text-prism-accent">en 2 minutes.</span></p>
          <p className="mt-2 text-sm text-prism-muted">14 jours gratuits · puis $19/mois · annulable en 1 clic</p>
          <Link href="/login?tab=signup" className="mt-5 inline-flex h-12 items-center gap-2 rounded-md bg-prism-accent px-6 text-xs font-extrabold tracking-[.14em] text-black">CRÉER MON COMPTE <ArrowRight className="h-4 w-4" /></Link>
        </section>
      </div>
    </DemoProvider>
  );
}
