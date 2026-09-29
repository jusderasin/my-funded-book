"use client";

// Wizard de création d'un compte prop firm en 5 étapes :
// Firm → Programme → Taille → Phase (+ aperçu des règles) → Détails.
// Écrit uniquement des colonnes existantes de public.accounts. La colonne
// JSONB `progress` (migration 005) n'est utilisée que si elle existe.

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Check, Pencil, X, MessageCircle } from "lucide-react";
import { useBook } from "@/components/BookProvider";
import { createClient } from "@/lib/supabase/client";
import { PROP_RULES } from "@/lib/constants";
import { INPUT, LABEL, Field, FirmAvatar, money, CYAN, GREEN, RED } from "./shared";

const CUSTOM = "__custom";
const DEFAULT_SIZES = [25000, 50000, 100000, 150000];
const DD_TYPES = ["eod", "intraday", "static"];

const pad = (n) => String(n).padStart(2, "0");
const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const num = (v) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : null; };

const TXT = {
  fr: {
    steps: ["Choisir la prop firm", "Choisir le programme", "Choisir la taille", "Choisir la phase", "Détails du compte"],
    notListed: "Ma firm n'est pas listée", notListedHint: "Saisir un nom de prop firm personnalisé", firmName: "Nom de la prop firm",
    customSize: "Autre taille ($)", evaluation: "Évaluation", funded: "Funded",
    preview: "RULES PREVIEW", target: "PROFIT TARGET", maxLoss: "MAX LOSS", consistency: "RÈGLE DE CONSISTANCE", ddType: "TYPE DE DRAWDOWN", dll: "PERTE MAX / JOUR",
    none: "Aucune", editRules: "Modifier les règles", doneRules: "Terminé",
    summary: (r) => `${r.dll ? `Perte max journalière ${money(r.dll, false)}.` : "Pas de perte max journalière."} ${r.consistency ? `Consistance : meilleur jour ≤ ${r.consistency} % du profit total.` : "Pas de règle de consistance."}`,
    outdatedTitle: "Règles possiblement obsolètes.", outdated: "Les prop firms mettent régulièrement leurs règles à jour. Vérifie-les sur le site de ta firm et corrige-les avec « Modifier les règles » si besoin.",
    name: "Nom du compte", progressToggle: "J'ai déjà de la progression sur ce compte", balance: "Solde actuel", existing: "Profit existant",
    winDays: "Jours gagnants", bestDay: "Profit du meilleur jour (opt.)", startDate: "Date de début (opt.)",
    progressOff: "Progression existante indisponible : lance la migration 005 dans Supabase pour l'activer.",
    back: "Retour", next: "Suivant", create: "Créer le compte", creating: "Création…",
    dd: { eod: "EOD", intraday: "Trailing", static: "Static" },
  },
  en: {
    steps: ["Select Prop Firm", "Select Program", "Select Account Size", "Select Phase", "Account Details"],
    notListed: "My firm isn't listed", notListedHint: "Enter a custom prop firm name", firmName: "Prop firm name",
    customSize: "Other size ($)", evaluation: "Evaluation", funded: "Funded",
    preview: "RULES PREVIEW", target: "PROFIT TARGET", maxLoss: "MAX LOSS", consistency: "CONSISTENCY RULE", ddType: "DRAWDOWN TYPE", dll: "DAILY LOSS LIMIT",
    none: "None", editRules: "Edit rules", doneRules: "Done",
    summary: (r) => `${r.dll ? `Daily loss limit ${money(r.dll, false)}.` : "No daily loss limit."} ${r.consistency ? `Consistency: largest day ≤ ${r.consistency}% of total profit.` : "No consistency rule."}`,
    outdatedTitle: "Rules may be outdated.", outdated: "Prop firms update their rules regularly. Check them on your firm's website and fix them with “Edit rules” if needed.",
    name: "Account Name", progressToggle: "I have existing progress on this account", balance: "Current Balance", existing: "Existing Profit",
    winDays: "Winning Days", bestDay: "Best Day Profit (opt)", startDate: "Start Date (opt)",
    progressOff: "Existing progress unavailable: run migration 005 in Supabase to enable it.",
    back: "Back", next: "Next", create: "Create Account", creating: "Creating…",
    dd: { eod: "EOD", intraday: "Trailing", static: "Static" },
  },
};

