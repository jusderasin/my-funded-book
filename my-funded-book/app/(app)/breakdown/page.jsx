"use client";

import { useState, useMemo } from "react";
import { useBook } from "@/components/BookProvider";
import { fmtMoney } from "@/lib/format";
import { BarChart3, TrendingUp, Layers, Clock, Tag, Target, Calendar, ArrowLeftRight, Award } from "lucide-react";

const GREEN = "#00E676";
const RED = "#FF5252";
const GRAY = "#8a93a6";
const PINK = "#ff66e4";

const PERIODS = [
  { v: "week", fr: "Semaine", en: "Week" },
  { v: "month", fr: "Mois", en: "Month" },
  { v: "year", fr: "Année", en: "Year" },
  { v: "all", fr: "Tout", en: "All" },
];

/* ---------- helpers ---------- */

function fmtR(r) {
  const n = Number(r) || 0;
  return (n >= 0 ? "+" : "") + n.toFixed(1) + "R";
}

function inPeriod(dateStr, period) {
  if (period === "all" || !dateStr) return true;
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return true;
  const diff = (Date.now() - d.getTime()) / 86400000;
  if (period === "week") return diff <= 7;
  if (period === "month") return diff <= 31;
  if (period === "year") return diff <= 366;
  return true;
}

function overall(trades) {
  let r = 0, pnl = 0, wins = 0, losses = 0, gp = 0, gl = 0, sumWin = 0, sumLoss = 0;
  for (const tr of trades) {
    const p = Number(tr.pnl) || 0, rr = Number(tr.r) || 0;
    r += rr; pnl += p;
    if (p > 0) { wins++; gp += p; sumWin += p; }
    else if (p < 0) { losses++; gl += -p; sumLoss += -p; }
  }
  const n = trades.length;
  const wr = n ? (wins / n) * 100 : 0;
  const pf = gl > 0 ? gp / gl : gp > 0 ? Infinity : 0;
  const exp = n ? r / n : 0;
  const avgWin = wins ? sumWin / wins : 0;
  const avgLoss = losses ? sumLoss / losses : 0;
  const sorted = [...trades].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  let cum = 0, peak = 0, maxDD = 0, cp = 0;
  const cumP = [];
  for (const tr of sorted) {
    cum += Number(tr.r) || 0;
    peak = Math.max(peak, cum);
    maxDD = Math.max(maxDD, peak - cum);
    cp += Number(tr.pnl) || 0;
    cumP.push(cp);
  }
  return { n, r, pnl, wins, losses, wr, pf, exp, avgWin, avgLoss, maxDD, cumP };
}

function groupStats(trades, keyFn) {
  const map = new Map();
  for (const tr of trades) {
    const raw = keyFn(tr);
    const keys = Array.isArray(raw) ? raw : [raw];
    for (let k of keys) {
      if (k == null || k === "") k = "—";
      k = String(k);
      if (!map.has(k)) map.set(k, { label: k, n: 0, r: 0, pnl: 0, wins: 0 });
      const g = map.get(k);
      g.n += 1;
      g.r += Number(tr.r) || 0;
      g.pnl += Number(tr.pnl) || 0;
      if ((Number(tr.pnl) || 0) > 0) g.wins += 1;
    }
  }
  return [...map.values()]
    .map((g) => ({ ...g, wr: g.n ? Math.round((g.wins / g.n) * 100) : 0 }))
    .sort((a, b) => b.pnl - a.pnl);
}

/* ---------- petits composants ---------- */

function Stat({ label, value, sub, color }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted2">{label}</div>
      <div className="mt-1 font-mono text-[20px] font-extrabold leading-none" style={color ? { color } : undefined}>{value}</div>
      {sub != null && <div className="mt-1 font-mono text-[11px] text-muted2">{sub}</div>}
    </div>
  );
}

function Section({ icon: Icon, title, right, children }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="mb-3.5 flex items-center gap-2">
        {Icon && <Icon size={14} className="text-accent" />}
        <div className="text-[11px] font-bold uppercase tracking-widest text-muted2">{title}</div>
        <div className="flex-1" />
        {right}
      </div>
      {children}
    </div>
  );
}

