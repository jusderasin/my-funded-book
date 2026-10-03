"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FilePicker } from "./FilePicker";
import { useBook } from "./BookProvider";
import { uploadFile } from "@/lib/upload";
import { FIRMS, SESSIONS, GRADES, TAG_LIB } from "@/lib/constants";
import { todayISO, fmtMoney } from "@/lib/format";
import {
  X,
  CreditCard,
  Download,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Check,
  Info,
  ImagePlus,
} from "lucide-react";

const firmOptions = Object.keys(FIRMS);

const PSYCHO_CHECKS = [
  { key: "calm", fr: "Je suis calme, je ne me précipite pas", en: "I am calm, not rushed" },
  { key: "no_chase", fr: "Je ne cherche pas à me refaire", en: "I am not chasing a loss" },
  { key: "rested", fr: "J'ai suffisamment dormi", en: "I slept enough" },
  { key: "plan", fr: "J'ai un plan clair pour ce trade", en: "I have a plan for this trade" },
  { key: "risk", fr: "J'accepte pleinement ce risque", en: "I can afford to lose this risk" },
];

const DEFAULT_PSYCHOLOGY = { emotional: 4, focus: 4, confidence: 4, checks: [] };

// Presets par prop firm : type de trailing DD et offset du lock ($).
const FIRM_TRAILING_DEFAULTS = {
  MFF:      { type: "eod",      lock: 0 },
  Lucid:    { type: "eod",      lock: 100 },
  Phidias:  { type: "intraday", lock: 0 },
  Topstep:  { type: "eod",      lock: 0 },
  Apex:     { type: "intraday", lock: 0 },
  Alpha:    { type: "intraday", lock: 0 },
  Tradeify: { type: "eod",      lock: 0 },
  Autre:    { type: "intraday", lock: 0 },
};

/* ================================================================== */
/*  PRIMITIVES PRISM — partagées par les 5 modals                      */
/* ================================================================== */

const PRISM_INPUT =
  "w-full rounded-xl border border-prism-line bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-prism-muted2 focus:border-prism-accent focus:outline-none transition-colors disabled:opacity-50";

const PRISM_SELECT =
  "w-full rounded-xl border border-prism-line bg-black/40 px-3 py-2.5 text-sm text-white focus:border-prism-accent focus:outline-none transition-colors appearance-none cursor-pointer";

