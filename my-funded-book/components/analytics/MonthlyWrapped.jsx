"use client";

// Récap mensuel plein écran (« Wrapped ») : les chiffres du mois apparaissent un par un,
// puis une carte finale exportable en PNG format story (1080×1920) pour Instagram.

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Download, Pause, Play, X } from "lucide-react";
import { fmtMoney, frDate } from "@/lib/format";

const SLIDE_MS = 2800;

function monthLabel(month, lang) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR", { month: "long", year: "numeric" });
}

const signed = (v) => (v > 0 ? "+" : "") + fmtMoney(v, true);

function useCount(target, active, ms = 1100) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf; const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      setV(target * (1 - (1 - k) ** 3));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, ms]);
  return v;
}

function Big({ label, value, tone, sub, active }) {
  const n = useCount(value, active);
  const color = tone === "loss" ? "text-prism-loss" : tone === "win" ? "text-prism-win" : "text-prism-accent";
  const glow = tone === "loss" ? "var(--prism-loss, #ef4444)" : tone === "win" ? "var(--prism-win, #22c55e)" : "var(--prism-accent, #3b82f6)";
  return (
    <div className="wrapped-in text-center">
      <span className={`inline-block rounded border px-2 py-0.5 font-mono text-[10px] font-bold tracking-[.2em] ${color}`} style={{ borderColor: glow }}>{label}</span>
      <p className={`mt-4 font-mono text-[clamp(2.6rem,11vw,6rem)] font-bold leading-none ${color}`} style={{ textShadow: `0 0 28px ${glow}, 0 0 60px ${glow}` }}>{signed(n)}</p>
      {sub && <p className="mt-4 font-mono text-xs text-prism-muted">{sub}</p>}
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="rounded-lg border border-prism-line bg-white/[0.03] px-3 py-3 text-left">
      <p className="text-[9px] font-bold tracking-[.16em] text-prism-muted2">{label}</p>
      <p className={`mt-1 font-mono text-lg font-bold ${tone === "win" ? "text-prism-win" : tone === "loss" ? "text-prism-loss" : "text-prism-text"}`}>{value}</p>
    </div>
  );
}

