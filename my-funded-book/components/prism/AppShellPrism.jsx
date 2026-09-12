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
    <div className="min-h-screen bg-black text-white font-sans antialiased">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      {/* La marge gauche compense la sidebar fixed sur desktop (lg+) uniquement */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <AppHeader
          user={user}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
