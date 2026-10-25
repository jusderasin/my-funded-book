"use client";

// Equity Lab façon PROTOS : courbe Equity / Cumul R / Drawdown en 2D ou terrain 3D,
// panneau « trade inspecté », carte comportementale synchronisée, fenêtre glissante
// et détecteurs de robustesse. Couleurs via --prism-* (suit le thème de la page).

import { useMemo, useState } from "react";
import { detectors, robustness, stabilitySurface, windowStats, HORIZONS } from "@/lib/analytics";
import { fmtMoney, frDate } from "@/lib/format";

const WIN = "var(--prism-win, #22c55e)";
const LOSS = "var(--prism-loss, #ef4444)";
const TEXT = "var(--prism-text, #fff)";
const MUTED = "var(--prism-muted2, #71717a)";
const LINE = "var(--prism-line, rgba(255,255,255,.08))";

const signedR = (r) => `${r >= 0 ? "+" : ""}${r.toFixed(2)}R`;
const shortDate = (d) => { const [y, m, dd] = String(d || "").split("-"); return dd ? `${dd}/${m}/${y.slice(2)}` : ""; };

function Seg({ items, value, onChange }) {
  return (
    <div className="flex overflow-hidden rounded-md border border-prism-line">
      {items.map(([k, label]) => (
        <button key={k} type="button" onClick={() => onChange(k)} className={`h-8 px-3 text-[11px] font-semibold transition ${value === k ? "bg-prism-text text-prism-bg" : "text-prism-muted hover:text-prism-text"}`}>{label}</button>
      ))}
    </div>
  );
}

// ---------- Courbe 2D ----------
function Chart2D({ rows, metric, onInspect, inspected, en }) {
  const W = 900, H = 300, L = 62, R = 12, T = 14, B = 26;
  const val = (x) => (metric === "cumR" ? x.cumR : metric === "dd" ? x.dd : x.equity);
  const vals = rows.map(val);
  const lo = Math.min(...vals, metric === "dd" ? 0 : Infinity); const hi = Math.max(...vals, metric === "dd" ? 0 : -Infinity);
  const span = hi - lo || 1;
  const X = (i) => L + (i / Math.max(1, rows.length - 1)) * (W - L - R);
  const Y = (v) => T + (1 - (v - lo) / span) * (H - T - B);
  const path = rows.map((x, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(val(x)).toFixed(1)}`).join("");
  // Bande de drawdown en bas (comme PROTOS), en arrière-plan de la courbe d'équité.
  const ddLo = Math.min(-1, ...rows.map((x) => x.dd));
  const ddY = (v) => H - B - (v / ddLo) * (H - T - B) * 0.28;
  const ddPath = `M${X(0)},${H - B}` + rows.map((x, i) => `L${X(i).toFixed(1)},${ddY(x.dd).toFixed(1)}`).join("") + `L${X(rows.length - 1)},${H - B}Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((k) => lo + span * (1 - k));
  const fmt = (v) => (metric === "cumR" ? `${v >= 0 ? "+" : ""}${v.toFixed(1)}R` : fmtMoney(v));
  const dates = [0, 0.25, 0.5, 0.75, 1].map((k) => Math.round(k * (rows.length - 1)));
  const lineCol = metric === "dd" ? LOSS : "var(--lab-line, var(--prism-text, #fff))";
  const ins = inspected != null ? rows.findIndex((x) => x.i === inspected) : -1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full select-none"
      onMouseMove={(e) => { const b = e.currentTarget.getBoundingClientRect(); const px = ((e.clientX - b.left) / b.width) * W; const k = Math.round(((px - L) / (W - L - R)) * (rows.length - 1)); const row = rows[Math.max(0, Math.min(rows.length - 1, k))]; if (row) onInspect(row.i); }}>
      {/* phases de performance en fond */}
      {rows.map((x, i) => x.phase !== "WARMUP" && (
        <rect key={`p${i}`} x={X(i) - (W - L - R) / rows.length / 2} width={(W - L - R) / rows.length + 0.5} y={T} height={H - T - B} fill={x.phase === "EDGE +" ? WIN : x.phase === "EDGE −" ? LOSS : "transparent"} opacity="0.045" />
      ))}
      {ticks.map((v, k) => (
        <g key={k}>
          <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke={LINE} />
          <text x={L - 8} y={Y(v) + 3} textAnchor="end" fontSize="10" fill={MUTED} fontFamily="ui-monospace, monospace">{fmt(v)}</text>
        </g>
      ))}
      {dates.map((i) => <text key={`d${i}`} x={X(i)} y={H - 8} textAnchor="middle" fontSize="10" fill={MUTED} fontFamily="ui-monospace, monospace">{shortDate(rows[i]?.trade.date)}</text>)}
      {metric === "equity" && <path d={ddPath} fill={LOSS} opacity="0.22" />}
      {metric === "dd" && <path d={`${path}L${X(rows.length - 1)},${Y(0)}L${X(0)},${Y(0)}Z`} fill={LOSS} opacity="0.18" />}
      <path d={path} fill="none" stroke={lineCol} strokeWidth="1.6" strokeLinejoin="round" />
      {ins >= 0 && (
        <g>
          <line x1={X(ins)} x2={X(ins)} y1={T} y2={H - B} stroke={TEXT} strokeOpacity="0.35" strokeDasharray="3 3" />
          <circle cx={X(ins)} cy={Y(val(rows[ins]))} r="4" fill="var(--prism-bg, #000)" stroke={TEXT} strokeWidth="1.6" />
        </g>
      )}
      <g fontSize="10" fill={MUTED}>
        <line x1={L + 4} x2={L + 22} y1={T + 4} y2={T + 4} stroke={TEXT} strokeWidth="1.6" /><text x={L + 27} y={T + 7}>{metric === "cumR" ? (en ? "Cumulative R" : "R cumulé") : metric === "dd" ? "Drawdown" : (en ? "Net equity" : "Équité nette")}</text>
        {metric === "equity" && <><rect x={L + 120} y={T} width="14" height="8" fill={LOSS} opacity="0.5" /><text x={L + 139} y={T + 7}>Drawdown</text></>}
      </g>
    </svg>
  );
}

