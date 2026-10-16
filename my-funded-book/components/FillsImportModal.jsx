"use client";

// Import des fills broker (Tradovate / Rithmic / NinjaTrader) : le fichier est
// lu dans le navigateur, les allers-retours sont reconstruits par lib/fills,
// puis insérés en un seul lot. Rien n'est envoyé ailleurs que dans Supabase.

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, FileUp, X } from "lucide-react";
import { useBook } from "@/components/BookProvider";
import { parseFills } from "@/lib/fills";
import { fmtMoney, frDate } from "@/lib/format";

const TXT = {
  fr: {
    title: "IMPORTER DES FILLS", drop: "Dépose ton export CSV", hint: "Tradovate (Performance ou Fills), Rithmic R|Trader (Completed Orders), NinjaTrader (Executions).",
    how: "Tradovate : Reports → Performance → Download CSV. Rithmic : Order History → Export. Les frais ne sont pas déduits.",
    errCols: "Colonnes non reconnues : il faut au minimum heure, sens (B/S), quantité, prix et symbole.", errEmpty: "Fichier vide.",
    found: (n, f) => `${n} trade${n > 1 ? "s" : ""} reconstruit${n > 1 ? "s" : ""} · format ${f}`, open: (n) => `${n} position${n > 1 ? "s" : ""} encore ouverte${n > 1 ? "s" : ""} ignorée${n > 1 ? "s" : ""}.`,
    dup: "déjà loggé", account: "Compte", none: "Aucun compte", setup: "Setup (optionnel)", cancel: "Annuler", import: (n) => `IMPORTER ${n} TRADE${n > 1 ? "S" : ""}`,
    done: (n) => `${n} trade${n > 1 ? "s" : ""} importé${n > 1 ? "s" : ""}`, all: "Tout", noneSel: "Aucun",
  },
  en: {
    title: "IMPORT FILLS", drop: "Drop your CSV export", hint: "Tradovate (Performance or Fills), Rithmic R|Trader (Completed Orders), NinjaTrader (Executions).",
    how: "Tradovate: Reports → Performance → Download CSV. Rithmic: Order History → Export. Fees are not deducted.",
    errCols: "Columns not recognised: need at least time, side (B/S), quantity, price and symbol.", errEmpty: "Empty file.",
    found: (n, f) => `${n} trade${n > 1 ? "s" : ""} rebuilt · ${f} format`, open: (n) => `${n} still-open position${n > 1 ? "s" : ""} skipped.`,
    dup: "already logged", account: "Account", none: "No account", setup: "Setup (optional)", cancel: "Cancel", import: (n) => `IMPORT ${n} TRADE${n > 1 ? "S" : ""}`,
    done: (n) => `${n} trade${n > 1 ? "s" : ""} imported`, all: "All", noneSel: "None",
  },
};

const INPUT = "h-10 w-full rounded-md border border-prism-line bg-prism-surface px-3 font-mono text-xs text-prism-text outline-none focus:border-prism-accent";

function sessionOf(date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(date);
  const t = Number(parts.find((p) => p.type === "hour")?.value || 0) * 60 + Number(parts.find((p) => p.type === "minute")?.value || 0);
  if (t >= 570 && t < 720) return "NY AM";
  if (t >= 720 && t < 1020) return "NY PM";
  if (t >= 180 && t < 570) return "London";
  return "Asia";
}

const key = (t) => `${t.date}|${String(t.symbol || "").toUpperCase()}|${t.dir}|${Math.round((Number(t.pnl) || 0) * 100)}`;

