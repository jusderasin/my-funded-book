"use client";

import { useState, useRef, useEffect } from "react";
import { fmtK } from "@/lib/format";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ---------- Hook tooltip : survol (souris) + tap (tactile) ----------
// - PC : onMouseEnter/Leave affiche/masque au survol
// - Mobile : tap affiche, re-tap sur le même point masque, tap ailleurs ferme
function useChartTip() {
  const [hi, setHi] = useState(null);
  const ref = useRef(null);
  useEffect(() => {
    if (hi == null) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setHi(null);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [hi]);
  // props à étaler sur chaque zone de survol/tap
  const zone = (i) => ({
    onMouseEnter: () => setHi(i),
    onMouseLeave: () => setHi(null),
    onPointerDown: (e) => {
      if (e.pointerType === "touch") {
        e.preventDefault(); // coupe les events souris synthétiques du tap
        setHi((cur) => (cur === i ? null : i));
      }
    },
  });
  return { hi, ref, zone };
}

// ---------- Tooltip overlay (HTML, positionné en % du conteneur) ----------
function Tip({ leftPct, topPct, place = "top", children }) {
  const transform =
    place === "bottom"
      ? "translate(-50%, 8px)"
      : "translate(-50%, calc(-100% - 8px))";
  return (
    <div
      className="pointer-events-none absolute z-20 whitespace-nowrap rounded-md border border-line2 bg-ink2/95 px-2 py-1 text-center font-mono text-[10px] leading-tight shadow-lg"
      style={{ left: `${clamp(leftPct, 3, 97)}%`, top: `${topPct}%`, transform }}
    >
      {children}
    </div>
  );
}

// ---------- Radar Edge Score ----------
export function Radar({ axes }) {
  const { hi, ref, zone } = useChartTip();
  const keys = Object.keys(axes);
  const N = keys.length;
  const cx = 140, cy = 125, R = 78;
  const VB_W = 280, VB_H = 250;
  const pt = (i, r) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / N;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const rings = [0.25, 0.5, 0.75, 1].map((f, ri) => {
    let p = "";
    for (let i = 0; i < N; i++) {
      const [x, y] = pt(i, R * f);
      p += (i ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1);
    }
    return <path key={ri} d={p + "Z"} fill="none" stroke="#242833" strokeWidth="1" />;
  });
  const spokes = keys.map((k, i) => {
    const [x, y] = pt(i, R);
    return <line key={i} x1={cx} y1={cy} x2={x.toFixed(1)} y2={y.toFixed(1)} stroke="#1c2029" strokeWidth="1" />;
  });
  const labels = keys.map((k, i) => {
    const [lx, ly] = pt(i, R + 16);
    const anchor = Math.abs(lx - cx) < 6 ? "middle" : lx > cx ? "start" : "end";
    return (
      <text key={i} x={lx.toFixed(1)} y={(ly + 3).toFixed(1)} textAnchor={anchor} fontSize="8.5" fill="#8a93a6">
        {k}
      </text>
    );
  });
  let poly = "";
  keys.forEach((k, i) => {
    const [x, y] = pt(i, (R * axes[k]) / 100);
    poly += (i ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1);
  });
  const dots = keys.map((k, i) => {
    const [x, y] = pt(i, (R * axes[k]) / 100);
    return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={hi === i ? "3.6" : "2.4"} fill="#00E676" />;
  });
  const hotspots = keys.map((k, i) => {
    const [x, y] = pt(i, (R * axes[k]) / 100);
    return (
      <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="13" fill="transparent" style={{ touchAction: "none" }} {...zone(i)} />
    );
  });
  let tip = null;
  if (hi != null) {
    const [x, y] = pt(hi, (R * axes[keys[hi]]) / 100);
    tip = (
      <Tip leftPct={(x / VB_W) * 100} topPct={(y / VB_H) * 100} place={y / VB_H < 0.35 ? "bottom" : "top"}>
        <div className="text-muted2">{keys[hi]}</div>
        <div className="font-extrabold" style={{ color: "#00E676" }}>
          {Math.round(axes[keys[hi]])}<span className="text-muted2">/100</span>
        </div>
      </Tip>
    );
  }
  return (
    <div ref={ref} className="relative w-full">
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full overflow-visible">
        {rings}
        {spokes}
        <path d={poly + "Z"} fill="rgba(0,230,118,0.14)" stroke="#00E676" strokeWidth="1.6" />
        {dots}
        {labels}
        {hotspots}
      </svg>
      {tip}
    </div>
  );
}

// ---------- Area chart ----------
export function Area({ values, color = "#00E676", fill = "#00E676", labels, fmt }) {
  const { hi, ref, zone } = useChartTip();
  if (!values || values.length < 2) return <ChartEmpty />;
  const W = 560, H = 150, pad = 8;
  const mn = Math.min(...values), mx = Math.max(...values);
  const x = (i) => pad + (i * (W - pad * 2)) / (values.length - 1);
  const y = (v) => H - pad - ((v - mn) / (mx - mn || 1)) * (H - pad * 2 - 10) - 5;
  const zeroY = mn < 0 && mx > 0 ? y(0) : null;
  const line = values.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + "," + y(v).toFixed(1)).join(" ");
  const area =
    `M${x(0).toFixed(1)},${H - pad} ` +
    values.map((v, i) => "L" + x(i).toFixed(1) + "," + y(v).toFixed(1)).join(" ") +
    ` L${x(values.length - 1).toFixed(1)},${H - pad} Z`;
  const gid = "g" + Math.abs(values.length * 7 + Math.round(mx)).toString(36);
  const step = (W - pad * 2) / (values.length - 1);
  const format = fmt || ((v) => (v >= 0 ? "+" : "") + (Number.isInteger(v) ? v : v.toFixed(2)));
  return (
    <div ref={ref} className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={fill} stopOpacity="0.35" />
            <stop offset="1" stopColor={fill} stopOpacity="0" />
          </linearGradient>
        </defs>
        {zeroY != null && <line x1={pad} y1={zeroY.toFixed(1)} x2={W - pad} y2={zeroY.toFixed(1)} stroke="#2e3340" strokeDasharray="3 3" />}
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" />
        {hi != null && (
          <g>
            <line x1={x(hi).toFixed(1)} y1={pad} x2={x(hi).toFixed(1)} y2={H - pad} stroke="#3a4150" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={x(hi).toFixed(1)} cy={y(values[hi]).toFixed(1)} r="3.5" fill={color} stroke="#0b0d12" strokeWidth="1.5" />
          </g>
        )}
        {values.map((v, i) => (
          <rect key={i} x={(x(i) - step / 2).toFixed(1)} y="0" width={step.toFixed(1)} height={H} fill="transparent" style={{ touchAction: "none" }} {...zone(i)} />
        ))}
      </svg>
      {hi != null && (
        <Tip leftPct={(x(hi) / W) * 100} topPct={(y(values[hi]) / H) * 100} place={y(values[hi]) / H < 0.35 ? "bottom" : "top"}>
          {labels && labels[hi] != null && <div className="text-muted2">{labels[hi]}</div>}
          <div className="font-extrabold" style={{ color }}>{format(values[hi])}</div>
        </Tip>
      )}
    </div>
  );
}

