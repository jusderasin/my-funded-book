"use client";

// Graphiques SVG maison pour la page Rapports (style prism, pas de librairie).

import { useMemo, useState } from "react";

export const GREEN = "#22c55e";
export const RED = "#ef4444";
export const CYAN = "#06b6d4";
export const MUTED = "#8a8a93";

export const money = (n, { sign = false, dec = 0 } = {}) => {
  const v = Number(n) || 0;
  const s = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  return `${v < 0 ? "-" : sign && v > 0 ? "+" : ""}$${s}`;
};
export const fmtR = (n, dec = 2) => {
  const v = Number(n) || 0;
  return `${v > 0 ? "+" : ""}${v.toFixed(dec)}R`;
};
export const tone = (v) => (v > 0 ? "text-prism-win" : v < 0 ? "text-prism-loss" : "text-prism-muted");

export function Panel({ title, right, children, className = "", info }) {
  return (
    <section className={`min-w-0 rounded-xl border border-prism-line bg-prism-panel ${className}`}>
      {(title || right) && (
        <header className="flex items-center justify-between gap-3 border-b border-prism-line px-4 py-3">
          <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-prism-muted">
            {title}
            {info && <span title={info} className="grid h-4 w-4 cursor-help place-items-center rounded-full border border-prism-line text-[9px] normal-case text-prism-muted2">i</span>}
          </h3>
          {right}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Empty({ children }) {
  return <p className="py-6 text-center text-xs text-prism-muted2">{children}</p>;
}

/* ---------- Equity + drawdown ---------- */

export function EquityChart({ points, height = 240 }) {
  const [hover, setHover] = useState(null);
  const W = 800; const H = height; const PAD = { l: 8, r: 8, t: 12, b: 12 };
  const ddH = Math.round(H * 0.28);
  const eqH = H - ddH - PAD.t - PAD.b - 10;
  const data = [{ eq: 0, dd: 0, date: null }, ...points];
  const eqs = data.map((p) => p.eq);
  const min = Math.min(0, ...eqs); const max = Math.max(0, ...eqs);
  const span = max - min || 1;
  const minDD = Math.min(-1, ...data.map((p) => p.dd));
  const x = (i) => PAD.l + (i / Math.max(1, data.length - 1)) * (W - PAD.l - PAD.r);
  const yEq = (v) => PAD.t + (1 - (v - min) / span) * eqH;
  const ddTop = PAD.t + eqH + 10;
  const yDD = (v) => ddTop + (v / minDD) * ddH;
  const line = data.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${yEq(p.eq).toFixed(1)}`).join("");
  const area = `${line}L${x(data.length - 1)},${yEq(min)}L${x(0)},${yEq(min)}Z`;
  const dd = `M${x(0)},${ddTop}${data.map((p, i) => `L${x(i).toFixed(1)},${yDD(p.dd).toFixed(1)}`).join("")}L${x(data.length - 1)},${ddTop}Z`;
  const last = eqs.at(-1) || 0;
  const color = last >= 0 ? GREEN : RED;
  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (data.length - 1));
    setHover(Math.max(1, Math.min(data.length - 1, i)));
  };
  const h = hover != null ? data[hover] : null;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} preserveAspectRatio="none" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="rep-eq" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.28" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={PAD.l} x2={W - PAD.r} y1={yEq(0)} y2={yEq(0)} stroke="#27272a" strokeDasharray="4 4" />
        <path d={area} fill="url(#rep-eq)" />
        <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <path d={dd} fill="rgba(239,68,68,0.22)" stroke={RED} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        {h && <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="#52525b" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
        {h && <circle cx={x(hover)} cy={yEq(h.eq)} r="4" fill={color} />}
      </svg>
      <div className="pointer-events-none absolute left-2 top-2 flex gap-3 text-[10px] uppercase tracking-[.12em] text-prism-muted2">
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: color }} />Equity</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: RED }} />Drawdown</span>
      </div>
      {h && (
        <div className="pointer-events-none absolute right-2 top-2 rounded-md border border-prism-line bg-prism-bg/90 px-2.5 py-1.5 text-right font-mono text-[11px]">
          <div className="text-prism-muted">{h.date} · #{hover}</div>
          <div className={tone(h.eq)}>{money(h.eq, { sign: true })}</div>
          {h.dd < 0 && <div className="text-prism-loss">DD {money(h.dd)}</div>}
        </div>
      )}
      {!h && <div className={`pointer-events-none absolute right-2 top-2 font-mono text-sm font-bold ${tone(last)}`}>{money(last, { sign: true })}</div>}
    </div>
  );
}

/* ---------- Barres horizontales divergentes ---------- */

export function HBars({ rows, format = (v) => money(v, { sign: true }), sub }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  const mixed = rows.some((r) => r.value < 0) && rows.some((r) => r.value > 0);
  const allNeg = rows.every((r) => r.value <= 0);
  const zero = mixed ? 50 : allNeg ? 100 : 0;
  const scale = mixed ? 50 : 100;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[88px_1fr_auto] items-center gap-3 text-xs sm:grid-cols-[120px_1fr_auto]">
          <span className="truncate text-prism-muted" title={r.label}>{r.label}</span>
          <div className="relative h-5 rounded bg-prism-panel2">
            {mixed && <div className="absolute inset-y-0 left-1/2 w-px bg-prism-line2" />}
            <div
              className="absolute inset-y-0.5 rounded-sm"
              style={{
                background: r.value >= 0 ? GREEN : RED,
                opacity: 0.85,
                left: r.value >= 0 ? `${zero}%` : `${zero - (Math.abs(r.value) / max) * scale}%`,
                width: `${(Math.abs(r.value) / max) * scale}%`,
              }}
            />
          </div>
          <span className={`w-24 text-right font-mono ${tone(r.value)}`}>
            {format(r.value)}
            {sub && <span className="block text-[10px] text-prism-muted2">{sub(r)}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Barres verticales (P&L par semaine / par heure) ---------- */

export function VBars({ rows, height = 160 }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  const hasNeg = rows.some((r) => r.value < 0);
  const hasPos = rows.some((r) => r.value > 0);
  const zero = hasNeg && hasPos ? 50 : hasNeg ? 0 : 100;
  return (
    <div className="relative">
      <div className="flex items-stretch gap-1" style={{ height }}>
        {rows.map((r, i) => {
          const pct = (Math.abs(r.value) / max) * (hasNeg && hasPos ? 50 : 100);
          return (
            <div key={r.label} className="relative flex-1 cursor-default" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <div className="absolute inset-x-0 h-px bg-prism-line2" style={{ top: `${zero}%` }} />
              <div
                className="absolute inset-x-[15%] rounded-sm"
                style={{
                  background: r.value >= 0 ? GREEN : RED,
                  opacity: hover === i ? 1 : 0.8,
                  top: r.value >= 0 ? `${zero - pct}%` : `${zero}%`,
                  height: `${Math.max(pct, r.value ? 1 : 0)}%`,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1">
        {rows.map((r, i) => (
          <span key={r.label} className="flex-1 truncate text-center text-[9px] text-prism-muted2">{i % Math.max(1, Math.ceil(rows.length / 8)) ? "" : r.short || r.label}</span>
        ))}
      </div>
      {hover != null && (
        <div className="pointer-events-none absolute right-0 top-0 rounded-md border border-prism-line bg-prism-bg/90 px-2.5 py-1.5 text-right font-mono text-[11px]">
          <div className="text-prism-muted">{rows[hover].label}</div>
          <div className={tone(rows[hover].value)}>{money(rows[hover].value, { sign: true })}</div>
          {rows[hover].n != null && <div className="text-prism-muted2">{rows[hover].n} trades</div>}
        </div>
      )}
    </div>
  );
}

/* ---------- Heatmap jour × heure ---------- */

export function Heatmap({ cells, minHour, maxHour, days }) {
  const [hover, setHover] = useState(null);
  const hours = [];
  for (let h = minHour; h <= maxHour; h += 1) hours.push(h);
  const max = Math.max(1, ...Object.values(cells).map((c) => Math.abs(c.pnl)));
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full border-separate" style={{ borderSpacing: 3 }}>
        <thead>
          <tr>
            <th />
            {hours.map((h) => <th key={h} className="text-center font-mono text-[9px] font-normal text-prism-muted2">{String(h).padStart(2, "0")}h</th>)}
          </tr>
        </thead>
        <tbody>
          {days.map((label, d) => (d >= 5 && !Object.keys(cells).some((k) => k.startsWith(`${d}-`)) ? null : (
            <tr key={label}>
              <td className="pr-2 text-[10px] text-prism-muted">{label}</td>
              {hours.map((h) => {
                const c = cells[`${d}-${h}`];
                const a = c ? 0.15 + (Math.abs(c.pnl) / max) * 0.85 : 0;
                const bg = !c ? "rgba(255,255,255,0.03)" : c.pnl >= 0 ? `rgba(34,197,94,${a})` : `rgba(239,68,68,${a})`;
                return (
                  <td key={h} onMouseEnter={() => c && setHover({ label, h, ...c })} onMouseLeave={() => setHover(null)}
                    className="h-8 min-w-[28px] rounded text-center font-mono text-[9px] text-white/80" style={{ background: bg }}>
                    {c ? c.n : ""}
                  </td>
                );
              })}
            </tr>
          )))}
        </tbody>
      </table>
      {hover && (
        <div className="pointer-events-none absolute right-0 top-0 rounded-md border border-prism-line bg-prism-bg/95 px-2.5 py-1.5 text-right font-mono text-[11px]">
          <div className="text-prism-muted">{hover.label} · {String(hover.h).padStart(2, "0")}h</div>
          <div className={tone(hover.pnl)}>{money(hover.pnl, { sign: true })}</div>
          <div className="text-prism-muted2">{hover.n} trade{hover.n > 1 ? "s" : ""}</div>
        </div>
      )}
    </div>
  );
}

/* ---------- Calendrier P&L du mois ---------- */

export function MonthCalendar({ byDay, lang }) {
  const months = useMemo(() => [...new Set(Object.keys(byDay).map((d) => d.slice(0, 7)))].sort(), [byDay]);
  const [month, setMonth] = useState(null);
  const current = month && months.includes(month) ? month : months.at(-1);
  if (!current) return <Empty>{lang === "en" ? "No trading day in this period." : "Aucun jour tradé sur la période."}</Empty>;
  const [y, m] = current.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  const nDays = new Date(y, m, 0).getDate();
  const cells = [...Array(offset).fill(null), ...Array.from({ length: nDays }, (_, i) => i + 1)];
  const key = (d) => `${current}-${String(d).padStart(2, "0")}`;
  const vals = Object.entries(byDay).filter(([d]) => d.startsWith(current)).map(([, v]) => v);
  const max = Math.max(1, ...vals.map(Math.abs));
  const total = vals.reduce((s, v) => s + v, 0);
  const i = months.indexOf(current);
  const label = first.toLocaleDateString(lang === "en" ? "en-US" : "fr-FR", { month: "long", year: "numeric" });
  const heads = lang === "en" ? ["M", "T", "W", "T", "F", "S", "S"] : ["L", "M", "M", "J", "V", "S", "D"];
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" disabled={i <= 0} onClick={() => setMonth(months[i - 1])} className="h-7 w-7 rounded-md border border-prism-line text-prism-muted disabled:opacity-30">‹</button>
        <div className="text-center">
          <p className="text-sm font-semibold capitalize">{label}</p>
          <p className={`font-mono text-xs ${tone(total)}`}>{money(total, { sign: true })}</p>
        </div>
        <button type="button" disabled={i >= months.length - 1} onClick={() => setMonth(months[i + 1])} className="h-7 w-7 rounded-md border border-prism-line text-prism-muted disabled:opacity-30">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {heads.map((h, idx) => <span key={idx} className="text-center text-[9px] text-prism-muted2">{h}</span>)}
        {cells.map((d, idx) => {
          if (!d) return <span key={`x${idx}`} />;
          const v = byDay[key(d)];
          const a = v == null ? 0 : 0.18 + (Math.abs(v) / max) * 0.7;
          const bg = v == null ? "rgba(255,255,255,0.03)" : v >= 0 ? `rgba(34,197,94,${a})` : `rgba(239,68,68,${a})`;
          return (
            <div key={d} title={v == null ? "" : `${key(d)} · ${money(v, { sign: true })}`} className="flex aspect-square flex-col justify-between rounded-md p-1" style={{ background: bg }}>
              <span className="text-[9px] text-prism-muted">{d}</span>
              {v != null && <span className="truncate text-right font-mono text-[9px] text-white">{Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v)}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Histogramme des R ---------- */

export function Histogram({ bins, height = 150 }) {
  const max = Math.max(1, ...bins.map((b) => b.n));
  return (
    <div>
      <div className="flex items-end gap-0.5" style={{ height }}>
        {bins.map((b) => (
          <div key={b.from} className="group relative flex-1" style={{ height: "100%" }}>
            <div className="absolute inset-x-0 bottom-0 rounded-t-sm" title={`${b.from.toFixed(1)}R → ${b.to.toFixed(1)}R : ${b.n}`}
              style={{ height: `${(b.n / max) * 100}%`, background: b.from >= 0 ? GREEN : RED, opacity: b.n ? 0.85 : 0 }} />
            {b.n > 0 && <span className="absolute inset-x-0 text-center font-mono text-[9px] text-prism-muted" style={{ bottom: `calc(${(b.n / max) * 100}% + 2px)` }}>{b.n}</span>}
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-0.5">
        {bins.map((b) => <span key={b.from} className="flex-1 text-center font-mono text-[8px] text-prism-muted2">{Number.isInteger(b.from) ? `${b.from}` : ""}</span>)}
      </div>
    </div>
  );
}

/* ---------- Donut TP / SL / BE ---------- */

export function Donut({ parts, size = 120 }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  let acc = 0;
  return (
    <svg viewBox="0 0 36 36" style={{ width: size, height: size }}>
      <circle cx="18" cy="18" r="14" fill="none" stroke="#27272a" strokeWidth="4" />
      {total > 0 && parts.map((p) => {
        const len = (p.value / total) * 100;
        const el = <circle key={p.label} cx="18" cy="18" r="14" fill="none" stroke={p.color} strokeWidth="4" pathLength="100" strokeDasharray={`${len} ${100 - len}`} strokeDashoffset={-acc} transform="rotate(-90 18 18)" />;
        acc += len;
        return el;
      })}
      <text x="18" y="20" textAnchor="middle" className="fill-white font-mono" style={{ fontSize: 7, fontWeight: 700 }}>{total}</text>
    </svg>
  );
}
