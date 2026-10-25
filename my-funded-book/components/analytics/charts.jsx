"use client";

// Graphiques de la page Analyse avancée : rendu SVG, thème sombre néon.
// Les couleurs suivent --prism-win / --prism-loss / --prism-accent (AccentPicker).

import { useState } from "react";
import { fmtMoney } from "@/lib/format";

const WIN = "var(--prism-win, #22c55e)";
const LOSS = "var(--prism-loss, #ef4444)";
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
  const H = 110; // hauteur max d'une barre
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
          return <polygon key={`f${r}-${c}`} points={face([p0, p1, p2, p3])} fill="var(--prism-line)" fillOpacity="0.25" stroke="var(--prism-line2)" strokeWidth="0.6" />;
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