// ---------- Bars (net daily) ----------
export function Bars({ byDay, days, labels, fmt }) {
  const { hi, ref, zone } = useChartTip();
  if (!days || !days.length) return <ChartEmpty />;
  const W = 560, H = 150, pad = 8;
  const vals = days.map((d) => byDay[d]);
  const mx = Math.max(1, ...vals.map(Math.abs));
  const step = (W - pad * 2) / days.length;
  const bw = Math.min(26, step * 0.6);
  const zeroY = H / 2;
  const format = fmt || fmtK;
  return (
    <div ref={ref} className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <line x1={pad} y1={zeroY} x2={W - pad} y2={zeroY} stroke="#2e3340" />
        {days.map((d, i) => {
          const v = byDay[d];
          const h = (Math.abs(v) / mx) * (H / 2 - 14);
          const cx = pad + step * (i + 0.5);
          return (
            <rect
              key={i}
              x={(cx - bw / 2).toFixed(1)}
              y={(v >= 0 ? zeroY - h : zeroY).toFixed(1)}
              width={bw.toFixed(1)}
              height={Math.max(1, h).toFixed(1)}
              rx="2"
              fill={v >= 0 ? "#00E676" : "#FF5252"}
              opacity={hi === i ? "1" : "0.9"}
            />
          );
        })}
        {days.map((d, i) => {
          const cx = pad + step * (i + 0.5);
          return (
            <rect key={"h" + i} x={(cx - step / 2).toFixed(1)} y="0" width={step.toFixed(1)} height={H} fill="transparent" style={{ touchAction: "none" }} {...zone(i)} />
          );
        })}
      </svg>
      {hi != null && (() => {
        const v = byDay[days[hi]];
        const cx = pad + step * (hi + 0.5);
        return (
          <Tip leftPct={(cx / W) * 100} topPct={(zeroY / H) * 100} place={v >= 0 ? "top" : "bottom"}>
            <div className="text-muted2">{labels && labels[hi] != null ? labels[hi] : days[hi]}</div>
            <div className="font-extrabold" style={{ color: v >= 0 ? "#00E676" : "#FF5252" }}>{format(v)}</div>
          </Tip>
        );
      })()}
    </div>
  );
}

