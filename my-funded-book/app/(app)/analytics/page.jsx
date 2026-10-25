"use client";

import { useMemo, useState } from "react";
import { Activity, Clock3, Cpu, Gauge, Play, Sigma, TrendingDown, Zap } from "lucide-react";
import { useBook } from "@/components/BookProvider";
import { Radar } from "@/components/charts";
import { DeltaBars, DrawdownChart, DurationScatter, Heat3D, RDistribution } from "@/components/analytics/charts";
import MonthlyWrapped from "@/components/analytics/MonthlyWrapped";
import { bestWindow, drawdownCurve, durationScatter, heatGrid, monthlyRecap, monthsOf, rDistribution, tradeDelta } from "@/lib/analytics";
import { computeStats } from "@/lib/stats";
import { fmtMoney } from "@/lib/format";

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Panel({ code, title, sub, children, className = "" }) {
  return (
    <section className={`relative overflow-hidden rounded-xl border border-prism-line bg-prism-panel p-4 sm:p-5 ${className}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, var(--prism-accent, #3b82f6), transparent)", opacity: 0.6 }} />
      <header className="mb-3">
        <p className="font-mono text-[10px] font-bold tracking-[.18em] text-prism-accent">{code}</p>
        <h2 className="mt-1 text-sm font-bold tracking-wide">{title}</h2>
        {sub && <p className="mt-0.5 text-xs text-prism-muted">{sub}</p>}
      </header>
      {children}
    </section>
  );
}

function Tile({ icon: Icon, label, value, hint, tone }) {
  const color = tone === "win" ? "text-prism-win" : tone === "loss" ? "text-prism-loss" : "text-prism-text";
  return (
    <div className="rounded-xl border border-prism-line bg-prism-panel px-4 py-3">
      <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-[.14em] text-prism-muted2"><Icon className="h-3.5 w-3.5 text-prism-accent" />{label}</p>
      <p className={`mt-1.5 font-mono text-xl font-bold ${color}`}>{value}</p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-prism-muted">{hint}</p>}
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

  const account = accounts.find((a) => a.id === accountId) || null;
  const months = useMemo(() => monthsOf(scopedTrades), [scopedTrades]);
  const [recapMonth, setRecapMonth] = useState("");
  const activeRecapMonth = recapMonth || months[0] || "";

  const trades = useMemo(() => {
    let list = scopedTrades.filter((t) => accountId === "all" || t.account_id === accountId);
    if (period !== "all") {
      const days = { "30": 30, "90": 90, "365": 365 }[period];
      const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
      list = list.filter((t) => String(t.date || "") >= since);
    }
    return list;
  }, [scopedTrades, accountId, period]);

  const grid = useMemo(() => heatGrid(trades), [trades]);
  const delta = useMemo(() => tradeDelta(trades), [trades]);
  const dist = useMemo(() => rDistribution(trades), [trades]);
  const dd = useMemo(() => drawdownCurve(trades, account ? Number(account.size) || 0 : 0), [trades, account]);
  const scatter = useMemo(() => durationScatter(trades), [trades]);
  const windows = useMemo(() => bestWindow(trades), [trades]);
  const stats = useMemo(() => computeStats(trades, 0), [trades]);
  const limit = account?.max_drawdown != null ? Number(account.max_drawdown) : null;
  const dayLabels = en ? DAYS_EN : DAYS_FR;
  const winLabel = (w) => (w ? `${dayLabels[w.d]} ${String(w.h).padStart(2, "0")}h` : "—");

  const T = en ? {
    kicker: "QUANT LAB", title: "Advanced analytics", sub: "Order-flow style views of your own executions. Everything follows the filters.",
    all: "All accounts", periods: { all: "All", "30": "30 d", "90": "90 d", "365": "1 y" },
    recap: "Play monthly recap", exp: "EXPECTANCY", sd: "R VOLATILITY", mdd: "MAX DRAWDOWN", best: "BEST WINDOW", worst: "LEAK WINDOW", edge: "EDGE SCORE",
    h3: "P&L TERRAIN", h3s: "Day × hour of entry. Bar height = size of the result, colour = sign.",
    dl: "TRADE DELTA", dls: "Every trade as a signed bar, cumulative P&L on top.",
    rd: "R DISTRIBUTION", rds: "How your results are spread, with a fitted bell curve.",
    ddt: "UNDERWATER CURVE", dds: "Equity on top, drawdown below. Pick an account to see its max drawdown limit.",
    sc: "TIME IN TRADE × R", scs: "Do you cut winners short or hold losers too long?",
    rad: "TRADER PROFILE", rads: "Six axes scored from 0 to 100.",
    noTime: "Add entry and exit times to your trades to unlock this view.", none: "Not enough trades yet.",
  } : {
    kicker: "QUANT LAB", title: "Analyse avancée", sub: "Des vues façon order flow sur tes propres exécutions. Tout suit les filtres.",
    all: "Tous les comptes", periods: { all: "Tout", "30": "30 j", "90": "90 j", "365": "1 an" },
    recap: "Lancer le récap du mois", exp: "ESPÉRANCE", sd: "VOLATILITÉ DES R", mdd: "DRAWDOWN MAX", best: "MEILLEUR CRÉNEAU", worst: "CRÉNEAU QUI SAIGNE", edge: "EDGE SCORE",
    h3: "TERRAIN DU P&L", h3s: "Jour × heure d'entrée. Hauteur = taille du résultat, couleur = signe.",
    dl: "DELTA DES TRADES", dls: "Chaque trade en barre signée, P&L cumulé par-dessus.",
    rd: "DISTRIBUTION DES R", rds: "Comment tes résultats se répartissent, avec la courbe en cloche ajustée.",
    ddt: "COURBE SOUS L'EAU", dds: "Équité en haut, drawdown en bas. Choisis un compte pour voir sa limite de drawdown.",
    sc: "DURÉE × R", scs: "Coupes-tu tes gagnants trop tôt ou gardes-tu tes perdants trop longtemps ?",
    rad: "PROFIL DU TRADER", rads: "Six axes notés de 0 à 100.",
    noTime: "Renseigne l'heure d'entrée et de sortie de tes trades pour débloquer cette vue.", none: "Pas encore assez de trades.",
  };

  const recap = useMemo(() => (activeRecapMonth ? monthlyRecap(scopedTrades.filter((t) => accountId === "all" || t.account_id === accountId), activeRecapMonth) : null), [scopedTrades, accountId, activeRecapMonth]);
  const monthName = (m) => { const [y, mo] = m.split("-").map(Number); return new Date(y, mo - 1, 1).toLocaleDateString(en ? "en-US" : "fr-FR", { month: "short", year: "numeric" }); };

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 text-prism-text sm:px-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-bold tracking-[.18em] text-prism-accent"><Cpu className="h-4 w-4" />{T.kicker}</p>
          <h1 className="mt-2 text-[26px] font-bold tracking-tight">{T.title}</h1>
          <p className="mt-1 max-w-xl text-sm text-prism-muted">{T.sub}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="h-10 rounded-lg border border-prism-line bg-prism-panel px-3 text-sm">
            <option value="all">{T.all}</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.note || a.firm}</option>)}
          </select>
          <div className="flex h-10 rounded-lg border border-prism-line bg-prism-panel p-1">
            {Object.entries(T.periods).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setPeriod(k)} className={`rounded-md px-2.5 text-xs font-bold ${period === k ? "bg-prism-accentDim text-prism-accent" : "text-prism-muted hover:text-prism-text"}`}>{label}</button>
            ))}
          </div>
        </div>
      </header>

      {/* Récap du mois */}
      {months.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-prism-line p-4" style={{ background: "linear-gradient(110deg, color-mix(in srgb, var(--prism-accent, #3b82f6) 16%, transparent), transparent 60%)" }}>
          <div className="mr-auto">
            <p className="text-[10px] font-bold tracking-[.18em] text-prism-accent">{en ? "MONTHLY RECAP" : "RÉCAP DU MOIS"}</p>
            <p className="mt-0.5 text-sm text-prism-muted">{en ? "Your month, stat by stat, ready to share on Instagram." : "Ton mois, stat par stat, prêt à partager sur Instagram."}</p>
          </div>
          <select value={activeRecapMonth} onChange={(e) => setRecapMonth(e.target.value)} className="h-10 rounded-lg border border-prism-line bg-prism-panel px-3 text-sm capitalize">
            {months.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
          </select>
          <button type="button" disabled={!recap} onClick={() => setWrapped(recap)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-prism-accent px-4 text-xs font-extrabold tracking-[.12em] text-black disabled:opacity-40">
            <Play className="h-4 w-4" />{T.recap.toUpperCase()}
          </button>
        </div>
      )}

      {/* Tuiles quant */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Tile icon={Sigma} label={T.exp} value={`${dist.mean >= 0 ? "+" : ""}${dist.mean.toFixed(2)}R`} hint={`${dist.n} trades · ${en ? "median" : "médiane"} ${dist.median.toFixed(2)}R`} tone={dist.mean >= 0 ? "win" : "loss"} />
        <Tile icon={Activity} label={T.sd} value={`σ ${dist.sd.toFixed(2)}R`} hint={en ? "spread of your results" : "dispersion de tes résultats"} />
        <Tile icon={TrendingDown} label={T.mdd} value={fmtMoney(-dd.maxDD)} hint={limit ? `${Math.round((dd.maxDD / limit) * 100)}% ${en ? "of the limit" : "de la limite"}` : null} tone="loss" />
        <Tile icon={Zap} label={T.best} value={winLabel(windows.best)} hint={windows.best ? fmtMoney(windows.best.pnl) : null} tone="win" />
        <Tile icon={Clock3} label={T.worst} value={winLabel(windows.worst)} hint={windows.worst ? fmtMoney(windows.worst.pnl) : null} tone={windows.worst ? "loss" : undefined} />
        <Tile icon={Gauge} label={T.edge} value={`${Math.round(stats.edge)}/100`} hint={`PF ${stats.pf >= 99 ? "∞" : stats.pf.toFixed(2)} · WR ${Math.round(stats.wr)}%`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel code="01 / 3D" title={T.h3} sub={T.h3s} className="lg:col-span-3">
          {grid.counted ? <Heat3D grid={grid} lang={lang} /> : <Empty text={T.noTime} />}
        </Panel>
        <Panel code="02 / RADAR" title={T.rad} sub={T.rads} className="lg:col-span-2">
          {trades.length ? <Radar axes={stats.axes} /> : <Empty text={T.none} />}
        </Panel>
        <Panel code="03 / DELTA" title={T.dl} sub={T.dls} className="lg:col-span-5">
          {delta.length > 1 ? <DeltaBars series={delta} lang={lang} /> : <Empty text={T.none} />}
        </Panel>
        <Panel code="04 / DIST" title={T.rd} sub={T.rds} className="lg:col-span-2">
          {dist.n > 2 ? <RDistribution dist={dist} lang={lang} /> : <Empty text={T.none} />}
        </Panel>
        <Panel code="05 / DD" title={T.ddt} sub={T.dds} className="lg:col-span-3">
          {trades.length > 1 ? <DrawdownChart curve={dd} limit={limit} lang={lang} /> : <Empty text={T.none} />}
        </Panel>
        <Panel code="06 / SCATTER" title={T.sc} sub={T.scs} className="lg:col-span-5">
          {scatter.length > 2 ? <DurationScatter points={scatter} lang={lang} /> : <Empty text={T.noTime} />}
        </Panel>
      </div>

      {wrapped && <MonthlyWrapped recap={wrapped} name={profile.display_name || profile.name || ""} lang={lang} onClose={() => setWrapped(null)} />}
    </div>
  );
}