function PrismModal({ title, onClose, footer, children, maxWidth = "max-w-2xl", className = "" }) {
  // Rendu dans <body> : un parent avec `transform` (sidebar) piégerait le `fixed`.
  const node = (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-0 sm:p-4">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative z-10 flex h-[100dvh] max-h-[100dvh] w-full ${maxWidth} flex-col rounded-none border border-prism-line bg-prism-panel shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-2xl ${className}`}
      >
        <div
          className="flex items-center justify-between border-b border-prism-line px-4 py-4 shrink-0 sm:px-6"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
        >
          <h2 className="text-lg font-semibold text-white tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-prism-muted hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">{children}</div>
        {footer && (
          <div
            className="flex gap-2 border-t border-prism-line px-4 py-4 shrink-0 sm:px-6"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
  return typeof document === "undefined" ? node : createPortal(node, document.body);
}

function PrismField({ label, children, hint }) {
  return (
    <div className="mb-4">
      <label className="block text-[10px] font-semibold uppercase tracking-widest text-prism-muted mb-2">
        {label}
      </label>
      {children}
      {hint && <div className="mt-1.5 text-[11px] text-prism-muted2">{hint}</div>}
    </div>
  );
}

function PrismSectionLabel({ children }) {
  return (
    <div className="mb-3 mt-2 border-t border-prism-line pt-4 text-[10px] font-semibold uppercase tracking-widest text-prism-muted2">
      {children}
    </div>
  );
}

function PrismChip({ children, active, danger, onClick, type = "button" }) {
  const base =
    "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer";
  const cls = active
    ? danger
      ? "border-prism-loss/40 bg-prism-loss/10 text-prism-loss"
      : "border-prism-accent bg-prism-accentDim text-prism-accent"
    : "border-prism-line bg-transparent text-prism-muted hover:border-prism-line2 hover:text-white";
  return (
    <button type={type} onClick={onClick} className={`${base} ${cls}`}>
      {children}
    </button>
  );
}

function PrismGhostBtn({ children, onClick, className = "", type = "button", disabled }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-prism-line bg-transparent px-4 py-2.5 text-sm font-medium text-white hover:bg-white/[0.03] hover:border-prism-line2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

function PrismPrimaryBtn({ children, onClick, className = "", type = "button", disabled }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-white text-black px-4 py-2.5 text-sm font-semibold hover:bg-white/90 active:bg-white/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

function PrismDangerBtn({ children, onClick, className = "", type = "button", disabled }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-prism-loss text-white px-4 py-2.5 text-sm font-semibold hover:bg-prism-loss/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

/* ================================================================== */
/*  LogTradeModal — saisie rapide "pro" (bouton + Log trade, édition)  */
/* ================================================================== */

const QUICK_R_DEFAULT = { TP: 2, SL: -1, BE: 0 };

const OUTCOME_STYLE = {
  TP: { on: "border-[rgba(34,197,94,0.7)] bg-[rgba(34,197,94,0.15)] text-prism-win", label: { fr: "Take profit", en: "Take profit" } },
  SL: { on: "border-[rgba(239,68,68,0.7)] bg-[rgba(239,68,68,0.15)] text-prism-loss", label: { fr: "Stop loss", en: "Stop loss" } },
  BE: { on: "border-[rgba(138,138,147,0.7)] bg-[rgba(138,138,147,0.15)] text-white", label: { fr: "Break-even", en: "Break-even" } },
};

// Session probable d'après l'heure de New York (le trader peut la changer).
function sessionNow() {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date());
    const h = Number(parts.find((p) => p.type === "hour")?.value || 0);
    const m = Number(parts.find((p) => p.type === "minute")?.value || 0);
    const t = h * 60 + m;
    if (t >= 570 && t < 720) return "NY AM";
    if (t >= 720 && t < 1020) return "NY PM";
    if (t >= 180 && t < 570) return "London";
    return "Asia";
  } catch {
    return "NY AM";
  }
}

// Force le signe du P&L selon la sortie : un SL est toujours une perte.
function signPnl(value, outcome) {
  if (value === "" || value == null) return value;
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  if (outcome === "SL") return String(-Math.abs(n));
  if (outcome === "TP") return String(Math.abs(n));
  if (outcome === "BE") return "0";
  return String(value);
}

const QL_TXT = "text-prism-text";
const QL_LABEL = "mb-1.5 block text-[10px] font-semibold uppercase tracking-[.14em] text-prism-muted";
const QL_INPUT = "h-11 w-full min-w-0 rounded-xl border border-prism-line bg-black/40 px-3 text-sm placeholder:text-prism-muted2 outline-none transition-colors focus:border-prism-accent";
const QL_SEG = "flex h-10 flex-1 items-center justify-center rounded-lg border text-xs font-bold tracking-wide transition-colors";
const QL_OFF = "border-prism-line text-prism-muted hover:border-prism-line2 hover:text-white";
const QL_ON = "border-prism-accent bg-prism-accentDim text-prism-accent";

function QlField({ label, children, className = "" }) {
  return <div className={`min-w-0 ${className}`}><span className={QL_LABEL}>{label}</span>{children}</div>;
}

function ShotSlot({ label, file, url, onFile, onRemove, lang }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [over, setOver] = useState(false);
  useEffect(() => {
    if (!file) { setPreview(null); return undefined; }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  const src = preview || url;
  const drop = (e) => {
    e.preventDefault();
    setOver(false);
    const f = [...(e.dataTransfer?.files || [])].find((x) => x.type.startsWith("image/"));
    if (f) onFile(f);
  };
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
      className={`relative h-28 min-w-0 overflow-hidden rounded-xl border ${src ? "border-prism-line" : "border-dashed"} ${over ? "border-prism-accent bg-prism-accentDim" : "border-prism-line2 bg-black/30"}`}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      {src ? (
        <>
          <img src={src} alt={label} className="h-full w-full object-cover" />
          <span className="absolute left-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[.14em] text-white">{label}</span>
          <button type="button" onClick={onRemove} aria-label="Supprimer" className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md bg-black/70 text-white hover:bg-prism-loss"><X className="h-4 w-4" /></button>
        </>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center">
          <ImagePlus className="h-5 w-5 text-prism-muted" />
          <span className="text-[10px] font-bold uppercase tracking-[.14em] text-white">{label}</span>
          <span className="text-[10px] text-prism-muted2">{lang === "en" ? "Tap, drop or paste" : "Toucher, déposer ou coller"}</span>
        </button>
      )}
    </div>
  );
}

export function LogTradeModal({ editing, onClose }) {
  const { addTrade, updateTrade, playbooks, accounts, activeAccountId, trades, notify, t, lang } = useBook();
  const en = lang === "en";
  const defaultAccountId = trades[0]?.account_id || accounts.find((account) => account.status === "active")?.id || "";

  // Symboles les plus utilisés sur les 60 derniers trades.
  const recentSymbols = (() => {
    const freq = {};
    (trades || []).slice(0, 60).forEach((tr) => { if (tr.symbol) freq[tr.symbol] = (freq[tr.symbol] || 0) + 1; });
    return Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, 5);
  })();

  const blank = () => ({
    symbol: recentSymbols[0] || "MNQ", date: todayISO(), dir: "long", session: sessionNow(), grade: "A",
    r: "", pnl: "", setup: "", strategy_checks: [], tags: [], emotion: null, psychology: DEFAULT_PSYCHOLOGY,
    why: "", plan: true, account_id: defaultAccountId, outcome: "",
  });

  const [f, setF] = useState(() =>
    editing
      ? {
          ...editing,
          r: editing.r ?? "", pnl: editing.pnl ?? "", outcome: editing.outcome || "",
          tags: Array.isArray(editing.tags) ? editing.tags : [],
          strategy_checks: Array.isArray(editing.strategy_checks) ? editing.strategy_checks : [],
          psychology: { ...DEFAULT_PSYCHOLOGY, ...(editing.psychology || {}) },
        }
      : blank()
  );
  const [quickR, setQuickR] = useState(QUICK_R_DEFAULT);
  const [file, setFile] = useState(null);
  const [file2, setFile2] = useState(null);
  const [shotUrl, setShotUrl] = useState(editing ? editing.screenshot_url || null : null);
  const [shotUrl2, setShotUrl2] = useState(editing ? editing.screenshot_url_2 || null : null);
  const [saving, setSaving] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const selectedStrategy = playbooks.find((strategy) => strategy.name === f.setup);
  const strategyRules = Array.isArray(selectedStrategy?.rules) ? selectedStrategy.rules : [];
  const selectedChecks = Array.isArray(f.strategy_checks) ? f.strategy_checks : [];

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("mtb.quickR") || "{}");
      setQuickR((current) => ({ ...current, ...stored }));
    } catch { /* valeurs par défaut */ }
  }, []);

  // Collage d'une image n'importe où dans le formulaire : premier emplacement libre.
  const slotsRef = useRef({});
  slotsRef.current = { first: !!(file || shotUrl), second: !!(file2 || shotUrl2) };
  useEffect(() => {
    const onPaste = (e) => {
      const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
      const img = item?.getAsFile();
      if (!img) return;
      e.preventDefault();
      if (!slotsRef.current.first) setFile(img);
      else if (!slotsRef.current.second) setFile2(img);
      else notify(en ? "Both screenshot slots are full" : "Les deux emplacements de capture sont pleins", true);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [en, notify]);

  const selectStrategy = (name) => setF((current) => ({ ...current, setup: name, strategy_checks: name === current.setup ? current.strategy_checks : [] }));
  const toggleStrategyRule = (rule) => setF((current) => {
    const checks = Array.isArray(current.strategy_checks) ? current.strategy_checks : [];
    return { ...current, strategy_checks: checks.includes(rule) ? checks.filter((item) => item !== rule) : [...checks, rule] };
  });

  const addTag = (raw) => {
    const v = (raw || "").trim();
    if (!v) return;
    if (f.tags.some((x) => x.toLowerCase() === v.toLowerCase())) { setTagInput(""); return; }
    set("tags", [...f.tags, v]);
    setTagInput("");
  };
  const removeTag = (tag) => set("tags", f.tags.filter((x) => x !== tag));
  const tagFreq = {};
  (trades || []).forEach((tr) => (tr.tags || []).forEach((tg) => { tagFreq[tg] = (tagFreq[tg] || 0) + 1; }));
  const historyTags = Object.keys(tagFreq).sort((a, b) => tagFreq[b] - tagFreq[a]);
  const tagSuggestions = [...new Set([...TAG_LIB, ...historyTags])]
    .filter((tg) => !f.tags.some((x) => x.toLowerCase() === tg.toLowerCase()))
    .slice(0, 12);

  function pickOutcome(o) {
    setF((current) => {
      const next = current.outcome === o ? "" : o;
      if (!next) return { ...current, outcome: "" };
      return { ...current, outcome: next, r: String(quickR[next]), pnl: signPnl(current.pnl, next) };
    });
  }

  async function save(again = false) {
    if (saving) return;
    setSaving(true);
    let screenshot_url = shotUrl;
    let screenshot_url_2 = shotUrl2;
    try {
      if (file) screenshot_url = await uploadFile(file, "trades");
      if (file2) screenshot_url_2 = await uploadFile(file2, "trades");
    } catch (e) {
      setSaving(false);
      return notify(e.message, true);
    }
    const row = {
      symbol: (f.symbol || "MNQ").trim().toUpperCase(), date: f.date, dir: f.dir, session: f.session,
      grade: f.grade, r: Number(f.r) || 0, pnl: Number(signPnl(f.pnl, f.outcome)) || 0, setup: f.setup || null,
      strategy_checks: selectedChecks, tags: f.tags, emotion: f.emotion || null, why: f.why || null, plan: !!f.plan,
      psychology: { ...DEFAULT_PSYCHOLOGY, ...(f.psychology || {}) },
      screenshot_url: screenshot_url || null,
      screenshot_url_2: screenshot_url_2 || null,
      account_id: f.account_id || null,
      outcome: f.outcome || null,
    };
    // Un break-even est toujours neutre.
    if (row.outcome === "BE") { row.r = 0; row.pnl = 0; }
    const result = editing ? await updateTrade(editing.id, row) : await addTrade(row);
    setSaving(false);
    // Sur erreur Supabase, on garde le formulaire ouvert pour corriger.
    if (!result) return;
    if (again && !editing) {
      // Garde le contexte (compte, symbole, date, session, stratégie), vide le reste.
      setF((current) => ({ ...blank(), symbol: current.symbol, date: current.date, session: current.session, account_id: current.account_id, setup: current.setup, dir: current.dir }));
      setFile(null); setFile2(null); setShotUrl(null); setShotUrl2(null);
      setAdvanced(false);
      return;
    }
    onClose();
  }

  // Échap ferme, Ctrl/Cmd + Entrée enregistre.
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveRef.current(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pnlNum = Number(signPnl(f.pnl, f.outcome));
  const pnlColor = f.pnl === "" || !Number.isFinite(pnlNum) || pnlNum === 0 ? "text-prism-text" : pnlNum > 0 ? "text-prism-win" : "text-prism-loss";
  const rNum = Number(f.r);
  const summary = f.outcome || f.r !== "" || f.pnl !== ""
    ? `${f.r !== "" && Number.isFinite(rNum) ? `${rNum > 0 ? "+" : ""}${rNum}R` : ""}${f.pnl !== "" && Number.isFinite(pnlNum) ? ` · ${pnlNum < 0 ? "-" : "+"}$${Math.abs(pnlNum).toLocaleString("en-US")}` : ""}`
    : "";

  return (
    <PrismModal
      title={editing ? t("m_edit_trade") : t("m_log_trade")}
      onClose={onClose}
      maxWidth="max-w-xl"
      className="trade-log-modal"
      footer={
        <div className="flex w-full flex-col gap-2">
          <div className="flex gap-2">
            <PrismGhostBtn className="flex-1" onClick={onClose}>{t("m_cancel")}</PrismGhostBtn>
            <PrismPrimaryBtn className="flex-[2]" onClick={() => save(false)} disabled={saving}>
              {saving ? t("m_sending") : editing ? t("m_save") : t("m_log_trade")}
              {!saving && summary && <span className="font-mono text-xs text-black/60">{summary}</span>}
            </PrismPrimaryBtn>
          </div>
          {!editing && (
            <button type="button" onClick={() => save(true)} disabled={saving} className="text-center text-[11px] font-semibold text-prism-muted hover:text-prism-accent disabled:opacity-40">
              {en ? "Save & log another" : "Enregistrer et en saisir un autre"}
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-5 overflow-x-hidden">
        {/* 1. Résultat */}
        <QlField label={en ? "Result" : "Résultat"}>
          <div className="grid grid-cols-3 gap-2">
            {["TP", "SL", "BE"].map((o) => {
              const active = f.outcome === o;
              const r = quickR[o];
              return (
                <button key={o} type="button" onClick={() => pickOutcome(o)}
                  className={`flex h-16 flex-col items-center justify-center rounded-xl border transition-colors ${active ? OUTCOME_STYLE[o].on : "border-prism-line text-prism-muted hover:border-prism-line2 hover:text-white"}`}>
                  <span className="text-base font-bold">{o}</span>
                  <span className="font-mono text-[11px] opacity-80">{r > 0 ? "+" : ""}{r}R</span>
                </button>
              );
            })}
          </div>
        </QlField>

        {/* 2. R + P&L */}
        <div className="grid grid-cols-[1fr_1.6fr] gap-3">
          <QlField label="R">
            <input type="number" inputMode="decimal" step="0.1" className={`${QL_INPUT} ${QL_TXT} font-mono`} value={f.r} onChange={(e) => set("r", e.target.value)} placeholder="0" />
          </QlField>
          <QlField label={t("m_pnl_net")}>
            <input type="number" inputMode="decimal" step="0.01" className={`${QL_INPUT} font-mono text-base font-bold ${pnlColor}`} value={f.pnl}
              onChange={(e) => set("pnl", e.target.value)}
              onBlur={() => set("pnl", signPnl(f.pnl, f.outcome))}
              placeholder={f.outcome === "SL" ? "-250" : "520"} disabled={f.outcome === "BE"} />
          </QlField>
        </div>
        {f.outcome === "SL" && <p className="-mt-3 text-[11px] text-prism-muted2">{en ? "Loss sign is added automatically." : "Le signe « - » est ajouté automatiquement."}</p>}

        {/* 3. Instrument + date */}
        <div className="grid grid-cols-2 gap-3">
          <QlField label={t("m_instrument")}>
            <input className={`${QL_INPUT} ${QL_TXT} font-mono uppercase`} value={f.symbol} onChange={(e) => set("symbol", e.target.value)} placeholder="MNQ" />
          </QlField>
          <QlField label={t("m_date")}>
            <input type="date" className={`${QL_INPUT} ${QL_TXT} appearance-none [&::-webkit-date-and-time-value]:text-left`} value={f.date} onChange={(e) => set("date", e.target.value)} />
          </QlField>
        </div>
        {recentSymbols.length > 1 && (
          <div className="-mt-3 flex flex-wrap gap-1.5">
            {recentSymbols.map((s) => (
              <button key={s} type="button" onClick={() => set("symbol", s)} className={`rounded-md border px-2 py-1 font-mono text-[11px] ${f.symbol?.toUpperCase() === s ? QL_ON : QL_OFF}`}>{s}</button>
            ))}
          </div>
        )}

        {/* 4. Compte */}
        {accounts.length > 0 && (
          <QlField label={en ? "Account" : "Compte"}>
            <select className={`${QL_INPUT} ${QL_TXT} cursor-pointer appearance-none`} value={f.account_id || ""} onChange={(e) => set("account_id", e.target.value)}>
              <option value="">{en ? "None" : "Aucun"}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.note ? `${a.note} · ` : ""}{a.firm} · {fmtMoney(a.size)}</option>
              ))}
            </select>
          </QlField>
        )}

        {/* 5. Sens + session */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1.6fr]">
          <QlField label={t("m_direction")}>
            <div className="flex gap-2">
              <button type="button" onClick={() => set("dir", "long")} className={`${QL_SEG} ${f.dir === "long" ? "border-[rgba(34,197,94,0.7)] bg-[rgba(34,197,94,0.12)] text-prism-win" : QL_OFF}`}>LONG</button>
              <button type="button" onClick={() => set("dir", "short")} className={`${QL_SEG} ${f.dir === "short" ? "border-[rgba(239,68,68,0.7)] bg-[rgba(239,68,68,0.12)] text-prism-loss" : QL_OFF}`}>SHORT</button>
            </div>
          </QlField>
          <QlField label={t("m_session")}>
            <div className="flex gap-1.5">
              {SESSIONS.map((s) => (
                <button key={s} type="button" onClick={() => set("session", s)} className={`${QL_SEG} px-1 text-[11px] ${f.session === s ? QL_ON : QL_OFF}`}>{s}</button>
              ))}
            </div>
          </QlField>
        </div>

        {/* 6. Grade + plan */}
        <div className="grid grid-cols-[1.6fr_1fr] gap-3">
          <QlField label={t("m_grade")}>
            <div className="flex gap-1.5">
              {GRADES.map((g) => (
                <button key={g} type="button" onClick={() => set("grade", g)} className={`${QL_SEG} ${f.grade === g ? QL_ON : QL_OFF}`}>{g}</button>
              ))}
            </div>
          </QlField>
          <QlField label={en ? "Plan followed" : "Plan respecté"}>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => set("plan", true)} className={`${QL_SEG} ${f.plan ? QL_ON : QL_OFF}`}>{t("m_yes")}</button>
              <button type="button" onClick={() => set("plan", false)} className={`${QL_SEG} ${!f.plan ? "border-[rgba(239,68,68,0.7)] bg-[rgba(239,68,68,0.12)] text-prism-loss" : QL_OFF}`}>{t("m_no")}</button>
            </div>
          </QlField>
        </div>

        {/* 7. Captures */}
        <QlField label={en ? "Screenshots" : "Captures"}>
          <div className="grid grid-cols-2 gap-2.5">
            <ShotSlot lang={lang} label={en ? "Entry" : "Entrée"} file={file} url={shotUrl} onFile={setFile} onRemove={() => { setFile(null); setShotUrl(null); }} />
            <ShotSlot lang={lang} label={en ? "Exit" : "Sortie"} file={file2} url={shotUrl2} onFile={setFile2} onRemove={() => { setFile2(null); setShotUrl2(null); }} />
          </div>
        </QlField>

        {/* 8. Stratégie */}
        <QlField label={en ? "Strategy" : "Stratégie"}>
          <select className={`${QL_INPUT} ${QL_TXT} cursor-pointer appearance-none`} value={f.setup || ""} onChange={(e) => selectStrategy(e.target.value)}>
            <option value="">{t("m_none")}</option>
            {playbooks.map((p) => (<option key={p.id} value={p.name}>{p.name}</option>))}
          </select>
        </QlField>

        {selectedStrategy && (
          <section className="rounded-xl border border-[rgba(6,182,212,0.3)] bg-[rgba(6,182,212,0.05)] p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-bold text-white">{en ? "Entry checklist" : "Checklist d'entrée"}</p>
              <span className="rounded-full border border-[rgba(6,182,212,0.3)] px-2 py-0.5 font-mono text-[10px] font-semibold text-prism-accent">{selectedChecks.length}/{strategyRules.length}</span>
            </div>
            {strategyRules.length ? (
              <div className="space-y-1">
                {strategyRules.map((rule, index) => {
                  const checked = selectedChecks.includes(rule);
                  return (
                    <button key={`${rule}-${index}`} type="button" onClick={() => toggleStrategyRule(rule)} className={`flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-xs transition-colors ${checked ? "bg-prism-accentDim text-white" : "text-prism-muted hover:bg-white/5 hover:text-white"}`}>
                      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? "border-prism-accent bg-prism-accent text-black" : "border-prism-muted2"}`}>{checked && <Check className="h-3 w-3 stroke-[3]" />}</span>
                      <span>{rule}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-prism-muted2">{en ? "This strategy has no checklist rule yet." : "Cette stratégie n'a pas encore de règle de checklist."}</p>
            )}
          </section>
        )}

        {/* 9. Détails repliables */}
        <button type="button" onClick={() => setAdvanced((v) => !v)} className="flex w-full items-center justify-between rounded-xl border border-prism-line bg-white/[0.02] px-3.5 py-3 text-left text-xs font-semibold text-prism-muted transition hover:text-white">
          <span>{en ? "Psychology, tags & notes" : "Psycho, tags et notes"}{(f.tags.length || f.why) ? <span className="ml-2 text-prism-accent">•</span> : null}</span>
          <span className="text-prism-accent">{advanced ? "−" : "+"}</span>
        </button>

        {advanced && (
          <div className="space-y-5">
            <section className="rounded-xl border border-prism-line2 bg-prism-panel2/60 p-3.5">
              <p className="mb-3 text-xs font-bold text-white">{en ? "Before entry" : "Avant l'entrée"}</p>
              <div className="space-y-3">
                {[{ key: "emotional", fr: "État émotionnel", en: "Emotional state" }, { key: "focus", fr: "Focus", en: "Focus" }, { key: "confidence", fr: "Confiance", en: "Confidence" }].map((metric) => {
                  const value = Number(f.psychology?.[metric.key] || 0);
                  return (
                    <div key={metric.key} className="flex items-center justify-between gap-3">
                      <p className="text-xs text-white">{en ? metric.en : metric.fr}</p>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button key={n} type="button" aria-label={`${metric.key} ${n}/5`} onClick={() => set("psychology", { ...DEFAULT_PSYCHOLOGY, ...(f.psychology || {}), [metric.key]: n })}
                            className={`h-7 w-7 rounded-md border font-mono text-[11px] ${n === value ? QL_ON : n < value ? "border-[rgba(6,182,212,0.3)] text-prism-accent" : QL_OFF}`}>{n}</button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="my-3 h-px bg-prism-line" />
              <div className="space-y-2">
                {PSYCHO_CHECKS.map((item) => {
                  const checked = (f.psychology?.checks || []).includes(item.key);
                  return (
                    <button key={item.key} type="button" onClick={() => set("psychology", { ...DEFAULT_PSYCHOLOGY, ...(f.psychology || {}), checks: checked ? (f.psychology?.checks || []).filter((key) => key !== item.key) : [...(f.psychology?.checks || []), item.key] })} className="flex w-full items-center gap-3 text-left text-xs text-prism-muted hover:text-white">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${checked ? "border-prism-accent bg-prism-accent text-black" : "border-prism-muted2"}`}>{checked && <Check className="h-3.5 w-3.5 stroke-[3]" />}</span>
                      {en ? item.en : item.fr}
                    </button>
                  );
                })}
              </div>
            </section>

            <QlField label={t("m_tags")}>
              {f.tags.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {f.tags.map((tag) => (<PrismChip key={tag} active onClick={() => removeTag(tag)}>{tag} ×</PrismChip>))}
                </div>
              )}
              <div className="flex gap-1.5">
                <input className={`${QL_INPUT} ${QL_TXT}`} value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }} placeholder={en ? "Add a tag…" : "Ajouter un tag…"} />
                <PrismGhostBtn className="px-3" onClick={() => addTag(tagInput)}>+</PrismGhostBtn>
              </div>
              {tagSuggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tagSuggestions.map((tag) => (<PrismChip key={tag} onClick={() => addTag(tag)}>{tag}</PrismChip>))}
                </div>
              )}
            </QlField>

            <QlField label={t("m_why")}>
              <textarea className={`${QL_INPUT} ${QL_TXT} h-auto min-h-[80px] resize-y py-2.5 leading-relaxed`} value={f.why || ""} onChange={(e) => set("why", e.target.value)} placeholder={t("m_why_ph")} />
            </QlField>
          </div>
        )}
      </div>
    </PrismModal>
  );
}