export default function MonthlyWrapped({ recap, name, lang = "fr", onClose, themeStyle }) {
  const en = lang === "en";
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const slides = useMemo(() => {
    const list = [
      { key: "net" },
      { key: "best" },
      { key: "worst" },
      { key: "discipline" },
      { key: "summary" },
    ];
    return recap.count > 1 ? list : list.filter((s) => s.key !== "worst");
  }, [recap.count]);
  const last = slides.length - 1;

  useEffect(() => {
    if (paused || i >= last) return;
    const id = setTimeout(() => setI((v) => Math.min(last, v + 1)), SLIDE_MS);
    return () => clearTimeout(id);
  }, [i, paused, last]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((v) => Math.min(last, v + 1));
      if (e.key === "ArrowLeft") setI((v) => Math.max(0, v - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last, onClose]);

  const L = en ? {
    net: "NET RESULT", best: "BEST TRADE", worst: "WORST TRADE", discipline: "DISCIPLINE",
    trades: "trades", days: "trading days", wr: "WIN RATE", plan: "PLAN RESPECTED", green: "GREEN DAYS", streak: "GREEN STREAK",
    totalR: "TOTAL R", bestDay: "BEST DAY", setup: "TOP SETUP", save: "Save image", pov: "POV: you followed the plan all month",
  } : {
    net: "RÉSULTAT NET", best: "MEILLEUR TRADE", worst: "PIRE TRADE", discipline: "DISCIPLINE",
    trades: "trades", days: "jours tradés", wr: "WIN RATE", plan: "PLAN RESPECTÉ", green: "JOURS VERTS", streak: "SÉRIE VERTE",
    totalR: "R TOTAL", bestDay: "MEILLEUR JOUR", setup: "TOP SETUP", save: "Enregistrer l'image", pov: "POV : tu as suivi le plan tout le mois",
  };
  const title = monthLabel(recap.month, lang);
  const s = slides[i].key;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  // Portal sur <body> : un parent transformé de l'app casserait le position: fixed.
  return createPortal(
    <div className="fixed inset-0 z-[150] flex flex-col bg-black text-prism-text" role="dialog" aria-modal="true" style={themeStyle}>
      <style>{`
        @keyframes wrappedIn { from { opacity: 0; transform: translateY(18px) scale(.96); filter: blur(6px); } to { opacity: 1; transform: none; filter: none; } }
        .wrapped-in { animation: wrappedIn .7s cubic-bezier(.2,.8,.2,1) both; }
        @keyframes wrappedBar { from { width: 0 } to { width: 100% } }
        @media (prefers-reduced-motion: reduce) { .wrapped-in { animation: none; } }
      `}</style>
      <div className="absolute inset-0 opacity-60" style={{ background: "radial-gradient(60% 45% at 50% 45%, color-mix(in srgb, var(--prism-accent, #3b82f6) 22%, transparent), transparent 70%)" }} />
      {/* barres de progression */}
      <div className="relative z-10 flex gap-1.5 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        {slides.map((sl, k) => (
          <button key={sl.key} type="button" onClick={() => setI(k)} className="h-1 flex-1 overflow-hidden rounded-full bg-white/15" aria-label={`${k + 1}`}>
            <span className="block h-full bg-white" style={k < i ? { width: "100%" } : k === i && !paused && i < last ? { animation: `wrappedBar ${SLIDE_MS}ms linear both` } : { width: k === i ? "100%" : 0 }} />
          </button>
        ))}
      </div>
      <div className="relative z-10 flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-[10px] font-bold tracking-[.2em] text-prism-accent">{en ? "MONTHLY RECAP" : "RÉCAP DU MOIS"}</p>
          <p className="text-sm font-semibold capitalize">{title}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPaused((p) => !p)} className="grid h-9 w-9 place-items-center rounded-full bg-white/10" aria-label="pause">{paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white/10" aria-label="close"><X className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-5" key={s}>
        {s === "net" && <Big active label={L.net} value={recap.net} tone={recap.net >= 0 ? "win" : "loss"} sub={`${recap.count} ${L.trades} · ${recap.days} ${L.days}`} />}
        {s === "best" && <Big active label={L.best} value={Number(recap.best.pnl) || 0} tone="win" sub={`${frDate(recap.best.date)} · ${recap.best.symbol || ""} ${recap.best.setup ? "· " + recap.best.setup : ""}`} />}
        {s === "worst" && <Big active label={L.worst} value={Number(recap.worst.pnl) || 0} tone="loss" sub={`${frDate(recap.worst.date)} · ${recap.worst.symbol || ""} ${recap.worst.setup ? "· " + recap.worst.setup : ""}`} />}
        {s === "discipline" && (
          <div className="wrapped-in w-full max-w-sm text-center">
            <span className="inline-block rounded border border-prism-accent px-2 py-0.5 font-mono text-[10px] font-bold tracking-[.2em] text-prism-accent">{L.discipline}</span>
            <p className="mt-4 font-mono text-[clamp(3rem,13vw,6rem)] font-bold leading-none text-prism-accent" style={{ textShadow: "0 0 28px var(--prism-accent, #3b82f6)" }}>{Math.round(recap.planPct)}%</p>
            <p className="mt-2 text-xs text-prism-muted">{L.plan}</p>
            <div className="mt-6 grid grid-cols-3 gap-2">
              <Stat label={L.wr} value={`${Math.round(recap.winRate)}%`} />
              <Stat label={L.green} value={`${recap.greenDays}/${recap.days}`} tone="win" />
              <Stat label={L.streak} value={`${recap.greenStreak}j`} />
            </div>
          </div>
        )}
        {s === "summary" && (
          <div className="wrapped-in w-full max-w-sm">
            <p className="text-center font-mono text-[11px] text-prism-muted">{L.pov}</p>
            <p className={`mt-3 text-center font-mono text-5xl font-bold ${recap.net >= 0 ? "text-prism-win" : "text-prism-loss"}`} style={{ textShadow: `0 0 26px ${recap.net >= 0 ? "var(--prism-win, #22c55e)" : "var(--prism-loss, #ef4444)"}` }}>{signed(recap.net)}</p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <Stat label={L.wr} value={`${Math.round(recap.winRate)}%`} />
              <Stat label={L.totalR} value={`${recap.totalR >= 0 ? "+" : ""}${recap.totalR.toFixed(1)}R`} tone={recap.totalR >= 0 ? "win" : "loss"} />
              <Stat label={L.best} value={signed(Number(recap.best.pnl) || 0)} tone="win" />
              <Stat label={L.bestDay} value={signed(recap.bestDay.pnl)} tone={recap.bestDay.pnl >= 0 ? "win" : "loss"} />
              <Stat label={L.plan} value={`${Math.round(recap.planPct)}%`} />
              <Stat label={L.setup} value={recap.topSetup?.name || "—"} />
            </div>
            <button type="button" onClick={() => exportStory(recap, { title, name, L })} className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-prism-accent text-xs font-extrabold tracking-[.14em] text-black">
              <Download className="h-4 w-4" />{L.save.toUpperCase()}
            </button>
          </div>
        )}
      </div>

      {/* zones de navigation tap gauche / droite */}
      <button type="button" onClick={() => setI((v) => Math.max(0, v - 1))} className="absolute bottom-6 left-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 disabled:opacity-30" disabled={i === 0} aria-label="prev"><ChevronLeft className="h-5 w-5" /></button>
      <button type="button" onClick={() => setI((v) => Math.min(last, v + 1))} className="absolute bottom-6 right-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 disabled:opacity-30" disabled={i === last} aria-label="next"><ChevronRight className="h-5 w-5" /></button>
    </div>,
    document.body
  );
}

