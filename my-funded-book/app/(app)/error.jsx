"use client";

import { RefreshCw } from "lucide-react";

export default function AppError({ reset }) {
  return (
    <main className="grid min-h-[70dvh] place-items-center px-4 py-10">
      <section className="prism-surface w-full max-w-md rounded-xl border border-prism-line bg-prism-panel p-7 text-center">
        <p className="text-[10px] font-bold tracking-[.18em] text-prism-loss">CONNEXION À VÉRIFIER</p>
        <h1 className="mt-3 text-2xl font-bold">Cette vue n'a pas pu se charger.</h1>
        <p className="mt-3 text-sm leading-6 text-prism-muted">Tes données ne sont pas modifiées. Réessaie la connexion à cette page.</p>
        <button type="button" onClick={reset} className="prism-primary mt-6 inline-flex items-center gap-2 rounded-md bg-prism-accent px-4 py-2.5 text-xs font-bold text-black">
          <RefreshCw className="h-3.5 w-3.5" />Réessayer
        </button>
      </section>
    </main>
  );
}
