"use client";

import { useEffect, useMemo, useState } from "react";
import { Cpu, Play } from "lucide-react";
import { useBook } from "@/components/BookProvider";
import { Radar } from "@/components/charts";
import { DeltaBars, DrawdownChart, DurationScatter, Heat3D, RDistribution } from "@/components/analytics/charts";
import EquityLab from "@/components/analytics/EquityLab";
import MonthlyWrapped from "@/components/analytics/MonthlyWrapped";
import TradeCard from "@/components/analytics/TradeCard";
import { MONO_VARS, bestWindow, drawdownCurve, durationScatter, equityLab, heatGrid, monthlyRecap, monthsOf, rDistribution, sharpe, tradeDelta } from "@/lib/analytics";
import { computeStats } from "@/lib/stats";
import { fmtMoney } from "@/lib/format";

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONO_KEY = "mtb-analytics-mono";

function Panel({ title, sub, right, children, className = "" }) {
  return (
    <section className={`rounded-lg border border-prism-line bg-prism-panel p-4 sm:p-5 ${className}`}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-bold tracking-[.06em]">{title}</h2>
          {sub && <p className="mt-0.5 text-xs text-prism-muted">{sub}</p>}
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

function Kpi({ label, value, sub, tone }) {
  const color = tone === "win" ? "text-prism-win" : tone === "loss" ? "text-prism-loss" : "text-prism-text";
  return (
    <div className="bg-prism-panel px-4 py-3.5">
      <p className="text-[9.5px] font-semibold tracking-[.14em] text-prism-muted2">{label}</p>
      <p className={`mt-2 font-mono text-[22px] font-semibold leading-none ${color}`}>{value}</p>
      {sub && <p className="mt-1.5 truncate text-[10.5px] text-prism-muted2">{sub}</p>}
    </div>
  );
}

function Empty({ text }) {
  return <div className="grid h-40 place-items-center rounded-lg border border-dashed border-prism-line text-center text-xs text-prism-muted">{text}</div>;
}

export default function AnalyticsPage() {
  const { scopedTrades = [], accounts = [], profile = {}, lang } = useBook();
  const en = lang === "en";
  const [accountId, setAccountId] = useState("all");
  const [period, setPeriod] = useState("all");
  const [wrapped, setWrapped] = useState(null);
  const [mono, setMono] = useState(true);
  const [recapMonth, setRecapMonth] = useState("");

  useEffect(() => { try { const v = localStorage.getItem(MONO_KEY); if (v != null) setMono(v === "1"); } catch {} }, []);
  const toggleMono = () => setMono((m) => { try { localStorage.setItem(MONO_KEY, m ? "0" : "1"); } catch {} return !m; });

  const account = accounts.find((a) => a.id === accountId) || null;
  const byAccount = useMemo(() => scopedTrades.filter((t) => accountId === "all" || t.account_id === accountId), [scopedTrades, accountId]);
  const months = useMemo(() => monthsOf(byAccount), [byAccount]);
  const activeRecapMonth = recapMonth || months[0] || "";

  const trades = useMemo(() => {
    if (period === "all") return byAccount;
    const days = { "30": 30, "90": 90, "365": 365 }[period];
    const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
    return byAccount.filter((t) => String(t.date || "") >= since);
  }, [byAccount, period]);

  const startBalance = account ? Number(account.size) || 0 : 0;
  const lab = useMemo(() => equityLab(trades, startBalance), [trades, startBalance]);
  const grid = useMemo(() => heatGrid(trades), [trades]);
  const delta = useMemo(() => tradeDelta(trades), [trades]);
  const dist = useMemo(() => rDistribution(trades), [trades]);
  const dd = useMemo(() => drawdownCurve(trades, startBalance), [trades, startBalance]);
  const scatter = useMemo(() => durationScatter(trades), [trades]);
  const windows = useMemo(() => bestWindow(trades), [trades]);
  const stats = useMemo(() => computeStats(trades, 0), [trades]);
  const sh = useMemo(() => sharpe(trades), [trades]);
  const recap = useMemo(() => (activeRecapMonth ? monthlyRecap(byAccount, activeRecapMonth) : null), [byAccount, activeRecapMonth]);
  const limit = account?.max_drawdown != null ? Number(account.max_drawdown) : null;
  const sizes = trades.map((t) => Number(t.execution?.size)).filter((n) => n > 0);
  const avgSize = sizes.length ? sizes.reduce((a, b) => a + b, 0) / sizes.length : null;
  const dayLabels = en ? DAYS_EN : DAYS_FR;
  const winLabel = (w) => (w ? `${dayLabels[w.d]} ${String(w.h).padStart(2, "0")}h` : "—");
  const monthName = (m) => { const [y, mo] = m.split("-").map(Number); return new Date(y, mo - 1, 1).toLocaleDateString(en ? "en-US" : "fr-FR", { month: "short", year: "numeric" }); };
  const periods = en ? { all: "All", "30": "30d", "90": "90d", "365": "1y" } : { all: "Tout", "30": "30 j", "90": "90 j", "365": "1 an" };
  const themeStyle = mono ? MONO_VARS : undefined;

  return (
    <div style={themeStyle} className={mono ? "min-h-full bg-prism-bg" : ""}>
      <div className="mx-auto max-w-[1440px] px-4 py-6 text-prism-text sm:px-8">
        {/* Barre d'en-tête façon terminal */}
        <header className="mb-5 flex flex-wrap items-center gap-3 border-b border-prism-line pb-4">
          <div className="mr-auto">
            <p className="flex items-center gap-2 font-mono text-[10.5px] text-prism-muted2"><Cpu className="h-3.5 w-3.5" />{en ? "Analytics" : "Analyse"} <span>/</span> <span className="text-prism-text">Quant Lab</span></p>
            <h1 className="mt-1 text-[22px] font-bold tracking-tight">{en ? "Advanced analytics" : "Analyse avancée"}</h1>
          </div>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="h-9 rounded-md border border-prism-line bg-prism-panel px-3 text-xs">
            <option value="all">{en ? "All accounts" : "Tous les comptes"}</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.note || a.firm}</option>)}
          </select>
          <div className="flex overflow-hidden rounded-md border border-prism-line">
            {Object.entries(periods).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setPeriod(k)} className={`h-9 px-3 text-[11px] font-semibold ${period === k ? "bg-prism-text text-prism-bg" : "text-prism-muted hover:text-prism-text"}`}>{label}</button>
            ))}
          </div>
          <button type="button" onClick={toggleMono} className="inline-flex h-9 items-center gap-2 rounded-md border border-prism-line px-3 text-[11px] font-semibold text-prism-muted hover:text-prism-text" title={en ? "Trial theme" : "Thème à l'essai"}>
            <span className="inline-block h-3 w-3 rounded-full border border-current" style={{ background: mono ? "linear-gradient(90deg,#fff 50%,#000 50%)" : "var(--prism-accent)" }} />
            {mono ? (en ? "B&W theme (trial)" : "Thème N&B (essai)") : (en ? "Classic theme" : "Thème classique")}
          </button>
        </header>

        {/* KPI */}
        <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-prism-line bg-prism-line sm:grid-cols-3 lg:grid-cols-5">
          <Kpi label="EDGE SCORE" value={`${Math.round(stats.edge)}`} sub="/ 100" />
          <Kpi label="TRADES" value={trades.length} sub={`${stats.days.length} ${en ? "days" : "jours"}`} />
          <Kpi label="WIN RATE" value={`${stats.wr.toFixed(1)}%`} sub={`${stats.wins.length}W · ${stats.losses.length}L`} />
          <Kpi label="PROFIT FACTOR" value={stats.pf >= 99 ? "∞" : stats.pf.toFixed(2)} tone={stats.pf >= 1 ? "win" : "loss"} />
          <Kpi label={en ? "EXPECTANCY R" : "ESPÉRANCE R"} value={`${dist.mean >= 0 ? "+" : ""}${dist.mean.toFixed(2)}`} sub={`σ ${dist.sd.toFixed(2)}R`} tone={dist.mean >= 0 ? "win" : "loss"} />
          <Kpi label={en ? "EV / TRADE $" : "EV / TRADE $"} value={`${fmtMoney(trades.length ? stats.net / trades.length : 0)}`} sub="/trade" tone={stats.net >= 0 ? "win" : "loss"} />
          <Kpi label="MAX DD" value={fmtMoney(-dd.maxDD)} sub={limit ? `${Math.round((dd.maxDD / limit) * 100)}% ${en ? "of limit" : "de la limite"}` : null} tone="loss" />
          <Kpi label={en ? "TOTAL P&L" : "P&L TOTAL"} value={fmtMoney(stats.net)} tone={stats.net >= 0 ? "win" : "loss"} />
          <Kpi label="SHARPE" value={sh.toFixed(2)} sub={en ? "annualised, daily" : "annualisé, journalier"} tone={sh >= 0 ? "win" : "loss"} />
          <Kpi label={en ? "BEST / LEAK WINDOW" : "CRÉNEAU + / −"} value={winLabel(windows.best)} sub={`${en ? "leak" : "fuite"} : ${winLabel(windows.worst)}${avgSize ? ` · ${avgSize.toFixed(1)} ct` : ""}`} />
        </div>

        {/* Equity Lab */}
        <Panel title="EQUITY LAB" sub={en ? "Your executions like a backtest: curve, stability terrain, behaviour map and robustness." : "Tes exécutions comme un backtest : courbe, terrain de stabilité, carte comportementale et robustesse."} className="mb-5">
          <EquityLab key={`${accountId}-${period}-${lab.length}`} rows={lab} lang={lang} />
        </Panel>

        {/* Partage */}
        <div className="mb-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Panel title={en ? "TRADE CARD" : "CARTE DE TRADE"} sub={en ? "Turn any trade into a card ready for Instagram." : "Transforme n'importe quel trade en carte prête pour Instagram."}>
            <TradeCard key={mono ? "m" : "c"} trades={trades} lang={lang} defaultTheme={mono ? "mono" : "graphite"} />
          </Panel>
          <Panel title={en ? "MONTHLY RECAP" : "RÉCAP DU MOIS"} sub={en ? "Your month, stat by stat, ready to share." : "Ton mois, stat par stat, prêt à partager."}>
            {months.length ? (
              <div className="space-y-3">
                <select value={activeRecapMonth} onChange={(e) => setRecapMonth(e.target.value)} className="h-10 w-full rounded-md border border-prism-line bg-prism-panel px-3 text-sm capitalize">
                  {months.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
                </select>
                {recap && (
                  <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-prism-line bg-prism-line">
                    <Kpi label="NET" value={fmtMoney(recap.net)} tone={recap.net >= 0 ? "win" : "loss"} />
                    <Kpi label="TRADES" value={recap.count} sub={`${Math.round(recap.winRate)}% WR`} />
                  </div>
                )}
                <button type="button" disabled={!recap} onClick={() => setWrapped(recap)} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-prism-accent text-xs font-extrabold tracking-[.12em] text-black disabled:opacity-40">
                  <Play className="h-4 w-4" />{en ? "PLAY RECAP" : "LANCER LE RÉCAP"}
                </button>
              </div>
            ) : <Empty text={en ? "No trades yet." : "Pas encore de trades."} />}
          </Panel>
        </div>

        {/* Modules */}
        <div className="grid gap-5 lg:grid-cols-5">
          <Panel title={en ? "P&L TERRAIN" : "TERRAIN DU P&L"} sub={en ? "Day × hour of entry. Height = size of the result." : "Jour × heure d'entrée. Hauteur = taille du résultat."} className="lg:col-span-3">
            {grid.counted ? <Heat3D grid={grid} lang={lang} /> : <Empty text={en ? "Add entry times to your trades." : "Renseigne l'heure d'entrée de tes trades."} />}
          </Panel>
          <Panel title={en ? "TRADER PROFILE" : "PROFIL DU TRADER"} sub={en ? "Six axes scored 0 to 100." : "Six axes notés de 0 à 100."} className="lg:col-span-2">
            {trades.length ? <Radar axes={stats.axes} /> : <Empty text="—" />}
          </Panel>
          <Panel title={en ? "TRADE DELTA" : "DELTA DES TRADES"} sub={en ? "Every trade as a signed bar, cumulative P&L on top." : "Chaque trade en barre signée, P&L cumulé par-dessus."} className="lg:col-span-5">
            {delta.length > 1 ? <DeltaBars series={delta} lang={lang} /> : <Empty text="—" />}
          </Panel>
          <Panel title={en ? "R DISTRIBUTION" : "DISTRIBUTION DES R"} sub={en ? "Spread of results with a fitted bell curve." : "Répartition des résultats avec la cloche ajustée."} className="lg:col-span-2">
            {dist.n > 2 ? <RDistribution dist={dist} lang={lang} /> : <Empty text="—" />}
          </Panel>
          <Panel title={en ? "UNDERWATER VS LIMIT" : "SOUS L'EAU VS LIMITE"} sub={en ? "Pick an account to see its max drawdown limit." : "Choisis un compte pour voir sa limite de drawdown."} className="lg:col-span-3">
            {trades.length > 1 ? <DrawdownChart curve={dd} limit={limit} lang={lang} /> : <Empty text="—" />}
          </Panel>
          <Panel title={en ? "TIME IN TRADE × R" : "DURÉE × R"} sub={en ? "Do you cut winners short or hold losers too long?" : "Coupes-tu tes gagnants trop tôt ou gardes-tu tes perdants trop longtemps ?"} className="lg:col-span-5">
            {scatter.length > 2 ? <DurationScatter points={scatter} lang={lang} /> : <Empty text={en ? "Add entry and exit times." : "Renseigne les heures d'entrée et de sortie."} />}
          </Panel>
        </div>
      </div>

      {wrapped && <MonthlyWrapped recap={wrapped} name={profile.display_name || profile.name || ""} lang={lang} themeStyle={themeStyle} onClose={() => setWrapped(null)} />}
    </div>
  );
}
