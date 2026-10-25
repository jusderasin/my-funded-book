"use client";

// Graphiques de la page Analyse avancée : rendu SVG, thème sombre néon.
// Les couleurs suivent --prism-win / --prism-loss / --prism-accent (AccentPicker).

import { useMemo, useState } from "react";
import { fmtK, fmtMoney, frDate } from "@/lib/format";

const WIN = "var(--prism-win, #22c55e)";
const LOSS = "var(--prism-loss, #ef4444)";
const ACCENT = "var(--prism-accent, #3b82f6)";
const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Readout({ children }) {
  return <div className="pointer-events-none mt-2 h-5 truncate font-mono text-[11px] text-prism-muted">{children}</div>;
}

// ---------- Heatmap 3D isométrique : jour × heure, hauteur = |P&L| ----------
export function Heat3D({ grid, lang = "fr" }) {
  const [hover, setHover] = useState(null);
  const [tilt, setTilt] = useState(0.5);
  const { cells, days, hours, maxAbs } = grid;
  const labels = lang === "en" ? DAYS_EN : DAYS_FR;
  const a = 22; // demi-largeur d'une tuile
  const b = a * tilt; // demi-hauteur (inclinaison)
  const H = 120; // hauteur max d'une barre
  const cols = hours.length; const rows = days.length;
  const ox = rows * a + 56; const oy = H + 30;
  const W = (cols + rows) * a + 96; const VH = oy + (cols + rows) * b + 40;
  const iso = (c, r) => [ox + (c - r) * a, oy + (c + r) * b];

  const bars = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) bars.push({ r, c, cell: cells[`${days[r]}-${hours[c]}`] });
  bars.sort((p, q) => p.r + p.c - (q.r + q.c));

  const face = (pts) => pts.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" ");
  return (
    <div>
      <div className="mb-2 flex items-center justify-end gap-2 font-mono text-[10px] text-prism-muted2">
        <span>{lang === "en" ? "TILT" : "INCLINAISON"}</span>
        <input type="range" min="0.3" max="0.75" step="0.01" value={tilt} onChange={(e) => setTilt(Number(e.target.value))} className="w-24 accent-[var(--prism-accent)]" aria-label="tilt" />
      </div>
      <svg viewBox={`0 0 ${W} ${VH}`} className="h-auto w-full" onMouseLeave={() => setHover(null)}>
        <defs>
          <filter id="h3glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {/* sol */}
        {bars.map(({ r, c }) => {
          const p0 = iso(c, r), p1 = iso(c + 1, r), p2 = iso(c + 1, r + 1), p3 = iso(c, r + 1);
          return <polygon key={`f${r}-${c}`} points={face([p0, p1, p2, p3])} fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.6" />;
        })}
        {/* barres */}
        {bars.map(({ r, c, cell }) => {
          if (!cell) return null;
          const h = Math.max(3, (Math.abs(cell.pnl) / maxAbs) * H);
          const col = cell.pnl >= 0 ? WIN : LOSS;
          const k = 0.18; // marge dans la tuile
          const p0 = iso(c + k, r + k), p1 = iso(c + 1 - k, r + k), p2 = iso(c + 1 - k, r + 1 - k), p3 = iso(c + k, r + 1 - k);
          const up = (p) => [p[0], p[1] - h];
          const isHover = hover && hover.r === r && hover.c === c;
          return (
            <g key={`b${r}-${c}`} onMouseEnter={() => setHover({ r, c, cell })} onClick={() => setHover({ r, c, cell })} style={{ cursor: "pointer" }} opacity={hover && !isHover ? 0.55 : 1}>
              <polygon points={face([p3, p2, up(p2), up(p3)])} fill={col} opacity="0.55" />
              <polygon points={face([p1, p2, up(p2), up(p1)])} fill={col} opacity="0.35" />
              <polygon points={face([up(p0), up(p1), up(p2), up(p3)])} fill={col} opacity="0.95" filter={isHover ? "url(#h3glow)" : undefined} />
            </g>
          );
        })}
        {/* étiquettes */}
        {days.map((d, r) => { const [x, y] = iso(0, r + 0.5); return <text key={`d${d}`} x={x - 10} y={y + 3} textAnchor="end" fontSize="10" fontWeight="600" fill="var(--prism-muted, #a1a1aa)">{labels[d]}</text>; })}
        {hours.map((h, c) => { const [x, y] = iso(c + 0.5, rows); return <text key={`h${h}`} x={x + 4} y={y + 12} fontSize="8.5" fill="var(--prism-muted2, #71717a)">{String(h).padStart(2, "0")}h</text>; })}
      </svg>
      <Readout>
        {hover ? `${labels[days[hover.r]]} ${String(hours[hover.c]).padStart(2, "0")}h · ${hover.cell.n} trade${hover.cell.n > 1 ? "s" : ""} · ${fmtMoney(hover.cell.pnl)}` : lang === "en" ? "Hover a bar · height = size of the P&L" : "Survole une barre · hauteur = taille du P&L"}
      </Readout>
    </div>
  );
}

