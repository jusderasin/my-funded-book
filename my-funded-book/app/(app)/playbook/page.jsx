"use client";

import { useState } from "react";
import { useBook } from "@/components/BookProvider";
import { fmtK } from "@/lib/format";
import { Check, ClipboardCheck, Pencil, Plus, Target, Trash2 } from "lucide-react";

const EMPTY_STRATEGY = { name: "", description: "", rules: "" };

export default function PlaybookPage() {
  const { playbooks, addSetup, updateSetup, deleteSetup, trades, lang } = useBook();
  const L = lang === "en" ? "en" : "fr";
  const [form, setForm] = useState(EMPTY_STRATEGY);
  const [editingId, setEditingId] = useState(null);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  function resetForm() {
    setForm(EMPTY_STRATEGY);
    setEditingId(null);
  }

  function startEdit(strategy) {
    setEditingId(strategy.id);
    setForm({
      name: strategy.name || "",
      description: strategy.description || "",
      rules: Array.isArray(strategy.rules) ? strategy.rules.join("\n") : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    if (!form.name.trim()) return;
    const rules = form.rules.split("\n").map((rule) => rule.trim()).filter(Boolean);
    const payload = { name: form.name.trim(), description: form.description.trim() || null, rules };
    if (editingId) await updateSetup(editingId, payload);
    else await addSetup(payload);
    resetForm();
  }

  return (
    <div className="min-h-full bg-black p-4 text-white sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1180px]">
        <header className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-prism-accent">
            {L === "en" ? "Trading process" : "Processus de trading"}
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <Target className="h-5 w-5 text-prism-accent" />
            {L === "en" ? "Strategies" : "Strat\u00e9gies"}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-prism-muted">
            {L === "en"
              ? "Build your entry rules once. When you log a trade, your checklist appears so you can validate exactly what was respected."
              : "Cr\u00e9e tes r\u00e8gles d'entr\u00e9e une seule fois. Au moment de loguer un trade, la checklist appara\u00eet pour valider exactement ce qui a \u00e9t\u00e9 respect\u00e9."}
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)]">
          <section className={`h-fit rounded-2xl border bg-prism-panel p-4 sm:p-5 ${editingId ? "border-prism-accent" : "border-prism-line"}`}>
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-prism-accentDim text-prism-accent"><ClipboardCheck className="h-4 w-4" /></span>
              <div>
                <h2 className="font-semibold">{editingId ? (L === "en" ? "Edit strategy" : "Modifier la strat\u00e9gie") : (L === "en" ? "New strategy" : "Nouvelle strat\u00e9gie")}</h2>
                <p className="text-xs text-prism-muted2">{L === "en" ? "One rule per line = one checkbox." : "Une ligne = une case \u00e0 cocher."}</p>
              </div>
            </div>

            <div className="space-y-3">
              <StrategyField label={L === "en" ? "Strategy name" : "Nom de la strat\u00e9gie"}>
                <input className={inputClass} value={form.name} onChange={(event) => set("name", event.target.value)} placeholder={L === "en" ? "e.g. NY Open Sweep + FVG" : "ex. NY Open Sweep + FVG"} />
              </StrategyField>
              <StrategyField label="Description">
                <input className={inputClass} value={form.description} onChange={(event) => set("description", event.target.value)} placeholder={L === "en" ? "When and why this setup works" : "Quand et pourquoi ce setup fonctionne"} />
              </StrategyField>
              <StrategyField label={L === "en" ? "Entry checklist" : "Checklist d'entr\u00e9e"}>
                <textarea className={`${inputClass} min-h-[175px] resize-y leading-relaxed`} value={form.rules} onChange={(event) => set("rules", event.target.value)} placeholder={"Liquidit\u00e9 prise au-dessus du high Asie\nD\u00e9placement avec cassure de structure\nEntr\u00e9e sur retracement FVG\nStop derri\u00e8re le sweep\nObjectif minimum 2R"} />
              </StrategyField>
            </div>

            <div className="mt-4 flex gap-2">
              <button type="button" onClick={submit} className="inline-flex items-center gap-2 rounded-xl bg-prism-accent px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90"><Plus className="h-4 w-4" />{editingId ? (L === "en" ? "Save strategy" : "Enregistrer") : (L === "en" ? "Create strategy" : "Cr\u00e9er la strat\u00e9gie")}</button>
              {editingId && <button type="button" onClick={resetForm} className="rounded-xl border border-prism-line px-4 py-2.5 text-sm font-semibold text-prism-muted hover:text-white">{L === "en" ? "Cancel" : "Annuler"}</button>}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">{L === "en" ? "Your strategies" : "Tes strat\u00e9gies"}</h2>
              <span className="rounded-full bg-prism-accentDim px-2.5 py-1 text-xs font-semibold text-prism-accent">{playbooks.length}</span>
            </div>
            {playbooks.length === 0 ? <StrategyEmpty L={L} /> : <div className="space-y-3">{playbooks.map((strategy) => <StrategyCard key={strategy.id} strategy={strategy} trades={trades} editing={editingId === strategy.id} onEdit={() => startEdit(strategy)} onDelete={() => { if (editingId === strategy.id) resetForm(); deleteSetup(strategy.id); }} L={L} />)}</div>}
          </section>
        </div>
      </div>
    </div>
  );
}

