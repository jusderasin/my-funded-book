"use client";

// Journal V3 — espace "Log Trade" : calendrier mensuel, KPI du jour, saisie
// rapide en 3 cartes, historique filtrable et revue quotidienne.
//
// Colonnes Supabase utilisées : uniquement celles qui existent déjà sur
// public.trades. Les champs d'exécution détaillés (heures, prix, taille,
// profit prévu, swing, note, émotions) sont rangés dans une seule colonne
// JSONB `execution` (migration 004). Tant que cette colonne n'existe pas, la
// page le détecte et masque ces champs au lieu de faire échouer l'insertion.

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  AlertCircle, ArrowDownRight, ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight,
  FileText, Filter, ImagePlus, ListChecks, Plus, Star, Trash2, Upload, X,
} from "lucide-react";
import { useBook } from "@/components/BookProvider";
import { LogTradeModal } from "@/components/modals";
import { ImportCsvModal } from "@/components/ImportCsvModal";
import { ConfirmModal } from "@/components/prism/TerminalPrimitives";
import { createClient } from "@/lib/supabase/client";
import { uploadFile } from "@/lib/upload";
import { fmtMoney, frDate } from "@/lib/format";

/* ------------------------------------------------------------------ */
/* Dates — toujours en heure locale (jamais new Date("YYYY-MM-DD"))    */
/* ------------------------------------------------------------------ */
const pad = (n) => String(n).padStart(2, "0");
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (s) => {
  const [y, m, d] = String(s).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};
const localToday = () => toISO(new Date());
const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d); };
const weekBounds = (iso) => { const d = parseISO(iso); const start = addDays(iso, -d.getDay()); return [start, addDays(start, 6)]; };

/* ------------------------------------------------------------------ */
/* Instruments & sessions                                               */
/* ------------------------------------------------------------------ */
const POINT_VALUES = { MNQ: 2, NQ: 20, MES: 5, ES: 50, MYM: 0.5, YM: 5, M2K: 5, RTY: 50, MGC: 10, GC: 100, MCL: 100, CL: 1000 };
const pointValue = (symbol) => {
  const s = String(symbol || "").toUpperCase().trim();
  const key = Object.keys(POINT_VALUES).sort((a, b) => b.length - a.length).find((k) => s.startsWith(k));
  return key ? POINT_VALUES[key] : null;
};
const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

// Session déduite de l'heure d'entrée (saisie en heure locale), découpée en heure de New York.
function sessionFromTime(date, time) {
  const m = TIME_RE.exec(time || "");
  if (!m) return null;
  const local = parseISO(date);
  local.setHours(Number(m[1]), Number(m[2]), 0, 0);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(local);
  const h = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const min = Number(parts.find((p) => p.type === "minute")?.value || 0);
  const t = h * 60 + min;
  if (t >= 570 && t < 720) return "NY AM";
  if (t >= 720 && t < 1020) return "NY PM";
  if (t >= 180 && t < 570) return "London";
  return "Asia";
}

const RATING_TO_GRADE = { 1: "B", 2: "A", 3: "A+" };
const MINDSETS = ["calm", "neutral", "tense", "tilt"];

/* ------------------------------------------------------------------ */
/* Textes FR / EN                                                       */
/* ------------------------------------------------------------------ */
const TXT = {
  fr: {
    logTrade: "LOG TRADE", import: "IMPORT", del: "SUPPRIMER", delSel: "Sélectionner des trades", delDay: "Supprimer les trades du jour",
    dayPnl: "P&L DU JOUR", winrate: "WINRATE %", tradesToday: (n) => `${n} trade${n > 1 ? "s" : ""} aujourd'hui`, wins: "WINS", be: "BE", losses: "LOSSES",
    avgWin: "GAIN MOYEN", avgRR: "R:R MOYEN", avgLoss: "PERTE MOYENNE",
    basics: "TRADE BASICS", execution: "EXECUTION", context: "CONTEXT", date: "DATE", start: "DATE DÉBUT", end: "DATE FIN",
    entryTime: "HEURE ENTRÉE", exitTime: "HEURE SORTIE", symbol: "SYMBOLE", direction: "DIRECTION",
    entryPrice: "PRIX ENTRÉE", exitPrice: "PRIX SORTIE", size: "TAILLE", rr: "R:R", planned: "PROFIT PRÉVU ($)", realized: "PROFIT RÉALISÉ ($)",
    strategy: "STRATÉGIE", rating: "NOTE", confluences: "CONFLUENCES", screenshot: "LIEN / SCREENSHOT", addShots: "Ajouter des screenshots",
    rules: "RÈGLES SUIVIES ?", emotions: "ÉMOTIONS MAÎTRISÉES ?", yes: "Oui", no: "Non", notes: "Ajouter des notes…", notesPh: "Contexte, exécution, ce que tu referais différemment…",
    submit: "LOG TRADE", saving: "ENREGISTREMENT…", history: "TRADING HISTORY", periods: { day: "JOUR", week: "SEMAINE", month: "MOIS", all: "TOUT" },
    select: "SÉLECTIONNER", filter: "FILTRER", cols: ["DATE", "ENTRÉE", "SORTIE", "PRIX ENTRÉE", "PRIX SORTIE", "SYMBOLE", "DIRECTION", "TAILLE", "PNL", "R:R", "STRATÉGIE", "CONFLUENCES", "CHART", "NOTES"],
    emptyDay: "AUCUN TRADE — AJOUTE TON PREMIER TRADE CI-DESSUS", emptyPeriod: "Aucun trade sur cette période.",
    waiting: "En attente de données (min 5 trades)…", month: "CE MOIS", tradedDays: "Jours tradés", best: "Meilleur jour", worst: "Pire jour",
    review: "REVUE DU JOUR", mindset: "État d'esprit", mindsets: { calm: "Calme", neutral: "Neutre", tense: "Tendu", tilt: "Tilt" },
    respected: "Plan respecté ?", lesson: "La leçon du jour", intention: "Mon intention pour demain", saveReview: "Sauvegarder la revue",
    errSymbol: "LE SYMBOLE EST REQUIS.", errPnl: "LE PROFIT RÉALISÉ EST REQUIS (OU PRIX + TAILLE).", errTime: "HEURE INVALIDE (FORMAT HH:MM OU HH:MM:SS).",
    errEnd: "LA DATE DE FIN DOIT ÊTRE APRÈS LA DATE DE DÉBUT.", errUpload: "L'UPLOAD DES SCREENSHOTS A ÉCHOUÉ : ",
    shotsTitle: "TRADE SCREENSHOTS", shotsDrop: "Upload Screenshots", shotsHint: "Glisser-déposer ou cliquer · Max 2", cancel: "Annuler", save: "Enregistrer",
    selected: (n) => `${n} sélectionné${n > 1 ? "s" : ""}`, deleteSel: "Supprimer", assign: "Assigner à un compte…", done: "Terminé",
    confirmDelTitle: "Supprimer ces trades ?", confirmDelMsg: (n) => `${n} trade${n > 1 ? "s" : ""} ser${n > 1 ? "ont" : "a"} supprimé${n > 1 ? "s" : ""} définitivement.`,
    fSymbol: "Symbole", fDir: "Direction", fSetup: "Stratégie", fResult: "Résultat", all: "Tous", win: "Gagnant", loss: "Perdant", reset: "Réinitialiser",
    migration: "Champs d'exécution détaillés désactivés : lance la migration 004 dans Supabase pour les activer.",
    auto: "auto", setupPh: "Setup…", tagsPh: "Tags… (Entrée)",
  },
  en: {
    logTrade: "LOG TRADE", import: "IMPORT", del: "DELETE", delSel: "Select trades", delDay: "Delete today's trades",
    dayPnl: "DAILY P&L", winrate: "WINRATE %", tradesToday: (n) => `${n} trade${n > 1 ? "s" : ""} today`, wins: "WINS", be: "BE", losses: "LOSSES",
    avgWin: "AVG PROFIT", avgRR: "AVG R:R", avgLoss: "AVG LOSS",
    basics: "TRADE BASICS", execution: "EXECUTION", context: "CONTEXT", date: "DATE", start: "START DATE", end: "END DATE",
    entryTime: "ENTRY TIME", exitTime: "EXIT TIME", symbol: "SYMBOL", direction: "DIRECTION",
    entryPrice: "ENTRY PRICE", exitPrice: "EXIT PRICE", size: "SIZE", rr: "R:R RATIO", planned: "PLANNED PROFIT ($)", realized: "REALIZED PROFIT ($)",
    strategy: "STRATEGY", rating: "RATING", confluences: "CONFLUENCES", screenshot: "LINK / SCREENSHOT", addShots: "Add Screenshots",
    rules: "FOLLOWED RULES?", emotions: "CONTROLLED EMOTIONS?", yes: "Yes", no: "No", notes: "Add Trading Notes…", notesPh: "Context, execution, what you would do differently…",
    submit: "LOG TRADE", saving: "SAVING…", history: "TRADING HISTORY", periods: { day: "DAY", week: "WEEK", month: "MONTH", all: "ALL" },
    select: "SELECT TRADES", filter: "FILTER TRADES", cols: ["DATE", "ENTRY", "EXIT", "ENTRY PRICE", "EXIT PRICE", "SYMBOL", "DIRECTION", "SIZE", "PNL", "R:R", "STRATEGY", "CONFLUENCES", "CHART", "NOTES"],
    emptyDay: "NO TRADES LOGGED — ADD YOUR FIRST TRADE ABOVE", emptyPeriod: "No trades in this period.",
    waiting: "Awaiting more data (min 5 trades)…", month: "THIS MONTH", tradedDays: "Traded days", best: "Best day", worst: "Worst day",
    review: "DAILY REVIEW", mindset: "Mindset", mindsets: { calm: "Calm", neutral: "Neutral", tense: "Tense", tilt: "Tilt" },
    respected: "Plan respected?", lesson: "Lesson of the day", intention: "Intention for tomorrow", saveReview: "Save review",
    errSymbol: "SYMBOL IS REQUIRED.", errPnl: "REALIZED PROFIT IS REQUIRED (OR PRICES + SIZE).", errTime: "INVALID TIME (HH:MM OR HH:MM:SS).",
    errEnd: "END DATE MUST BE AFTER START DATE.", errUpload: "SCREENSHOT UPLOAD FAILED: ",
    shotsTitle: "TRADE SCREENSHOTS", shotsDrop: "Upload Screenshots", shotsHint: "Drag & drop or click to browse · Max 2", cancel: "Cancel", save: "Save Screenshots",
    selected: (n) => `${n} selected`, deleteSel: "Delete", assign: "Assign to account…", done: "Done",
    confirmDelTitle: "Delete these trades?", confirmDelMsg: (n) => `${n} trade${n > 1 ? "s" : ""} will be permanently deleted.`,
    fSymbol: "Symbol", fDir: "Direction", fSetup: "Strategy", fResult: "Result", all: "All", win: "Win", loss: "Loss", reset: "Reset",
    migration: "Detailed execution fields disabled: run migration 004 in Supabase to enable them.",
    auto: "auto", setupPh: "Setup…", tagsPh: "Tags… (Enter)",
  },
};

