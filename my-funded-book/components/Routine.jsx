"use client";

// Routine hebdomadaire : éditeur (modèle de semaine + exceptions datées) et
// bandeau « règle du jour » réutilisé par le dashboard et le journal.

import { useState } from "react";
import { createPortal } from "react-dom";
import { CalendarClock, Plus, Trash2, X } from "lucide-react";
import { useBook } from "@/components/BookProvider";
import { DAY_NAMES, KIND_COLORS, ROUTINE_KINDS, ROUTINE_WEEK, accountKind, kindLabel, readRoutine, routineEnabled, ruleFor } from "@/lib/routine";

const INPUT = "h-9 w-full rounded-md border border-prism-line bg-prism-surface px-3 font-mono text-xs text-prism-text placeholder:text-prism-muted2 outline-none focus:border-prism-accent";
const pad = (n) => String(n).padStart(2, "0");
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

export function KindChips({ value, onChange, lang, allowNone = true }) {
  const options = allowNone ? ["", ...ROUTINE_KINDS] : ROUTINE_KINDS;
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((kind) => {
        const active = (value || "") === kind;
        return (
          <button
            key={kind || "none"}
            type="button"
            onClick={() => onChange(kind)}
            className={`h-7 rounded-md border px-2 text-[10px] font-bold uppercase tracking-[.08em] transition ${active ? "text-black" : "border-prism-line text-prism-muted hover:text-prism-text"}`}
            style={active ? { background: kind ? KIND_COLORS[kind] : "var(--prism-line2)", borderColor: "transparent" } : undefined}
          >
            {kind ? kindLabel(kind, lang) : "—"}
          </button>
        );
      })}
    </div>
  );
}

