"use client";

import { useMemo, useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { useBook } from "@/components/BookProvider";
import { accountHealth } from "@/lib/accountHealth";
import { EMOTION_BY_KEY } from "@/lib/constants";
import {
  afterLosses, dailyPnL, distinct, DURATION_BUCKETS, durationBucket, drawdownPeriods, entryHour, equitySeries,
  filterTrades, groupBy, groupStats, heatmap, kpis, periodRange, plannedVsRealized, pnlOf, previousRange,
  rHistogram, riskOfRuin, tradeIndexInDay, tradesToCsv, weekday,
} from "@/lib/reports";
import {
  Donut, Empty, EquityChart, fmtR, GREEN, Heatmap, HBars, Histogram, MonthCalendar, money, MUTED, Panel, RED, tone, VBars,
} from "@/components/reports/charts";

const SELECT = "h-9 min-w-0 rounded-lg border border-prism-line bg-prism-surface px-2.5 text-xs text-prism-text outline-none focus:border-prism-accent";
const DATE = `${SELECT} appearance-none [&::-webkit-date-and-time-value]:text-left`;

const PERIODS = [
  ["week", "Semaine", "Week"], ["month", "Mois", "Month"], ["quarter", "Trimestre", "Quarter"],
  ["year", "Année", "Year"], ["all", "Tout", "All"], ["custom", "Perso", "Custom"],
];
const TABS = [
  ["overview", "Vue d'ensemble", "Overview"], ["time", "Temps", "Time"], ["setups", "Setups", "Setups"],
  ["risk", "Risque", "Risk"], ["discipline", "Discipline", "Discipline"], ["compare", "Comparaison", "Compare"],
];
const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const pf = (v) => (v === Infinity ? "∞" : v ? v.toFixed(2) : "—");
const pct = (v) => `${(Number(v) || 0).toFixed(1)}%`;

/* ------------------------------------------------------------------ */

function Kpi({ label, value, sub, color }) {
  return (
    <div className="min-w-0 rounded-xl border border-prism-line bg-prism-panel px-4 py-3.5">
      <p className="truncate text-[9px] font-bold uppercase tracking-[.14em] text-prism-muted2">{label}</p>
      <p className={`mt-1.5 truncate font-mono text-lg font-bold ${color || "text-prism-text"}`}>{value}</p>
      {sub && <p className="mt-0.5 truncate text-[10px] text-prism-muted">{sub}</p>}
    </div>
  );
}

// Tableau triable de groupes (setup, symbole, session…).
function StatTable({ rows, label, en, extra = [], order = "net" }) {
  const [sort, setSort] = useState(order === "key" ? { key: "key", dir: 1 } : { key: "net", dir: -1 });
  const cols = [
    ["n", "Trades", (r) => r.n],
    ["winRate", "WR", (r) => pct(r.winRate)],
    ["profitFactor", "PF", (r) => pf(r.profitFactor)],
    ["expectancyR", en ? "Exp. R" : "Esp. R", (r) => <span className={tone(r.expectancyR)}>{fmtR(r.expectancyR)}</span>],
    ["net", "P&L", (r) => <span className={tone(r.net)}>{money(r.net, { sign: true })}</span>],
    ...extra,
  ];
  const sorted = [...rows].sort((a, b) => {
    const va = a[sort.key] === Infinity ? 1e12 : a[sort.key];
    const vb = b[sort.key] === Infinity ? 1e12 : b[sort.key];
    if (sort.key === "key") return (typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb))) * sort.dir;
    return ((Number(va) || 0) - (Number(vb) || 0)) * sort.dir;
  });
  const head = (key, text, align = "text-right") => (
    <th key={key} onClick={() => setSort((s) => ({ key, dir: s.key === key ? -s.dir : -1 }))}
      className={`cursor-pointer select-none whitespace-nowrap px-2 py-2 text-[9px] font-bold uppercase tracking-[.12em] text-prism-muted2 hover:text-prism-text ${align}`}>
      {text}{sort.key === key ? (sort.dir < 0 ? " ↓" : " ↑") : ""}
    </th>
  );
  if (!rows.length) return <Empty>{en ? "No data." : "Pas de données."}</Empty>;
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-[420px] text-xs">
        <thead><tr className="border-b border-prism-line">{head("key", label, "text-left")}{cols.map(([k, t]) => head(k, t))}</tr></thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.key} className="border-b border-prism-line last:border-0 hover:bg-white/[0.02]">
              <td className="max-w-[160px] truncate px-2 py-2 font-medium" title={String(r.label ?? r.key)}>{r.label ?? r.key}</td>
              {cols.map(([k, , render]) => <td key={k} className="whitespace-nowrap px-2 py-2 text-right font-mono">{render(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function YesNoCompare({ title, rows, en }) {
  const usable = rows.filter((r) => r.n > 0);
  return (
    <Panel title={title}>
      {usable.length < 1 ? <Empty>{en ? "Not filled on any trade yet." : "Pas encore renseigné sur tes trades."}</Empty> : (
        <div className="grid grid-cols-2 gap-3">
          {rows.map((r) => (
            <div key={r.key} className={`rounded-lg border p-3 ${r.good ? "border-[rgba(34,197,94,0.3)]" : "border-[rgba(239,68,68,0.3)]"}`}>
              <p className="text-[10px] font-bold uppercase tracking-[.12em] text-prism-muted">{r.label}</p>
              <p className={`mt-1 font-mono text-base font-bold ${tone(r.net)}`}>{r.n ? money(r.net, { sign: true }) : "—"}</p>
              <p className="mt-0.5 text-[10px] text-prism-muted2">{r.n} trades · WR {pct(r.winRate)} · {fmtR(r.expectancyR)}</p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */

export default function ReportsPage() {
  const { trades, accounts, activeAccountId, profile, certificates, lang } = useBook();
  const en = lang === "en";
  const beThreshold = Math.max(0, Number(profile?.be_threshold) || 0);
  const DAYS = en ? DAYS_EN : DAYS_FR;

  const [tab, setTab] = useState("overview");
  const [period, setPeriod] = useState("month");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [f, setF] = useState({ account: activeAccountId === "all" ? "" : activeAccountId || "", symbol: "", dir: "", setup: "", session: "", outcome: "" });
  const setFilter = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const reset = () => { setPeriod("month"); setCustom({ from: "", to: "" }); setF({ account: "", symbol: "", dir: "", setup: "", session: "", outcome: "" }); };

  const all = trades || [];
  const range = periodRange(period, new Date(), custom);
  const list = useMemo(() => filterTrades(all, { ...f, range }), [all, f, range.from, range.to]); // eslint-disable-line react-hooks/exhaustive-deps
  const account = accounts.find((a) => a.id === f.account) || null;
  const k = useMemo(() => kpis(list, { beThreshold, startBalance: Number(account?.size) || 0 }), [list, beThreshold, account]);

  const options = {
    symbol: distinct(all, "symbol"), setup: distinct(all, "setup"), session: distinct(all, "session"),
  };

  function exportCsv() {
    const blob = new Blob([tradesToCsv(list)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `mytradebook-trades-${range.from || "all"}_${range.to || "all"}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  const activeFilters = Object.values(f).filter(Boolean).length + (period !== "month" ? 1 : 0);

  return (
    <main className="min-h-full bg-prism-bg p-4 sm:p-8">
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{en ? "Reports" : "Rapports"}</h1>
          <p className="mt-1 text-sm text-prism-muted">
            {k.n} trade{k.n > 1 ? "s" : ""} · {range.from ? `${range.from} → ${range.to || "…"}` : en ? "all time" : "tout l'historique"}
          </p>
        </div>
        <button type="button" onClick={exportCsv} disabled={!list.length} className="inline-flex h-9 items-center gap-2 self-start rounded-lg border border-[rgba(6,182,212,0.45)] bg-[rgba(6,182,212,0.06)] px-3.5 text-xs font-semibold text-prism-accent hover:bg-[rgba(6,182,212,0.12)] disabled:opacity-40 sm:self-auto">
          <Download className="h-4 w-4" /> {en ? "Export CSV" : "Export CSV"}
        </button>
      </header>

      {/* Filtres globaux */}
      <div className="-mx-4 lg:sticky lg:top-0 lg:z-20 mb-4 border-b border-prism-line bg-prism-bg/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-x-auto rounded-lg border border-prism-line p-0.5">
            {PERIODS.map(([v, fr, enL]) => (
              <button key={v} type="button" onClick={() => setPeriod(v)} className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-semibold ${period === v ? "bg-prism-accentDim text-prism-accent" : "text-prism-muted hover:text-prism-text"}`}>{en ? enL : fr}</button>
            ))}
          </div>
          {period === "custom" && (
            <div className="flex items-center gap-1.5">
              <input type="date" className={`${DATE} w-36`} value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
              <span className="text-prism-muted2">→</span>
              <input type="date" className={`${DATE} w-36`} value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
            </div>
          )}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap">
          <select className={SELECT} value={f.account} onChange={(e) => setFilter("account", e.target.value)}>
            <option value="">{en ? "All accounts" : "Tous les comptes"}</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.note || a.firm} · ${Number(a.size || 0).toLocaleString("en-US")}</option>)}
          </select>
          <select className={SELECT} value={f.symbol} onChange={(e) => setFilter("symbol", e.target.value)}>
            <option value="">{en ? "All symbols" : "Tous les symboles"}</option>
            {options.symbol.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className={SELECT} value={f.dir} onChange={(e) => setFilter("dir", e.target.value)}>
            <option value="">Long + Short</option><option value="long">Long</option><option value="short">Short</option>
          </select>
          <select className={SELECT} value={f.setup} onChange={(e) => setFilter("setup", e.target.value)}>
            <option value="">{en ? "All setups" : "Tous les setups"}</option>
            {options.setup.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className={SELECT} value={f.session} onChange={(e) => setFilter("session", e.target.value)}>
            <option value="">{en ? "All sessions" : "Toutes les sessions"}</option>
            {options.session.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className={SELECT} value={f.outcome} onChange={(e) => setFilter("outcome", e.target.value)}>
            <option value="">TP + SL + BE</option><option value="TP">TP</option><option value="SL">SL</option><option value="BE">BE</option>
          </select>
          {activeFilters > 0 && (
            <button type="button" onClick={reset} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-prism-line px-3 text-[11px] font-semibold text-prism-muted hover:text-prism-text">
              <RotateCcw className="h-3.5 w-3.5" /> {en ? "Reset" : "Réinitialiser"}
            </button>
          )}
        </div>
      </div>

      {/* Onglets */}
      <nav className="mb-5 flex gap-1 overflow-x-auto border-b border-prism-line">
        {TABS.map(([v, fr, enL]) => (
          <button key={v} type="button" onClick={() => setTab(v)} className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold ${tab === v ? "border-prism-accent text-prism-accent" : "border-transparent text-prism-muted hover:text-prism-text"}`}>{en ? enL : fr}</button>
        ))}
      </nav>

      {!list.length && tab !== "compare" ? (
        <Panel><Empty>{en ? "No trade matches these filters." : "Aucun trade ne correspond à ces filtres."}</Empty></Panel>
      ) : (
        <>
          {tab === "overview" && <Overview list={list} k={k} en={en} lang={lang} startBalance={Number(account?.size) || 0} />}
          {tab === "time" && <TimeTab list={list} en={en} DAYS={DAYS} beThreshold={beThreshold} />}
          {tab === "setups" && <SetupsTab list={list} en={en} beThreshold={beThreshold} />}
          {tab === "risk" && <RiskTab list={list} k={k} en={en} account={account} allTrades={all} certificates={certificates} lang={lang} />}
          {tab === "discipline" && <DisciplineTab list={list} en={en} beThreshold={beThreshold} />}
          {tab === "compare" && <CompareTab all={all} filters={f} en={en} beThreshold={beThreshold} />}
        </>
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  1. Vue d'ensemble                                                   */
/* ------------------------------------------------------------------ */

function Overview({ list, k, en, lang, startBalance }) {
  const eq = equitySeries(list, startBalance);
  const byDay = dailyPnL(list);
  const weeks = {};
  Object.entries(byDay).forEach(([d, v]) => {
    const dt = new Date(`${d}T12:00:00`);
    dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
    const key = dt.toISOString().slice(0, 10);
    if (!weeks[key]) weeks[key] = { value: 0, n: 0 };
    weeks[key].value += v;
  });
  list.forEach((t) => {
    const dt = new Date(`${t.date}T12:00:00`);
    dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
    const key = dt.toISOString().slice(0, 10);
    if (weeks[key]) weeks[key].n += 1;
  });
  const weekRows = Object.entries(weeks).sort(([a], [b]) => a.localeCompare(b)).slice(-16)
    .map(([d, w]) => ({ label: `${en ? "Week of" : "Sem. du"} ${d.slice(8, 10)}/${d.slice(5, 7)}`, short: `${d.slice(8, 10)}/${d.slice(5, 7)}`, value: w.value, n: w.n }));

  const cards = [
    [en ? "Net P&L" : "P&L net", money(k.net, { sign: true, dec: 2 }), `${k.n} trades`, tone(k.net)],
    ["Win rate", pct(k.winRate), `${k.wins}W · ${k.losses}L · ${k.bes}BE`],
    ["Profit factor", pf(k.profitFactor), null, k.profitFactor >= 1 ? "text-prism-win" : k.profitFactor ? "text-prism-loss" : ""],
    [en ? "Expectancy" : "Espérance", money(k.expectancy, { sign: true, dec: 2 }), `${fmtR(k.expectancyR)} / trade`, tone(k.expectancy)],
    [en ? "Total R" : "R total", fmtR(k.rTotal, 1), null, tone(k.rTotal)],
    [en ? "Avg win / loss" : "Gain / perte moy.", `${money(k.avgWin)} / ${money(-k.avgLoss)}`, k.avgLoss ? `ratio ${(k.avgWin / k.avgLoss).toFixed(2)}` : null],
    [en ? "Best / worst" : "Meilleur / pire", `${money(k.best, { sign: true })} / ${money(k.worst)}`],
    ["Max drawdown", money(-k.maxDD), startBalance ? `${k.maxDDPct.toFixed(2)}%` : null, k.maxDD ? "text-prism-loss" : ""],
    ["Sharpe / Sortino", `${k.sharpe == null ? "—" : k.sharpe.toFixed(2)} / ${k.sortino == null ? "—" : k.sortino.toFixed(2)}`, en ? "daily P&L" : "P&L journalier"],
    [en ? "Green / red days" : "Jours verts / rouges", `${k.greenDays} / ${k.redDays}`, `${k.days} ${en ? "days traded" : "jours tradés"}`],
    [en ? "Best win streak" : "Série max gains", String(k.bestWinStreak), null, "text-prism-win"],
    [en ? "Worst loss streak" : "Série max pertes", String(k.bestLossStreak), null, k.bestLossStreak ? "text-prism-loss" : ""],
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-6">
        {cards.map(([label, value, sub, color]) => <Kpi key={label} label={label} value={value} sub={sub} color={color} />)}
      </div>
      <Panel title={en ? "Equity & drawdown" : "Equity & drawdown"}>
        {eq.points.length < 2 ? <Empty>{en ? "At least 2 trades are needed." : "Il faut au moins 2 trades."}</Empty> : <EquityChart points={eq.points} />}
      </Panel>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Panel title={en ? "P&L calendar" : "Calendrier P&L"}><MonthCalendar byDay={byDay} lang={lang} /></Panel>
        <Panel title={en ? "P&L by week" : "P&L par semaine"}>
          {weekRows.length ? <VBars rows={weekRows} height={200} /> : <Empty>—</Empty>}
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  2. Temps                                                            */
/* ------------------------------------------------------------------ */

function TimeTab({ list, en, DAYS, beThreshold }) {
  const hm = heatmap(list);
  const byHour = groupBy(list, entryHour, beThreshold).sort((a, b) => a.key - b.key);
  const bySession = groupBy(list, (t) => t.session, beThreshold).sort((a, b) => b.net - a.net);
  const byWeekday = groupBy(list, weekday, beThreshold).sort((a, b) => a.key - b.key);
  const byDuration = groupBy(list, durationBucket, beThreshold);
  const durRows = DURATION_BUCKETS.map((b) => {
    const g = byDuration.find((x) => x.key === b.key);
    return g ? { ...g, label: en ? b.en : b.fr } : null;
  }).filter(Boolean);
  const missingTime = list.length - hm.counted;

  return (
    <div className="space-y-4">
      <Panel title={en ? "Heatmap · weekday × entry hour" : "Heatmap · jour × heure d'entrée"}
        info={en ? "Colour = P&L, number = trades. Uses the entry time filled in the journal." : "Couleur = P&L, chiffre = nombre de trades. Utilise l'heure d'entrée saisie dans le journal."}>
        {hm.counted < 3 ? (
          <Empty>{en ? `Not enough data — needs 3 trades with an entry time (${hm.counted} now).` : `Pas assez de données — il faut 3 trades avec une heure d'entrée (${hm.counted} actuellement).`}</Empty>
        ) : (
          <>
            <Heatmap cells={hm.cells} minHour={hm.minHour} maxHour={hm.maxHour} days={DAYS} />
            {missingTime > 0 && <p className="mt-2 text-[10px] text-prism-muted2">{missingTime} trade{missingTime > 1 ? "s" : ""} {en ? "without entry time excluded." : "sans heure d'entrée exclu(s)."}</p>}
          </>
        )}
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={en ? "P&L by entry hour" : "P&L par heure d'entrée"}>
          {byHour.length ? <VBars rows={byHour.map((g) => ({ label: `${String(g.key).padStart(2, "0")}h`, value: g.net, n: g.n }))} /> : <Empty>{en ? "No entry time filled." : "Aucune heure d'entrée renseignée."}</Empty>}
        </Panel>
        <Panel title={en ? "P&L by session" : "P&L par session"}>
          <HBars rows={bySession.map((g) => ({ label: g.key, value: g.net, g }))} sub={(r) => `${r.g.n} · WR ${pct(r.g.winRate)}`} />
        </Panel>
        <Panel title={en ? "P&L by weekday" : "P&L par jour de semaine"}>
          <HBars rows={byWeekday.map((g) => ({ label: DAYS[g.key], value: g.net, g }))} sub={(r) => `${r.g.n} · WR ${pct(r.g.winRate)}`} />
        </Panel>
        <Panel title={en ? "Trade duration" : "Durée des trades"} info={en ? "Entry → exit time, intraday trades only." : "Heure d'entrée → heure de sortie, trades intraday uniquement."}>
          {durRows.length ? <StatTable rows={durRows.map((r) => ({ ...r, key: DURATION_BUCKETS.findIndex((b) => b.key === r.key) }))} label={en ? "Duration" : "Durée"} en={en} order="key" /> : <Empty>{en ? "Fill entry and exit times to see this." : "Renseigne l'heure d'entrée et de sortie pour voir ce bloc."}</Empty>}
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  3. Setups & confluences                                             */
/* ------------------------------------------------------------------ */

function SetupsTab({ list, en, beThreshold }) {
  const none = en ? "No setup" : "Sans setup";
  const bySetup = groupBy(list, (t) => t.setup || none, beThreshold);
  const sessions = [...new Set(list.map((t) => t.session).filter(Boolean))];
  const setups = bySetup.sort((a, b) => b.n - a.n).map((g) => g.key);
  const matrix = {};
  list.forEach((t) => {
    const key = `${t.setup || none}|${t.session}`;
    if (!matrix[key]) matrix[key] = [];
    matrix[key].push(t);
  });
  const maxCell = Math.max(1, ...Object.values(matrix).map((ts) => Math.abs(ts.reduce((s, t) => s + pnlOf(t), 0))));
  const byTag = groupBy(list, (t) => t.tags || [], beThreshold).sort((a, b) => b.net - a.net).slice(0, 14);
  const bySymbol = groupBy(list, (t) => String(t.symbol || "").toUpperCase(), beThreshold);
  const byDir = groupBy(list, (t) => t.dir, beThreshold);
  const byGrade = groupBy(list, (t) => t.grade, beThreshold);
  const byRating = groupBy(list, (t) => (t.execution?.rating ? `${"★".repeat(Number(t.execution.rating))}` : null), beThreshold);

  return (
    <div className="space-y-4">
      <Panel title={en ? "By setup" : "Par setup"}>
        <StatTable rows={bySetup} label="Setup" en={en} extra={[
          ["best", en ? "Best" : "Meilleur", (r) => <span className="text-prism-win">{money(r.best, { sign: true })}</span>],
          ["worst", en ? "Worst" : "Pire", (r) => <span className="text-prism-loss">{money(r.worst)}</span>],
        ]} />
      </Panel>

      <Panel title={en ? "Setup × session matrix" : "Matrice setup × session"} info={en ? "P&L per cell, trades and win rate below." : "P&L par case, nombre de trades et win rate en dessous."}>
        {!sessions.length ? <Empty>—</Empty> : (
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[480px] border-separate text-xs" style={{ borderSpacing: 3 }}>
              <thead><tr><th />{sessions.map((s) => <th key={s} className="px-2 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-prism-muted2">{s}</th>)}</tr></thead>
              <tbody>
                {setups.map((s) => (
                  <tr key={s}>
                    <td className="max-w-[140px] truncate pr-2 font-medium">{s}</td>
                    {sessions.map((sess) => {
                      const ts = matrix[`${s}|${sess}`];
                      if (!ts) return <td key={sess} className="rounded-md bg-white/[0.03] py-2 text-center text-prism-muted2">·</td>;
                      const g = groupStats(ts, beThreshold);
                      const a = 0.12 + (Math.abs(g.net) / maxCell) * 0.6;
                      return (
                        <td key={sess} className="rounded-md px-2 py-2 text-center" style={{ background: g.net >= 0 ? `rgba(34,197,94,${a})` : `rgba(239,68,68,${a})` }}>
                          <div className="font-mono font-bold text-white">{money(g.net, { sign: true })}</div>
                          <div className="text-[9px] text-white/70">{g.n} · {pct(g.winRate)}</div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={en ? "By tag / confluence" : "Par tag / confluence"}>
          {byTag.length ? <HBars rows={byTag.map((g) => ({ label: g.key, value: g.net, g }))} sub={(r) => `${r.g.n} · WR ${pct(r.g.winRate)}`} /> : <Empty>{en ? "No tags on these trades." : "Aucun tag sur ces trades."}</Empty>}
        </Panel>
        <Panel title={en ? "Long vs short" : "Long vs short"}>
          <div className="grid grid-cols-2 gap-3">
            {["long", "short"].map((d) => {
              const g = byDir.find((x) => x.key === d);
              return (
                <div key={d} className={`rounded-lg border p-3 ${d === "long" ? "border-[rgba(34,197,94,0.3)]" : "border-[rgba(239,68,68,0.3)]"}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-[.14em] ${d === "long" ? "text-prism-win" : "text-prism-loss"}`}>{d}</p>
                  <p className={`mt-1 font-mono text-lg font-bold ${tone(g?.net || 0)}`}>{g ? money(g.net, { sign: true }) : "—"}</p>
                  <p className="text-[10px] text-prism-muted2">{g ? `${g.n} trades · WR ${pct(g.winRate)} · PF ${pf(g.profitFactor)}` : "0 trade"}</p>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel title={en ? "By symbol" : "Par symbole"}><StatTable rows={bySymbol} label={en ? "Symbol" : "Symbole"} en={en} /></Panel>
        <Panel title={en ? "By execution grade" : "Par grade d'exécution"}><StatTable rows={byGrade} label="Grade" en={en} /></Panel>
        {byRating.length > 0 && <Panel title={en ? "By trade rating" : "Par note du trade"}><StatTable rows={byRating} label={en ? "Rating" : "Note"} en={en} order="key" /></Panel>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  4. Risque & exécution                                               */
/* ------------------------------------------------------------------ */

function RiskTab({ list, k, en, account, allTrades, certificates, lang }) {
  const bins = rHistogram(list);
  const outcomes = ["TP", "SL", "BE"].map((o) => {
    const ts = list.filter((t) => t.outcome === o);
    return { label: o, value: ts.length, net: ts.reduce((s, t) => s + pnlOf(t), 0), color: o === "TP" ? GREEN : o === "SL" ? RED : MUTED };
  });
  const noOutcome = list.filter((t) => !t.outcome).length;
  const pvr = plannedVsRealized(list);
  const bySize = groupBy(list, (t) => (Number(t.execution?.size) > 0 ? Number(t.execution.size) : null)).sort((a, b) => a.key - b.key);
  const dds = drawdownPeriods(list).slice(0, 5);
  const health = account ? accountHealth(account, allTrades, certificates, lang) : null;
  const buffer = health?.ddMargin != null && Number.isFinite(health.ddMargin) ? health.ddMargin : null;
  const units = buffer != null && k.avgLoss ? buffer / k.avgLoss : null;
  const payoff = k.avgLoss ? k.avgWin / k.avgLoss : 0;
  const ror = units != null ? riskOfRuin(k.winRate, payoff, units) : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel title={en ? "R distribution" : "Distribution des R"} info={en ? "Buckets of 0.5R, clipped to [-3R ; +5R]." : "Tranches de 0,5R, bornées à [-3R ; +5R]."}>
          <Histogram bins={bins} />
          <p className="mt-3 text-[11px] text-prism-muted">
            {en ? "Avg win" : "Gain moyen"} <b className="font-mono text-prism-win">{fmtR(k.avgWinR)}</b> · {en ? "avg loss" : "perte moyenne"} <b className="font-mono text-prism-loss">{fmtR(k.avgLossR)}</b>
          </p>
        </Panel>
        <Panel title={en ? "Exits TP / SL / BE" : "Sorties TP / SL / BE"}>
          <div className="flex items-center gap-5">
            <Donut parts={outcomes} />
            <div className="flex-1 space-y-2">
              {outcomes.map((o) => (
                <div key={o.label} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: o.color }} />{o.label} <span className="text-prism-muted2">{o.value}</span></span>
                  <span className={`font-mono ${tone(o.net)}`}>{money(o.net, { sign: true })}</span>
                </div>
              ))}
              {noOutcome > 0 && <p className="text-[10px] text-prism-muted2">{noOutcome} {en ? "without exit type" : "sans type de sortie"}</p>}
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={en ? "Planned vs realized" : "Profit prévu vs réalisé"} info={en ? "Winning trades with a planned profit: realized ÷ planned." : "Trades gagnants avec un profit prévu : réalisé ÷ prévu."}>
          {pvr.rows.length < 1 ? <Empty>{en ? "Fill the planned profit on winning trades." : "Renseigne le profit prévu sur tes trades gagnants."}</Empty> : (
            <>
              <p className={`font-mono text-3xl font-bold ${pvr.efficiency >= 100 ? "text-prism-win" : pvr.efficiency >= 70 ? "text-prism-accent" : "text-prism-loss"}`}>{pvr.efficiency.toFixed(0)}%</p>
              <p className="mt-1 text-[11px] text-prism-muted">{en ? "average efficiency on" : "efficacité moyenne sur"} {pvr.rows.length} trade{pvr.rows.length > 1 ? "s" : ""}</p>
              <p className="mt-3 text-[11px] text-prism-muted2">{en ? "Left on the table:" : "Laissé sur la table :"} <span className="font-mono text-prism-loss">{money(-pvr.rows.reduce((s, r) => s + Math.max(0, r.planned - r.realized), 0))}</span></p>
            </>
          )}
        </Panel>
        <Panel title={en ? "Risk of ruin" : "Risque de ruine"}
          info={en ? "Classic fixed-payoff formula: ((1−edge)/(1+edge))^N, edge from win rate and avg win/avg loss, N = drawdown buffer left ÷ average loss." : "Formule classique à gains/pertes fixes : ((1−edge)/(1+edge))^N, edge calculé avec le win rate et le ratio gain/perte moyen, N = marge de drawdown restante ÷ perte moyenne."}>
          {!account ? <Empty>{en ? "Pick an account in the filters." : "Choisis un compte dans les filtres."}</Empty>
            : buffer == null ? <Empty>{en ? "This account has no max drawdown set." : "Ce compte n'a pas de drawdown max renseigné."}</Empty>
            : ror == null ? <Empty>{en ? "Needs at least one win and one loss." : "Il faut au moins un gain et une perte."}</Empty>
            : (
              <>
                <p className={`font-mono text-3xl font-bold ${ror < 5 ? "text-prism-win" : ror < 25 ? "text-amber-400" : "text-prism-loss"}`}>{ror < 0.1 ? "< 0.1" : ror.toFixed(1)}%</p>
                <p className="mt-1 text-[11px] text-prism-muted">{en ? "Buffer left" : "Marge restante"} {money(buffer)} ≈ {units.toFixed(1)} {en ? "average losses" : "pertes moyennes"}</p>
              </>
            )}
        </Panel>
        <Panel title={en ? "By position size" : "Par taille de position"}>
          {bySize.length ? <StatTable rows={bySize.map((g) => ({ ...g, label: `${g.key} ${en ? "ct" : "ct"}` }))} label={en ? "Size" : "Taille"} en={en} order="key" /> : <Empty>{en ? "No size filled." : "Aucune taille renseignée."}</Empty>}
        </Panel>
      </div>

      <Panel title={en ? "Drawdown periods" : "Périodes de drawdown"} info={en ? "On the daily equity curve, deepest first." : "Sur la courbe journalière, les plus profondes d'abord."}>
        {!dds.length ? <Empty>{en ? "No drawdown in this period." : "Aucun drawdown sur la période."}</Empty> : (
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[420px] text-xs">
              <thead><tr className="border-b border-prism-line text-[9px] uppercase tracking-[.12em] text-prism-muted2">
                <th className="px-2 py-2 text-left">{en ? "Start" : "Début"}</th><th className="px-2 py-2 text-left">{en ? "Trough" : "Creux"}</th>
                <th className="px-2 py-2 text-right">{en ? "Depth" : "Profondeur"}</th><th className="px-2 py-2 text-right">{en ? "Days" : "Jours"}</th>
                <th className="px-2 py-2 text-right">{en ? "Recovered" : "Récupéré"}</th>
              </tr></thead>
              <tbody>{dds.map((d) => (
                <tr key={`${d.start}-${d.trough}`} className="border-b border-prism-line last:border-0">
                  <td className="px-2 py-2 font-mono">{d.start}</td><td className="px-2 py-2 font-mono">{d.trough}</td>
                  <td className="px-2 py-2 text-right font-mono text-prism-loss">{money(-d.depth)}</td>
                  <td className="px-2 py-2 text-right font-mono">{d.days}</td>
                  <td className="px-2 py-2 text-right font-mono">{d.recovered || <span className="text-amber-400">{en ? "ongoing" : "en cours"}</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  5. Discipline & psychologie                                         */
/* ------------------------------------------------------------------ */

function DisciplineTab({ list, en, beThreshold }) {
  const pair = (pred, yes, no) => [
    { key: "y", label: yes, good: true, ...groupStats(list.filter((t) => pred(t) === true), beThreshold) },
    { key: "n", label: no, good: false, ...groupStats(list.filter((t) => pred(t) === false), beThreshold) },
  ];
  const yn = (v) => (v === "yes" ? true : v === "no" ? false : null);
  const outOfPlan = list.filter((t) => t.plan === false);
  const mistakesCost = outOfPlan.reduce((s, t) => s + Math.min(0, pnlOf(t)), 0);
  const byEmotion = groupBy(list, (t) => t.emotion, beThreshold).map((g) => ({ ...g, label: EMOTION_BY_KEY[g.key] ? `${EMOTION_BY_KEY[g.key].e} ${en ? EMOTION_BY_KEY[g.key].en : EMOTION_BY_KEY[g.key].fr}` : g.key }));
  const psychoKeys = [["emotional", en ? "Emotional state" : "État émotionnel"], ["focus", "Focus"], ["confidence", en ? "Confidence" : "Confiance"]];
  const withPsycho = list.filter((t) => t.psychology && Object.keys(t.psychology).some((key) => ["emotional", "focus", "confidence"].includes(key)));
  const checklist = groupBy(withPsycho, (t) => {
    const n = (t.psychology?.checks || []).length;
    return n >= 5 ? (en ? "5/5 checks" : "5/5 cochés") : n >= 3 ? "3–4/5" : "0–2/5";
  }, beThreshold);
  const after = afterLosses(list, beThreshold);
  const idx = tradeIndexInDay(list);
  const byIndex = groupBy(list, idx, beThreshold).sort((a, b) => a.key - b.key).map((g) => ({ ...g, label: g.key === 4 ? (en ? "4th +" : "4e et +") : `${g.key}${en ? (g.key === 1 ? "st" : g.key === 2 ? "nd" : "rd") : g.key === 1 ? "er" : "e"}` }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <YesNoCompare en={en} title={en ? "Plan followed" : "Plan respecté"} rows={pair((t) => (t.plan == null ? null : !!t.plan), en ? "Yes" : "Oui", en ? "No" : "Non")} />
        <YesNoCompare en={en} title={en ? "Rules followed" : "Règles suivies"} rows={pair((t) => yn(t.execution?.followed_rules), en ? "Yes" : "Oui", en ? "No" : "Non")} />
        <YesNoCompare en={en} title={en ? "Emotions controlled" : "Émotions contrôlées"} rows={pair((t) => yn(t.execution?.controlled_emotions), en ? "Yes" : "Oui", en ? "No" : "Non")} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={en ? "Cost of mistakes" : "Coût des erreurs"} info={en ? "Sum of losses on trades marked outside the plan." : "Somme des pertes sur les trades marqués hors plan."}>
          <p className={`font-mono text-3xl font-bold ${mistakesCost < 0 ? "text-prism-loss" : "text-prism-muted"}`}>{money(mistakesCost)}</p>
          <p className="mt-1 text-[11px] text-prism-muted">{outOfPlan.length} trade{outOfPlan.length > 1 ? "s" : ""} {en ? "outside the plan" : "hors plan"} · {list.length ? pct((outOfPlan.length / list.length) * 100) : "—"}</p>
        </Panel>
        <Panel title={en ? "After consecutive losses" : "Après des pertes consécutives"} info={en ? "Result of the next trade on the same day." : "Résultat du trade suivant, le même jour."} className="lg:col-span-2">
          {after.every((g) => !g.n) ? <Empty>{en ? "Needs several trades on the same day after a loss." : "Il faut plusieurs trades le même jour après une perte."}</Empty> : <StatTable rows={after.filter((g) => g.n).map((g) => ({ ...g, label: `${en ? "After" : "Après"} ${g.key}${g.key === 3 ? "+" : ""} ${en ? "loss" : "perte"}${g.key > 1 ? "s" : ""}` }))} label={en ? "Context" : "Contexte"} en={en} />}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={en ? "By trade # in the day" : "Par n° de trade dans la journée"}><StatTable rows={byIndex} label="#" en={en} order="key" /></Panel>
        <Panel title={en ? "By emotion" : "Par émotion"}>
          {byEmotion.length ? <HBars rows={byEmotion.map((g) => ({ label: g.label, value: g.net, g }))} sub={(r) => `${r.g.n} · WR ${pct(r.g.winRate)}`} /> : <Empty>{en ? "No emotion logged." : "Aucune émotion renseignée."}</Empty>}
        </Panel>
        <Panel title={en ? "Pre-trade check-in" : "Check-in psycho avant l'entrée"} className="lg:col-span-2">
          {withPsycho.length < 3 ? <Empty>{en ? `Not enough data — needs 3 trades with a check-in (${withPsycho.length} now).` : `Pas assez de données — il faut 3 trades avec un check-in (${withPsycho.length} actuellement).`}</Empty> : (
            <div className="grid gap-4 md:grid-cols-2">
              {psychoKeys.map(([key, label]) => (
                <div key={key}>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[.12em] text-prism-muted">{label}</p>
                  <StatTable rows={groupBy(withPsycho, (t) => (t.psychology?.[key] ? Number(t.psychology[key]) : null), beThreshold).map((g) => ({ ...g, label: `${g.key}/5` }))} label={en ? "Level" : "Niveau"} en={en} order="key" />
                </div>
              ))}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[.12em] text-prism-muted">Checklist</p>
                <StatTable rows={checklist} label="Checks" en={en} />
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  6. Comparaison                                                      */
/* ------------------------------------------------------------------ */

function CompareTab({ all, filters, en, beThreshold }) {
  const [kind, setKind] = useState("month");
  const [a, setA] = useState(null);
  const [b, setB] = useState(null);
  const rangeA = a || (kind === "month" ? periodRange("month") : periodRange(kind));
  const rangeB = b || previousRange(kind);
  const ka = kpis(filterTrades(all, { ...filters, range: rangeA }), { beThreshold });
  const kb = kpis(filterTrades(all, { ...filters, range: rangeB }), { beThreshold });
  const rows = [
    ["Trades", "n", (v) => v, null],
    [en ? "Net P&L" : "P&L net", "net", (v) => money(v, { sign: true }), true, (d) => money(d, { sign: true })],
    ["Win rate", "winRate", pct, true, (d) => `${d > 0 ? "+" : ""}${d.toFixed(1)} pts`],
    ["Profit factor", "profitFactor", pf, true],
    [en ? "Expectancy" : "Espérance", "expectancy", (v) => money(v, { sign: true, dec: 2 }), true, (d) => money(d, { sign: true, dec: 2 })],
    [en ? "Expectancy R" : "Espérance R", "expectancyR", (v) => fmtR(v), true, (d) => fmtR(d)],
    [en ? "Total R" : "R total", "rTotal", (v) => fmtR(v, 1), true, (d) => fmtR(d, 1)],
    [en ? "Avg win" : "Gain moyen", "avgWin", (v) => money(v), true, (d) => money(d, { sign: true })],
    [en ? "Avg loss" : "Perte moyenne", "avgLoss", (v) => money(-v), false, (d) => money(-d, { sign: true })],
    ["Max drawdown", "maxDD", (v) => money(-v), false, (d) => money(-d, { sign: true })],
    [en ? "Green days" : "Jours verts", "greenDays", (v) => v, true],
    [en ? "Red days" : "Jours rouges", "redDays", (v) => v, false],
  ];
  const dateInput = (value, onChange) => <input type="date" className={`${DATE} w-full`} value={value} onChange={(e) => onChange(e.target.value)} />;
  return (
    <div className="space-y-4">
      <Panel title={en ? "Periods" : "Périodes"}>
        <div className="flex flex-wrap items-center gap-2">
          {[["week", en ? "Week vs previous" : "Semaine vs précédente"], ["month", en ? "Month vs previous" : "Mois vs précédent"], ["quarter", en ? "Quarter vs previous" : "Trimestre vs précédent"], ["year", en ? "Year vs previous" : "Année vs précédente"]].map(([v, l]) => (
            <button key={v} type="button" onClick={() => { setKind(v); setA(null); setB(null); }} className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold ${kind === v && !a && !b ? "border-prism-accent bg-prism-accentDim text-prism-accent" : "border-prism-line text-prism-muted"}`}>{l}</button>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-[rgba(6,182,212,0.35)] p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[.12em] text-prism-accent">{en ? "Period A" : "Période A"}</p>
            <div className="grid grid-cols-2 gap-2">{dateInput(rangeA.from, (v) => setA({ ...rangeA, from: v }))}{dateInput(rangeA.to, (v) => setA({ ...rangeA, to: v }))}</div>
          </div>
          <div className="rounded-lg border border-prism-line p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[.12em] text-prism-muted">{en ? "Period B" : "Période B"}</p>
            <div className="grid grid-cols-2 gap-2">{dateInput(rangeB.from, (v) => setB({ ...rangeB, from: v }))}{dateInput(rangeB.to, (v) => setB({ ...rangeB, to: v }))}</div>
          </div>
        </div>
        <p className="mt-2 text-[10px] text-prism-muted2">{en ? "Account, symbol, setup… filters still apply." : "Les filtres compte, symbole, setup… restent appliqués."}</p>
      </Panel>
      <Panel>
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[420px] text-xs">
            <thead><tr className="border-b border-prism-line text-[9px] uppercase tracking-[.12em] text-prism-muted2">
              <th className="px-2 py-2 text-left">KPI</th><th className="px-2 py-2 text-right text-prism-accent">A</th><th className="px-2 py-2 text-right">B</th><th className="px-2 py-2 text-right">Δ</th>
            </tr></thead>
            <tbody>
              {rows.map(([label, key, fmt, higherIsBetter, fmtDelta]) => {
                const va = ka[key]; const vb = kb[key];
                const finite = Number.isFinite(va) && Number.isFinite(vb);
                const raw = finite ? va - vb : null;
                const d = raw != null && Math.abs(raw) < 0.005 ? 0 : raw;
                const good = d == null || d === 0 || higherIsBetter == null ? null : (d > 0) === higherIsBetter;
                return (
                  <tr key={key} className="border-b border-prism-line last:border-0">
                    <td className="px-2 py-2 text-prism-muted">{label}</td>
                    <td className="px-2 py-2 text-right font-mono">{ka.n || key === "n" ? fmt(va) : "—"}</td>
                    <td className="px-2 py-2 text-right font-mono">{kb.n || key === "n" ? fmt(vb) : "—"}</td>
                    <td className={`px-2 py-2 text-right font-mono ${good == null ? "text-prism-muted2" : good ? "text-prism-win" : "text-prism-loss"}`}>
                      {d == null || !ka.n || !kb.n ? "—" : fmtDelta ? fmtDelta(d) : `${d > 0 ? "+" : ""}${Number.isInteger(d) ? d : d.toFixed(2)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
