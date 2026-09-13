"use client";

import { useState, useMemo } from "react";
import { useBook } from "@/components/BookProvider";
import { fmtMoney, frDate } from "@/lib/format";
import { LogTradeModal } from "@/components/modals";
import { Search, Grid3x3, List, Plus, ImageOff } from "lucide-react";

/**
 * Trade Logs — grille de vignettes des screenshots de trades style TradeXNova.
 * Chaque tuile montre le screenshot en fond avec P&L + symbol + date en overlay.
 * Filtres : search par symbol/tag/setup, toggle grid/list.
 *
 * Se base sur `useBook().trades`, tri par date décroissante (plus récent en 1er),
 * affiche tous les trades, avec ou sans capture.
 */
export default function TradeLogsPage() {
  const { trades, lang } = useBook();
  const L = lang === "en" ? "en" : "fr";

  const [query, setQuery] = useState("");
  const [view, setView] = useState("grid"); // "grid" | "list"
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = trades
      .slice()
      .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
    if (q) {
      list = list.filter((tr) => {
        const hay = [
          tr.symbol,
          tr.setup,
          tr.session,
          tr.dir,
          ...(tr.tags || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    return list;
  }, [trades, query]);

  const totalCount = trades.length;

  return (
    <div className="min-h-full bg-black text-white p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Trade Logs</h1>
          <p className="mt-1 text-sm text-prism-muted">
            {L === "en"
              ? `${filtered.length} of ${totalCount} trades`
              : `${filtered.length} sur ${totalCount} trades`}
          </p>
        </div>
      </div>

      {/* Toolbar : search + view toggle */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-prism-muted2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              L === "en"
                ? "Search by symbol, setup, tag…"
                : "Rechercher par symbol, setup, tag…"
            }
            className="w-full rounded-xl border border-prism-line bg-black/40 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-prism-muted2 focus:border-prism-accent focus:outline-none transition-colors"
          />
        </div>

        <div className="inline-flex rounded-xl border border-prism-line bg-transparent p-0.5">
          <button
            type="button"
            onClick={() => setView("grid")}
            aria-label="Grid view"
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
              view === "grid"
                ? "bg-prism-accentDim text-prism-accent"
                : "text-prism-muted hover:text-white"
            }`}
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            aria-label="List view"
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
              view === "list"
                ? "bg-prism-accentDim text-prism-accent"
                : "text-prism-muted hover:text-white"
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white text-black px-3 py-2 text-xs font-semibold hover:bg-white/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          {L === "en" ? "Log trade" : "Logger un trade"}
        </button>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyLogs L={L} hasQuery={!!query.trim()} totalCount={totalCount} />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((tr) => (
            <TradeCard key={tr.id} tr={tr} onClick={() => setEditing(tr)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((tr) => (
            <TradeRow key={tr.id} tr={tr} onClick={() => setEditing(tr)} />
          ))}
        </div>
      )}

      {editing && (
        <LogTradeModal
          editing={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Card grille (vignette screenshot avec overlay P&L)                 */
/* ------------------------------------------------------------------ */

function TradeCard({ tr, onClick }) {
  const win = tr.pnl >= 0;
  const url = tr.screenshot_url || tr.screenshot_url_2;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col text-left rounded-2xl border border-prism-line bg-prism-panel overflow-hidden hover:border-prism-line2 transition-all border-t-[3px] ${
        win ? "border-t-prism-win" : "border-t-prism-loss"
      }`}
    >
      {/* Screenshot */}
      <div className="relative aspect-[16/10] bg-black overflow-hidden">
        {url ? (
          <img
            src={url}
            alt={`${tr.symbol} · ${tr.date}`}
            loading="lazy"
            className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-prism-muted2">
            <ImageOff className="h-8 w-8" />
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-white">{tr.symbol}</span>
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider ${
                tr.dir === "long" ? "text-prism-win" : "text-prism-loss"
              }`}
            >
              {tr.dir === "long" ? "LONG" : "SHORT"}
            </span>
          </div>
          <div className="mt-0.5 text-[11px] text-prism-muted2 font-mono">
            {frDate(tr.date)}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div
            className={`font-mono text-base font-bold tabular-nums ${
              win ? "text-prism-win" : "text-prism-loss"
            }`}
          >
            {(win ? "+" : "") + fmtMoney(tr.pnl)}
          </div>
          {tr.setup && (
            <div className="mt-0.5 text-[10px] text-prism-muted2 truncate max-w-[140px]">
              {tr.setup}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Row liste (vignette petite à gauche + méta)                        */
/* ------------------------------------------------------------------ */

function TradeRow({ tr, onClick }) {
  const win = tr.pnl >= 0;
  const url = tr.screenshot_url || tr.screenshot_url_2;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-4 text-left rounded-2xl border border-prism-line bg-prism-panel px-4 py-3 hover:border-prism-line2 hover:bg-white/[0.02] transition-all border-l-[3px] ${
        win ? "border-l-prism-win" : "border-l-prism-loss"
      }`}
    >
      <div className="h-14 w-24 shrink-0 rounded-xl overflow-hidden border border-prism-line bg-black">
        {url ? (
          <img
            src={url}
            alt={`${tr.symbol}`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-prism-muted2">
            <ImageOff className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-white">{tr.symbol}</span>
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider ${
              tr.dir === "long" ? "text-prism-win" : "text-prism-loss"
            }`}
          >
            {tr.dir === "long" ? "LONG" : "SHORT"}
          </span>
          {tr.outcome && (
            <span className="rounded-md border border-prism-line px-1.5 py-0.5 text-[10px] font-semibold text-prism-muted uppercase tracking-wider">
              {tr.outcome}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-prism-muted2 font-mono truncate">
          {frDate(tr.date)}
          {tr.session && <span>· {tr.session}</span>}
          {tr.setup && <span className="truncate">· {tr.setup}</span>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div
          className={`font-mono text-base font-bold tabular-nums ${
            win ? "text-prism-win" : "text-prism-loss"
          }`}
        >
          {(win ? "+" : "") + fmtMoney(tr.pnl)}
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

function EmptyLogs({ L, hasQuery, totalCount }) {
  return (
    <div className="rounded-2xl border border-dashed border-prism-line bg-prism-panel p-16 text-center">
      <ImageOff className="mx-auto h-10 w-10 text-prism-muted2 mb-4" />
      <div className="text-lg font-semibold text-white mb-1">
        {hasQuery
          ? L === "en"
            ? "No trades match your search"
            : "Aucun trade ne correspond à ta recherche"
          : totalCount === 0
          ? L === "en"
            ? "No trades yet"
            : "Aucun trade pour l'instant"
          : L === "en"
          ? "Nothing to show"
          : "Rien à afficher"}
      </div>
      <div className="text-sm text-prism-muted">
        {hasQuery
          ? L === "en"
            ? "Try a different keyword."
            : "Essaie un autre mot-clé."
          : L === "en"
          ? "Log your first trade to see it here."
          : "Log ton premier trade pour le voir ici."}
      </div>
    </div>
  );
}
