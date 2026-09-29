"use client";

import { useState } from "react";
import { Check, ClipboardCheck, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { useBook } from "@/components/BookProvider";
import { ConfirmModal } from "@/components/prism/TerminalPrimitives";

const EMPTY = { name: "", description: "", rules: "" };
const inputClass = "w-full rounded-lg border border-prism-line bg-prism-surface px-3 py-2.5 text-sm text-prism-text outline-none placeholder:text-prism-muted2 focus:border-prism-accent";

export default function PlaybookPage() {
  const { playbooks, addSetup, updateSetup, deleteSetup, trades, lang, notify } = useBook();
  const en = lang === "en";
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const reset = () => { setForm(EMPTY); setEditingId(null); };

  function edit(strategy) {
    setEditingId(strategy.id);
    setForm({ name: strategy.name || "", description: strategy.description || "", rules: Array.isArray(strategy.rules) ? strategy.rules.join("\n") : "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) return notify(en ? "A strategy name is required." : "Un nom de stratégie est requis.", true);
    const payload = { name, description: form.description.trim() || null, rules: form.rules.split("\n").map((rule) => rule.trim()).filter(Boolean) };
    setSaving(true);
    const result = editingId ? await updateSetup(editingId, payload) : await addSetup(payload);
    setSaving(false);
    if (result) reset();
  }

  return <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
    <header className="mb-6"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-prism-accent">{en ? "Trading process" : "Processus de trading"}</p><h1 className="mt-2 flex items-center gap-2 text-2xl font-bold sm:text-3xl"><Target className="h-6 w-6 text-prism-accent" />{en ? "Strategies" : "Stratégies"}</h1><p className="mt-2 max-w-2xl text-sm text-prism-muted">{en ? "Build your entry rules once, then use them when you log every trade." : "Crée tes règles d’entrée une seule fois, puis utilise-les à chaque trade loggé."}</p></header>
    <div className="grid gap-5 lg:grid-cols-[minmax(320px,.8fr)_minmax(0,1.2fr)]">
      <form onSubmit={submit} className="h-fit rounded-xl border border-prism-line bg-prism-panel p-5">
        <div className="mb-5 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-prism-accentDim text-prism-accent"><ClipboardCheck className="h-5 w-5" /></span><div><h2 className="font-bold">{editingId ? (en ? "Edit strategy" : "Modifier la stratégie") : (en ? "New strategy" : "Nouvelle stratégie")}</h2><p className="text-xs text-prism-muted">{en ? "One line equals one checklist item." : "Une ligne égale une règle de checklist."}</p></div></div>
        <label className="mb-3 block text-[10px] font-bold uppercase tracking-[.13em] text-prism-muted2">{en ? "Strategy name" : "Nom de la stratégie"}<input className={`${inputClass} mt-1.5`} value={form.name} onChange={(event) => set("name", event.target.value)} placeholder={en ? "e.g. NY Open Sweep + FVG" : "ex. NY Open Sweep + FVG"} /></label>
        <label className="mb-3 block text-[10px] font-bold uppercase tracking-[.13em] text-prism-muted2">Description<input className={`${inputClass} mt-1.5`} value={form.description} onChange={(event) => set("description", event.target.value)} placeholder={en ? "When this setup works" : "Quand ce setup fonctionne"} /></label>
        <label className="block text-[10px] font-bold uppercase tracking-[.13em] text-prism-muted2">{en ? "Entry checklist" : "Checklist d’entrée"}<textarea className={`${inputClass} mt-1.5 min-h-48 resize-y leading-relaxed`} value={form.rules} onChange={(event) => set("rules", event.target.value)} placeholder={en ? "Liquidity taken\nStructure break\nEntry on retracement" : "Liquidité prise\nCassure de structure\nEntrée sur retracement"} /></label>
        <div className="mt-4 flex gap-2"><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-prism-accent px-4 py-2.5 text-xs font-bold uppercase tracking-[.12em] text-black disabled:opacity-50"><Plus className="h-4 w-4" />{saving ? "…" : editingId ? (en ? "Save" : "Enregistrer") : (en ? "Create strategy" : "Créer la stratégie")}</button>{editingId && <button type="button" onClick={reset} className="rounded-md border border-prism-line px-4 py-2.5 text-xs font-bold text-prism-muted hover:text-prism-text">{en ? "Cancel" : "Annuler"}</button>}</div>
      </form>
      <section><div className="mb-3 flex items-center justify-between"><h2 className="font-bold">{en ? "Your strategies" : "Tes stratégies"}</h2><span className="rounded-full bg-prism-accentDim px-2.5 py-1 font-mono text-xs font-bold text-prism-accent">{playbooks.length}</span></div>{playbooks.length === 0 ? <div className="rounded-xl border border-dashed border-prism-line bg-prism-panel px-6 py-14 text-center"><ClipboardCheck className="mx-auto h-7 w-7 text-prism-accent" /><h3 className="mt-3 font-bold">{en ? "Your process starts here" : "Ton process commence ici"}</h3><p className="mt-2 text-sm text-prism-muted">{en ? "Create your first strategy to make it available in Log trade." : "Crée ta première stratégie pour la retrouver dans Log trade."}</p></div> : <div className="space-y-3">{playbooks.map((strategy) => <StrategyCard key={strategy.id} strategy={strategy} trades={trades} en={en} onEdit={() => edit(strategy)} onDelete={() => setDeleting(strategy)} />)}</div>}</section>
    </div>
    {deleting && <ConfirmModal title={en ? "Delete this strategy?" : "Supprimer cette stratégie ?"} message={en ? `“${deleting.name}” will no longer be available for new trades.` : `“${deleting.name}” ne sera plus disponible pour les nouveaux trades.`} confirmLabel={en ? "Delete" : "Supprimer"} onClose={() => setDeleting(null)} onConfirm={async () => { const deleted = await deleteSetup(deleting.id); if (deleted) setDeleting(null); }} />}
  </main>;
}

function StrategyCard({ strategy, trades, en, onEdit, onDelete }) {
  const rules = Array.isArray(strategy.rules) ? strategy.rules : [];
  const used = trades.filter((trade) => trade.setup === strategy.name);
  const wins = used.filter((trade) => Number(trade.pnl) > 0).length;
  const pnl = used.reduce((total, trade) => total + (Number(trade.pnl) || 0), 0);
  return <article className="rounded-xl border border-prism-line bg-prism-panel p-5"><div className="flex items-start justify-between gap-4"><div><h3 className="font-bold text-prism-text">{strategy.name}</h3>{strategy.description && <p className="mt-1 text-sm text-prism-muted">{strategy.description}</p>}</div><div className="flex shrink-0 gap-1"><button type="button" onClick={onEdit} className="rounded-md p-2 text-prism-muted hover:bg-prism-panel2 hover:text-prism-text" aria-label="Modifier"><Pencil className="h-4 w-4" /></button><button type="button" onClick={onDelete} className="rounded-md p-2 text-prism-muted hover:bg-red-500/10 hover:text-prism-loss" aria-label="Supprimer"><Trash2 className="h-4 w-4" /></button></div></div><div className="mt-4 grid grid-cols-3 divide-x divide-prism-line rounded-lg border border-prism-line bg-prism-surface"><Stat value={used.length} label="trades" /><Stat value={used.length ? `${Math.round((wins / used.length) * 100)}%` : "—"} label="win rate" /><Stat value={`${pnl >= 0 ? "+" : ""}$${pnl.toFixed(0)}`} label="P&L" tone={pnl < 0 ? "text-prism-loss" : "text-prism-win"} /></div><div className="mt-4 border-t border-prism-line pt-3"><p className="mb-2 text-[10px] font-bold uppercase tracking-[.13em] text-prism-muted2">Checklist · {rules.length}</p>{rules.length ? <ul className="space-y-2">{rules.map((rule, index) => <li key={`${rule}-${index}`} className="flex items-start gap-2 text-sm text-prism-muted"><Check className="mt-0.5 h-4 w-4 shrink-0 text-prism-accent" />{rule}</li>)}</ul> : <p className="text-sm text-prism-muted2">{en ? "No checklist rules yet." : "Pas encore de règle de checklist."}</p>}</div></article>;
}

function Stat({ value, label, tone = "text-prism-text" }) { return <div className="min-w-0 p-3 text-center"><b className={`block truncate font-mono text-sm ${tone}`}>{value}</b><span className="mt-1 block text-[9px] uppercase tracking-[.12em] text-prism-muted2">{label}</span></div>; }
