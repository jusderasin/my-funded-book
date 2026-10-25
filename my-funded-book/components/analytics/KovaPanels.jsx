"use client";

// Panneaux de la page Analyse : comportements détectés, comparateur de contextes
// et questions posées au journal. Toutes les valeurs sont calculées sur les trades.

import { useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { SUGGESTIONS, answerQuestion, captureStats, detectBehaviors, dimensions, groupValues } from "@/lib/behaviors";
import { fmtMoney } from "@/lib/format";

const signedR = (r, d = 1) => `${r >= 0 ? "+" : ""}${r.toFixed(d)}R`;

// ---------- Comportements ----------
export function BehaviorPanel({ trades, lang = "fr" }) {
  const en = lang === "en";
  const rows = useMemo(() => detectBehaviors(trades, lang), [trades, lang]);
  const cap = useMemo(() => captureStats(trades), [trades]);
  const totalCost = rows.filter((r) => r.r < 0 && r.key !== "offplan" && r.key !== "early").reduce((s, r) => s + r.r, 0);
  if (!rows.length && !cap) return <p className="text-xs text-prism-muted">{en ? "No harmful pattern detected. Keep it up." : "Aucun comportement coûteux détecté. Continue comme ça."}</p>;
  return (
    <div className="space-y-3">
      {totalCost < 0 && (
        <p className="text-xs text-prism-muted">{en ? "These habits cost you" : "Ces habitudes t'ont coûté"} <b className="font-mono text-prism-loss">{signedR(totalCost)}</b> {en ? "over the period." : "sur la période."}</p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.key} className="rounded-lg border border-prism-line bg-prism-surface p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-bold">{r.label}</p>
                <p className="text-[11px] text-prism-muted2">{r.count} trade{r.count > 1 ? "s" : ""}</p>
              </div>
              <div className="text-right">
                <p className={`font-mono text-lg font-bold ${r.r < 0 ? "text-prism-loss" : "text-prism-win"}`}>{signedR(r.r)}</p>
                {r.pnl != null && <p className="font-mono text-[11px] text-prism-muted">{fmtMoney(r.pnl)}</p>}
              </div>
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-prism-muted">{r.key === "early" ? (en ? `${r.text} R left on the table.` : `${r.text} R laissés au marché.`) : r.text}</p>
          </div>
        ))}
      </div>
      {cap && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg border border-prism-line px-3 py-2.5 text-[11.5px]">
          <span className="text-prism-muted">{en ? "Exit efficiency" : "Efficacité de sortie"} <b className="ml-1 font-mono text-prism-text">{cap.efficiency.toFixed(0)}%</b></span>
          <span className="text-prism-muted">{en ? "R left on the table" : "R laissés au marché"} <b className="ml-1 font-mono text-prism-loss">{cap.leftR.toFixed(1)}R</b></span>
          {cap.avgMae != null && <span className="text-prism-muted">{en ? "Average MAE" : "MAE moyen"} <b className="ml-1 font-mono text-prism-text">{cap.avgMae.toFixed(2)}R</b></span>}
          <span className="text-prism-muted2">{en ? `on ${cap.n} trades with an MFE` : `sur ${cap.n} trades avec un MFE`}</span>
        </div>
      )}
    </div>
  );
}