// courbe d'equity (PnL cumulé)
function Equity({ values }) {
  if (!values || values.length < 2) return <Empty />;
  const W = 900, H = 190, pad = 10;
  const mn = Math.min(0, ...values), mx = Math.max(0, ...values);
  const range = mx - mn || 1;
  const n = values.length;
  const x = (i) => pad + (i / (n - 1)) * (W - 2 * pad);
  const y = (v) => H - pad - ((v - mn) / range) * (H - 2 * pad);
  const line = values.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + "," + y(v).toFixed(1)).join(" ");
  const area = `M${x(0).toFixed(1)},${(H - pad).toFixed(1)} ` + values.map((v, i) => "L" + x(i).toFixed(1) + "," + y(v).toFixed(1)).join(" ") + ` L${x(n - 1).toFixed(1)},${(H - pad).toFixed(1)} Z`;
  const last = values[values.length - 1];
  const color = last >= 0 ? GREEN : RED;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 190 }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="eqg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={pad} y1={y(0).toFixed(1)} x2={W - pad} y2={y(0).toFixed(1)} stroke="#2a2f3d" strokeWidth="1" strokeDasharray="4 4" />
      <path d={area} fill="url(#eqg)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.2" />
    </svg>
  );
}

// barres verticales (jour de semaine / distribution)
function VBars({ items }) {
  if (!items || !items.length) return <Empty />;
  const W = 900, H = 170, pad = 10;
  const mx = Math.max(1, ...items.map((it) => Math.abs(it.value)));
  const step = (W - 2 * pad) / items.length;
  const bw = Math.min(48, step * 0.6);
  const zeroY = H / 2;
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 170 }} preserveAspectRatio="none">
        <line x1={pad} y1={zeroY} x2={W - pad} y2={zeroY} stroke="#2a2f3d" strokeWidth="1" />
        {items.map((it, i) => {
          const h = (Math.abs(it.value) / mx) * (H / 2 - 16);
          const cx = pad + step * (i + 0.5);
          const pos = it.value >= 0;
          return (
            <rect key={i} x={(cx - bw / 2).toFixed(1)} y={(pos ? zeroY - h : zeroY).toFixed(1)} width={bw.toFixed(1)} height={Math.max(1, h).toFixed(1)} rx="3" fill={pos ? GREEN : RED} opacity="0.92" />
          );
        })}
      </svg>
      <div className="mt-1 flex" style={{ paddingLeft: pad, paddingRight: pad }}>
        {items.map((it, i) => (
          <div key={i} className="flex-1 text-center">
            <div className="font-mono text-[10px] text-muted2">{it.label}</div>
            <div className={`font-mono text-[10px] font-bold ${it.value >= 0 ? "text-accent" : "text-loss"}`}>{it.n ? fmtMoney(it.value) : "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// barres horizontales groupées
function Breakdown({ rows }) {
  if (!rows || !rows.length) return <Empty />;
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.pnl)));
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r) => {
        const c = r.pnl >= 0 ? GREEN : RED;
        const bw = Math.max(3, (Math.abs(r.pnl) / maxAbs) * 100);
        return (
          <div key={r.label} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate text-[12px] text-muted2" title={r.label}>{r.label}</span>
            <div className="h-6 flex-1 overflow-hidden rounded-md" style={{ background: "#1a1f2e" }}>
              <div className="flex h-full items-center rounded-md pl-2" style={{ width: bw + "%", minWidth: 46, background: c }}>
                <span className="font-mono text-[11px] font-extrabold text-black/80">{(r.pnl >= 0 ? "+" : "") + fmtMoney(r.pnl)}</span>
              </div>
            </div>
            <span className="w-[128px] shrink-0 text-right font-mono text-[11px] text-muted2">
              {r.n} tr · <b className={r.wr >= 50 ? "text-accent" : "text-muted"}>{r.wr}%</b> · <b style={{ color: c }}>{fmtR(r.r)}</b>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Segmented({ tp, be, sl, lang }) {
  const tot = tp + be + sl;
  if (tot === 0) return <Empty />;
  const seg = [
    { k: "TP", n: tp, c: GREEN },
    { k: "BE", n: be, c: GRAY },
    { k: "SL", n: sl, c: RED },
  ];
  return (
    <div>
      <div className="flex h-6 overflow-hidden rounded-md" style={{ background: "#1a1f2e" }}>
        {seg.map((s) => (s.n > 0 ? <div key={s.k} style={{ width: (s.n / tot) * 100 + "%", background: s.c }} /> : null))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-4 text-[12px]">
        {seg.map((s) => (
          <span key={s.k} className="flex items-center gap-1.5 text-muted2">
            <span className="h-2 w-2 rounded-full" style={{ background: s.c }} /> {s.k} <b className="font-mono text-white">{s.n}</b>
            <span className="text-muted2">({tot ? Math.round((s.n / tot) * 100) : 0}%)</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Empty() {
  return <div className="flex h-[80px] items-center justify-center text-[12px] text-muted2">—</div>;
}

/* ---------- page ---------- */

export default function BreakdownPage() {
  const { trades, lang } = useBook();
  const L = lang === "en" ? "en" : "fr";
  const [period, setPeriod] = useState("all");

  const data = useMemo(() => {
    const list = (trades || []).filter((tr) => inPeriod(tr.date, period));
    const o = overall(list);

    const WD_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    const WD_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const order = [1, 2, 3, 4, 5, 6, 0];
    const wdMap = {};
    for (const tr of list) {
      const d = new Date((tr.date || "") + "T00:00:00");
      if (isNaN(d)) continue;
      const g = d.getDay();
      if (!wdMap[g]) wdMap[g] = { pnl: 0, n: 0 };
      wdMap[g].pnl += Number(tr.pnl) || 0;
      wdMap[g].n += 1;
    }
    const weekday = order.map((g) => ({
      label: (L === "en" ? WD_EN : WD_FR)[g],
      value: wdMap[g] ? wdMap[g].pnl : 0,
      n: wdMap[g] ? wdMap[g].n : 0,
    }));

    // distribution des R
    const buckets = [
      { label: "≤-2", c: RED, n: 0 },
      { label: "-2…-1", c: RED, n: 0 },
      { label: "-1…0", c: RED, n: 0 },
      { label: "0…1", c: GREEN, n: 0 },
      { label: "1…2", c: GREEN, n: 0 },
      { label: "2…3", c: GREEN, n: 0 },
      { label: "≥3", c: GREEN, n: 0 },
    ];
    for (const tr of list) {
      const r = Number(tr.r) || 0;
      let idx = 6;
      if (r <= -2) idx = 0; else if (r < -1) idx = 1; else if (r < 0) idx = 2;
      else if (r < 1) idx = 3; else if (r < 2) idx = 4; else if (r < 3) idx = 5;
      buckets[idx].n += 1;
    }
    const dist = buckets.map((b) => ({ label: b.label, value: b.n, n: b.n }));

    let tp = 0, be = 0, sl = 0;
    for (const tr of list) {
      if (tr.outcome === "TP") tp++;
      else if (tr.outcome === "BE") be++;
      else if (tr.outcome === "SL") sl++;
    }

    return {
      list,
      o,
      weekday,
      dist,
      outcome: { tp, be, sl },
      bySession: groupStats(list, (tr) => tr.session),
      bySetup: groupStats(list, (tr) => tr.setup),
      byInstrument: groupStats(list, (tr) => tr.symbol),
      byGrade: groupStats(list, (tr) => tr.grade),
      byTag: groupStats(list, (tr) => (Array.isArray(tr.tags) && tr.tags.length ? tr.tags : ["—"])),
      byDir: groupStats(list, (tr) => (tr.dir === "long" ? "LONG" : "SHORT")),
    };
  }, [trades, period, L]);

  const o = data.o;
  const pfDisplay = o.pf === Infinity ? "∞" : o.pf.toFixed(2);

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[18px] font-extrabold">
            <BarChart3 size={18} className="text-accent" /> {L === "en" ? "Analytics" : "Analyse"}
          </h2>
          <div className="mt-0.5 text-[12px] text-muted2">
            {L === "en" ? "Full breakdown of your trading — everything on one page." : "Décomposition complète de ton trading — tout sur une seule page."}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.v}
              onClick={() => setPeriod(p.v)}
              className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold ${period === p.v ? "border-accent bg-accentDim text-accent" : "border-line2 bg-panel2 text-muted2 hover:text-white"}`}
            >
              {L === "en" ? p.en : p.fr}
            </button>
          ))}
        </div>
      </div>

      {o.n === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-panel/50 p-12 text-center">
          <div className="text-4xl">📊</div>
          <div className="mt-3 text-[14px] font-bold">{L === "en" ? "No trades over this period" : "Aucun trade sur cette période"}</div>
          <div className="mt-1 text-[12px] text-muted2">{L === "en" ? "Log trades or widen the period." : "Enregistre des trades ou élargis la période."}</div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* KPI band */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-8">
            <Stat label={L === "en" ? "Trades" : "Trades"} value={o.n} sub={`${o.wins}W / ${o.losses}L`} />
            <Stat label="Win rate" value={o.wr.toFixed(1) + "%"} color={o.wr >= 50 ? GREEN : GRAY} />
            <Stat label="Profit factor" value={pfDisplay} color={o.pf >= 1.5 ? GREEN : o.pf >= 1 ? GRAY : RED} />
            <Stat label="Total R" value={fmtR(o.r)} color={o.r >= 0 ? GREEN : RED} />
            <Stat label="PnL net" value={(o.pnl >= 0 ? "+" : "") + fmtMoney(o.pnl)} color={o.pnl >= 0 ? GREEN : RED} />
            <Stat label="Expectancy" value={fmtR(o.exp)} color={o.exp >= 0 ? GREEN : RED} />
            <Stat label={L === "en" ? "Avg W / L" : "Gain/perte moy."} value={fmtMoney(o.avgWin)} sub={"-" + fmtMoney(o.avgLoss).replace("-", "")} color={GREEN} />
            <Stat label="Max DD" value={fmtR(-o.maxDD)} color={RED} />
          </div>

          {/* Equity */}
          <Section icon={TrendingUp} title={L === "en" ? "Equity curve (cumulative PnL)" : "Courbe d'equity (PnL cumulé)"} right={<span className={`font-mono text-[13px] font-extrabold ${o.pnl >= 0 ? "text-accent" : "text-loss"}`}>{(o.pnl >= 0 ? "+" : "") + fmtMoney(o.pnl)}</span>}>
            <Equity values={o.cumP} />
          </Section>

          {/* weekday + direction */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Section icon={Calendar} title={L === "en" ? "By weekday" : "Par jour de la semaine"}>
              <VBars items={data.weekday} />
            </Section>
            <Section icon={ArrowLeftRight} title={L === "en" ? "Long vs Short" : "Long vs Short"}>
              <Breakdown rows={data.byDir} />
            </Section>
          </div>

          {/* session + setup */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Section icon={Clock} title={L === "en" ? "By session" : "Par session"}>
              <Breakdown rows={data.bySession} />
            </Section>
            <Section icon={Layers} title={L === "en" ? "By setup" : "Par setup"}>
              <Breakdown rows={data.bySetup} />
            </Section>
          </div>

          {/* instrument + grade */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Section icon={Target} title={L === "en" ? "By instrument" : "Par instrument"}>
              <Breakdown rows={data.byInstrument} />
            </Section>
            <Section icon={Award} title={L === "en" ? "By grade" : "Par grade"}>
              <Breakdown rows={data.byGrade} />
            </Section>
          </div>

          {/* tags + outcome */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Section icon={Tag} title={L === "en" ? "By tag" : "Par tag"}>
              <Breakdown rows={data.byTag} />
            </Section>
            <Section icon={Target} title={L === "en" ? "Exits (TP / BE / SL)" : "Sorties (TP / BE / SL)"}>
              <Segmented tp={data.outcome.tp} be={data.outcome.be} sl={data.outcome.sl} lang={lang} />
            </Section>
          </div>

          {/* distribution R */}
          <Section icon={BarChart3} title={L === "en" ? "R distribution" : "Distribution des R"}>
            <VBars items={data.dist} />
          </Section>
        </div>
      )}
    </div>
  );
}