// ---------- Delta : une barre par trade + équité cumulée ----------
export function DeltaBars({ series, lang = "fr", height = 220 }) {
  const [hi, setHi] = useState(null);
  const W = 800; const pad = 34;
  const n = series.length;
  const maxBar = Math.max(1, ...series.map((p) => Math.abs(p.pnl)));
  const cums = series.map((p) => p.cum);
  const cMin = Math.min(0, ...cums); const cMax = Math.max(0, ...cums);
  const mid = height / 2;
  const bw = (W - pad * 2) / Math.max(1, n);
  const x = (i) => pad + i * bw + bw / 2;
  const yc = (v) => 12 + (1 - (v - cMin) / Math.max(1, cMax - cMin)) * (height - 24);
  const line = series.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${yc(p.cum).toFixed(1)}`).join("");
  const p = hi != null ? series[hi] : null;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" onMouseLeave={() => setHi(null)}>
        <defs>
          <linearGradient id="cumfill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={ACCENT} stopOpacity="0.25" /><stop offset="1" stopColor={ACCENT} stopOpacity="0" /></linearGradient>
        </defs>
        <line x1={pad} x2={W - pad} y1={mid} y2={mid} stroke="rgba(255,255,255,0.12)" strokeDasharray="3 4" />
        {series.map((s, i) => {
          const h = (Math.abs(s.pnl) / maxBar) * (mid - 10);
          return <rect key={s.id || i} x={x(i) - Math.max(1, bw * 0.32)} width={Math.max(2, bw * 0.64)} y={s.pnl >= 0 ? mid - h : mid} height={Math.max(1, h)} rx="1" fill={s.pnl >= 0 ? WIN : LOSS} opacity={hi == null || hi === i ? 0.9 : 0.35} />;
        })}
        {n > 1 && <path d={`${line}L${x(n - 1).toFixed(1)},${height}L${x(0).toFixed(1)},${height}Z`} fill="url(#cumfill)" />}
        {n > 1 && <path d={line} fill="none" stroke={ACCENT} strokeWidth="2" style={{ filter: "drop-shadow(0 0 6px var(--prism-accent, #3b82f6))" }} />}
        {series.map((s, i) => <rect key={`z${i}`} x={x(i) - bw / 2} width={bw} y="0" height={height} fill="transparent" onMouseEnter={() => setHi(i)} onClick={() => setHi(i)} />)}
        {p && <line x1={x(hi)} x2={x(hi)} y1="0" y2={height} stroke="rgba(255,255,255,0.25)" />}
      </svg>
      <Readout>
        {p ? `#${hi + 1} · ${frDate(p.date)} · ${p.symbol || ""} · ${fmtMoney(p.pnl)} · ${lang === "en" ? "cumulative" : "cumul"} ${fmtMoney(p.cum)}` : lang === "en" ? "Bars = each trade · line = cumulative P&L" : "Barres = chaque trade · ligne = P&L cumulé"}
      </Readout>
    </div>
  );
}