export default function AccountWizard({ onClose, onCreated }) {
  const { lang, addAccount } = useBook();
  const T = TXT[lang === "en" ? "en" : "fr"];
  const supabase = useMemo(() => createClient(), []);

  const [step, setStep] = useState(0);
  const [firm, setFirm] = useState("");
  const [customFirm, setCustomFirm] = useState("");
  const [program, setProgram] = useState("");
  const [size, setSize] = useState(null);
  const [customSize, setCustomSize] = useState("");
  const [phase, setPhase] = useState("");
  const [rules, setRules] = useState(null);
  const [editingRules, setEditingRules] = useState(false);
  const [name, setName] = useState("");
  const [withProgress, setWithProgress] = useState(false);
  const [progress, setProgress] = useState({ balance: "", existing: "0", winDays: "0", bestDay: "", startDate: "" });
  const [hasProgressCol, setHasProgressCol] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let alive = true;
    supabase.from("accounts").select("progress").limit(1).then((progressResult) => {
      if (!alive) return;
      setHasProgressCol(!progressResult.error);
    });
    return () => { alive = false; };
  }, [supabase]);

  const isCustom = firm === CUSTOM;
  const firmDef = isCustom ? null : PROP_RULES[firm];
  const programs = firmDef ? Object.keys(firmDef.programs) : ["Standard"];
  const programDef = firmDef?.programs[program] || null;
  const sizes = programDef ? Object.keys(programDef.sizes).map(Number) : DEFAULT_SIZES;
  const finalSize = size === "custom" ? num(customSize) : size;

  // Pré-remplit les règles quand la phase est choisie.
  function choosePhase(p) {
    setPhase(p);
    const s = programDef?.sizes[finalSize] || {};
    setRules({
      target: p === "eval" ? s.target ?? "" : "",
      mll: s.mll ?? "",
      dll: s.dll ?? programDef?.dll ?? "",
      dd: programDef?.dd || "eod",
      lock: programDef?.lock ?? 0,
      consistency: (p === "eval" ? programDef?.consistency : programDef?.fundedConsistency) ?? "",
    });
    setEditingRules(isCustom || !programDef?.sizes[finalSize]);
  }

  function goNext() {
    if (step === 0 && !isCustom) setProgram(programs[0]);
    if (step === 0 && isCustom) setProgram("Standard");
    if (step === 3) {
      const label = isCustom ? customFirm.trim() : program;
      const k = finalSize ? `${Math.round(finalSize / 1000)}K` : "";
      setName((cur) => cur || `${label} ${k} #${Math.floor(1000 + Math.random() * 9000)}`.replace(/\s+/g, " ").trim());
      setProgress((cur) => ({ ...cur, balance: cur.balance || String(finalSize || "") }));
    }
    setStep((s) => Math.min(4, s + 1));
  }

  const canNext = [
    Boolean(firm) && (!isCustom || customFirm.trim().length > 1),
    Boolean(program),
    Boolean(finalSize && finalSize > 0),
    Boolean(phase) && rules && num(rules.mll) > 0,
    name.trim().length > 0,
  ][step];

  function setBalance(v) {
    const b = num(v);
    setProgress((cur) => ({ ...cur, balance: v, existing: b !== null && finalSize ? String(Math.round((b - finalSize) * 100) / 100) : cur.existing }));
  }
  function setExisting(v) {
    const e = num(v);
    setProgress((cur) => ({ ...cur, existing: v, balance: e !== null && finalSize ? String(finalSize + e) : cur.balance }));
  }

  async function create() {
    if (!canNext || saving) return;
    setSaving(true);
    const dd = rules.dd;
    const payload = {
      firm: isCustom ? customFirm.trim() : firm,
      size: finalSize,
      cost: 0,
      type: phase === "eval" ? "eval" : "funded",
      status: phase === "eval" ? "active" : "funded",
      date: (withProgress && progress.startDate) || localToday(),
      note: name.trim(),
      profit_target: num(rules.target),
      max_drawdown: num(rules.mll),
      daily_loss_limit: num(rules.dll),
      trailing_type: dd,
      trailing_drawdown: dd !== "static",
      trailing_lock_offset: dd === "static" ? 0 : num(rules.lock) ?? 0,
    };
    if (hasProgressCol && withProgress) {
      payload.progress = {
        existing_profit: num(progress.existing) || 0,
        winning_days: Math.max(0, Math.round(num(progress.winDays) || 0)),
        best_day: num(progress.bestDay),
        consistency: num(rules.consistency),
        consistency_phase: phase,
      };
    } else if (hasProgressCol && num(rules.consistency)) {
      payload.progress = { consistency: num(rules.consistency), consistency_phase: phase };
    }
    const created = await addAccount(payload);
    setSaving(false);
    if (created) onCreated?.(created);
  }

  const r = rules || {};
  if (!mounted) return null;
  // Portail vers <body> : la sidebar a un transform CSS qui casserait position:fixed.
  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/85 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-prism-line bg-prism-panel shadow-2xl">
        {/* En-tête + stepper */}
        <header className="flex items-start justify-between border-b border-prism-line px-6 py-5">
          <div>
            <h2 className="text-xl font-bold">{T.steps[step]}</h2>
            <div className="mt-3 flex items-center gap-1.5">
              {T.steps.map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-prism-accent" : i < step ? "w-1.5 bg-[rgba(6,182,212,0.55)]" : "w-1.5 bg-prism-line2"}`} />
              ))}
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-prism-muted hover:text-prism-text" aria-label="close"><X className="h-5 w-5" /></button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-6">
          {/* Étape 1 — Firm */}
          {step === 0 && (
            <>
              {Object.entries(PROP_RULES).map(([key, def]) => (
                <Choice key={key} active={firm === key} onClick={() => { setFirm(key); setSize(null); setPhase(""); setRules(null); }}>
                  <FirmAvatar firm={key} size={40} />
                  <span className="text-sm font-semibold">{def.label}</span>
                </Choice>
              ))}
              <button
                type="button"
                onClick={() => { setFirm(CUSTOM); setSize(null); setPhase(""); setRules(null); }}
                className={`flex w-full items-center gap-4 rounded-xl border border-dashed px-4 py-3.5 text-left transition ${isCustom ? "border-prism-accent bg-prism-accentDim" : "border-prism-line2 hover:border-prism-muted"}`}
              >
                <span className="grid h-10 w-10 place-items-center rounded-lg border border-prism-line bg-prism-panel2"><Pencil className="h-4 w-4 text-prism-muted" /></span>
                <span><b className="block text-sm">{T.notListed}</b><span className="text-[11px] text-prism-muted">{T.notListedHint}</span></span>
              </button>
              {isCustom && <Field label={T.firmName}><input autoFocus className={INPUT} value={customFirm} onChange={(e) => setCustomFirm(e.target.value)} placeholder="Tradeify, Alpha Futures…" /></Field>}
            </>
          )}

          {/* Étape 2 — Programme */}
          {step === 1 && programs.map((p) => (
            <Choice key={p} active={program === p} onClick={() => setProgram(p)}>
              <span className="text-sm font-semibold">{p}</span>
            </Choice>
          ))}

          {/* Étape 3 — Taille */}
          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {sizes.map((s) => (
                  <button key={s} type="button" onClick={() => { setSize(s); setPhase(""); setRules(null); }} className={`h-[60px] rounded-xl border text-base font-bold transition ${size === s ? "border-prism-accent bg-prism-accentDim text-prism-accent" : "border-prism-line bg-prism-surface hover:border-prism-line2"}`}>
                    {money(s, false)}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => { setSize("custom"); setPhase(""); setRules(null); }} className={`w-full rounded-xl border border-dashed py-3 text-xs ${size === "custom" ? "border-prism-accent text-prism-accent" : "border-prism-line2 text-prism-muted"}`}>{T.customSize}</button>
              {size === "custom" && <input autoFocus inputMode="numeric" className={INPUT} placeholder="75000" value={customSize} onChange={(e) => setCustomSize(e.target.value)} />}
            </>
          )}

          {/* Étape 4 — Phase + règles */}
          {step === 3 && (
            <>
              {["eval", "funded"].map((p) => (
                <button key={p} type="button" onClick={() => choosePhase(p)} className={`h-12 w-full rounded-xl border text-sm transition ${phase === p ? "border-prism-accent bg-prism-accentDim text-prism-accent" : "border-prism-line bg-prism-surface hover:border-prism-line2"}`}>
                  {p === "eval" ? T.evaluation : T.funded}
                </button>
              ))}

              {rules && (
                <div className="rounded-xl border border-prism-line bg-prism-surface p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[11px] font-bold tracking-[.14em] text-prism-muted">{T.preview}</p>
                    <button type="button" onClick={() => setEditingRules((v) => !v)} className="text-[11px] text-prism-accent">{editingRules ? T.doneRules : T.editRules}</button>
                  </div>
                  {editingRules ? (
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={T.target}><input inputMode="decimal" className={INPUT} value={r.target} onChange={(e) => setRules({ ...r, target: e.target.value })} placeholder={phase === "eval" ? "1250" : "—"} /></Field>
                      <Field label={T.maxLoss}><input inputMode="decimal" className={INPUT} value={r.mll} onChange={(e) => setRules({ ...r, mll: e.target.value })} placeholder="1000" /></Field>
                      <Field label={T.dll}><input inputMode="decimal" className={INPUT} value={r.dll} onChange={(e) => setRules({ ...r, dll: e.target.value })} placeholder={T.none} /></Field>
                      <Field label={`${T.consistency} (%)`}><input inputMode="decimal" className={INPUT} value={r.consistency} onChange={(e) => setRules({ ...r, consistency: e.target.value })} placeholder={T.none} /></Field>
                      <Field label={T.ddType} className="col-span-2">
                        <div className="grid grid-cols-3 gap-2">
                          {DD_TYPES.map((d) => (
                            <button key={d} type="button" onClick={() => setRules({ ...r, dd: d })} className={`h-9 rounded-md border text-xs ${r.dd === d ? "border-prism-accent bg-prism-accentDim text-prism-accent" : "border-prism-line text-prism-muted"}`}>{T.dd[d]}</button>
                          ))}
                        </div>
                      </Field>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      <Rule label={T.target} value={num(r.target) ? money(r.target, false) : "—"} color={GREEN} />
                      <Rule label={T.maxLoss} value={num(r.mll) ? money(r.mll, false) : "—"} color={RED} />
                      <Rule label={T.consistency} value={num(r.consistency) ? `≤ ${num(r.consistency)}%` : T.none} color={CYAN} />
                      <Rule label={T.ddType} value={T.dd[r.dd]} />
                    </div>
                  )}
                  <p className="mt-4 border-t border-prism-line pt-3 text-[11px] text-prism-muted">{T.summary({ dll: num(r.dll), consistency: num(r.consistency) })}</p>
                </div>
              )}

              {phase && (
                <div className="flex gap-2.5 rounded-xl border border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.06)] p-3.5 text-[11px] leading-5 text-amber-400">
                  <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <p><b>{T.outdatedTitle}</b> {T.outdated}</p>
                </div>
              )}
            </>
          )}

          {/* Étape 5 — Détails */}
          {step === 4 && (
            <>
              <Field label={T.name}><input autoFocus className={`${INPUT} font-sans text-sm`} value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <div className="border-t border-prism-line pt-4">
                <button type="button" disabled={!hasProgressCol} onClick={() => setWithProgress((v) => !v)} className="flex items-center gap-3 text-sm disabled:opacity-50">
                  <span className={`relative h-6 w-10 rounded-full transition ${withProgress ? "bg-prism-accent" : "bg-prism-panel2 border border-prism-line"}`}>
                    <span className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white transition-all ${withProgress ? "left-5" : "left-1"}`} />
                  </span>
                  {T.progressToggle}
                </button>
                {!hasProgressCol && <p className="mt-2 text-[11px] text-prism-muted">{T.progressOff}</p>}
              </div>
              {withProgress && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label={T.balance}><input inputMode="decimal" className={INPUT} value={progress.balance} onChange={(e) => setBalance(e.target.value)} /></Field>
                  <Field label={T.existing}><input inputMode="decimal" className={INPUT} value={progress.existing} onChange={(e) => setExisting(e.target.value)} /></Field>
                  <Field label={T.winDays}><input inputMode="numeric" className={INPUT} value={progress.winDays} onChange={(e) => setProgress({ ...progress, winDays: e.target.value })} /></Field>
                  <Field label={T.bestDay}><input inputMode="decimal" className={INPUT} value={progress.bestDay} onChange={(e) => setProgress({ ...progress, bestDay: e.target.value })} /></Field>
                  <Field label={T.startDate} className="col-span-2"><input type="date" className={INPUT} value={progress.startDate} onChange={(e) => setProgress({ ...progress, startDate: e.target.value })} /></Field>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pied */}
        <footer className="flex items-center justify-between border-t border-prism-line px-6 py-5">
          {step > 0 ? (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="inline-flex items-center gap-1.5 text-sm text-prism-muted hover:text-prism-text"><ChevronLeft className="h-4 w-4" />{T.back}</button>
          ) : <span />}
          {step < 4 ? (
            <button type="button" disabled={!canNext} onClick={goNext} className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-white px-5 text-sm font-medium text-black transition disabled:bg-[#6b6b6b] disabled:text-[#2a2a2a]">
              {T.next}<ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" disabled={!canNext || saving} onClick={create} className="inline-flex h-11 items-center gap-2 rounded-lg bg-prism-accent px-5 text-sm font-medium text-black transition hover:brightness-110 disabled:opacity-50">
              <Check className="h-4 w-4" />{saving ? T.creating : T.create}
            </button>
          )}
        </footer>
      </section>
    </div>,
    document.body
  );
}

function Choice({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-4 rounded-xl border px-4 py-3.5 text-left transition ${active ? "border-prism-accent bg-prism-accentDim" : "border-prism-line bg-prism-surface hover:border-prism-line2"}`}>
      {children}
    </button>
  );
}

function Rule({ label, value, color }) {
  return (
    <div>
      <p className="text-[10px] tracking-[.1em] text-prism-muted2">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-bold" style={color ? { color } : undefined}>{value}</p>
    </div>
  );
}