// ---------- Comparateur ----------
function MiniCurve({ a, b }) {
  const W = 600, H = 120;
  const all = [...a, ...b];
  const lo = Math.min(0, ...all), hi = Math.max(0, ...all);
  const path = (c) => c.map((v, i) => `${i ? "L" : "M"}${((i / Math.max(1, c.length - 1)) * W).toFixed(1)},${(6 + (1 - (v - lo) / (hi - lo || 1)) * (H - 12)).toFixed(1)}`).join("");
  const zero = 6 + (1 - (0 - lo) / (hi - lo || 1)) * (H - 12);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" preserveAspectRatio="none">
      <line x1="0" x2={W} y1={zero} y2={zero} stroke="var(--prism-line2)" strokeDasharray="3 4" />
      <path d={path(a)} fill="none" stroke="var(--prism-win)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <path d={path(b)} fill="none" stroke="var(--prism-loss)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function ComparePanel({ trades, lang = "fr" }) {
  const en = lang === "en";
  const dims = useMemo(() => dimensions(lang), [lang]);
  const [dimId, setDimId] = useState("session");
  const dim = dims.find((d) => d.id === dimId) || dims[0];
  const groups = useMemo(() => groupValues(trades, dim), [trades, dim]);
  const [pick, setPick] = useState([null, null]);
  const a = groups.find((g) => g.key === pick[0]) || groups[0];
  const b = groups.find((g) => g.key === pick[1] && g.key !== a?.key) || groups.find((g) => g.key !== a?.key);
  const changeDim = (id) => { setDimId(id); setPick([null, null]); };
  if (groups.length < 2) {
    return (
      <div className="space-y-3">
        <DimSelect dims={dims} value={dimId} onChange={changeDim} />
        <p className="text-xs text-prism-muted">{en ? "At least two different values are needed for this criterion." : "Il faut au moins deux valeurs différentes pour ce critère."}</p>
      </div>
    );
  }
  const rows = [
    ["Trades", (s) => String(s.n)],
    ["Win rate", (s) => `${s.wr.toFixed(0)}%`],
    ["P&L", (s) => fmtMoney(s.net)],
    [en ? "Total R" : "R total", (s) => signedR(s.totalR)],
    [en ? "Average R" : "R moyen", (s) => signedR(s.avgR, 2)],
    ["Profit factor", (s) => (s.pf >= 99 ? "∞" : s.pf.toFixed(2))],
    [en ? "Max DD" : "Drawdown max", (s) => signedR(s.maxDDR)],
  ];
  const better = a.stats.avgR >= b.stats.avgR ? a : b;
  const worse = better === a ? b : a;
  const weak = Math.min(a.stats.n, b.stats.n) < 10;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <DimSelect dims={dims} value={dimId} onChange={changeDim} />
        <select value={a.key} onChange={(e) => setPick([e.target.value, pick[1]])} className="h-9 rounded-md border border-prism-line bg-prism-panel px-2.5 text-xs" style={{ color: "var(--prism-win)" }}>
          {groups.map((g) => <option key={g.key} value={g.key}>{g.key}</option>)}
        </select>
        <span className="text-xs text-prism-muted2">vs</span>
        <select value={b.key} onChange={(e) => setPick([a.key, e.target.value])} className="h-9 rounded-md border border-prism-line bg-prism-panel px-2.5 text-xs" style={{ color: "var(--prism-loss)" }}>
          {groups.filter((g) => g.key !== a.key).map((g) => <option key={g.key} value={g.key}>{g.key}</option>)}
        </select>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
        <div className="overflow-hidden rounded-lg border border-prism-line">
          <div className="grid grid-cols-[1.2fr_1fr_1fr] border-b border-prism-line bg-prism-surface px-3 py-2 text-[10px] font-bold tracking-[.1em]">
            <span className="text-prism-muted2">{dim.label.toUpperCase()}</span>
            <span className="truncate text-right" style={{ color: "var(--prism-win)" }}>{a.key}</span>
            <span className="truncate text-right" style={{ color: "var(--prism-loss)" }}>{b.key}</span>
          </div>
          {rows.map(([label, f]) => (
            <div key={label} className="grid grid-cols-[1.2fr_1fr_1fr] border-b border-prism-line px-3 py-1.5 text-[12px] last:border-0">
              <span className="text-prism-muted">{label}</span>
              <span className="text-right font-mono">{f(a.stats)}</span>
              <span className="text-right font-mono">{f(b.stats)}</span>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-prism-line bg-prism-surface p-3">
          <p className="mb-1 font-mono text-[10px] tracking-[.1em] text-prism-muted2">{en ? "CUMULATIVE R" : "R CUMULÉ"}</p>
          <MiniCurve a={a.stats.curve} b={b.stats.curve} />
          <p className="mt-2 text-[12px]">
            <b>{en ? "Keep" : "À garder"} : {better.key}</b>{" "}
            <span className="text-prism-muted">({signedR(better.stats.avgR, 2)} {en ? "per trade vs" : "par trade contre"} {signedR(worse.stats.avgR, 2)})</span>
          </p>
          {weak && <p className="mt-1 text-[11px] text-prism-muted2">{en ? "Fewer than 10 trades on one side: treat this as a hint, not a verdict." : "Moins de 10 trades d'un côté : c'est une piste, pas un verdict."}</p>}
        </div>
      </div>
    </div>
  );
}

function DimSelect({ dims, value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 rounded-md border border-prism-line bg-prism-panel px-2.5 text-xs font-semibold">
      {dims.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
    </select>
  );
}

// ---------- Questions au journal ----------
export function AskPanel({ trades, lang = "fr" }) {
  const en = lang === "en";
  const [q, setQ] = useState("");
  const [asked, setAsked] = useState(null);
  const ans = useMemo(() => (asked ? answerQuestion(asked, trades, lang) : null), [asked, trades, lang]);
  const ask = (text) => { setQ(text); setAsked(text); };
  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) setAsked(q.trim()); }} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-prism-muted2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={en ? "e.g. my win rate on Monday vs Friday?" : "ex. mon win rate le lundi vs le vendredi ?"} className="h-10 w-full rounded-md border border-prism-line bg-prism-panel pl-9 pr-3 text-sm outline-none focus:border-prism-accent" />
        </div>
        <button type="submit" className="inline-flex h-10 items-center gap-1.5 rounded-md bg-prism-accent px-4 text-xs font-extrabold text-prism-bg">{en ? "Ask" : "Calculer"}<ArrowRight className="h-3.5 w-3.5" /></button>
      </form>
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS[en ? "en" : "fr"].map((s) => (
          <button key={s} type="button" onClick={() => ask(s)} className="rounded-full border border-prism-line px-2.5 py-1 text-[11px] text-prism-muted hover:border-prism-line2 hover:text-prism-text">{s}</button>
        ))}
      </div>
      {ans && (
        <div className="rounded-lg border border-prism-line bg-prism-surface p-3">
          {ans.kind === "unknown" || ans.kind === "empty" ? (
            <p className="text-xs text-prism-muted">
              {ans.text || (en ? "I could not turn this into a calculation. Mention a criterion (day, session, setup, hour, instrument, plan, duration) and a measure (win rate, R, P&L), or ask PRISM IA for an open question." : "Je n'ai pas pu en faire un calcul. Cite un critère (jour, session, setup, heure, instrument, plan, durée) et une mesure (win rate, R, P&L), ou pose la question ouverte à PRISM IA.")}
            </p>
          ) : (
            <>
              <p className="mb-2 text-[11px] font-bold tracking-[.1em] text-prism-muted2">{ans.title.toUpperCase()}</p>
              <div className={`grid gap-2 ${ans.kind === "compare" ? "grid-cols-2" : "sm:grid-cols-3"}`}>
                {ans.rows.map((r) => (
                  <div key={r.label} className="rounded-md border border-prism-line bg-prism-panel px-3 py-2">
                    <p className="truncate text-[11px] text-prism-muted">{r.label}</p>
                    <p className={`font-mono text-xl font-bold ${r.tone === "loss" ? "text-prism-loss" : "text-prism-win"}`}>{r.value}</p>
                    <p className="text-[10.5px] text-prism-muted2">{r.sub}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10.5px] text-prism-muted2">{en ? `Calculated on your ${ans.basis} trades with the current filters. Nothing is estimated.` : `Calculé sur tes ${ans.basis} trades avec les filtres actuels. Rien n'est estimé.`}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