// ---------- Distribution des R (cloche) ----------
export function RDistribution({ dist, lang = "fr", height = 200 }) {
  const [hi, setHi] = useState(null);
  const { bins, mean, sd, n } = dist;
  const W = 640; const pad = 26;
  const maxN = Math.max(1, ...bins.map((b) => b.n));
  const bw = (W - pad * 2) / bins.length;
  const xr = (r) => pad + ((r + 3) / 8) * (W - pad * 2);
  const base = height - 22;
  // Courbe normale ajustée (même aire que l'histogramme).
  const curve = useMemo(() => {
    if (!sd || n < 3) return "";
    let d = "";
    for (let i = 0; i <= 80; i++) {
      const r = -3 + (i / 80) * 8;
      const dens = (1 / (sd * Math.sqrt(2 * Math.PI))) * Math.exp(-((r - mean) ** 2) / (2 * sd * sd));
      const y = base - ((dens * n * 0.5) / maxN) * (base - 12);
      d += `${i ? "L" : "M"}${xr(r).toFixed(1)},${Math.max(4, y).toFixed(1)}`;
    }
    return d;
  }, [sd, n, mean, maxN, base]);
  const b = hi != null ? bins[hi] : null;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" onMouseLeave={() => setHi(null)}>
        {bins.map((bin, i) => {
          const h = (bin.n / maxN) * (base - 12);
          return <rect key={i} x={pad + i * bw + 1.5} width={bw - 3} y={base - h} height={h} rx="2" fill={bin.from >= 0 ? WIN : LOSS} opacity={hi == null || hi === i ? 0.85 : 0.35} onMouseEnter={() => setHi(i)} onClick={() => setHi(i)} />;
        })}
        {curve && <path d={curve} fill="none" stroke={ACCENT} strokeWidth="1.8" strokeDasharray="1 0" style={{ filter: "drop-shadow(0 0 5px var(--prism-accent, #3b82f6))" }} />}
        <line x1={xr(0)} x2={xr(0)} y1="6" y2={base} stroke="rgba(255,255,255,0.2)" />
        {n > 0 && <g><line x1={xr(mean)} x2={xr(mean)} y1="6" y2={base} stroke={ACCENT} strokeDasharray="4 3" /><text x={xr(mean) + 4} y="14" fontSize="10" fill={ACCENT} fontFamily="monospace">E = {mean >= 0 ? "+" : ""}{mean.toFixed(2)}R</text></g>}
        {[-3, -2, -1, 0, 1, 2, 3, 4, 5].map((r) => <text key={r} x={xr(r)} y={height - 6} textAnchor="middle" fontSize="9" fill="var(--prism-muted2, #71717a)">{r > 0 ? `+${r}` : r}R</text>)}
      </svg>
      <Readout>{b ? `${b.from >= 0 ? "+" : ""}${b.from}R → ${b.to >= 0 ? "+" : ""}${b.to}R · ${b.n} trade${b.n > 1 ? "s" : ""}` : lang === "en" ? "Dashed line = expectancy per trade" : "Ligne pointillée = espérance par trade"}</Readout>
    </div>
  );
}

