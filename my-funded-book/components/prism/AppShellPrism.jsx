"use client";
import React, { useState } from "react";
import Sidebar from "./Sidebar";
import AppHeader from "./AppHeader";

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
    </div>
  );
}