// ---------- Circular gauge ----------
export function Gauge({ pct, color = "#00E676" }) {
  const p = Math.max(0, Math.min(100, pct));
  const r = 13;
  const c = 2 * Math.PI * r;
  const off = c * (1 - p / 100);
  return (
    <svg width="34" height="34" viewBox="0 0 34 34">
      <circle cx="17" cy="17" r={r} fill="none" stroke="#1c2029" strokeWidth="3.5" />
      <circle
        cx="17"
        cy="17"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={c.toFixed(1)}
        strokeDashoffset={off.toFixed(1)}
        transform="rotate(-90 17 17)"
      />
    </svg>
  );
}

// ---------- Monthly calendar ----------
export function Calendar({ byDay, tradesByDay, month, onShift, t, onDayClick }) {
  const today = new Date();
  const safe = month || { y: today.getFullYear(), m: today.getMonth() + 1 };
  const { y, m } = safe;
  const monthName = new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const first = new Date(y, m - 1, 1).getDay();
  const dim = new Date(y, m, 0).getDate();
  const dows = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(<div key={"e" + i} />);
  for (let d = 1; d <= dim; d++) {
    const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const pnl = byDay[key];
    const nT = tradesByDay[key] || 0;
    const cls = pnl > 0 ? "bg-accentDim border-accent/30" : pnl < 0 ? "bg-lossDim border-loss/30" : "bg-panel2 border-transparent";
    const clickable = nT > 0 && typeof onDayClick === "function";
    cells.push(
      <div
        key={d}
        onClick={clickable ? () => onDayClick(key) : undefined}
        className={`flex aspect-square min-h-[44px] flex-col justify-between rounded-lg border p-1.5 ${cls} ${clickable ? "cursor-pointer transition hover:brightness-125" : ""}`}
      >
        <div className="font-mono text-[9px] text-muted2">{d}</div>
        {pnl != null && (
          <div>
            <div className={`font-mono text-[10px] font-extrabold leading-tight ${pnl >= 0 ? "text-accent" : "text-loss"}`}>{fmtK(pnl)}</div>
            <div className="text-[8px] text-muted2">{nT} {nT > 1 ? (t ? t("cal_trades") : "trades") : (t ? t("cal_trade") : "trade")}</div>
          </div>
        )}
      </div>
    );
  }
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => onShift(-1)} className="rounded-md px-2 text-[15px] text-muted hover:bg-panel2 hover:text-white">‹</button>
        <div className="font-mono text-[13px] font-bold">{monthName}</div>
        <button onClick={() => onShift(1)} className="rounded-md px-2 text-[15px] text-muted hover:bg-panel2 hover:text-white">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {dows.map((d) => (
          <div key={d} className="pb-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-muted2">{d}</div>
        ))}
        {cells}
      </div>
    </div>
  );
}

function ChartEmpty() {
  return <div className="flex h-[150px] items-center justify-center text-[12px] text-muted2">Pas assez de données / Not enough data</div>;
}
