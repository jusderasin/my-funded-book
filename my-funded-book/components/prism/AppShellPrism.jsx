"use client";
import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import AppHeader from "./AppHeader";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const { profile } = useBook();
  const [splash, setSplash] = useState(true);
  const [splashOut, setSplashOut] = useState(false);
  useEffect(() => {
    const out = setTimeout(() => setSplashOut(true), 1150);
    const done = setTimeout(() => setSplash(false), 1650);
    return () => { clearTimeout(out); clearTimeout(done); };
  }, []);

  return (
    <div className="min-h-[100dvh] bg-black text-white font-sans antialiased app-aurora">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      {/* La marge gauche compense la sidebar fixed sur desktop (lg+) uniquement */}
      <div className="flex min-h-[100dvh] flex-col lg:pl-64">
        <AppHeader
          user={user}
          onMenuClick={() => setSidebarOpen(true)}
          onLogTrade={() => setQuickLogOpen(true)}
        />
        <main className="relative flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-56 app-dot-grid opacity-40" />
          {children}
        </main>
      </div>
      {quickLogOpen && <LogTradeModal onClose={() => setQuickLogOpen(false)} />}
      {splash && <div className={`fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-black transition-opacity duration-500 ${splashOut ? "opacity-0" : "opacity-100"}`}>
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