/* ================================================================== */
/*  AccountModal — reskin PRISM                                        */
/* ================================================================== */

export function AccountModal({ editing, onClose }) {
  const { addAccount, updateAccount, t, lang } = useBook();
  const isEdit = !!editing;
  const [f, setF] = useState(
    editing
      ? {
          firm: editing.firm || "MFF",
          size: editing.size ?? 50000,
          cost: editing.cost ?? 0,
          type: editing.type || "eval",
          status: editing.status || "active",
          date: editing.date || todayISO(),
          funded_at: editing.funded_at || "",
          note: editing.note || "",
          daily_loss_limit: editing.daily_loss_limit == null ? "" : editing.daily_loss_limit,
          max_drawdown: editing.max_drawdown == null ? "" : editing.max_drawdown,
          profit_target: editing.profit_target == null ? "" : editing.profit_target,
          payout_min: editing.payout_min == null ? "" : editing.payout_min,
          payout_cycle_days: editing.payout_cycle_days == null ? "" : editing.payout_cycle_days,
          min_trading_days: editing.min_trading_days == null ? "" : editing.min_trading_days,
          trailing_type:
            editing.trailing_type ||
            (editing.trailing_drawdown === false ? "static" : "intraday"),
          trailing_lock_offset:
            editing.trailing_lock_offset == null ? "" : editing.trailing_lock_offset,
        }
      : {
          firm: "MFF", size: 50000, cost: 0, type: "eval", status: "active", date: todayISO(), funded_at: "", note: "",
          daily_loss_limit: "", max_drawdown: "", profit_target: "",
          payout_min: "", payout_cycle_days: "", min_trading_days: "",
          trailing_type: FIRM_TRAILING_DEFAULTS.MFF.type,
          trailing_lock_offset: FIRM_TRAILING_DEFAULTS.MFF.lock,
        }
  );
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const onFirmChange = (firm) => {
    if (isEdit) {
      set("firm", firm);
      return;
    }
    const preset = FIRM_TRAILING_DEFAULTS[firm] || FIRM_TRAILING_DEFAULTS.Autre;
    setF((s) => ({
      ...s,
      firm,
      trailing_type: preset.type,
      trailing_lock_offset: preset.lock,
    }));
  };

  const numOrNull = (v) => (v === "" || v == null ? null : Number(v));
  const L = lang === "en" ? "en" : "fr";
  const isStatic = f.trailing_type === "static";

  async function save() {
    const payload = {
      ...f,
      size: Number(f.size) || 0,
      cost: Number(f.cost) || 0,
      daily_loss_limit: numOrNull(f.daily_loss_limit),
      max_drawdown: numOrNull(f.max_drawdown),
      profit_target: numOrNull(f.profit_target),
      payout_min: numOrNull(f.payout_min),
      payout_cycle_days: numOrNull(f.payout_cycle_days),
      min_trading_days: numOrNull(f.min_trading_days),
      trailing_type: f.trailing_type || "intraday",
      trailing_lock_offset: isStatic ? 0 : (numOrNull(f.trailing_lock_offset) ?? 0),
      trailing_drawdown: f.trailing_type !== "static",
      funded_at: f.funded_at || null,
    };
    if (isEdit) await updateAccount(editing.id, payload);
    else await addAccount(payload);
    onClose();
  }

  return (
    <PrismModal
      title={isEdit ? (L === "en" ? "Edit account" : "Éditer le compte") : t("m_new_account")}
      onClose={onClose}
      footer={
        <>
          <PrismGhostBtn className="flex-1" onClick={onClose}>{t("m_cancel")}</PrismGhostBtn>
          <PrismPrimaryBtn className="flex-1" onClick={save}>{t("m_save")}</PrismPrimaryBtn>
        </>
      }
    >
      <PrismField label={t("m_firm")}>
        <select className={PRISM_SELECT} value={f.firm} onChange={(e) => onFirmChange(e.target.value)}>
          {firmOptions.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </PrismField>

      <div className="grid grid-cols-2 gap-3">
        <PrismField label={t("m_size")}>
          <input type="number" className={PRISM_INPUT} value={f.size} onChange={(e) => set("size", e.target.value)} />
        </PrismField>
        <PrismField label={t("m_eval_cost")}>
          <input type="number" className={PRISM_INPUT} value={f.cost} onChange={(e) => set("cost", e.target.value)} placeholder={t("m_free_if")} />
        </PrismField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PrismField label={t("m_type")}>
          <select className={PRISM_SELECT} value={f.type} onChange={(e) => { const type = e.target.value; setF((s) => ({ ...s, type, funded_at: type === "funded" && !s.funded_at ? todayISO() : s.funded_at })); }}>
            <option value="eval">{t("m_eval")}</option>
            <option value="funded">{t("m_funded")}</option>
          </select>
        </PrismField>
        <PrismField label={t("m_status")}>
          <select className={PRISM_SELECT} value={f.status} onChange={(e) => set("status", e.target.value)}>
            <option value="active">{t("m_st_active")}</option>
            <option value="passed">{t("m_st_passed")}</option>
            <option value="funded">{t("m_funded")}</option>
            <option value="failed">{t("m_st_failed")}</option>
            <option value="paid">{t("m_st_paid")}</option>
          </select>
        </PrismField>
      </div>

      {(f.type === "funded" || f.status === "funded" || f.status === "passed") && <PrismField label={L === "en" ? "Funded start date" : "Date de départ funded"} hint={L === "en" ? "Only trades from this date count toward payout." : "Seuls les trades à partir de cette date comptent pour le payout."}><input type="date" className={PRISM_INPUT} value={f.funded_at} onChange={(e) => set("funded_at", e.target.value)} /></PrismField>}

      <PrismSectionLabel>
        {L === "en" ? "Risk rules (optional)" : "Règles de risque (optionnel)"}
      </PrismSectionLabel>

      <div className="grid grid-cols-2 gap-3">
        <PrismField label={L === "en" ? "Daily loss limit ($)" : "Perte max / jour ($)"}>
          <input type="number" className={PRISM_INPUT} value={f.daily_loss_limit} onChange={(e) => set("daily_loss_limit", e.target.value)} placeholder="500" />
        </PrismField>
        <PrismField label={L === "en" ? "Max drawdown ($)" : "Drawdown max ($)"}>
          <input type="number" className={PRISM_INPUT} value={f.max_drawdown} onChange={(e) => set("max_drawdown", e.target.value)} placeholder="1500" />
        </PrismField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PrismField label={L === "en" ? "Profit target ($)" : "Objectif de profit ($)"}>
          <input type="number" className={PRISM_INPUT} value={f.profit_target} onChange={(e) => set("profit_target", e.target.value)} placeholder="1500" />
        </PrismField>
        <PrismField label={L === "en" ? "Trailing type" : "Type de trailing"}>
          <div className="flex gap-1.5">
            <PrismChip active={f.trailing_type === "intraday"} onClick={() => set("trailing_type", "intraday")}>Intraday</PrismChip>
            <PrismChip active={f.trailing_type === "eod"} onClick={() => set("trailing_type", "eod")}>EOD</PrismChip>
            <PrismChip active={f.trailing_type === "static"} onClick={() => set("trailing_type", "static")}>Static</PrismChip>
          </div>
        </PrismField>
      </div>

      {!isStatic && (
        <PrismField
          label={L === "en" ? "Lock offset ($ above initial)" : "Lock offset ($ au-dessus de l'initial)"}
          hint={
            L === "en"
              ? "Once the peak crosses (initial + max DD), the threshold locks at (initial + this offset). Apex: 0. Lucid: 100."
              : "Une fois que le peak franchit (initial + max DD), le seuil se fige à (initial + cet offset). Apex : 0. Lucid : 100."
          }
        >
          <input type="number" className={PRISM_INPUT} value={f.trailing_lock_offset} onChange={(e) => set("trailing_lock_offset", e.target.value)} placeholder="0" />
        </PrismField>
      )}

      <PrismSectionLabel>
        {L === "en" ? "Payout rules (funded, optional)" : "Règles de payout (funded, optionnel)"}
      </PrismSectionLabel>
      <div className="grid grid-cols-3 gap-3">
        <PrismField label="Minimum ($)">
          <input type="number" className={PRISM_INPUT} value={f.payout_min} onChange={(e) => set("payout_min", e.target.value)} placeholder="500" />
        </PrismField>
        <PrismField label={L === "en" ? "Cycle (days)" : "Cycle (jours)"}>
          <input type="number" className={PRISM_INPUT} value={f.payout_cycle_days} onChange={(e) => set("payout_cycle_days", e.target.value)} placeholder="14" />
        </PrismField>
        <PrismField label={L === "en" ? "Trading days" : "Jours tradés"}>
          <input type="number" className={PRISM_INPUT} value={f.min_trading_days} onChange={(e) => set("min_trading_days", e.target.value)} placeholder="5" />
        </PrismField>
      </div>

      <PrismField label={t("m_date")}>
        <input type="date" className={PRISM_INPUT} value={f.date} onChange={(e) => set("date", e.target.value)} />
      </PrismField>

      <PrismField label={t("m_note")}>
        <input className={PRISM_INPUT} value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="Rapid 50K, static drawdown…" />
      </PrismField>
    </PrismModal>
  );
}

/* ================================================================== */
/*  CertModal — reskin PRISM                                           */
/* ================================================================== */

export function CertModal({ onClose, initialAccountId = "", initialFirm = "MFF", initialAmount = "", initialType = "eval_passed" }) {
  const { addCert, notify, t, accounts } = useBook();
  const { lang } = useBook();
  const L = lang === "en" ? "en" : "fr";
  const [f, setF] = useState({ firm: initialFirm, account_id: initialAccountId, amount: initialAmount, type: initialType, date: todayISO(), note: "" });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function submit() {
    if (!Number(f.amount)) return;
    let file_url = null;
    if (file) {
      try {
        setUploading(true);
        file_url = await uploadFile(file, "certificates");
      } catch (e) {
        setUploading(false);
        return notify(e.message, true);
      }
      setUploading(false);
    }
    await addCert({ ...f, amount: Number(f.amount), file_url });
    onClose();
  }

  return (
    <PrismModal
      title={t("m_new_cert")}
      onClose={onClose}
      footer={
        <>
          <PrismGhostBtn className="flex-1" onClick={onClose}>{t("m_cancel")}</PrismGhostBtn>
          <PrismPrimaryBtn className="flex-1" onClick={submit} disabled={uploading}>
            {uploading ? t("m_sending") : t("m_save")}
          </PrismPrimaryBtn>
        </>
      }
    >
      <PrismField label={t("m_firm")}>
        <select className={PRISM_SELECT} value={f.firm} onChange={(e) => set("firm", e.target.value)}>
          {firmOptions.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </PrismField>

      <div className="grid grid-cols-2 gap-3">
        <PrismField label={t("m_amount")}>
          <input type="number" className={PRISM_INPUT} value={f.amount} onChange={(e) => set("amount", e.target.value)} placeholder="50000 ou 1017" />
        </PrismField>
        <PrismField label={t("m_type")}>
          <select className={PRISM_SELECT} value={f.type} onChange={(e) => set("type", e.target.value)}>
            <option value="eval_passed">{t("m_eval_passed")}</option>
            <option value="funded">{L === "en" ? "Funded account" : "Compte funded"}</option>
            <option value="payout">{t("m_payout")}</option>
          </select>
        </PrismField>
      </div>

      <PrismField label={f.type === "payout" ? "Compte funded concerné" : "Compte concerné (optionnel)"} hint={f.type === "payout" ? "Le payout sera compté uniquement sur ce compte." : undefined}>
        <select
          className={PRISM_SELECT}
          value={f.account_id}
          onChange={(e) => {
            const account = accounts.find((a) => a.id === e.target.value);
            setF((s) => ({ ...s, account_id: e.target.value, firm: account?.firm || s.firm }));
          }}
        >
          <option value="">{f.type === "payout" ? "Choisir un compte" : "Aucun compte spécifique"}</option>
          {accounts.filter((a) => f.type !== "payout" || a.type === "funded" || a.status === "funded" || a.status === "passed").map((a) => (
            <option key={a.id} value={a.id}>{a.firm} · ${Number(a.size || 0).toLocaleString()} · {a.status}</option>
          ))}
        </select>
      </PrismField>

      <PrismField label={t("m_date")}>
        <input type="date" className={PRISM_INPUT} value={f.date} onChange={(e) => set("date", e.target.value)} />
      </PrismField>

      <PrismField label={t("m_cert_file")}>
        <FilePicker
          accept="image/*,application/pdf"
          value={file}
          onChange={setFile}
          onRemove={() => setFile(null)}
          hint={t("m_cert_hint")}
        />
      </PrismField>

      <PrismField label={t("m_note")}>
        <input className={PRISM_INPUT} value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="Express funded, certified funded trader…" />
      </PrismField>
    </PrismModal>
  );
}

/* ================================================================== */
/*  ExpenseModal — reskin PRISM                                        */
/* ================================================================== */

export function ExpenseModal({ onClose }) {
  const { addExpense, t } = useBook();
  const [f, setF] = useState({ firm: "MFF", amount: "", date: todayISO(), note: "" });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    if (!Number(f.amount)) return;
    await addExpense({ ...f, amount: Number(f.amount) });
    onClose();
  }

  return (
    <PrismModal
      title={t("m_new_expense")}
      onClose={onClose}
      footer={
        <>
          <PrismGhostBtn className="flex-1" onClick={onClose}>{t("m_cancel")}</PrismGhostBtn>
          <PrismPrimaryBtn className="flex-1" onClick={save}>{t("m_save")}</PrismPrimaryBtn>
        </>
      }
    >
      <PrismField label={t("m_firm_post")}>
        <select className={PRISM_SELECT} value={f.firm} onChange={(e) => set("firm", e.target.value)}>
          {firmOptions.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </PrismField>

      <PrismField label={t("m_amount")}>
        <input type="number" className={PRISM_INPUT} value={f.amount} onChange={(e) => set("amount", e.target.value)} placeholder="165" />
      </PrismField>

      <PrismField label={t("m_date")}>
        <input type="date" className={PRISM_INPUT} value={f.date} onChange={(e) => set("date", e.target.value)} />
      </PrismField>

      <PrismField label={t("m_note")}>
        <input className={PRISM_INPUT} value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="Éval 100K, reset, data feed…" />
      </PrismField>
    </PrismModal>
  );
}

/* ================================================================== */
/*  SettingsModal — reskin PRISM (logique Stripe intacte)              */
/* ================================================================== */

export function SettingsModal({ onClose, onReplayTutorial }) {
  const { profile, saveProfile, trades, lang, setLang, t, notify, subscription, reload } = useBook();
  const [f, setF] = useState({ name: profile.name, pin: profile.pin });
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const locale = lang === "fr" ? "fr-FR" : "en-US";
  const isActive = subscription && subscription.status === "active";
  const isCanceling = subscription?.cancel_at_period_end === true;
  const periodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;
  const daysLeft = periodEnd ? Math.max(0, Math.ceil((periodEnd.getTime() - Date.now()) / 86400000)) : null;
  const memberSince = profile?.created_at ? new Date(profile.created_at) : null;
  const fmtDate = (d) => (d ? d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }) : "—");

  function exportCSV() {
    const rows = [["date", "symbol", "dir", "session", "grade", "r", "pnl", "setup", "tags", "plan", "why"]];
    trades.forEach((tr) =>
      rows.push([tr.date, tr.symbol, tr.dir, tr.session, tr.grade, tr.r, tr.pnl, tr.setup, (tr.tags || []).join("|"), tr.plan ? 1 : 0, (tr.why || "").replace(/"/g, '""')])
    );
    const csv = rows.map((r) => r.map((c) => (/[",\n]/.test(String(c)) ? '"' + c + '"' : c)).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "myfundedbook_trades.csv";
    a.click();
  }

  async function openPortal() {
    try {
      setPortalLoading(true);
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setPortalLoading(false);
        notify(data.error || "Erreur", true);
      }
    } catch (e) {
      setPortalLoading(false);
      notify(e.message, true);
    }
  }

  async function cancelSub() {
    try {
      setCancelLoading(true);
      const res = await fetch("/api/stripe/cancel", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        notify(t("sub_cancel_done"));
        setCancelConfirm(false);
        await reload();
      } else {
        notify(data.error || "Erreur", true);
      }
    } catch (e) {
      notify(e.message, true);
    } finally {
      setCancelLoading(false);
    }
  }

  async function saveProfileHandler() {
    await saveProfile({ name: f.name || "trader", pin: f.pin || "1234", starting_balance: profile.starting_balance ?? 0 });
    onClose();
  }

  return (
    <PrismModal
      title={t("settings_title")}
      onClose={onClose}
      footer={
        <>
          <PrismGhostBtn className="flex-1" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5" />
            {t("settings_export")}
          </PrismGhostBtn>
          <PrismPrimaryBtn className="flex-1" onClick={saveProfileHandler}>
            {t("settings_save")}
          </PrismPrimaryBtn>
        </>
      }
    >
      <PrismField label={t("settings_name")}>
        <input className={PRISM_INPUT} value={f.name} onChange={(e) => set("name", e.target.value)} />
      </PrismField>

      <PrismField label={t("settings_pin")}>
        <input className={PRISM_INPUT} value={f.pin} maxLength={6} inputMode="numeric" onChange={(e) => set("pin", e.target.value)} />
      </PrismField>

      <PrismField label={t("settings_lang")}>
        <div className="flex gap-1.5">
          <PrismChip active={lang === "fr"} onClick={() => setLang("fr")}>Français</PrismChip>
          <PrismChip active={lang === "en"} onClick={() => setLang("en")}>English</PrismChip>
        </div>
      </PrismField>

      <PrismField
        label={lang === "en" ? "Help" : "Aide"}
        hint={lang === "en" ? "Take the guided tour of the app again." : "Refaire le tour guidé de l'application."}
      >
        <PrismGhostBtn className="w-full" onClick={() => { if (onReplayTutorial) onReplayTutorial(); }}>
          <RotateCcw className="h-3.5 w-3.5" />
          {lang === "en" ? "Replay demo" : "Revoir la démo"}
        </PrismGhostBtn>
      </PrismField>

      <PrismSectionLabel>{t("sub_section")}</PrismSectionLabel>

      {isActive ? (
        <div className="rounded-2xl border border-prism-line bg-white/[0.02] p-5">
          {/* Header : status badges */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-prism-accentDim px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-prism-accent">
              <Check className="h-3 w-3" />
              {t("sub_active")}
            </span>
            {isCanceling ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-yellow-400">
                <AlertTriangle className="h-3 w-3" />
                {t("sub_canceled_title")}
              </span>
            ) : (
              <span className="text-[10px] font-medium uppercase tracking-widest text-prism-muted2">
                {t("sub_next_payment")}
              </span>
            )}
          </div>

          {/* Chiffre massif jours restants */}
          <div className="mt-4 text-center">
            <div
              className="font-mono text-5xl font-bold leading-none tabular-nums"
              style={{ color: isCanceling ? "#facc15" : "#ffffff" }}
            >
              {daysLeft}
            </div>
            <div className="mt-2 text-xs text-prism-muted2">
              {daysLeft === 0 ? t("sub_today") : daysLeft === 1 ? t("sub_day") : t("sub_days")}
            </div>
          </div>

          {/* Meta lines */}
          <div className="mt-4 space-y-2 border-t border-prism-line pt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-prism-muted2">{isCanceling ? t("sub_canceled_until") : t("sub_renews_on")}</span>
              <span className="font-mono text-white">{fmtDate(periodEnd)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-prism-muted2">{t("sub_member_since")}</span>
              <span className="font-mono text-white">{fmtDate(memberSince)}</span>
            </div>
          </div>

          {/* Manage button */}
          <PrismGhostBtn
            className="mt-4 w-full"
            onClick={() => { if (!portalLoading) openPortal(); }}
            disabled={portalLoading}
          >
            <CreditCard className="h-3.5 w-3.5" />
            {portalLoading ? t("sub_loading") : t("sub_manage")}
          </PrismGhostBtn>

          {/* Cancel flow */}
          {!isCanceling && (
            cancelConfirm ? (
              <div className="mt-3 rounded-xl border border-prism-loss/20 bg-prism-loss/5 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-prism-loss mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white">{t("sub_cancel_confirm")}</div>
                    <div className="mt-1 text-xs text-prism-muted">{t("sub_cancel_hint")}</div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <PrismGhostBtn
                    className="flex-1"
                    onClick={() => { if (!cancelLoading) setCancelConfirm(false); }}
                    disabled={cancelLoading}
                  >
                    {t("sub_cancel_back")}
                  </PrismGhostBtn>
                  <PrismDangerBtn
                    className="flex-1"
                    onClick={() => { if (!cancelLoading) cancelSub(); }}
                    disabled={cancelLoading}
                  >
                    {cancelLoading ? t("sub_cancel_loading") : t("sub_cancel_yes")}
                  </PrismDangerBtn>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCancelConfirm(true)}
                className="mt-2 w-full py-2 text-center text-xs font-semibold text-prism-muted hover:text-prism-loss transition-colors"
              >
                {t("sub_cancel")}
              </button>
            )
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-prism-line bg-white/[0.02] p-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-prism-accentDim text-prism-accent mb-3">
            <CreditCard className="h-6 w-6" />
          </div>
          <div className="text-sm text-prism-muted">{t("sub_none")}</div>
        </div>
      )}
    </PrismModal>
  );
}
