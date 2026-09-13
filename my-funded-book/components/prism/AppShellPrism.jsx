"use client";
import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import AppHeader from "./AppHeader";
import CoachChat from "./CoachChat";
import { useBook } from "@/components/BookProvider";

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
        />
        <main className="relative flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-56 app-dot-grid opacity-40" />
          {children}
        </main>
      </div>
      <CoachChat />
      {splash && <div className={`fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-black transition-opacity duration-500 ${splashOut ? "opacity-0" : "opacity-100"}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,color-mix(in_srgb,var(--prism-accent)_20%,transparent),transparent_42%)]" />
        <div className="relative text-center"><p className="animate-pulse font-mono text-[11px] font-bold tracking-[0.55em] text-prism-accent">MYTRADEBOOK</p><h1 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-6xl">Bienvenue{profile?.name ? <>, <span className="text-prism-accent">{profile.name}</span></> : ""}</h1><p className="mt-3 text-xs uppercase tracking-[0.28em] text-prism-muted">Ton process. Tes chiffres. Ton avantage.</p><div className="mx-auto mt-8 h-px w-36 overflow-hidden bg-white/10"><div className="h-full w-1/2 animate-pulse bg-prism-accent" /></div></div>
      </div>}
    </div>
  );
}