// ---------- Équité + drawdown sous l'eau, avec limite du compte ----------
export function DrawdownChart({ curve, limit, lang = "fr", height = 240 }) {
  const [hi, setHi] = useState(null);
  const pts = curve.points;
  const W = 800; const pad = 40;
  const eqH = height * 0.58; const ddTop = eqH + 14; const ddH = height - ddTop - 6;
  const eqs = pts.map((p) => p.eq);
  const eMin = Math.min(...eqs); const eMax = Math.max(...eqs);
  const ddMin = Math.min(-1, ...pts.map((p) => p.dd), limit ? -limit * 1.08 : 0);
  const x = (i) => pad + (i / Math.max(1, pts.length - 1)) * (W - pad * 2);
  const ye = (v) => 8 + (1 - (v - eMin) / Math.max(1, eMax - eMin)) * (eqH - 16);
  const yd = (v) => ddTop + (v / ddMin) * ddH;
  const eqLine = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${ye(p.eq).toFixed(1)}`).join("");
  const ddArea = `M${x(0)},${ddTop}` + pts.map((p, i) => `L${x(i).toFixed(1)},${yd(p.dd).toFixed(1)}`).join("") + `L${x(pts.length - 1)},${ddTop}Z`;
  const p = hi != null ? pts[hi] : null;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" onMouseLeave={() => setHi(null)}
        onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const i = Math.round(((e.clientX - r.left) / r.width * W - pad) / (W - pad * 2) * (pts.length - 1)); setHi(Math.max(0, Math.min(pts.length - 1, i))); }}>
        <defs>
          <linearGradient id="ddfill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={LOSS} stopOpacity="0.15" /><stop offset="1" stopColor={LOSS} stopOpacity="0.55" /></linearGradient>
        </defs>
        <path d={eqLine} fill="none" stroke={WIN} strokeWidth="2" style={{ filter: "drop-shadow(0 0 6px var(--prism-win, #22c55e))" }} />
        <line x1={pad} x2={W - pad} y1={ddTop} y2={ddTop} stroke="rgba(255,255,255,0.12)" />
        <path d={ddArea} fill="url(#ddfill)" stroke={LOSS} strokeWidth="1" />
        {limit ? <g><line x1={pad} x2={W - pad} y1={yd(-limit)} y2={yd(-limit)} stroke={LOSS} strokeWidth="1.5" strokeDasharray="6 4" /><text x={W - pad} y={yd(-limit) - 4} textAnchor="end" fontSize="10" fill={LOSS} fontFamily="monospace">{lang === "en" ? "MAX DD LIMIT" : "LIMITE MAX DD"} −{fmtK(limit)}</text></g> : null}
        <text x={pad - 6} y={ddTop + 10} textAnchor="end" fontSize="9" fill="var(--prism-muted2, #71717a)">DD</text>
        {p && <g><line x1={x(hi)} x2={x(hi)} y1="0" y2={height} stroke="rgba(255,255,255,0.25)" /><circle cx={x(hi)} cy={ye(p.eq)} r="3.5" fill={WIN} /><circle cx={x(hi)} cy={yd(p.dd)} r="3" fill={LOSS} /></g>}
      </svg>
      <Readout>{p ? `${frDate(p.date)} · ${lang === "en" ? "equity" : "équité"} ${fmtMoney(p.eq)} · DD ${fmtMoney(p.dd)}` : `${lang === "en" ? "Max drawdown" : "Drawdown max"} ${fmtMoney(-curve.maxDD)}`}</Readout>
    </div>
  );
}

// ---------- Nuage durée × R ----------
export function DurationScatter({ points, lang = "fr", height = 220 }) {
  const [hi, setHi] = useState(null);
  const W = 640; const pad = 34;
  const maxMin = Math.max(5, ...points.map((p) => p.min));
  const rMin = Math.min(-1, ...points.map((p) => p.r)); const rMax = Math.max(1, ...points.map((p) => p.r));
  const x = (m) => pad + (Math.log1p(m) / Math.log1p(maxMin)) * (W - pad * 2);
  const y = (r) => 10 + (1 - (r - rMin) / (rMax - rMin)) * (height - 34);
  const p = hi != null ? points[hi] : null;
  const ticks = [1, 5, 15, 30, 60, 120, 240].filter((m) => m <= maxMin);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" onMouseLeave={() => setHi(null)}>
        <line x1={pad} x2={W - pad} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 4" />
        {ticks.map((m) => <text key={m} x={x(m)} y={height - 6} textAnchor="middle" fontSize="9" fill="var(--prism-muted2, #71717a)">{m >= 60 ? `${m / 60}h` : `${m}m`}</text>)}
        {points.map((pt, i) => (
          <circle key={pt.id || i} cx={x(pt.min)} cy={y(pt.r)} r={hi === i ? 6 : 4} fill={pt.r >= 0 ? WIN : LOSS} fillOpacity={hi == null || hi === i ? 0.75 : 0.3} stroke={pt.r >= 0 ? WIN : LOSS} strokeWidth="1" onMouseEnter={() => setHi(i)} onClick={() => setHi(i)} style={{ cursor: "pointer" }} />
        ))}
      </svg>
      <Readout>{p ? `${frDate(p.date)} · ${p.symbol || ""} · ${p.min} min · ${p.r >= 0 ? "+" : ""}${p.r.toFixed(2)}R · ${fmtMoney(p.pnl)}` : lang === "en" ? "Each dot = a trade · x = time in trade (log) · y = R" : "Chaque point = un trade · x = durée (log) · y = R"}</Readout>
    </div>
  );
}