export function FillsImportModal({ onClose, hasExecution, defaultAccountId = "" }) {
  const { lang, trades, accounts, playbooks, importTrades, notify } = useBook();
  const T = TXT[lang === "en" ? "en" : "fr"];
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState([]);
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [setup, setSetup] = useState("");
  const [saving, setSaving] = useState(false);
  const [drag, setDrag] = useState(false);

  const existing = useMemo(() => new Set(trades.map(key)), [trades]);

  const read = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseFills(String(reader.result || ""));
        setError("");
        setResult(parsed);
        setPicked(parsed.trades.map((t, i) => (existing.has(key(t)) ? null : i)).filter((i) => i !== null));
      } catch (e) {
        setResult(null);
        setError(e?.message === "empty" ? T.errEmpty : T.errCols);
      }
    };
    reader.readAsText(file);
  };

  async function confirm() {
    const rows = picked.map((i) => result.trades[i]).map((t) => {
      const row = {
        date: t.date, symbol: t.symbol, dir: t.dir, session: sessionOf(t.start), r: 0, pnl: t.pnl,
        setup: setup || null, tags: [], why: null, plan: true, grade: null, account_id: accountId || null,
        outcome: t.pnl === 0 ? "BE" : null, strategy_checks: [],
      };
      if (hasExecution) {
        row.execution = { mode: "day", entry_time: t.entry_time, exit_time: t.exit_time, entry_price: t.entry_price, exit_price: t.exit_price, size: t.qty, source: t.source, contract: t.contract };
      }
      return row;
    });
    setSaving(true);
    const ok = await importTrades(rows);
    setSaving(false);
    if (ok) { notify(T.done(rows.length)); onClose(); }
  }

  const list = result?.trades || [];
  const toggle = (i) => setPicked((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]));

  const modal = (
    <div className="fixed inset-0 z-[100] grid overflow-y-auto overflow-x-hidden bg-black/85 p-3 backdrop-blur-sm sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="m-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-prism-line bg-prism-panel">
        <header className="flex items-center justify-between border-b border-prism-line px-5 py-4">
          <h2 className="term-title text-lg text-prism-accent">{T.title}</h2>
          <button type="button" onClick={onClose} className="text-prism-muted hover:text-prism-text" aria-label="close"><X className="h-5 w-5" /></button>
        </header>
        <div className="space-y-4 p-4 sm:p-6">
          <label
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); read(e.dataTransfer.files?.[0]); }}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition ${drag ? "border-prism-accent bg-prism-accentDim" : "border-prism-line2"}`}
          >
            <FileUp className="mb-2 h-6 w-6 text-prism-muted" />
            <span className="text-sm font-medium">{T.drop}</span>
            <span className="mt-1 max-w-md text-[11px] text-prism-muted">{T.hint}</span>
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => read(e.target.files?.[0])} />
          </label>
          <p className="text-[11px] text-prism-muted2">{T.how}</p>
          {error && <p className="rounded-md border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.10)] px-3 py-2 text-xs text-prism-loss">{error}</p>}

          {result && (
            <>
              <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
                <span className="text-prism-accent">{T.found(list.length, result.format)}</span>
                {result.openPositions > 0 && <span className="text-prism-muted">{T.open(result.openPositions)}</span>}
                <span className="ml-auto flex gap-3">
                  <button type="button" onClick={() => setPicked(list.map((_, i) => i))} className="text-prism-accent">{T.all}</button>
                  <button type="button" onClick={() => setPicked([])} className="text-prism-muted">{T.noneSel}</button>
                </span>
              </div>
              <div className="max-h-[40vh] space-y-1.5 overflow-y-auto pr-1">
                {list.map((t, i) => {
                  const on = picked.includes(i);
                  const dup = existing.has(key(t));
                  return (
                    <button key={i} type="button" onClick={() => toggle(i)} className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left font-mono text-[11px] ${on ? "border-prism-accent/60 bg-prism-accentDim" : "border-prism-line"}`}>
                      <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${on ? "border-prism-accent bg-prism-accent text-black" : "border-prism-line2"}`}>{on && <Check className="h-3 w-3" />}</span>
                      <span className="min-w-0 flex-1 truncate">
                        <b>{t.symbol}</b> <span className={t.dir === "long" ? "text-prism-accent" : "text-prism-loss"}>{t.dir.toUpperCase()}</span> ×{t.qty}
                        <span className="text-prism-muted"> · {frDate(t.date).slice(0, 5)} {t.entry_time.slice(0, 5)} · {t.entry_price} → {t.exit_price}</span>
                        {dup && <span className="ml-1 text-prism-muted2">({T.dup})</span>}
                      </span>
                      <b className={`shrink-0 ${t.pnl > 0 ? "text-prism-win" : t.pnl < 0 ? "text-prism-loss" : "text-prism-muted"}`}>{fmtMoney(t.pnl, true)}</b>
                    </button>
                  );
                })}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[.12em] text-prism-muted">{T.account}</span>
                  <select className={INPUT} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                    <option value="">{T.none}</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.note || a.firm}</option>)}
                  </select>
                </label>
                <label className="block"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[.12em] text-prism-muted">{T.setup}</span>
                  <select className={INPUT} value={setup} onChange={(e) => setSetup(e.target.value)}>
                    <option value="">—</option>
                    {playbooks.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </label>
              </div>
            </>
          )}
        </div>
        <footer className="flex justify-end gap-3 border-t border-prism-line px-5 py-4">
          <button type="button" onClick={onClose} className="px-3 text-sm text-prism-muted hover:text-prism-text">{T.cancel}</button>
          <button type="button" disabled={!picked.length || saving} onClick={confirm} className="inline-flex h-10 items-center rounded-md bg-prism-accent px-4 text-[11px] font-extrabold tracking-[.14em] text-black disabled:opacity-40">{saving ? "…" : T.import(picked.length)}</button>
        </footer>
      </section>
    </div>
  );
  return typeof document === "undefined" ? modal : createPortal(modal, document.body);
}
