"use client";

// Compass Score : note globale 0-100 et six sous-scores en barres 3D isométriques.
// Couleurs via --prism-* (suit le thème de la page).

import { useMemo, useState } from "react";
import { compassScore } from "@/lib/analytics";

const ACCENT = "var(--prism-accent, #c6f432)";
const WIN = "var(--prism-win, #22c55e)";
const LOSS = "var(--prism-loss, #ef4444)";
const MUTED = "var(--prism-muted2, #71717a)";
const LINE = "var(--prism-line, rgba(255,255,255,.08))";

const tone = (s) => (s >= 70 ? WIN : s >= 40 ? ACCENT : LOSS);

export default function CompassScore({ trades, lang = "fr" }) {
  const en = lang === "en";
  const data = useMemo(() => compassScore(trades, lang), [trades, lang]);
  const [hover, setHover] = useState(null);
  if (!data) return <div className="grid h-[300px] place-items-center text-xs text-prism-muted">{en ? "At least 3 trades needed." : "Il faut au moins 3 trades."}</div>;

  const { score, parts } = data;
  // Projection isométrique : x le long des barres, profondeur fixe.
  const W = 560, H = 330, ox = 70, oy = 270, gap = 74, Hh = 190, bw = 26, dx = 14, dy = -9;
  const P = (x, h) => [ox + x, oy - h];
  const pts = (a) => a.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" ");
  const active = hover != null ? parts[hover] : null;

  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full select-none" onMouseLeave={() => setHover(null)}>
        {/* graduations */}
        {[0, 25, 50, 75, 100].map((v) => {
          const [x1, y] = P(-20, (v / 100) * Hh); const x2 = ox + gap * (parts.length - 1) + bw + 30;
          return (
            <g key={v}>
              <line x1={x1} x2={x2} y1={y} y2={y} stroke={LINE} />
              <line x1={x2} x2={x2 + dx} y1={y} y2={y + dy} stroke={LINE} />
              <text x={x1 - 6} y={y + 3} textAnchor="end" fontSize="10" fill={MUTED} fontFamily="ui-monospace, monospace">{v}</text>
            </g>
          );
        })}
        {parts.map((p, i) => {
          const x = i * gap; const h = Math.max(2, (p.score / 100) * Hh); const col = tone(p.score);
          const front = [P(x, 0), P(x + bw, 0), P(x + bw, h), P(x, h)];
          const side = [P(x + bw, 0), [ox + x + bw + dx, oy + dy], [ox + x + bw + dx, oy - h + dy], P(x + bw, h)];
          const top = [P(x, h), P(x + bw, h), [ox + x + bw + dx, oy - h + dy], [ox + x + dx, oy - h + dy]];
          const dim = hover != null && hover !== i;
          return (
            <g key={p.key} opacity={dim ? 0.35 : 1} onMouseEnter={() => setHover(i)} style={{ cursor: "default" }}>
              <polygon points={pts(front)} fill={col} fillOpacity="0.55" />
              <polygon points={pts(side)} fill={col} fillOpacity="0.3" />
              <polygon points={pts(top)} fill={col} />
              <text x={ox + x + bw / 2 + dx / 2} y={oy - h + dy - 8} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--prism-text, #fff)" fontFamily="ui-monospace, monospace">{p.score}</text>
              <text x={ox + x + bw / 2} y={oy + 18} textAnchor="middle" fontSize="9.5" fill={MUTED}>{p.label}</text>
            </g>
          );
        })}
      </svg>

      <div className="flex min-w-[180px] flex-col justify-between gap-4 sm:border-l sm:border-prism-line sm:pl-4">
        <div>
          <p className="text-[9.5px] font-semibold tracking-[.14em] text-prism-muted2">COMPASS SCORE</p>
          <p className="mt-1 font-mono text-[46px] font-semibold leading-none" style={{ color: tone(score) }}>{score}</p>
          <p className="mt-1 text-[10.5px] text-prism-muted2">{en ? `on ${data.n} trades` : `sur ${data.n} trades`}</p>
        </div>
        <ul className="space-y-1.5 text-[11px]">
          {parts.map((p, i) => (
            <li key={p.key} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className={`flex justify-between gap-3 ${active && active.key !== p.key ? "opacity-40" : ""}`}>
              <span className="text-prism-muted">{p.label}</span>
              <span className="font-mono">{p.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