// ---------- Terrain 3D de stabilité ----------
function Terrain3D({ rows, en }) {
  const [tilt, setTilt] = useState(1);
  const surf = useMemo(() => stabilitySurface(rows), [rows]);
  if (!surf) return <div className="grid h-[300px] place-items-center text-xs text-prism-muted">{en ? "At least 6 trades needed." : "Il faut au moins 6 trades."}</div>;
  const { z, amp, xs } = surf;
  const cols = xs.length; const nr = z.length;
  const dxC = 640 / Math.max(1, cols - 1) * 0.92, dyC = 2.2 * tilt, dxR = -46, dyR = 34 * tilt, Hh = 90;
  const ox = 230, oy = 70;
  const P = (c, r, v) => [ox + c * dxC + r * dxR, oy + c * dyC + r * dyR - (v / amp) * Hh];
  const quads = [];
  for (let r = 0; r < nr - 1; r++) for (let c = 0; c < cols - 1; c++) {
    const v = (z[r][c] + z[r][c + 1] + z[r + 1][c] + z[r + 1][c + 1]) / 4;
    quads.push({ r, c, v, pts: [P(c, r, z[r][c]), P(c + 1, r, z[r][c + 1]), P(c + 1, r + 1, z[r + 1][c + 1]), P(c, r + 1, z[r + 1][c])] });
  }
  const pts = (a) => a.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" ");
  const base = (c, r) => P(c, r, 0);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between font-mono text-[10px] text-prism-muted2">
        <span>{en ? "Stability terrain · rolling expectancy over 5 / 10 / 20 / 40 trades" : "Terrain de stabilité · espérance glissante sur 5 / 10 / 20 / 40 trades"} · ±{amp.toFixed(1)}R</span>
        <label className="flex items-center gap-2">{en ? "TILT" : "INCLINAISON"}<input type="range" min="0.5" max="1.6" step="0.05" value={tilt} onChange={(e) => setTilt(Number(e.target.value))} className="w-20 accent-[var(--prism-text)]" /></label>
      </div>
      <svg viewBox="0 0 900 300" className="h-auto w-full">
        {/* plan zéro */}
        <polygon points={pts([base(0, 0), base(cols - 1, 0), base(cols - 1, nr - 1), base(0, nr - 1)])} fill="none" stroke={LINE} />
        {Array.from({ length: cols }, (_, c) => c % 4 === 0 && <line key={`g${c}`} x1={base(c, 0)[0]} y1={base(c, 0)[1]} x2={base(c, nr - 1)[0]} y2={base(c, nr - 1)[1]} stroke={LINE} />)}
        {quads.map((q) => (
          <polygon key={`${q.r}-${q.c}`} points={pts(q.pts)} fill={q.v >= 0 ? WIN : LOSS} fillOpacity={0.18 + Math.min(1, Math.abs(q.v) / amp) * 0.6} stroke={TEXT} strokeOpacity="0.18" strokeWidth="0.6" />
        ))}
        {HORIZONS.map((h, r) => { const [x, y] = base(0, r); return <text key={h} x={x - 30} y={y + 14} textAnchor="end" fontSize="10" fill={MUTED} fontFamily="ui-monospace, monospace">{h} tr.</text>; })}
        {[0, Math.floor((cols - 1) / 2), cols - 1].map((c) => { const [x, y] = base(c, nr - 1); return <text key={`x${c}`} x={x} y={y + 18} textAnchor="middle" fontSize="10" fill={MUTED} fontFamily="ui-monospace, monospace">#{xs[c] + 1}</text>; })}
      </svg>
    </div>
  );
}

// ---------- Carte comportementale synchronisée ----------
function BehaviourMap({ rows, inspected, onInspect, en }) {
  const maxP = Math.max(1, ...rows.map((x) => Math.abs(x.pnl)));
  const maxR = Math.max(1, ...rows.map((x) => Math.abs(x.r)));
  const durs = rows.map((x) => x.dur).filter((d) => d != null); const maxD = Math.max(1, ...durs);
  const maxDD = Math.max(1, ...rows.map((x) => -x.dd));
  const lanes = [
    [en ? "P&L TRADE" : "P&L TRADE", (x) => [x.pnl >= 0 ? WIN : LOSS, Math.abs(x.pnl) / maxP]],
    ["R", (x) => [x.r >= 0 ? WIN : LOSS, Math.abs(x.r) / maxR]],
    [en ? "DURATION" : "DURÉE", (x) => (x.dur == null ? ["transparent", 0] : [TEXT, x.dur / maxD])],
    [en ? "PLAN" : "PLAN", (x) => [x.plan ? TEXT : LOSS, x.plan ? 0.55 : 0.75]],
    ["DRAWDOWN", (x) => [LOSS, -x.dd / maxDD]],
  ];
  const n = rows.length; const W = 1000; const lh = 16;
  return (
    <div className="grid grid-cols-[92px_1fr] items-center gap-x-2 gap-y-[3px]">
      {lanes.map(([label, f]) => (
        <div key={label} className="contents">
          <span className="font-mono text-[9.5px] tracking-[.08em] text-prism-muted2">{label}</span>
          <svg viewBox={`0 0 ${W} ${lh}`} preserveAspectRatio="none" className="h-4 w-full" onMouseMove={(e) => { const b = e.currentTarget.getBoundingClientRect(); const k = Math.floor(((e.clientX - b.left) / b.width) * n); if (rows[k]) onInspect(rows[k].i); }}>
            <rect width={W} height={lh} fill={LINE} />
            {rows.map((x, k) => { const [col, a] = f(x); return <rect key={k} x={(k / n) * W} width={W / n + 0.6} height={lh} fill={col} opacity={col === "transparent" ? 0 : 0.12 + a * 0.85} />; })}
            {inspected != null && rows.findIndex((x) => x.i === inspected) >= 0 && <rect x={(rows.findIndex((x) => x.i === inspected) / n) * W} width={Math.max(2, W / n)} height={lh} fill="none" stroke={TEXT} strokeWidth="2" />}
          </svg>
        </div>
      ))}
    </div>
  );
}

// ---------- Vue globale avec fenêtre ----------
function Overview({ all, win, setWin, en }) {
  const W = 1000, H = 44;
  const vals = all.map((x) => x.cum); const lo = Math.min(0, ...vals); const hi = Math.max(0, ...vals);
  const X = (i) => (i / Math.max(1, all.length - 1)) * W;
  const Y = (v) => 4 + (1 - (v - lo) / (hi - lo || 1)) * (H - 8);
  const d = all.map((x, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(x.cum).toFixed(1)}`).join("");
  const max = all.length - 1;
  return (
    <div>
      <p className="mb-1 font-mono text-[9.5px] tracking-[.08em] text-prism-muted2">{en ? "OVERVIEW · DRAG THE WINDOW" : "VUE GLOBALE · GLISSE LA FENÊTRE"}</p>
      <div className="relative rounded border border-prism-line">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-11 w-full">
          <rect x={X(win[0])} width={Math.max(2, X(win[1]) - X(win[0]))} height={H} fill={TEXT} opacity="0.07" />
          <path d={d} fill="none" stroke={TEXT} strokeOpacity="0.7" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        </svg>
        <input type="range" min="0" max={max} value={win[0]} onChange={(e) => setWin([Math.min(Number(e.target.value), win[1] - 1), win[1]])} className="lab-range absolute inset-0 w-full" aria-label="start" />
        <input type="range" min="0" max={max} value={win[1]} onChange={(e) => setWin([win[0], Math.max(Number(e.target.value), win[0] + 1)])} className="lab-range absolute inset-0 w-full" aria-label="end" />
      </div>
      <style>{`
        .lab-range { -webkit-appearance: none; appearance: none; background: transparent; pointer-events: none; height: 100%; margin: 0; }
        .lab-range::-webkit-slider-thumb { -webkit-appearance: none; pointer-events: auto; width: 10px; height: 44px; background: var(--prism-text, #fff); opacity: .8; border-radius: 2px; cursor: ew-resize; }
        .lab-range::-moz-range-thumb { pointer-events: auto; width: 10px; height: 44px; background: var(--prism-text, #fff); opacity: .8; border: 0; border-radius: 2px; cursor: ew-resize; }
      `}</style>
    </div>
  );
}

function Row({ k, v, tone }) {
  return <div className="flex items-center justify-between py-1 text-[11.5px]"><span className="text-prism-muted">{k}</span><span className={`font-mono font-semibold ${tone === "win" ? "text-prism-win" : tone === "loss" ? "text-prism-loss" : "text-prism-text"}`}>{v}</span></div>;
}

function Bar({ label, value, pct, tone }) {
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[11px]"><span className="text-prism-muted">{label}</span><span className="font-mono">{value}</span></div>
      <div className="mt-1 h-1 rounded bg-prism-line2"><div className="h-full rounded" style={{ width: `${Math.max(2, Math.min(100, pct))}%`, background: tone === "loss" ? LOSS : tone === "win" ? WIN : TEXT }} /></div>
    </div>
  );
}

export default function EquityLab({ rows, lang = "fr" }) {
  const en = lang === "en";
  const [metric, setMetric] = useState("equity");
  const [view, setView] = useState("2d");
  const [win, setWin] = useState([0, Math.max(1, rows.length - 1)]);
  const [inspected, setInspected] = useState(null);
  const safeWin = [Math.min(win[0], Math.max(0, rows.length - 2)), Math.min(Math.max(win[1], 1), rows.length - 1)];
  const visible = useMemo(() => rows.slice(safeWin[0], safeWin[1] + 1), [rows, safeWin[0], safeWin[1]]);
  const ws = useMemo(() => windowStats(visible), [visible]);
  const dets = useMemo(() => detectors(rows, lang), [rows, lang]);
  const score = robustness(dets);
  const cur = rows.find((x) => x.i === inspected) || rows[rows.length - 1];
  const tr = cur?.trade || {};
  const maxAbsR = Math.max(1, ...rows.map((x) => Math.abs(x.r)));

  if (rows.length < 2) return <div className="grid h-48 place-items-center text-xs text-prism-muted">{en ? "Log at least two trades." : "Logue au moins deux trades."}</div>;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Seg items={[["equity", "Equity"], ["cumR", en ? "Cumul R" : "Cumul R"], ["dd", "Drawdown"]]} value={metric} onChange={setMetric} />
          <Seg items={[["2d", "2D"], ["3d", en ? "Terrain 3D" : "Terrain 3D"]]} value={view} onChange={setView} />
          <span className="ml-auto font-mono text-[10.5px] text-prism-muted2">{frDate(visible[0]?.trade.date)} → {frDate(visible[visible.length - 1]?.trade.date)}</span>
          <button type="button" onClick={() => setWin([0, rows.length - 1])} className="h-8 rounded-md border border-prism-line px-2.5 text-[11px] text-prism-muted hover:text-prism-text">↺</button>
        </div>
        <div className="rounded-lg border border-prism-line bg-prism-surface p-2" onMouseLeave={() => setInspected(null)}>
          {view === "2d" ? <Chart2D rows={visible} metric={metric} inspected={inspected} onInspect={setInspected} en={en} /> : <Terrain3D rows={visible} en={en} />}
        </div>
        <div className="rounded-lg border border-prism-line bg-prism-surface p-3" onMouseLeave={() => setInspected(null)}>
          <p className="mb-2 flex flex-wrap items-center gap-3 font-mono text-[10px] tracking-[.1em] text-prism-muted">
            {en ? "SYNCHRONISED BEHAVIOUR MAP" : "CARTE COMPORTEMENTALE SYNCHRONISÉE"}
            <span className="inline-flex items-center gap-1"><i className="inline-block h-2 w-3" style={{ background: LOSS }} />{en ? "loss" : "perte"}</span>
            <span className="inline-flex items-center gap-1"><i className="inline-block h-2 w-3" style={{ background: WIN }} />{en ? "gain" : "gain"}</span>
          </p>
          <BehaviourMap rows={visible} inspected={inspected} onInspect={setInspected} en={en} />
          <div className="mt-3"><Overview all={rows} win={safeWin} setWin={setWin} en={en} /></div>
          <p className="mt-2 text-[10.5px] text-prism-muted2">{en ? "Each column = one trade · brighter = bigger · hover to inspect." : "Chaque colonne = un trade · plus vif = plus gros · survole pour inspecter."}</p>
        </div>
      </div>

      <aside className="space-y-3 text-prism-text">
        <div className="rounded-lg border border-prism-line p-3">
          <p className="font-mono text-[10px] tracking-[.12em] text-prism-muted2">{en ? "ROBUSTNESS DIAGNOSTIC" : "DIAGNOSTIC ROBUSTESSE"}</p>
          <div className="mt-2 flex items-center gap-3">
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded border font-mono text-lg font-bold ${score >= 70 ? "border-prism-win text-prism-win" : score >= 45 ? "border-prism-text text-prism-text" : "border-prism-loss text-prism-loss"}`}>{score}</span>
            <div>
              <p className="text-xs font-bold">{score >= 70 ? (en ? "SOLID EDGE" : "EDGE SOLIDE") : score >= 45 ? (en ? "EDGE TO CONFIRM" : "EDGE À CONFIRMER") : (en ? "FRAGILE" : "FRAGILE")}</p>
              <p className="text-[10.5px] text-prism-muted">{en ? "Built from the detectors below." : "Calculé à partir des détecteurs ci-dessous."}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-prism-line p-3">
          <div className="flex items-center justify-between font-mono text-[10px] tracking-[.12em] text-prism-muted2"><span>{en ? "INSPECTED TRADE" : "TRADE INSPECTÉ"}</span><span>#{cur.i + 1} / {rows.length}</span></div>
          <p className={`mt-1.5 font-mono text-xl font-bold ${cur.pnl >= 0 ? "text-prism-win" : "text-prism-loss"}`}>{signedR(cur.r)} · {fmtMoney(cur.pnl)}</p>
          <p className="font-mono text-[10.5px] text-prism-muted2">{frDate(tr.date)}{tr.execution?.entry_time ? ` ${String(tr.execution.entry_time).slice(0, 5)}` : ""}{tr.execution?.exit_time ? ` → ${String(tr.execution.exit_time).slice(0, 5)}` : ""} · {tr.symbol}</p>
          <div className="mt-2 divide-y divide-prism-line">
            <Row k="Direction" v={String(tr.dir || "—").toUpperCase()} />
            <Row k="Setup" v={tr.setup || "—"} />
            <Row k={en ? "Equity after trade" : "Équité après trade"} v={fmtMoney(cur.equity)} />
            <Row k={en ? "Current drawdown" : "Drawdown courant"} v={fmtMoney(cur.dd)} tone={cur.dd < 0 ? "loss" : undefined} />
            <Row k={en ? "Duration" : "Durée"} v={cur.dur != null ? `${cur.dur} min` : "—"} />
            <Row k="Phase" v={cur.phase} tone={cur.phase === "EDGE +" ? "win" : cur.phase === "EDGE −" ? "loss" : undefined} />
          </div>
          <Bar label={en ? "Size of the result" : "Taille du résultat"} value={signedR(cur.r)} pct={(Math.abs(cur.r) / maxAbsR) * 100} tone={cur.r >= 0 ? "win" : "loss"} />
          <Bar label={en ? "Rolling expectancy (20)" : "Espérance glissante (20)"} value={signedR(cur.rollExp)} pct={(Math.abs(cur.rollExp) / maxAbsR) * 100} tone={cur.rollExp >= 0 ? "win" : "loss"} />
          {tr.execution?.mae_r != null && tr.execution.mae_r !== "" && <Bar label={en ? "MAE · risk taken" : "MAE · risque subi"} value={`${Number(tr.execution.mae_r).toFixed(2)}R`} pct={(Number(tr.execution.mae_r) / maxAbsR) * 100} tone="loss" />}
          {Number(tr.execution?.mfe_r) > 0 && <Bar label={en ? "MFE · potential reached" : "MFE · potentiel atteint"} value={`${Number(tr.execution.mfe_r).toFixed(2)}R`} pct={(Number(tr.execution.mfe_r) / maxAbsR) * 100} tone="win" />}
          {Number(tr.execution?.mfe_r) > 0 && cur.r > 0 && <Bar label={en ? "Exit efficiency" : "Efficacité de sortie"} value={`${Math.round((cur.r / Number(tr.execution.mfe_r)) * 100)}%`} pct={(cur.r / Number(tr.execution.mfe_r)) * 100} />}
          {Number(tr.execution?.mfe_r) > 0 && <p className="mt-2 text-[11px] text-prism-muted">{en ? `Exited at ${signedR(cur.r)}, price offered +${Number(tr.execution.mfe_r).toFixed(2)}R.` : `Sorti à ${signedR(cur.r)}, le prix a offert +${Number(tr.execution.mfe_r).toFixed(2)}R.`}</p>}
          <Row k={en ? "Plan respected" : "Plan respecté"} v={cur.plan ? (en ? "YES" : "OUI") : (en ? "NO" : "NON")} tone={cur.plan ? undefined : "loss"} />
        </div>

        <div className="rounded-lg border border-prism-line p-3">
          <div className="flex items-center justify-between font-mono text-[10px] tracking-[.12em] text-prism-muted2"><span>{en ? "VISIBLE PERIOD" : "PÉRIODE VISIBLE"}</span><span>{ws.n} trades</span></div>
          <div className="mt-2 grid grid-cols-2 gap-px overflow-hidden rounded border border-prism-line bg-prism-line">
            {[["P&L", fmtMoney(ws.pnl), ws.pnl >= 0 ? "win" : "loss"], ["EXPECTANCY", signedR(ws.exp), ws.exp >= 0 ? "win" : "loss"], ["WIN RATE", `${ws.wr.toFixed(1)}%`], ["MAX DD", fmtMoney(ws.maxDD), "loss"]].map(([k, v, tone]) => (
              <div key={k} className="bg-prism-bg p-2"><p className="text-[9px] tracking-[.1em] text-prism-muted2">{k}</p><p className={`mt-0.5 font-mono text-sm font-bold ${tone === "win" ? "text-prism-win" : tone === "loss" ? "text-prism-loss" : ""}`}>{v}</p></div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-prism-line p-3">
          <p className="font-mono text-[10px] tracking-[.12em] text-prism-muted2">{en ? "ANTI-OVERFIT DETECTORS" : "DÉTECTEURS ANTI-OVERFIT"}</p>
          <div className="mt-2 space-y-2.5">
            {dets.map((d) => (
              <div key={d.key} className={`border-l-2 pl-2.5 ${d.level === "ok" ? "border-prism-win" : d.level === "warn" ? "border-prism-text" : "border-prism-loss"}`}>
                <div className="flex justify-between gap-2 text-[11.5px] font-semibold"><span>{d.label}</span><span className="font-mono text-prism-muted">{d.value}</span></div>
                <p className="text-[10.5px] leading-snug text-prism-muted">{d.text}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
