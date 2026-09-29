"use client";
import React, { useEffect, useState } from "react";
import { Menu, Plus } from "lucide-react";
import Sidebar from "./Sidebar";
import { useBook } from "@/components/BookProvider";
import { LogTradeModal } from "@/components/modals";

/**
 * PRISM AppShell — layout global pour toutes les pages (app)/*.
 *
 * Structure :
 *   - Sidebar fixed left (desktop) ou en drawer (mobile)
 *   - Zone content à droite avec AppHeader sticky en haut + main scrollable
 *
 * Props:
 *   user     : { email: String } — passé à AppHeader pour le display name
 *   children : Contenu des pages
 */
export default function AppShellPrism({ user, children }) {
  const appVersion = "2026.10";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const { profile } = useBook();
  const [splash, setSplash] = useState(true);
  const [splashOut, setSplashOut] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showCookies, setShowCookies] = useState(false);
  useEffect(() => {
    const out = setTimeout(() => setSplashOut(true), 650);
    const done = setTimeout(() => setSplash(false), 950);
    return () => { clearTimeout(out); clearTimeout(done); };
  }, []);

  useEffect(() => {
    if (localStorage.getItem("mtb.whats-new") !== appVersion) setShowWhatsNew(true);
    if (!localStorage.getItem("mtb.cookies")) setShowCookies(true);
  }, []);

  return (
    <div className="app-shell min-h-[100dvh] bg-prism-bg text-prism-text font-sans antialiased">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      {/* La marge gauche compense la sidebar fixed sur desktop (lg+) uniquement */}
      <div className="app-content flex min-h-[100dvh] flex-col pt-[calc(3.5rem+env(safe-area-inset-top))] lg:pl-[232px] lg:pt-0">
        <div className="app-mobile-bar fixed inset-x-0 top-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-end justify-between px-4 pb-2 pt-[env(safe-area-inset-top)] lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="app-mobile-menu inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold text-prism-text"><Menu className="h-3.5 w-3.5" />Menu</button>
          <button onClick={() => setQuickLogOpen(true)} className="app-mobile-log inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold text-black"><Plus className="h-3.5 w-3.5" />Log trade</button>
        </div>
        <main className="app-main relative flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-56 app-dot-grid opacity-40" />
          {children}
        </main>
      </div>
      {quickLogOpen && <LogTradeModal onClose={() => setQuickLogOpen(false)} />}
      {showWhatsNew && <div className="fixed inset-0 z-[115] grid place-items-center bg-black/75 p-4"><section className="w-full max-w-md rounded-xl border border-prism-line bg-prism-panel p-6"><p className="text-[10px] font-bold tracking-[.18em] text-prism-accent">NOUVEAUTÉS</p><h2 className="mt-2 text-xl font-bold">MyTradeBook évolue.</h2><p className="mt-3 text-sm text-prism-muted">Nouvelle navigation, identité simplifiée et espaces d’analyse unifiés.</p><button onClick={() => { localStorage.setItem("mtb.whats-new", "2026.09"); setShowWhatsNew(false); }} className="mt-5 rounded bg-prism-accent px-4 py-2 text-xs font-bold text-black">Compris</button></section></div>}
      {showCookies && <div className="fixed bottom-4 left-4 z-[110] max-w-sm rounded-xl border border-prism-line bg-prism-panel p-4 shadow-2xl"><b className="text-sm">Cookies essentiels</b><p className="mt-1 text-xs leading-5 text-prism-muted">Nous utilisons le stockage local nécessaire au fonctionnement de l’application.</p><div className="mt-3 flex gap-2"><button onClick={() => { localStorage.setItem("mtb.cookies", "accepted"); setShowCookies(false); }} className="rounded bg-prism-accent px-3 py-2 text-xs font-bold text-black">Accepter</button><button onClick={() => { localStorage.setItem("mtb.cookies", "essential"); setShowCookies(false); }} className="rounded border border-prism-line px-3 py-2 text-xs">Essentiels</button></div></div>}
      {splash && <div className={`app-splash fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-prism-bg transition-opacity duration-300 ${splashOut ? "opacity-0" : "opacity-100"}`}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#151515_0%,#050505_42%,#000_72%)]" />
        <div className="relative w-full max-w-xl px-8 text-center">
          <div className="mx-auto h-px w-24 bg-zinc-700" />
          <div className="relative mx-auto mt-6 h-2 w-2"><span className="absolute inset-0 animate-ping rounded-full bg-zinc-500 opacity-50" /><span className="absolute inset-0 rounded-full bg-zinc-300" /></div>
          <p className="mt-4 font-mono text-[9px] font-medium tracking-[0.42em] text-zinc-600">MYTRADEBOOK</p>
          <h1 className="mt-5 text-2xl font-medium tracking-[0.32em] text-zinc-100 sm:text-3xl">BIENVENUE</h1>
          <p className="mt-4 font-mono text-xs uppercase tracking-[0.24em] text-zinc-400">{profile?.name || "TRADER"}</p>
          <div className="mx-auto mt-7 h-px w-32 overflow-hidden bg-zinc-800"><div className="h-full w-1/3 animate-pulse bg-zinc-400" /></div>
          <p className="mt-3 font-mono text-[8px] uppercase tracking-[0.25em] text-zinc-700">Connexion sécurisée</p>
        </div>
      </div>}
    </div>
  );
}