const inputClass = "w-full rounded-xl border border-prism-line bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-prism-muted2 focus:border-prism-accent";

function StrategyField({ label, children }) {
  return <label className="block"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-prism-muted2">{label}</span>{children}</label>;
}

function StrategyEmpty({ L }) {
  return <div className="rounded-2xl border border-dashed border-prism-line bg-prism-panel px-6 py-14 text-center"><ClipboardCheck className="mx-auto h-7 w-7 text-prism-accent" /><h3 className="mt-3 font-semibold">{L === "en" ? "Your process starts here" : "Ton process commence ici"}</h3><p className="mx-auto mt-1 max-w-sm text-sm text-prism-muted">{L === "en" ? "Create a strategy and turn each entry criterion into a checklist." : "Cr\u00e9e une strat\u00e9gie et transforme chaque crit\u00e8re d'entr\u00e9e en checklist."}</p></div>;
}

function StrategyCard({ strategy, trades, editing, onEdit, onDelete, L }) {
  const rules = Array.isArray(strategy.rules) ? strategy.rules : [];
  const used = trades.filter((trade) => trade.setup === strategy.name);
  const wins = used.filter((trade) => Number(trade.pnl) > 0).length;
  const winRate = used.length ? Math.round((wins / used.length) * 100) : null;
  const net = used.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0);
  return <article className={`rounded-2xl border bg-prism-panel p-4 sm:p-5 ${editing ? "border-prism-accent" : "border-prism-line"}`}>
    <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-white">{strategy.name}</h3>{strategy.description && <p className="mt-1 text-sm text-prism-muted">{strategy.description}</p>}</div><div className="flex shrink-0 gap-1"><button type="button" onClick={onEdit} className="rounded-lg p-2 text-prism-muted hover:bg-white/5 hover:text-white" aria-label="Modifier"><Pencil className="h-4 w-4" /></button><button type="button" onClick={onDelete} className="rounded-lg p-2 text-prism-muted hover:bg-prism-lossDim hover:text-prism-loss" aria-label="Supprimer"><Trash2 className="h-4 w-4" /></button></div></div>
    <div className="mt-4 grid grid-cols-3 divide-x divide-prism-line rounded-xl border border-prism-line bg-black/20"><Stat value={String(used.length)} label={L === "en" ? "trades" : "trades"} /><Stat value={winRate == null ? "—" : `${winRate}%`} label="win rate" /><Stat value={fmtK(net)} label="P&L" tone={net >= 0 ? "text-prism-win" : "text-prism-loss"} /></div>
    <div className="mt-4 border-t border-prism-line pt-3"><div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-prism-muted2">{L === "en" ? "Checklist" : "Checklist"} · {rules.length}</div>{rules.length ? <ul className="space-y-2">{rules.map((rule, index) => <li key={`${rule}-${index}`} className="flex items-start gap-2 text-sm text-prism-muted"><span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-prism-line"><Check className="h-3 w-3 text-prism-muted2" /></span>{rule}</li>)}</ul> : <p className="text-sm text-prism-muted2">{L === "en" ? "Add entry rules to create the checklist." : "Ajoute des r\u00e8gles d'entr\u00e9e pour cr\u00e9er la checklist."}</p>}</div>
  </article>;
}

function Stat({ value, label, tone = "text-white" }) {
  return <div className="min-w-0 p-2.5 text-center"><div className={`truncate font-mono text-sm font-bold ${tone}`}>{value}</div><div className="mt-0.5 text-[9px] uppercase tracking-wider text-prism-muted2">{label}</div></div>;
}