// Dessine la carte récap sur un canvas 1080×1920 et la télécharge en PNG.
function exportStory(recap, { title, name, L }) {
  const css = getComputedStyle(document.querySelector("[role=dialog]") || document.documentElement);
  const v = (k, d) => (css.getPropertyValue(k).trim() || d);
  const WIN = v("--prism-win", "#22c55e"); const LOSS = v("--prism-loss", "#ef4444"); const ACC = v("--prism-accent", "#3b82f6");
  const c = document.createElement("canvas");
  c.width = 1080; c.height = 1920;
  const g = c.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, 1080, 1920);
  const rg = g.createRadialGradient(540, 820, 40, 540, 820, 760);
  rg.addColorStop(0, /^#[0-9a-f]{6}$/i.test(ACC) ? ACC + "55" : "rgba(59,130,246,0.33)"); rg.addColorStop(1, "#00000000");
  g.fillStyle = rg; g.fillRect(0, 0, 1080, 1920);
  const font = (w, s, mono) => `${w} ${s}px ${mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "Inter, system-ui, sans-serif"}`;
  g.textAlign = "center";
  g.fillStyle = ACC; g.font = font(800, 34); g.fillText(L.net === "NET RESULT" ? "MONTHLY RECAP" : "RÉCAP DU MOIS", 540, 250);
  g.fillStyle = "#fff"; g.font = font(700, 64); g.fillText(title.charAt(0).toUpperCase() + title.slice(1), 540, 340);
  if (name) { g.fillStyle = "#a1a1aa"; g.font = font(500, 34); g.fillText(name, 540, 400); }
  const netCol = recap.net >= 0 ? WIN : LOSS;
  g.fillStyle = "#a1a1aa"; g.font = font(700, 30, true); g.fillText(L.net, 540, 650);
  g.shadowColor = netCol; g.shadowBlur = 60;
  g.fillStyle = netCol; g.font = font(800, 150, true); g.fillText(signed(recap.net), 540, 820);
  g.shadowBlur = 0;
  g.fillStyle = "#a1a1aa"; g.font = font(500, 34, true); g.fillText(`${recap.count} ${L.trades} · ${recap.days} ${L.days}`, 540, 900);
  const cells = [
    [L.wr, `${Math.round(recap.winRate)}%`, "#fff"],
    [L.totalR, `${recap.totalR >= 0 ? "+" : ""}${recap.totalR.toFixed(1)}R`, recap.totalR >= 0 ? WIN : LOSS],
    [L.best, signed(Number(recap.best.pnl) || 0), WIN],
    [L.worst, signed(Number(recap.worst.pnl) || 0), LOSS],
    [L.plan, `${Math.round(recap.planPct)}%`, ACC],
    [L.green, `${recap.greenDays}/${recap.days}`, WIN],
  ];
  cells.forEach(([label, value, col], k) => {
    const x = 100 + (k % 2) * 450; const y = 1020 + Math.floor(k / 2) * 230;
    g.fillStyle = "rgba(255,255,255,0.05)"; g.strokeStyle = "rgba(255,255,255,0.12)"; g.lineWidth = 2;
    g.beginPath(); g.roundRect(x, y, 430, 200, 24); g.fill(); g.stroke();
    g.textAlign = "left"; g.fillStyle = "#71717a"; g.font = font(700, 26); g.fillText(label, x + 34, y + 62);
    g.fillStyle = col; g.font = font(800, 62, true); g.fillText(value, x + 34, y + 150);
  });
  g.textAlign = "center"; g.fillStyle = "#71717a"; g.font = font(600, 30); g.fillText("MyTradeBook", 540, 1800);
  c.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `recap-${recap.month}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }, "image/png");
}
