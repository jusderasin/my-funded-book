"use client";

import { fmtK } from "@/lib/format";

// ---------- Radar Edge Score ----------
export function Radar({ axes }) {
  const keys = Object.keys(axes);
  const N = keys.length;
  const cx = 140, cy = 125, R = 78;
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
    return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="2.4" fill="#00E676" />;
  });
  return (
    <svg viewBox="0 0 280 250" className="w-full overflow-visible">
      {rings}
      {spokes}
      <path d={poly + "Z"} fill="rgba(0,230,118,0.14)" stroke="#00E676" strokeWidth="1.6" />
      {dots}
      {labels}
    </svg>
  );
}

// ---------- Area chart ----------
export function Area({ values, color = "#00E676", fill = "#00E676" }) {
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
  return (
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
    </svg>
  );
}

// ---------- Bars (net daily) ----------
export function Bars({ byDay, days }) {
  if (!days || !days.length) return <ChartEmpty />;
  const W = 560, H = 150, pad = 8;
  const vals = days.map((d) => byDay[d]);
  const mx = Math.max(1, ...vals.map(Math.abs));
  const step = (W - pad * 2) / days.length;
  const bw = Math.min(26, step * 0.6);
  const zeroY = H / 2;
  return (
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
            opacity="0.9"
          />
        );
      })}
    </svg>
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
export function Calendar({ byDay, tradesByDay, month, onShift }) {
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
    cells.push(
      <div key={d} className={`flex aspect-square min-h-[44px] flex-col justify-between rounded-lg border p-1.5 ${cls}`}>
        <div className="font-mono text-[9px] text-muted2">{d}</div>
        {pnl != null && (
          <div>
            <div className={`font-mono text-[10px] font-extrabold leading-tight ${pnl >= 0 ? "text-accent" : "text-loss"}`}>{fmtK(pnl)}</div>
            <div className="text-[8px] text-muted2">{nT} trade{nT > 1 ? "s" : ""}</div>
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
  return <div className="flex h-[150px] items-center justify-center text-[12px] text-muted2">Pas assez de données</div>;
}