/* ------------------------------------------------------------------ */
/* Styles partagés                                                      */
/* ------------------------------------------------------------------ */
const INPUT = "h-10 w-full rounded-md border border-prism-line bg-prism-surface px-3 font-mono text-xs text-prism-text placeholder:text-prism-muted2 outline-none transition focus:border-prism-accent";
const LABEL = "mb-1.5 block text-[10px] font-semibold uppercase tracking-[.12em] text-prism-muted";
const GHOST = "inline-flex h-8 items-center gap-1.5 rounded-md border border-prism-line px-3 text-[10px] font-bold uppercase tracking-[.14em] text-prism-muted transition hover:border-prism-line2 hover:text-prism-text disabled:opacity-40";
const LOSS_BOX = "border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.10)]";
const WIN_BG = "bg-[rgba(34,197,94,0.12)]";

const emptyForm = () => ({
  mode: "day", end_date: "", entry_time: "", exit_time: "", symbol: "", dir: "long",
  entry_price: "", exit_price: "", size: "1", r: "", planned: "", pnl: "", outcome: null,
  setup: "", tags: [], rating: 0, followed: "", emotions: "", why: "", account_id: "",
});

export default function JournalPage() {
  const {
    lang, profile, scopedTrades, trades, playbooks, accounts,
    addTrade, updateTrade, deleteTrade, dailyReviews, saveDailyReview, notify,
  } = useBook();
  const T = TXT[lang === "en" ? "en" : "fr"];
  const supabase = useMemo(() => createClient(), []);

  const [date, setDate] = useState(localToday);
  const [viewMonth, setViewMonth] = useState(() => localToday().slice(0, 7));
  const [f, setF] = useState(emptyForm);
  const accountDefaulted = useRef(false);
  const [tagInput, setTagInput] = useState("");
  const [files, setFiles] = useState([]);
  const [quickR, setQuickR] = useState({ TP: 2, SL: -1, BE: 0 });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [unit, setUnit] = useState("$");
  const [period, setPeriod] = useState("day");
  const [filters, setFilters] = useState({ symbol: "", dir: "", setup: "", result: "" });
  const [filterOpen, setFilterOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState([]);
  const [deleteMenu, setDeleteMenu] = useState(false);
  const [confirmIds, setConfirmIds] = useState(null);
  const [shotsOpen, setShotsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [monthPicker, setMonthPicker] = useState(false);
  const [hasExecution, setHasExecution] = useState(true);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("mtb.quickR") || "{}");
      setQuickR((current) => ({ ...current, ...stored }));
    } catch { /* keep defaults */ }
  }, []);

  // Détecte si la colonne `execution` existe (migration 004).
  useEffect(() => {
    let alive = true;
    supabase.from("trades").select("execution").limit(1).then(({ error }) => {
      if (alive && error) setHasExecution(false);
    });
    return () => { alive = false; };
  }, [supabase]);

  useEffect(() => {
    if (accountDefaulted.current || (!trades.length && !accounts.length)) return;
    const defaultAccountId = trades[0]?.account_id || accounts.find((account) => account.status === "active")?.id || "";
    setF((current) => ({ ...current, account_id: current.account_id || defaultAccountId }));
    accountDefaulted.current = true;
  }, [accounts, trades]);

  useEffect(() => {
    const onPaste = (event) => {
      const image = [...(event.clipboardData?.files || [])].find((file) => file.type.startsWith("image/"));
      if (!image) return;
      setFiles((current) => current[0] ? current[1] ? current : [current[0], image] : [image, current[1] || null]);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const put = (key, value) => setF((cur) => ({ ...cur, [key]: value }));
  const setQuickOutcome = (outcome) => {
    setF((current) => {
      const next = current.outcome === outcome ? null : outcome;
      return { ...current, outcome: next, r: next ? String(quickR[next]) : current.r, pnl: next === "BE" ? "0" : current.pnl };
    });
  };
  const beThreshold = Math.max(0, Number(profile?.be_threshold) || 0);

  const classify = (t) => {
    const p = Number(t.pnl) || 0;
    if (t.outcome === "BE" || p === 0 || (beThreshold > 0 && Math.abs(p) <= beThreshold)) return "be";
    return p > 0 ? "win" : "loss";
  };

  /* ------------------------------ Données ------------------------------ */
  const dayTrades = useMemo(() => scopedTrades.filter((t) => t.date === date), [scopedTrades, date]);

  const kpi = useMemo(() => {
    const res = { pnl: 0, w: 0, be: 0, l: 0, gains: [], losses: [], rWins: [], rLosses: [] };
    dayTrades.forEach((t) => {
      const p = Number(t.pnl) || 0;
      res.pnl += p;
      const c = classify(t);
      if (c === "win") { res.w += 1; res.gains.push(p); res.rWins.push(Number(t.r) || 0); }
      else if (c === "loss") { res.l += 1; res.losses.push(p); res.rLosses.push(Number(t.r) || 0); }
      else res.be += 1;
    });
    const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
    return { ...res, wr: dayTrades.length ? (res.w / dayTrades.length) * 100 : 0, avgGain: avg(res.gains), avgLoss: avg(res.losses), avgRWin: avg(res.rWins), avgRLoss: avg(res.rLosses) };
  }, [dayTrades, beThreshold]);

  const pnlByDay = useMemo(() => {
    const map = {};
    scopedTrades.forEach((t) => { map[t.date] = (map[t.date] || 0) + (Number(t.pnl) || 0); });
    return map;
  }, [scopedTrades]);

  const monthStats = useMemo(() => {
    const list = scopedTrades.filter((t) => String(t.date).startsWith(viewMonth));
    const days = Object.entries(pnlByDay).filter(([d]) => d.startsWith(viewMonth));
    const wins = list.filter((t) => classify(t) === "win").length;
    const sorted = [...days].sort((a, b) => b[1] - a[1]);
    return {
      count: list.length,
      pnl: list.reduce((s, t) => s + (Number(t.pnl) || 0), 0),
      wr: list.length ? (wins / list.length) * 100 : 0,
      days: days.length,
      best: sorted[0], worst: sorted[sorted.length - 1],
    };
  }, [scopedTrades, pnlByDay, viewMonth, beThreshold]);

  const history = useMemo(() => {
    const [ws, we] = weekBounds(date);
    return scopedTrades.filter((t) => {
      if (period === "day" && t.date !== date) return false;
      if (period === "week" && (t.date < ws || t.date > we)) return false;
      if (period === "month" && !String(t.date).startsWith(date.slice(0, 7))) return false;
      if (filters.symbol && !String(t.symbol || "").toUpperCase().includes(filters.symbol.toUpperCase())) return false;
      if (filters.dir && t.dir !== filters.dir) return false;
      if (filters.setup && t.setup !== filters.setup) return false;
      if (filters.result && classify(t) !== filters.result) return false;
      return true;
    });
  }, [scopedTrades, period, date, filters, beThreshold]);

  const tagSuggestions = useMemo(() => {
    const freq = {};
    (trades || []).forEach((t) => (t.tags || []).forEach((tg) => { freq[tg] = (freq[tg] || 0) + 1; }));
    return Object.keys(freq).sort((a, b) => freq[b] - freq[a]).filter((tg) => !f.tags.includes(tg)).slice(0, 8);
  }, [trades, f.tags]);

  /* ------------------------------ Calendrier ------------------------------ */
  const calendar = useMemo(() => {
    const [y, m] = viewMonth.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const daysInMonth = new Date(y, m, 0).getDate();
    const lead = first.getDay();
    const cells = Math.ceil((lead + daysInMonth) / 7) * 7;
    return Array.from({ length: cells }, (_, i) => {
      const day = i - lead + 1;
      return day >= 1 && day <= daysInMonth ? `${viewMonth}-${pad(day)}` : null;
    });
  }, [viewMonth]);

  const shiftMonth = (n) => {
    const [y, m] = viewMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + n, 1);
    setViewMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  };
  const monthLabel = (ym) => {
    const [y, m] = ym.split("-").map(Number);
    return new Intl.DateTimeFormat(lang === "en" ? "en-US" : "fr-FR", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1)).toUpperCase();
  };
  const pickDate = (iso) => { setDate(iso); setViewMonth(iso.slice(0, 7)); setErr(""); };
  const today = localToday();

  /* ------------------------------ Saisie ------------------------------ */
  const pv = pointValue(f.symbol);
  const computedPnl = useMemo(() => {
    const e = parseFloat(f.entry_price), x = parseFloat(f.exit_price), s = parseFloat(f.size);
    if (!pv || !Number.isFinite(e) || !Number.isFinite(x) || !Number.isFinite(s)) return null;
    return Math.round((x - e) * (f.dir === "long" ? 1 : -1) * pv * s * 100) / 100;
  }, [f.entry_price, f.exit_price, f.size, f.dir, pv]);

  const addTag = (raw) => {
    const v = String(raw || "").trim();
    if (v && !f.tags.some((x) => x.toLowerCase() === v.toLowerCase())) put("tags", [...f.tags, v]);
    setTagInput("");
  };

  async function submit() {
    setErr("");
    if (!f.symbol.trim()) return setErr(T.errSymbol);
    if ((f.entry_time && !TIME_RE.test(f.entry_time)) || (f.exit_time && !TIME_RE.test(f.exit_time))) return setErr(T.errTime);
    if (f.mode === "swing" && f.end_date && f.end_date < date) return setErr(T.errEnd);
    const typed = f.pnl.trim() === "" ? null : Number(f.pnl.replace(",", "."));
    const pnl = typed ?? computedPnl;
    if (pnl === null || !Number.isFinite(pnl)) return setErr(T.errPnl);

    setSaving(true);
    let urls = [null, null];
    try {
      urls = await Promise.all([0, 1].map((i) => (files[i] ? uploadFile(files[i], "trades") : null)));
    } catch (e) {
      setSaving(false);
      return setErr(T.errUpload + (e?.message || ""));
    }

    const row = {
      date,
      symbol: f.symbol.trim().toUpperCase(),
      dir: f.dir,
      session: sessionFromTime(date, f.entry_time) || "NY AM",
      r: Number(String(f.r).replace(",", ".")) || 0,
      pnl,
      setup: f.setup || null,
      tags: f.tags,
      why: f.why.trim() || null,
      plan: f.followed !== "no",
      grade: RATING_TO_GRADE[f.rating] || null,
      screenshot_url: urls[0],
      screenshot_url_2: urls[1],
      account_id: f.account_id || null,
      outcome: f.outcome || (pnl === 0 ? "BE" : null),
      strategy_checks: [],
    };
    if (hasExecution) {
      const num = (v) => { const n = parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) ? n : null; };
      row.execution = {
        mode: f.mode,
        end_date: f.mode === "swing" ? f.end_date || null : null,
        entry_time: f.entry_time || null,
        exit_time: f.exit_time || null,
        entry_price: num(f.entry_price),
        exit_price: num(f.exit_price),
        size: num(f.size),
        planned_profit: num(f.planned),
        rating: f.rating || null,
        followed_rules: f.followed || null,
        controlled_emotions: f.emotions || null,
      };
    }
    const created = await addTrade(row);
    setSaving(false);
    if (!created) return; // erreur déjà affichée par BookProvider : on garde la saisie
    setF((cur) => ({ ...emptyForm(), symbol: cur.symbol, dir: cur.dir, mode: cur.mode, account_id: cur.account_id }));
    setFiles([]);
    setNotesOpen(false);
  }

  /* ------------------------------ Suppression ------------------------------ */
  async function confirmDelete() {
    const ids = confirmIds || [];
    setConfirmIds(null);
    for (const id of ids) await deleteTrade(id);
    setSelected([]);
    setSelecting(false);
  }
  async function assignSelected(accountId) {
    if (!accountId) return;
    for (const id of selected) await updateTrade(id, { account_id: accountId });
    notify(lang === "en" ? "Trades assigned" : "Trades assignés");
    setSelected([]);
    setSelecting(false);
  }

  const exec = (t) => t.execution || {};
  const hasFilters = Object.values(filters).some(Boolean);

  /* ------------------------------ Rendu ------------------------------ */
  return (
    <div className="min-h-full text-prism-text lg:grid lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* ======================= Colonne calendrier ======================= */}
      <aside className="border-b border-prism-line bg-prism-surface lg:min-h-[100dvh] lg:border-b-0 lg:border-r">
        <div className="relative flex h-[72px] items-center justify-between border-b border-prism-line px-5">
          <button type="button" onClick={() => setMonthPicker((v) => !v)} className="flex items-center gap-2 font-mono text-lg font-bold tracking-tight">
            {monthLabel(viewMonth)} <ChevronDown className={`h-4 w-4 text-prism-muted transition ${monthPicker ? "rotate-180" : ""}`} />
          </button>
          <div className="flex items-center gap-1 text-prism-muted">
            <button type="button" onClick={() => shiftMonth(-1)} className="rounded p-1 hover:text-prism-text" aria-label="prev"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" onClick={() => shiftMonth(1)} className="rounded p-1 hover:text-prism-text" aria-label="next"><ChevronRight className="h-4 w-4" /></button>
          </div>
          {monthPicker && (
            <div className="absolute left-4 top-[64px] z-30 w-64 rounded-lg border border-prism-line bg-prism-panel p-3 shadow-2xl">
              <div className="mb-2 flex items-center justify-between font-mono text-sm">
                <button type="button" onClick={() => setViewMonth(`${Number(viewMonth.slice(0, 4)) - 1}${viewMonth.slice(4)}`)}><ChevronLeft className="h-4 w-4" /></button>
                {viewMonth.slice(0, 4)}
                <button type="button" onClick={() => setViewMonth(`${Number(viewMonth.slice(0, 4)) + 1}${viewMonth.slice(4)}`)}><ChevronRight className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 12 }, (_, i) => {
                  const ym = `${viewMonth.slice(0, 4)}-${pad(i + 1)}`;
                  const label = new Intl.DateTimeFormat(lang === "en" ? "en-US" : "fr-FR", { month: "short" }).format(new Date(2000, i, 1));
                  return <button key={ym} type="button" onClick={() => { setViewMonth(ym); setMonthPicker(false); }} className={`rounded py-1.5 text-xs uppercase ${ym === viewMonth ? "bg-prism-accentDim text-prism-accent" : "text-prism-muted hover:bg-prism-panel2 hover:text-prism-text"}`}>{label}</button>;
                })}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 pb-5">
          <div className="grid grid-cols-7 gap-1.5 border-b border-prism-line py-3 text-center text-[10px] font-semibold tracking-[.1em] text-prism-muted">
            {(lang === "en" ? ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] : ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"]).map((d) => <span key={d}>{d}</span>)}
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1.5">
            {calendar.map((iso, i) => {
              if (!iso) return <span key={`e${i}`} />;
              const p = pnlByDay[iso];
              const selectedDay = iso === date;
              const future = iso > today;
              const tone = p === undefined ? "" : p > 0 ? `${WIN_BG} text-prism-win` : p < 0 ? "bg-[rgba(239,68,68,0.12)] text-prism-loss" : "text-prism-muted";
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => pickDate(iso)}
                  title={p !== undefined ? fmtMoney(p, true) : undefined}
                  className={`aspect-square rounded-[4px] border font-mono text-xs transition ${selectedDay ? "border-prism-accent bg-prism-accentDim text-prism-accent" : `border-prism-line hover:border-prism-line2 ${tone}`} ${future ? "opacity-25" : ""}`}
                >
                  {Number(iso.slice(-2))}
                </button>
              );
            })}
          </div>

          <div className="mt-5 border-t border-prism-line pt-5">
            {monthStats.count < 5 ? (
              <p className="py-6 text-center font-mono text-[11px] text-prism-muted2">{T.waiting}</p>
            ) : (
              <dl className="space-y-2 font-mono text-[11px]">
                <p className="mb-3 text-[10px] font-semibold tracking-[.18em] text-prism-muted">{T.month}</p>
                <Row label="P&L" value={fmtMoney(monthStats.pnl, true)} tone={monthStats.pnl >= 0 ? "text-prism-win" : "text-prism-loss"} />
                <Row label="Winrate" value={`${monthStats.wr.toFixed(1)}%`} />
                <Row label={T.tradedDays} value={monthStats.days} />
                {monthStats.best && <Row label={T.best} value={`${frDate(monthStats.best[0]).slice(0, 5)} · ${fmtMoney(monthStats.best[1])}`} tone="text-prism-win" />}
                {monthStats.worst && monthStats.worst[1] < 0 && <Row label={T.worst} value={`${frDate(monthStats.worst[0]).slice(0, 5)} · ${fmtMoney(monthStats.worst[1])}`} tone="text-prism-loss" />}
              </dl>
            )}
          </div>

          <DailyReview key={`${date}-${dailyReviews.some((r) => r.date === date) ? "saved" : "new"}`} date={date} T={T} review={dailyReviews.find((r) => r.date === date)} onSave={saveDailyReview} />
        </div>
      </aside>

      {/* ======================= Zone principale ======================= */}
      <main className="min-w-0">
        {/* Barre du haut + bande KPI */}
        <header className="flex flex-col border-b border-prism-line min-[1800px]:flex-row min-[1800px]:items-stretch">
          <div className="flex flex-none flex-wrap items-center gap-3 whitespace-nowrap px-6 py-5">
            <h1 className="text-xl font-bold tracking-[.02em] text-prism-accent">{T.logTrade}</h1>
            <i className="hidden h-6 w-px bg-prism-line sm:block" />
            <button type="button" onClick={() => setImportOpen(true)} className={GHOST}><Upload className="h-3 w-3" />{T.import}</button>
            <div className="relative">
              <button type="button" onClick={() => setDeleteMenu((v) => !v)} className={GHOST}><Trash2 className="h-3 w-3" />{T.del}<ChevronDown className="h-3 w-3" /></button>
              {deleteMenu && (
                <div className="absolute left-0 top-10 z-30 w-60 overflow-hidden rounded-lg border border-prism-line bg-prism-panel shadow-2xl">
                  <button type="button" onClick={() => { setDeleteMenu(false); setSelecting(true); }} className="block w-full px-3 py-2.5 text-left text-xs hover:bg-prism-panel2">{T.delSel}</button>
                  <button type="button" disabled={!dayTrades.length} onClick={() => { setDeleteMenu(false); setConfirmIds(dayTrades.map((t) => t.id)); }} className="block w-full px-3 py-2.5 text-left text-xs text-prism-loss hover:bg-prism-panel2 disabled:opacity-40">{T.delDay} ({dayTrades.length})</button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 border-t border-prism-line bg-prism-surface sm:grid-cols-4 min-[1800px]:flex-1 min-[1800px]:rounded-bl-xl min-[1800px]:border-l min-[1800px]:border-t-0">
            <Kpi label={T.dayPnl}>
              <b className={`font-mono text-xl ${kpi.pnl > 0 ? "text-prism-win" : kpi.pnl < 0 ? "text-prism-loss" : ""}`}>{fmtMoney(kpi.pnl, true)}</b>
            </Kpi>
            <Kpi label={T.winrate}>
              <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                <div>
                  <b className="font-mono text-xl">{kpi.wr.toFixed(1)}%</b>
                  <p className="mt-0.5 whitespace-nowrap text-[9px] text-prism-muted2">{T.tradesToday(dayTrades.length)}</p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[[T.wins, kpi.w, "text-prism-win"], [T.be, kpi.be, "text-prism-muted"], [T.losses, kpi.l, "text-prism-loss"]].map(([l, v, c]) => (
                    <span key={l}><small className="block text-[8px] tracking-[.1em] text-prism-muted2">{l}</small><b className={`font-mono text-xs ${c}`}>{v}</b></span>
                  ))}
                </div>
              </div>
            </Kpi>
            <Kpi label={unit === "$" ? T.avgWin : T.avgRR} extra={<UnitToggle unit={unit} setUnit={setUnit} />}>
              <b className="flex items-center gap-2 font-mono text-xl">
                {unit === "$" ? fmtMoney(kpi.avgGain, true) : kpi.avgRWin.toFixed(2)}
                <ArrowUpRight className="h-3.5 w-3.5 text-prism-accent" />
              </b>
            </Kpi>
            <Kpi label={T.avgLoss}>
              <b className="flex items-center gap-2 font-mono text-xl text-prism-loss">
                {unit === "$" ? fmtMoney(kpi.avgLoss, true) : kpi.avgRLoss.toFixed(2)}
                <ArrowDownRight className="h-3.5 w-3.5" />
              </b>
            </Kpi>
          </div>
        </header>

        <div className="space-y-6 p-6">
          {err && (
            <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-xs font-bold uppercase tracking-[.08em] text-prism-loss ${LOSS_BOX}`}>
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="flex-1">{err}</span>
              <button type="button" onClick={() => setErr("")} aria-label="close"><X className="h-4 w-4" /></button>
            </div>
          )}
          {!hasExecution && (
            <p className="rounded-lg border border-prism-line bg-prism-panel px-4 py-3 text-[11px] text-prism-muted">{T.migration}</p>
          )}

          {/* ---------------- Formulaire en 3 cartes ---------------- */}
          <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
            <Card
              title={T.basics}
              action={hasExecution && (
                <div className="inline-flex rounded-full border border-prism-line bg-prism-surface p-0.5">
                  {["day", "swing"].map((m) => (
                    <button key={m} type="button" onClick={() => put("mode", m)} className={`rounded-full px-3 py-1 text-[9px] font-bold tracking-[.14em] ${f.mode === m ? "bg-prism-accentDim text-prism-accent" : "text-prism-muted"}`}>{m.toUpperCase()}</button>
                  ))}
                </div>
              )}
            >
              {f.mode === "swing" && hasExecution ? (
                <div className="grid grid-cols-2 gap-3">
                  <Field label={T.start}><input type="date" className={INPUT} value={date} onChange={(e) => e.target.value && pickDate(e.target.value)} /></Field>
                  <Field label={T.end}><input type="date" className={INPUT} value={f.end_date} min={date} onChange={(e) => put("end_date", e.target.value)} /></Field>
                </div>
              ) : (
                <Field label={T.date}><input type="date" className={INPUT} value={date} onChange={(e) => e.target.value && pickDate(e.target.value)} /></Field>
              )}
              <div className="mt-4">
                <Field label={lang === "en" ? "ACCOUNT" : "COMPTE"}>
                  <select className={INPUT} value={f.account_id || ""} onChange={(e) => put("account_id", e.target.value)}>
                    <option value="">{lang === "en" ? "No account" : "Aucun compte"}</option>
                    {accounts.map((account) => <option key={account.id} value={account.id}>{account.note || account.firm}</option>)}
                  </select>
                </Field>
              </div>
              {hasExecution && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Field label={T.entryTime}><input className={INPUT} placeholder="09:30:15" value={f.entry_time} onChange={(e) => put("entry_time", e.target.value)} /></Field>
                  <Field label={T.exitTime}><input className={INPUT} placeholder="09:34:42" value={f.exit_time} onChange={(e) => put("exit_time", e.target.value)} /></Field>
                </div>
              )}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Field label={T.symbol}><input className={`${INPUT} uppercase`} placeholder="NQ" value={f.symbol} onChange={(e) => put("symbol", e.target.value)} /></Field>
                <Field label={T.direction}>
                  <div className="grid h-10 grid-cols-2 overflow-hidden rounded-md border border-prism-line">
                    <button type="button" onClick={() => put("dir", "long")} className={`text-xs font-bold tracking-[.12em] ${f.dir === "long" ? "bg-prism-accentDim text-prism-accent" : "text-prism-muted"}`}>LONG</button>
                    <button type="button" onClick={() => put("dir", "short")} className={`text-xs font-bold tracking-[.12em] ${f.dir === "short" ? "bg-[rgba(239,68,68,0.15)] text-prism-loss" : "text-prism-muted"}`}>SHORT</button>
                  </div>
                </Field>
              </div>
            </Card>

            <Card title={T.execution}>
              <div className="mb-4 grid grid-cols-3 gap-2">
                {["TP", "SL", "BE"].map((outcome) => (
                  <button key={outcome} type="button" onClick={() => setQuickOutcome(outcome)} className={`h-10 rounded-md border text-xs font-extrabold transition ${f.outcome === outcome ? outcome === "TP" ? "border-prism-win bg-[rgba(34,197,94,0.15)] text-prism-win" : outcome === "SL" ? "border-prism-loss bg-[rgba(239,68,68,0.15)] text-prism-loss" : "border-prism-line2 bg-[rgba(138,138,147,0.15)] text-prism-text" : "border-prism-line text-prism-muted hover:text-prism-text"}`}>
                    {outcome} <span className="font-mono">{quickR[outcome] >= 0 ? "+" : ""}{quickR[outcome]}R</span>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {hasExecution && <>
                  <Field label={T.entryPrice}><input inputMode="decimal" className={INPUT} placeholder="6500.00" value={f.entry_price} onChange={(e) => put("entry_price", e.target.value)} /></Field>
                  <Field label={T.exitPrice}><input inputMode="decimal" className={INPUT} placeholder="6512.50" value={f.exit_price} onChange={(e) => put("exit_price", e.target.value)} /></Field>
                  <Field label={T.size}><input inputMode="decimal" className={INPUT} placeholder="1" value={f.size} onChange={(e) => put("size", e.target.value)} /></Field>
                </>}
                <Field label={T.rr}><input inputMode="decimal" className={INPUT} placeholder="2.5" value={f.r} onChange={(e) => put("r", e.target.value)} /></Field>
                {hasExecution && <Field label={T.planned}><Money value={f.planned} onChange={(v) => put("planned", v)} placeholder="200" /></Field>}
                <Field label={<>{T.realized}{computedPnl !== null && f.pnl === "" && <span className="ml-1 normal-case tracking-normal text-prism-accent">· {T.auto}</span>}</>}>
                  <Money value={f.pnl} onChange={(v) => put("pnl", v)} placeholder={computedPnl !== null ? String(computedPnl) : "150"} />
                </Field>
              </div>
            </Card>

            <Card title={T.context}>
              <div className="grid grid-cols-2 gap-3">
                <Field label={T.strategy}>
                  <div className="flex gap-2"><select className={INPUT} value={f.setup} onChange={(e) => put("setup", e.target.value)}>
                    <option value="">{T.setupPh}</option>
                    {playbooks.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select><Link href="/playbook" className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-prism-line text-prism-accent hover:border-prism-accent" aria-label={lang === "en" ? "Manage strategies" : "Gérer les stratégies"}><Plus className="h-4 w-4" /></Link></div>
                </Field>
                <Field label={T.rating}>
                  <div className="flex h-10 items-center justify-center gap-1 rounded-md border border-prism-line bg-prism-surface">
                    {[1, 2, 3].map((n) => (
                      <button key={n} type="button" onClick={() => put("rating", f.rating === n ? 0 : n)} aria-label={`${n}`}>
                        <Star className={`h-4 w-4 ${n <= f.rating ? "fill-amber-400 text-amber-400" : "text-prism-muted"}`} />
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label={T.confluences}>
                  <input
                    className={INPUT}
                    placeholder={T.tagsPh}
                    value={tagInput}
                    list="journal-tag-suggestions"
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); } }}
                    onBlur={() => tagInput && addTag(tagInput)}
                  />
                  <datalist id="journal-tag-suggestions">{tagSuggestions.map((tg) => <option key={tg} value={tg} />)}</datalist>
                </Field>
                <div className="col-span-2 grid grid-cols-2 gap-3">
                  <ScreenshotSlot label={lang === "en" ? "ENTRY" : "ENTRÉE"} file={files[0]} onPick={(file) => setFiles((current) => [file, current[1] || null])} />
                  <ScreenshotSlot label={lang === "en" ? "EXIT" : "SORTIE"} file={files[1]} onPick={(file) => setFiles((current) => [current[0] || null, file])} />
                </div>
                {f.tags.length > 0 && (
                  <div className="col-span-2 -mt-1 flex flex-wrap gap-1.5">
                    {f.tags.map((tg) => (
                      <span key={tg} className="inline-flex items-center gap-1 rounded border border-prism-line bg-prism-panel2 px-2 py-0.5 text-[10px]">
                        {tg}<button type="button" onClick={() => put("tags", f.tags.filter((x) => x !== tg))}><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
                <Field label={T.rules}>
                  <select className={INPUT} value={f.followed} onChange={(e) => put("followed", e.target.value)}>
                    <option value="">—</option><option value="yes">{T.yes}</option><option value="no">{T.no}</option>
                  </select>
                </Field>
                {hasExecution && (
                  <Field label={T.emotions}>
                    <select className={INPUT} value={f.emotions} onChange={(e) => put("emotions", e.target.value)}>
                      <option value="">—</option><option value="yes">{T.yes}</option><option value="no">{T.no}</option>
                    </select>
                  </Field>
                )}
              </div>
            </Card>
          </div>

          {/* ---------------- Notes + CTA ---------------- */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="w-full sm:max-w-md">
              <button type="button" onClick={() => setNotesOpen((v) => !v)} className="flex h-10 w-full items-center justify-between rounded-md border border-prism-line px-4 font-mono text-xs text-prism-muted hover:border-prism-line2 hover:text-prism-text sm:w-80">
                <span className="flex items-center gap-2"><FileText className="h-3.5 w-3.5" />{T.notes}</span><Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-prism-accent px-10 text-xs font-extrabold tracking-[.18em] text-black shadow-[0_0_24px_rgba(6,182,212,.35)] transition hover:brightness-110 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />{saving ? T.saving : T.submit}
            </button>
          </div>
          {notesOpen && (
            <textarea className={`${INPUT} h-28 py-3 font-sans`} placeholder={T.notesPh} maxLength={2000} value={f.why} onChange={(e) => put("why", e.target.value)} />
          )}

          {/* ---------------- Historique ---------------- */}
          <section>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h2 className="text-[13px] font-bold tracking-[.14em]">{T.history}</h2>
              <span className="font-mono text-xs text-prism-muted">
                — {period === "day" ? frDate(date).replaceAll("/", ".") : period === "month" ? monthLabel(date.slice(0, 7)) : period === "week" ? `${frDate(weekBounds(date)[0]).slice(0, 5)} → ${frDate(weekBounds(date)[1]).slice(0, 5)}` : T.periods.all}
              </span>
              <div className="inline-flex rounded-md border border-prism-line bg-prism-surface p-0.5">
                {Object.keys(T.periods).map((p) => (
                  <button key={p} type="button" onClick={() => setPeriod(p)} className={`rounded px-3 py-1 text-[10px] font-bold tracking-[.12em] ${period === p ? "bg-prism-panel2 text-prism-text" : "text-prism-muted hover:text-prism-text"}`}>{T.periods[p]}</button>
                ))}
              </div>
              <div className="ml-auto flex gap-2">
                <button type="button" onClick={() => { setSelecting((v) => !v); setSelected([]); }} className={`${GHOST} ${selecting ? "border-prism-accent text-prism-accent" : ""}`}><ListChecks className="h-3.5 w-3.5" />{T.select}</button>
                <div className="relative">
                  <button type="button" onClick={() => setFilterOpen((v) => !v)} className={`${GHOST} ${hasFilters ? "border-prism-accent text-prism-accent" : ""}`}><Filter className="h-3.5 w-3.5" />{T.filter}</button>
                  {filterOpen && (
                    <div className="absolute right-0 top-10 z-30 w-64 space-y-3 rounded-lg border border-prism-line bg-prism-panel p-4 shadow-2xl">
                      <Field label={T.fSymbol}><input className={INPUT} value={filters.symbol} onChange={(e) => setFilters({ ...filters, symbol: e.target.value })} placeholder="NQ" /></Field>
                      <Field label={T.fDir}>
                        <select className={INPUT} value={filters.dir} onChange={(e) => setFilters({ ...filters, dir: e.target.value })}>
                          <option value="">{T.all}</option><option value="long">LONG</option><option value="short">SHORT</option>
                        </select>
                      </Field>
                      <Field label={T.fSetup}>
                        <select className={INPUT} value={filters.setup} onChange={(e) => setFilters({ ...filters, setup: e.target.value })}>
                          <option value="">{T.all}</option>{playbooks.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>
                      </Field>
                      <Field label={T.fResult}>
                        <select className={INPUT} value={filters.result} onChange={(e) => setFilters({ ...filters, result: e.target.value })}>
                          <option value="">{T.all}</option><option value="win">{T.win}</option><option value="be">BE</option><option value="loss">{T.loss}</option>
                        </select>
                      </Field>
                      <button type="button" onClick={() => setFilters({ symbol: "", dir: "", setup: "", result: "" })} className="text-[11px] text-prism-muted hover:text-prism-text">{T.reset}</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {selecting && (
              <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-prism-line bg-prism-panel px-4 py-2.5 text-xs">
                <span className="font-mono text-prism-muted">{T.selected(selected.length)}</span>
                <button type="button" onClick={() => setSelected(history.map((t) => t.id))} className="text-prism-accent">{lang === "en" ? "Select all" : "Tout sélectionner"}</button>
                <button type="button" onClick={() => setSelected([])} className="text-prism-muted">{lang === "en" ? "Deselect all" : "Tout désélectionner"}</button>
                <div className="ml-auto flex items-center gap-2">
                  {accounts.length > 0 && (
                    <select className="h-8 rounded-md border border-prism-line bg-prism-surface px-2 text-xs" value="" disabled={!selected.length} onChange={(e) => assignSelected(e.target.value)}>
                      <option value="">{T.assign}</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.note || a.firm} · {fmtMoney(a.size)}</option>)}
                    </select>
                  )}
                  <button type="button" disabled={!selected.length} onClick={() => setConfirmIds(selected)} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-prism-loss px-3 text-[11px] font-bold text-white disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" />{T.deleteSel}</button>
                  <button type="button" onClick={() => { setSelecting(false); setSelected([]); }} className={GHOST}>{T.done}</button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] font-mono text-[11px]">
                <thead>
                  <tr className="border-b border-prism-line">
                    {selecting && <th className="w-8" />}
                    {T.cols.map((c) => <th key={c} className="whitespace-nowrap px-2 py-3 text-left text-[10px] font-semibold tracking-[.1em] text-prism-muted">{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {history.map((t) => {
                    const e = exec(t);
                    const p = Number(t.pnl) || 0;
                    const checked = selected.includes(t.id);
                    return (
                      <tr
                        key={t.id}
                        onClick={() => (selecting ? setSelected((s) => (checked ? s.filter((x) => x !== t.id) : [...s, t.id])) : setEditing(t))}
                        className={`h-11 cursor-pointer border-b border-prism-line transition hover:bg-prism-panel ${checked ? "bg-prism-accentDim" : ""}`}
                      >
                        {selecting && <td className="px-2"><span className={`grid h-4 w-4 place-items-center rounded border ${checked ? "border-prism-accent bg-prism-accent text-black" : "border-prism-line2"}`}>{checked && <Check className="h-3 w-3" />}</span></td>}
                        <td className="whitespace-nowrap px-2">{frDate(t.date)}{e.end_date ? ` → ${frDate(e.end_date).slice(0, 5)}` : ""}</td>
                        <td className="px-2 text-prism-muted">{e.entry_time || "—"}</td>
                        <td className="px-2 text-prism-muted">{e.exit_time || "—"}</td>
                        <td className="px-2">{e.entry_price ?? "—"}</td>
                        <td className="px-2">{e.exit_price ?? "—"}</td>
                        <td className="px-2 font-bold">{t.symbol}</td>
                        <td className={`px-2 font-bold ${t.dir === "long" ? "text-prism-accent" : "text-prism-loss"}`}>{String(t.dir || "").toUpperCase()}</td>
                        <td className="px-2">{e.size ?? "—"}</td>
                        <td className={`px-2 font-bold ${classify(t) === "be" ? "text-prism-muted" : p > 0 ? "text-prism-win" : "text-prism-loss"}`}>{fmtMoney(p, true)} {t.outcome && <span className="ml-1 rounded border border-current px-1 text-[8px]">{t.outcome}</span>}</td>
                        <td className="px-2">{Number(t.r) ? Number(t.r).toFixed(2) : "—"}</td>
                        <td className="max-w-[140px] truncate px-2">{t.setup || "—"}</td>
                        <td className="max-w-[160px] px-2"><div className="flex flex-wrap gap-1">{(t.tags || []).slice(0, 3).map((tg) => <span key={tg} className="rounded border border-prism-line px-1.5 text-[9px]">{tg}</span>)}{!(t.tags || []).length && "—"}</div></td>
                        <td className="px-2">
                          <div className="flex gap-1">{[t.screenshot_url, t.screenshot_url_2].filter(Boolean).map((url, index) => <button key={url} type="button" onClick={(ev) => { ev.stopPropagation(); setLightbox({ urls: [t.screenshot_url, t.screenshot_url_2].filter(Boolean), index }); }}><img src={url} alt="" className="h-7 w-10 rounded object-cover" /></button>)}{!t.screenshot_url && !t.screenshot_url_2 && "-"}</div>
                        </td>
                        <td className="max-w-[200px] truncate px-2 font-sans text-prism-muted">{t.why || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {history.length === 0 && (
                <p className="py-12 text-center font-mono text-[11px] tracking-[.1em] text-prism-muted2">{period === "day" && !hasFilters ? T.emptyDay : T.emptyPeriod}</p>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* ======================= Modales ======================= */}
      {shotsOpen && <ScreenshotModal T={T} files={files} onClose={() => setShotsOpen(false)} onSave={(list) => { setFiles(list); setShotsOpen(false); }} />}
      {importOpen && <ImportCsvModal onClose={() => setImportOpen(false)} />}
      {editing && <LogTradeModal editing={editing} onClose={() => setEditing(null)} />}
      {confirmIds && (
        <ConfirmModal title={T.confirmDelTitle} message={T.confirmDelMsg(confirmIds.length)} confirmLabel={T.deleteSel} onClose={() => setConfirmIds(null)} onConfirm={confirmDelete} />
      )}
      {lightbox && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[120] grid overflow-x-hidden overflow-y-auto bg-black/90 p-6" onClick={() => setLightbox(null)}>
          <button type="button" onClick={(event) => { event.stopPropagation(); setLightbox((current) => ({ ...current, index: (current.index + current.urls.length - 1) % current.urls.length })); }} className="absolute left-5 text-3xl">‹</button><img src={lightbox.urls[lightbox.index]} alt="" className="max-h-full max-w-full rounded-lg" onClick={(event) => event.stopPropagation()} /><button type="button" onClick={(event) => { event.stopPropagation(); setLightbox((current) => ({ ...current, index: (current.index + 1) % current.urls.length })); }} className="absolute right-5 text-3xl">›</button>
        </div>,
        document.body,
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sous-composants                                                      */
/* ------------------------------------------------------------------ */
function Card({ title, action, children }) {
  return (
    <section className="rounded-xl border border-prism-line bg-prism-panel p-6">
      <div className="mb-5 flex items-center justify-between border-b border-prism-line pb-4">
        <h2 className="text-[11px] font-bold tracking-[.16em]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return <label className="block"><span className={LABEL}>{label}</span>{children}</label>;
}

function Money({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-prism-muted">$</span>
      <input inputMode="decimal" className={`${INPUT} pl-7`} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Kpi({ label, extra, children }) {
  return (
    <div className="min-w-0 border-b border-r border-prism-line px-5 py-4 last:border-r-0 sm:border-b-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[9px] font-semibold tracking-[.14em] text-prism-muted">{label}</span>
        {extra}
      </div>
      {children}
    </div>
  );
}

function UnitToggle({ unit, setUnit }) {
  return (
    <div className="inline-flex overflow-hidden rounded border border-prism-line">
      {["$", "RR"].map((u) => (
        <button key={u} type="button" onClick={() => setUnit(u)} className={`px-1.5 py-0.5 text-[9px] font-bold ${unit === u ? "bg-prism-accentDim text-prism-accent" : "text-prism-muted"}`}>{u}</button>
      ))}
    </div>
  );
}

function Row({ label, value, tone = "" }) {
  return <div className="flex justify-between gap-3"><dt className="text-prism-muted">{label}</dt><dd className={tone}>{value}</dd></div>;
}

function DailyReview({ date, T, review, onSave }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => ({
    mindset: review?.mindset || "",
    respected_plan: review?.respected_plan ?? null,
    lesson: review?.lesson || "",
    intention: review?.intention || "",
  }));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  async function save() {
    setSaving(true);
    await onSave(date, { mindset: draft.mindset || null, respected_plan: draft.respected_plan, lesson: draft.lesson || null, intention: draft.intention || null });
    setSaving(false);
  }
  return (
    <div className="mt-5 border-t border-prism-line pt-4">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-[10px] font-bold tracking-[.18em] text-prism-muted hover:text-prism-text">
        <span>{T.review} {review && <Check className="ml-1 inline h-3 w-3 text-prism-win" />}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-4 space-y-3">
          <div>
            <span className={LABEL}>{T.mindset}</span>
            <div className="grid grid-cols-2 gap-1.5">
              {MINDSETS.map((m) => (
                <button key={m} type="button" onClick={() => set("mindset", m)} className={`rounded-md border py-1.5 text-[11px] ${draft.mindset === m ? "border-prism-accent bg-prism-accentDim text-prism-accent" : "border-prism-line text-prism-muted"}`}>{T.mindsets[m]}</button>
              ))}
            </div>
          </div>
          <div>
            <span className={LABEL}>{T.respected}</span>
            <div className="grid grid-cols-2 gap-1.5">
              {[[true, T.yes], [false, T.no]].map(([v, l]) => (
                <button key={l} type="button" onClick={() => set("respected_plan", v)} className={`rounded-md border py-1.5 text-[11px] ${draft.respected_plan === v ? "border-prism-accent bg-prism-accentDim text-prism-accent" : "border-prism-line text-prism-muted"}`}>{l}</button>
              ))}
            </div>
          </div>
          <textarea className={`${INPUT} h-20 py-2 font-sans`} placeholder={T.lesson} maxLength={500} value={draft.lesson} onChange={(e) => set("lesson", e.target.value)} />
          <textarea className={`${INPUT} h-20 py-2 font-sans`} placeholder={T.intention} maxLength={500} value={draft.intention} onChange={(e) => set("intention", e.target.value)} />
          <button type="button" disabled={saving} onClick={save} className="h-9 w-full rounded-md bg-prism-accent text-[11px] font-bold tracking-[.12em] text-black disabled:opacity-60">{T.saveReview}</button>
        </div>
      )}
    </div>
  );
}

function ScreenshotSlot({ label, file, onPick }) {
  const [dragging, setDragging] = useState(false);
  const preview = useMemo(() => file ? URL.createObjectURL(file) : null, [file]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);
  const accept = (items) => {
    const image = [...(items || [])].find((item) => item.type?.startsWith("image/"));
    if (image) onPick(image);
  };
  return <label onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); accept(event.dataTransfer.files); }} className={`relative flex h-24 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed ${dragging ? "border-prism-accent bg-prism-accentDim" : "border-prism-line"}`}><input className="hidden" type="file" accept="image/*" onChange={(event) => accept(event.target.files)} />{preview ? <img src={preview} alt={label} className="h-full w-full object-cover" /> : <span className="text-[10px] font-bold tracking-[.12em] text-prism-muted"><ImagePlus className="mx-auto mb-1 h-4 w-4" />{label}</span>}<span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-black/60 text-[9px] text-white">?</span></label>;
}

function ScreenshotModal({ T, files, onClose, onSave }) {
  const [list, setList] = useState(files);
  const [drag, setDrag] = useState(false);
  const add = (incoming) => setList((cur) => [...cur, ...Array.from(incoming || []).filter((file) => file.type.startsWith("image/"))].slice(0, 2));
  const previews = useMemo(() => list.map((file) => URL.createObjectURL(file)), [list]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);
  const modal = (
    <div className="fixed inset-0 z-[100] grid overflow-x-hidden overflow-y-auto bg-black/85 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="m-auto w-full max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-prism-line bg-prism-panel sm:max-w-2xl">
        <header className="flex items-center justify-between border-b border-prism-line px-5 py-4">
          <h2 className="text-xs font-bold tracking-[.16em]">{T.shotsTitle}</h2>
          <button type="button" onClick={onClose} className="text-prism-muted hover:text-prism-text"><X className="h-5 w-5" /></button>
        </header>
        <div className="p-6">
          <label
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
            className={`flex h-52 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed text-center transition ${drag ? "border-prism-accent bg-prism-accentDim" : "border-prism-line2"}`}
          >
            <Upload className="mb-3 h-7 w-7 text-prism-muted" />
            <span className="text-sm font-medium">{T.shotsDrop}</span>
            <span className="mt-1 text-xs text-prism-muted">{T.shotsHint}</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => add(e.target.files)} />
          </label>
          {list.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {previews.map((src, i) => (
                <div key={src} className="relative overflow-hidden rounded-lg border border-prism-line">
                  <img src={src} alt="" className="h-28 w-full object-cover" />
                  <button type="button" onClick={() => setList((cur) => cur.filter((_, j) => j !== i))} className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/70"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
        <footer className="flex justify-end gap-3 border-t border-prism-line px-5 py-4">
          <button type="button" onClick={onClose} className="px-3 text-sm text-prism-muted hover:text-prism-text">{T.cancel}</button>
          <button type="button" onClick={() => onSave(list)} className="inline-flex h-9 items-center gap-2 rounded-md bg-prism-accent px-4 text-sm font-semibold text-black"><ImagePlus className="h-4 w-4" />{T.save}</button>
        </footer>
      </section>
    </div>
  );
  return typeof document === "undefined" ? modal : createPortal(modal, document.body);
}