export function RoutineEditor({ onClose }) {
  const { profile, saveProfile, lang } = useBook();
  const en = lang === "en";
  const initial = readRoutine(profile);
  const [days, setDays] = useState(initial.days);
  const [exceptions, setExceptions] = useState(initial.exceptions);
  const [draft, setDraft] = useState({ date: todayISO(), kind: "off", note: "" });
  const [saving, setSaving] = useState(false);

  const setDay = (wd, patch) => setDays((cur) => ({ ...cur, [wd]: { ...(cur[wd] || {}), ...patch } }));
  const addException = () => {
    if (!draft.date || !draft.kind) return;
    setExceptions((cur) => ({ ...cur, [draft.date]: { kind: draft.kind, note: draft.note.trim() } }));
    setDraft((d) => ({ ...d, note: "" }));
  };
  const removeException = (iso) => setExceptions((cur) => { const next = { ...cur }; delete next[iso]; return next; });

  async function save() {
    setSaving(true);
    const cleanDays = Object.fromEntries(Object.entries(days).filter(([, d]) => d?.kind).map(([k, d]) => [k, { kind: d.kind, note: (d.note || "").trim() }]));
    const ok = await saveProfile({ trading_routine: { days: cleanDays, exceptions } });
    setSaving(false);
    if (ok) onClose();
  }

  const upcoming = Object.entries(exceptions).sort(([a], [b]) => a.localeCompare(b));

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-xl border border-prism-line bg-prism-panel p-4 text-prism-text shadow-2xl sm:rounded-xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 className="term-title text-xl">{en ? "WEEKLY ROUTINE" : "ROUTINE DE LA SEMAINE"}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-prism-muted hover:text-prism-text" aria-label="close"><X className="h-4 w-4" /></button>
        </div>
        <p className="mb-5 text-xs text-prism-muted">{en ? "Pick which accounts you are allowed to trade each day. Trades outside the plan get an OFF-ROUTINE badge." : "Choisis quels comptes tu as le droit de trader chaque jour. Un trade en dehors du plan reçoit un badge HORS ROUTINE."}</p>

        <div className="divide-y divide-prism-line rounded-lg border border-prism-line">
          {ROUTINE_WEEK.map((wd) => (
            <div key={wd} className="grid gap-2 p-3 sm:grid-cols-[110px_1fr] sm:items-center">
              <span className="text-xs font-bold uppercase tracking-[.1em]">{DAY_NAMES[en ? "en" : "fr"][wd]}</span>
              <div className="space-y-2">
                <KindChips value={days[wd]?.kind} onChange={(kind) => setDay(wd, { kind })} lang={lang} />
                {days[wd]?.kind && <input className={INPUT} value={days[wd]?.note || ""} onChange={(e) => setDay(wd, { note: e.target.value })} placeholder={en ? "Note (e.g. max 2 trades, no news)" : "Note (ex. max 2 trades, pas de news)"} />}
              </div>
            </div>
          ))}
        </div>

        <h3 className="mt-6 mb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-prism-muted">{en ? "Exceptions" : "Exceptions ponctuelles"}</h3>
        <div className="space-y-2 rounded-lg border border-prism-line p-3">
          <div className="grid gap-2 sm:grid-cols-[150px_1fr]">
            <input type="date" className={INPUT} value={draft.date} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} />
            <KindChips value={draft.kind} onChange={(kind) => setDraft((d) => ({ ...d, kind }))} lang={lang} allowNone={false} />
          </div>
          <div className="flex gap-2">
            <input className={INPUT} value={draft.note} onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))} placeholder={en ? "Reason (e.g. NFP day)" : "Raison (ex. jour de NFP)"} />
            <button type="button" onClick={addException} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md border border-prism-accent px-3 text-[11px] font-bold text-prism-accent"><Plus className="h-3 w-3" />{en ? "Add" : "Ajouter"}</button>
          </div>
          {upcoming.length > 0 && (
            <ul className="divide-y divide-prism-line pt-1">
              {upcoming.map(([iso, ex]) => (
                <li key={iso} className="flex items-center gap-2 py-2 font-mono text-[11px]">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: KIND_COLORS[ex.kind] }} />
                  <span className="w-24 shrink-0">{iso.split("-").reverse().join("/")}</span>
                  <span className="w-20 shrink-0 font-bold uppercase">{kindLabel(ex.kind, lang)}</span>
                  <span className="min-w-0 flex-1 truncate text-prism-muted">{ex.note}</span>
                  <button type="button" onClick={() => removeException(iso)} className="text-prism-muted hover:text-prism-loss" aria-label="remove"><Trash2 className="h-3.5 w-3.5" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-prism-line px-4 text-xs font-semibold text-prism-muted">{en ? "Cancel" : "Annuler"}</button>
          <button type="button" disabled={saving} onClick={save} className="h-10 rounded-md bg-prism-accent px-5 text-xs font-bold text-black disabled:opacity-50">{saving ? "…" : en ? "Save routine" : "Enregistrer la routine"}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Bandeau « Mardi — Comptes financés » + comptes du jour mis en avant.
export function RoutineToday({ date, compact = false }) {
  const { profile, accounts, lang } = useBook();
  const [open, setOpen] = useState(false);
  const en = lang === "en";
  const routine = readRoutine(profile);
  const iso = date || todayISO();
  const rule = ruleFor(routine, iso);
  const [y, m, d] = iso.split("-").map(Number);
  const dayName = DAY_NAMES[en ? "en" : "fr"][new Date(y, m - 1, d).getDay()];
  const active = (accounts || []).filter((a) => !["failed", "paid"].includes(a.status));
  const allowed = (a) => !rule || rule.kind === "any" ? true : rule.kind === "off" ? false : accountKind(a) === rule.kind;
  const color = rule ? KIND_COLORS[rule.kind] : "var(--prism-line2)";

  return (
    <>
      <div className="term-panel flex flex-col gap-3 border-l-4 p-4 sm:flex-row sm:items-center" style={{ borderLeftColor: color }}>
        <CalendarClock className="hidden h-5 w-5 shrink-0 text-prism-muted sm:block" />
        <div className="min-w-0 flex-1">
          {routineEnabled(routine) ? (
            <>
              <p className="text-sm font-bold">
                {dayName} — <span style={{ color }}>{rule ? (rule.kind === "off" ? (en ? "No trading" : "Pas de trading") : rule.kind === "any" ? (en ? "Any account" : "Tous les comptes") : `${en ? "" : "Comptes "}${kindLabel(rule.kind, lang).toLowerCase()}`) : kindLabel(null, lang)}</span>
                {rule?.exception && <span className="ml-2 rounded border border-prism-line px-1.5 text-[9px] font-bold uppercase text-prism-muted">{en ? "exception" : "exception"}</span>}
              </p>
              {rule?.note && <p className="mt-0.5 text-xs text-prism-muted">{rule.note}</p>}
              {!compact && active.length > 0 && rule && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {active.map((a) => (
                    <span key={a.id} className={`rounded border px-2 py-0.5 font-mono text-[10px] ${allowed(a) ? "border-prism-line2 text-prism-text" : "border-prism-line text-prism-muted2 line-through opacity-50"}`}>
                      {a.firm} {Number(a.size) ? `${Math.round(Number(a.size) / 1000)}K` : ""}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-prism-muted">{en ? "Set a weekly routine: which accounts you trade on which days." : "Définis ta routine : quels comptes tu trades selon les jours de la semaine."}</p>
          )}
        </div>
        <button type="button" onClick={() => setOpen(true)} className="term-tag h-8 shrink-0 px-3">{routineEnabled(routine) ? (en ? "Edit routine" : "Modifier la routine") : (en ? "Set up" : "Configurer")}</button>
      </div>
      {open && <RoutineEditor onClose={() => setOpen(false)} />}
    </>
  );
}
