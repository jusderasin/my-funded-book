"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Area } from "@/components/charts";
import WeeklyReportCard from "@/components/WeeklyReportCard";
import { useBook } from "@/components/BookProvider";
import { EmptyState, ProgressBar } from "@/components/prism/TerminalPrimitives";
import { fmtMoney, fmtR, frDate } from "@/lib/format";
import { accountHealth } from "@/lib/accountHealth";
import { computeStats } from "@/lib/stats";
import { advancedStats, missedSummary } from "@/lib/journalKit";

const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const pnlOf = (trade) => Number(trade.pnl) || 0;

function calculateMetrics(trades, threshold) {
  const pnls = trades.map(pnlOf);
  const winners = pnls.filter((pnl) => pnl > threshold);
  const losers = pnls.filter((pnl) => pnl < -threshold);
  const grossWin = winners.reduce((sum, value) => sum + value, 0);
  const grossLoss = Math.abs(losers.reduce((sum, value) => sum + value, 0));
  return {
    net: pnls.reduce((sum, value) => sum + value, 0),
    winRate: trades.length ? winners.length / trades.length * 100 : 0,
    profitFactor: grossLoss ? grossWin / grossLoss : grossWin ? Infinity : 0,
    averageR: average(trades.map((trade) => Number(trade.r) || 0)),
    tradingDays: new Set(trades.map((trade) => trade.date)).size,
  };
}

// Regroupe les trades par clé (setup, session, tag...) avec P&L et nombre.
function groupBy(trades, keyOf) {
  const map = new Map();
  trades.forEach((trade) => {
    const keys = [].concat(keyOf(trade) ?? []).filter(Boolean);
    keys.forEach((key) => {
      const row = map.get(key) || { key, count: 0, pnl: 0, wins: 0 };
      row.count += 1;
      row.pnl += pnlOf(trade);
      if (pnlOf(trade) > 0) row.wins += 1;
      map.set(key, row);
    });
  });
  return [...map.values()].sort((a, b) => b.count - a.count);
}

const tagsOf = (trade) => Array.isArray(trade.tags) ? trade.tags : String(trade.tags || "").split(",").map((tag) => tag.trim());

export default function DashboardPage() {
  const { scopedTrades, missedTrades = [], accounts, certificates, profile, lang, demo } = useBook();
  const [range, setRange] = useState("all");
  const [dir, setDir] = useState("all");
  const [session, setSession] = useState("all");
  const en = lang === "en";
  const T = en ? {
    s1: "01 / COMMAND OVERVIEW", title: "DATASET PULSE", intro: "Every module responds to the filters. A research layer on your own executions — what works, what bleeds.",
    trades: "Logged trades", winRate: "Win rate", net: "Net P&L", pf: "Profit factor", plan: "Plan respected",
    s2: "03 / PLAYBOOK DISTRIBUTION", title2: "WHERE YOUR EDGE APPEARS", intro2: "Frequency and P&L by setup and direction. Counts describe your sample, not a guarantee.",
    setups: "SETUP FREQUENCY", split: "DIRECTION SPLIT", curve: "EQUITY OVER TIME",
    s3: "04 / P&L CALENDAR", title3: "DAY BY DAY", yearly: "YEARLY PERFORMANCE", week: "WEEK",
    s4: "05 / EXECUTION ANATOMY", title4: "CONTEXT TO EXECUTION", sessions: "SESSION TIMING", tags: "TOP TAGS", symbols: "INSTRUMENTS", accounts: "ACTIVE PROP ACCOUNTS",
    s5: "06 / TRADE LEDGER", title5: "LATEST EXECUTIONS", empty: "Log at least two trades to reveal this module.", none: "No data yet", openAll: "Open journal",
    prism: "Ask PRISM where you lose money", prismText: "Your AI coach reads every trade and answers in plain words.",
  } : {
    s1: "01 / VUE D'ENSEMBLE", title: "DATASET PULSE", intro: "Chaque module répond aux filtres. Une couche d'analyse sur tes propres exécutions — ce qui marche, ce qui saigne.",
    trades: "Trades loggés", winRate: "Win rate", net: "P&L net", pf: "Profit factor", plan: "Plan respecté",
    s2: "03 / DISTRIBUTION DU PLAYBOOK", title2: "OÙ TON EDGE APPARAÎT", intro2: "Fréquence et P&L par setup et direction. Les chiffres décrivent ton échantillon, pas une garantie.",
    setups: "FRÉQUENCE DES SETUPS", split: "RÉPARTITION LONG / SHORT", curve: "ÉQUITY DANS LE TEMPS",
    s3: "04 / CALENDRIER P&L", title3: "JOUR PAR JOUR", yearly: "PERFORMANCE ANNUELLE", week: "SEM.",
    s4: "05 / ANATOMIE DES TRADES", title4: "DU CONTEXTE À L'EXÉCUTION", sessions: "TIMING DES SESSIONS", tags: "TOP TAGS", symbols: "INSTRUMENTS", accounts: "COMPTES PROP ACTIFS",
    s5: "06 / REGISTRE", title5: "DERNIÈRES EXÉCUTIONS", empty: "Logue au moins deux trades pour révéler ce module.", none: "Pas encore de données", openAll: "Ouvrir le journal",
    prism: "Demande à PRISM où tu perds de l'argent", prismText: "Ton coach IA lit chaque trade et te répond en clair.",
  };

  const trades = useMemo(() => {
    let list = scopedTrades;
    if (range !== "all") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - Number(range));
      list = list.filter((trade) => new Date(`${trade.date}T00:00:00`) >= cutoff);
    }
    if (dir !== "all") list = list.filter((trade) => String(trade.dir || "").toLowerCase() === dir);
    if (session !== "all") list = list.filter((trade) => trade.session === session);
    return list;
  }, [range, dir, session, scopedTrades]);

  const stats = useMemo(() => computeStats(trades, Number(profile?.starting_balance) || 0), [trades, profile]);
  const threshold = Number(profile?.be_threshold) || 0;
  const m = useMemo(() => calculateMetrics(trades, threshold), [trades, threshold]);
  const planRate = trades.length ? Math.round(trades.filter((trade) => trade.plan).length / trades.length * 100) : 0;
  const setups = useMemo(() => groupBy(trades, (trade) => trade.setup || "—").slice(0, 8), [trades]);
  const sessions = useMemo(() => groupBy(trades, (trade) => trade.session), [trades]);
  const tags = useMemo(() => groupBy(trades, tagsOf).slice(0, 6), [trades]);
  const symbols = useMemo(() => groupBy(trades, (trade) => trade.symbol).slice(0, 6), [trades]);
  const longs = trades.filter((trade) => String(trade.dir || "").toLowerCase() === "long").length;
  const propAccounts = useMemo(() => accounts.filter((account) => ["active", "funded", "passed"].includes(account.status)).map((account) => ({ account, health: accountHealth(account, scopedTrades, certificates, lang) })), [accounts, certificates, lang, scopedTrades]);
  const sessionOptions = [...new Set(scopedTrades.map((trade) => trade.session).filter(Boolean))];

  const adv = useMemo(() => advancedStats(trades), [trades]);
  const missed = useMemo(() => missedSummary(missedTrades), [missedTrades]);
  const rankRows = [["first", en ? "1st trade of the day" : "1er trade du jour"], ["second", en ? "2nd trade" : "2e trade"], ["later", en ? "3rd and more" : "3e et plus"]]
    .map(([key, label]) => ({ key: label, count: adv.rank[key].trades, pnl: adv.rank[key].pnl }))
    .filter((row) => row.count);
  const mistakeRows = Object.entries(adv.mistakes).map(([key, row]) => ({ key, count: row.trades, pnl: row.pnl })).sort((a, b) => a.pnl - b.pnl).slice(0, 6);
  const hourRows = Object.entries(adv.byHour).sort(([a], [b]) => a.localeCompare(b)).map(([hour, row]) => ({ key: `${hour}h`, count: row.trades, pnl: row.pnl }));

  const kpis = [
    [String(trades.length), T.trades, `${m.tradingDays} ${en ? "trading days" : "jours tradés"}`, 100],
    [`${m.winRate.toFixed(0)}%`, T.winRate, `${en ? "avg" : "moy."} ${fmtR(m.averageR)}`, m.winRate],
    [fmtMoney(m.net), T.net, en ? "filtered sample" : "échantillon filtré", m.net >= 0 ? 100 : 30, m.net < 0],
    [m.profitFactor === Infinity ? "∞" : m.profitFactor.toFixed(2), T.pf, en ? "gross win / gross loss" : "gains / pertes bruts", Math.min(m.profitFactor * 40, 100)],
    [`${planRate}%`, T.plan, en ? "of executions" : "des exécutions", planRate],
    [`${adv.expectancy >= 0 ? "+" : ""}${fmtMoney(adv.expectancy)}`, en ? "Expectancy" : "Espérance", `${en ? "per trade" : "par trade"} · ${fmtR(adv.expectancyR)}`, adv.expectancy > 0 ? 100 : 25, adv.expectancy < 0],
    [`-${fmtMoney(adv.maxDrawdown)}`, en ? "Max drawdown" : "Drawdown max", en ? "peak to trough" : "du plus haut au plus bas", m.net > 0 && adv.maxDrawdown ? Math.min(100, adv.maxDrawdown / Math.max(1, m.net) * 100) : 0, true],
  ];

  return (
    <main className="min-h-full px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-[1180px] space-y-14">
        <section>
          <SectionHead eyebrow={T.s1} title={T.title} intro={T.intro} />
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <FilterSelect value={range} onChange={setRange} options={[["all", en ? "All time" : "Tout"], ["7", "7 j"], ["30", "30 j"], ["90", "90 j"]]} />
            <FilterSelect value={dir} onChange={setDir} options={[["all", "Long + Short"], ["long", "Long"], ["short", "Short"]]} />
            <FilterSelect value={session} onChange={setSession} options={[["all", en ? "All sessions" : "Toutes sessions"], ...sessionOptions.map((value) => [value, value])]} />
            {(range !== "all" || dir !== "all" || session !== "all") && <button type="button" onClick={() => { setRange("all"); setDir("all"); setSession("all"); }} className="term-tag h-8 px-3">{en ? "Reset filters" : "Réinitialiser"}</button>}
          </div>
          <div className="term-panel mt-4 grid grid-cols-2 divide-prism-line sm:grid-cols-4 lg:grid-cols-7 sm:divide-x">
            {kpis.map(([value, label, sub, bar, negative], index) => (
              <div key={label} className={`p-4 ${index === 0 ? "col-span-2 sm:col-span-1" : ""}`}>
                <p className={`term-title text-3xl ${negative ? "text-prism-loss" : index === 0 ? "text-prism-accent" : "text-prism-text"}`}>{trades.length ? value : "—"}</p>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[.12em] text-prism-muted">{label}</p>
                <p className="text-[10px] text-prism-muted2">{sub}</p>
                <div className="mt-3 h-[3px] w-16 bg-prism-panel2"><div className="h-full bg-prism-accent" style={{ width: `${trades.length ? Math.max(4, Math.min(100, bar)) : 0}%` }} /></div>
              </div>
            ))}
          </div>
          <Link href="/prism" className="term-panel fx-shine group mt-4 flex items-center gap-4 p-4 transition hover:border-prism-accent/60">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-prism-accent text-black"><Sparkles className="h-5 w-5" /></span>
            <span className="flex-1"><b className="term-title block text-lg">{T.prism}</b><span className="text-xs text-prism-muted">{T.prismText}</span></span>
            <ArrowUpRight className="h-5 w-5 text-prism-accent transition group-hover:translate-x-0.5" />
          </Link>
          <div className="mt-4"><WeeklyReportCard trades={scopedTrades} lang={lang} prismHref={demo ? "/login" : "/prism"} /></div>
        </section>

        <section>
          <SectionHead eyebrow={T.s2} title={T.title2} intro={T.intro2} />
          <div className="mt-6 grid gap-3 lg:grid-cols-[1.6fr_1fr]">
            <Panel title={T.setups} tag={`${setups.length}`}>
              {setups.length ? <SetupBars rows={setups} /> : <EmptyState title={T.none}>{T.empty}</EmptyState>}
            </Panel>
            <Panel title={T.split} tag={dir === "all" ? "ALL" : dir.toUpperCase()}>
              <Donut total={trades.length} part={longs} labelA="Long" labelB="Short" />
            </Panel>
          </div>
          <Panel className="mt-3" title={T.curve} tag={fmtMoney(m.net)}>
            {stats.curve.length > 2 ? <Area values={stats.curve.map((point) => point.eq)} labels={stats.curve.map((point) => frDate(point.d))} color="var(--prism-accent)" fill="var(--prism-accent)" fmt={fmtMoney} /> : <EmptyState title={T.none}>{T.empty}</EmptyState>}
          </Panel>
        </section>

        <section>
          <SectionHead eyebrow={T.s3} title={T.title3} />
          <PnlCalendar byDay={stats.byDay || {}} trades={trades} T={T} lang={lang} />
        </section>

        <section>
          <SectionHead eyebrow={T.s4} title={T.title4} />
          <div className="mt-6 grid gap-3 lg:grid-cols-2">
            <Panel title={T.sessions} tag={`${sessions.length}`}><HBars rows={sessions} /></Panel>
            <Panel title={T.tags} tag={`${tags.length}`}><HBars rows={tags} /></Panel>
            <Panel title={T.symbols} tag={`${symbols.length}`}><HBars rows={symbols} /></Panel>
            <PropAccounts accounts={propAccounts} title={T.accounts} en={en} />
            <Panel title={en ? "FIRST VS NEXT TRADES" : "1ER TRADE VS LES SUIVANTS"} tag={en ? "P&L" : "P&L"}>
              {rankRows.length ? <HBars rows={rankRows} /> : <p className="text-xs text-prism-muted">—</p>}
              <p className="mt-3 text-[10px] text-prism-muted2">{en ? "If your 2nd trade bleeds, one trade a day may be your edge." : "Si ton 2e trade saigne, un seul trade par jour est peut-être ton edge."}</p>
            </Panel>
            <Panel title={en ? "MISTAKES THAT COST" : "ERREURS QUI COÛTENT"} tag={`${mistakeRows.length}`}>
              {mistakeRows.length ? <HBars rows={mistakeRows} /> : <p className="text-xs text-prism-muted">{en ? "Tag your mistakes in the trade form (Mistakes section)." : "Tague tes erreurs dans le formulaire de trade (section Erreurs)."}</p>}
            </Panel>
            <Panel title={en ? "MISSED TRADES" : "TRADES RATÉS"} tag={`${missed.count}`}>
              {missed.count ? (
                <div className="space-y-2 text-xs">
                  <p className="text-prism-muted">{en ? `${missed.count} valid setups not taken, ${missed.wouldHaveWon} would have won.` : `${missed.count} setups valides non pris, dont ${missed.wouldHaveWon} auraient été gagnants.`}</p>
                  <p className={`term-title text-2xl ${missed.hypotheticalPnl >= 0 ? "text-amber-300" : "text-prism-win"}`}>{missed.hypotheticalPnl >= 0 ? "+" : ""}{fmtMoney(missed.hypotheticalPnl)}</p>
                  <p className="text-[10px] text-prism-muted2">{missed.hypotheticalPnl >= 0 ? (en ? "Money left on the table by hesitation." : "Argent laissé sur la table par hésitation.") : (en ? "Skipping them saved you money: good discipline." : "Les laisser passer t'a fait économiser : bonne discipline.")}</p>
                </div>
              ) : <p className="text-xs text-prism-muted">{en ? "Log the setups you see but don't take (Missed trade in the form)." : "Logue les setups que tu vois sans les prendre (« Trade raté » dans le formulaire)."}</p>}
            </Panel>
            {hourRows.length > 0 && <Panel title={en ? "P&L BY ENTRY HOUR" : "P&L PAR HEURE D'ENTRÉE"} tag={`${hourRows.length}`}><HBars rows={hourRows} /></Panel>}
          </div>
        </section>

        <section>
          <SectionHead eyebrow={T.s5} title={T.title5} action={<Link href="/journal" className="term-tag h-7 px-3">{T.openAll} →</Link>} />
          <Ledger trades={trades.slice(0, 15)} en={en} />
        </section>
      </div>
    </main>
  );
}

function SectionHead({ eyebrow, title, intro, action }) {
  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div><p className="term-eyebrow">{eyebrow}</p><h1 className="term-title mt-2 text-4xl sm:text-5xl">{title}</h1></div>
      {intro && <p className="max-w-sm text-xs leading-5 text-prism-muted">{intro}</p>}
      {action}
    </div>
  );
}

function FilterSelect({ value, onChange, options }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="h-8 rounded-md border border-prism-line bg-prism-panel px-3 font-mono text-[11px] text-prism-text outline-none focus:border-prism-accent">{options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}</select>;
}

function Panel({ title, tag, children, className = "" }) {
  return (
    <div className={`term-panel p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3"><p className="term-title text-sm tracking-wide">{title}</p>{tag != null && <span className="term-tag">{tag}</span>}</div>
      {children}
    </div>
  );
}

function SetupBars({ rows }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <div className="flex h-56 items-end gap-2 sm:gap-3">
      {rows.map((row) => (
        <div key={row.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${row.key} · ${row.count} trades · ${fmtMoney(row.pnl)}`}>
          <span className="font-mono text-[10px] text-prism-muted">{row.count}</span>
          <div className="fx-grow w-full rounded-t-sm bg-gradient-to-t from-[#7a9a10] to-prism-accent transition-all duration-700" style={{ height: `${Math.max(4, row.count / max * 100)}%` }} />
          <span className={`font-mono text-[9px] font-bold ${row.pnl < 0 ? "text-prism-loss" : "text-prism-win"}`}>{Math.round(row.pnl)}</span>
          <span className="w-full truncate text-center text-[9px] uppercase text-prism-muted2">{row.key}</span>
        </div>
      ))}
    </div>
  );
}

function Donut({ total, part, labelA, labelB }) {
  const radius = 54;
  const length = 2 * Math.PI * radius;
  const share = total ? part / total : 0;
  return (
    <div className="flex flex-col items-center justify-center py-2">
      <div className="relative h-44 w-44">
      <svg viewBox="0 0 140 140" className="h-44 w-44 -rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="16" />
        <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--prism-accent)" strokeWidth="16" strokeDasharray={`${share * length} ${length}`} className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center"><p className="term-title text-3xl">{total}</p><p className="text-[9px] uppercase tracking-[.14em] text-prism-muted">trades</p></div>
      </div>
      <div className="mt-3 flex gap-4 text-[10px] text-prism-muted"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-prism-accent" />{labelA} {part}</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-white/20" />{labelB} {total - part}</span></div>
    </div>
  );
}

function HBars({ rows }) {
  if (!rows.length) return <p className="text-xs text-prism-muted">—</p>;
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <div className="space-y-2.5">
      {rows.map((row) => (
        <div key={row.key} className="grid grid-cols-[6.5rem_1fr_4.5rem] items-center gap-3 text-[11px]">
          <span className="truncate text-prism-muted">{row.key}</span>
          <div className="h-1.5 bg-prism-panel2"><div className="fx-grow-x h-full bg-prism-accent transition-all duration-700" style={{ width: `${Math.max(3, row.count / max * 100)}%` }} /></div>
          <span className={`text-right font-mono font-bold ${row.pnl < 0 ? "text-prism-loss" : "text-prism-win"}`}>{Math.round(row.pnl)}</span>
        </div>
      ))}
    </div>
  );
}

function tradingKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Calendrier façon heatmap : tuiles vertes/rouges, total hebdo et bandeau annuel.
function PnlCalendar({ byDay, trades, T, lang }) {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const { year, month } = cursor;
  const counts = useMemo(() => {
    const map = {};
    trades.forEach((trade) => { map[trade.date] = (map[trade.date] || 0) + 1; });
    return map;
  }, [trades]);
  const maxAbs = Math.max(1, ...Object.values(byDay).map((value) => Math.abs(value)));
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // lundi en premier
  const dayCount = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((offset + dayCount) / 7) * 7 }, (_, index) => {
    const day = index - offset + 1;
    return day >= 1 && day <= dayCount ? day : null;
  });
  const weeks = Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));
  const locale = lang === "en" ? "en-US" : "fr-FR";
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(year, month, 1));
  const weekdays = lang === "en" ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const move = (delta) => setCursor(({ year: y, month: mo }) => { const date = new Date(y, mo + delta, 1); return { year: date.getFullYear(), month: date.getMonth() }; });
  const monthly = Array.from({ length: 12 }, (_, mo) => {
    const prefix = `${year}-${String(mo + 1).padStart(2, "0")}`;
    const keys = Object.keys(byDay).filter((key) => key.startsWith(prefix));
    return { mo, pnl: keys.reduce((sum, key) => sum + byDay[key], 0), n: trades.filter((trade) => String(trade.date).startsWith(prefix)).length };
  });
  const tone = (pnl) => {
    if (pnl == null) return { className: "border-prism-line bg-prism-panel2/50 text-prism-muted2", style: {} };
    const alpha = 0.18 + Math.min(1, Math.abs(pnl) / maxAbs) * 0.5;
    return pnl >= 0
      ? { className: "border-[color-mix(in_srgb,var(--prism-accent)_60%,transparent)] text-[var(--prism-accent-soft)] shadow-[0_0_18px_-6px_color-mix(in_srgb,var(--prism-accent)_60%,transparent)]", style: { background: `color-mix(in srgb, var(--prism-accent) ${Math.round(alpha * 100)}%, transparent)` } }
      : { className: "border-[color-mix(in_srgb,var(--prism-loss)_60%,transparent)] text-prism-loss", style: { background: `rgba(220,38,38,${alpha})` } };
  };

  return (
    <div className="term-panel mt-6 p-3 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={() => move(-1)} className="grid h-8 w-8 place-items-center rounded-md border border-prism-line hover:border-prism-accent" aria-label="previous"><ChevronLeft className="h-4 w-4" /></button>
        <p className="term-title text-xl capitalize">{monthLabel}</p>
        <button type="button" onClick={() => move(1)} className="grid h-8 w-8 place-items-center rounded-md border border-prism-line hover:border-prism-accent" aria-label="next"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-[repeat(7,1fr)_minmax(3.5rem,.8fr)] gap-1 sm:gap-1.5">
        {weekdays.map((day) => <span key={day} className="pb-1 text-center text-[9px] font-bold uppercase text-prism-muted2">{day}</span>)}
        <span className="pb-1 text-center text-[9px] font-bold uppercase text-prism-muted2">{T.week}</span>
        {weeks.map((week, weekIndex) => {
          const weekTotal = week.reduce((sum, day) => sum + (day ? byDay[tradingKey(year, month, day)] || 0 : 0), 0);
          const weekTrades = week.reduce((sum, day) => sum + (day ? counts[tradingKey(year, month, day)] || 0 : 0), 0);
          return [
            ...week.map((day, index) => {
              if (!day) return <i key={`e-${weekIndex}-${index}`} className="min-h-[3.25rem] rounded-md bg-prism-panel2/20 sm:min-h-[4.5rem]" />;
              const key = tradingKey(year, month, day);
              const pnl = byDay[key];
              const { className, style } = tone(pnl);
              return (
                <Link key={key} href={`/journal?date=${key}`} style={style} className={`flex min-h-[3.25rem] flex-col justify-between rounded-md border p-1 transition hover:-translate-y-0.5 sm:min-h-[4.5rem] sm:p-1.5 ${className}`}>
                  <span className="text-[9px] opacity-70">{day}</span>
                  {pnl != null && <span className="text-center"><b className="block font-mono text-[9px] sm:text-xs">{Math.round(pnl)}</b><small className="hidden text-[8px] opacity-70 sm:block">{counts[key] || 0} trades</small></span>}
                </Link>
              );
            }),
            <div key={`w-${weekIndex}`} className={`flex min-h-[3.25rem] flex-col items-center justify-center rounded-md border text-center sm:min-h-[4.5rem] ${weekTrades ? (weekTotal >= 0 ? "border-[color-mix(in_srgb,var(--prism-accent)_40%,transparent)] text-prism-win" : "border-[color-mix(in_srgb,var(--prism-loss)_40%,transparent)] text-prism-loss") : "border-prism-line text-prism-muted2"}`}>
              <b className="font-mono text-[10px] sm:text-xs">{weekTrades ? Math.round(weekTotal) : "—"}</b>
              {weekTrades > 0 && <small className="text-[8px] text-prism-muted">{weekTrades}t</small>}
            </div>,
          ];
        })}
      </div>
      <p className="term-title mb-2 mt-6 text-sm">{T.yearly} · {year}</p>
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
        {monthly.map(({ mo, pnl, n }) => (
          <button key={mo} type="button" onClick={() => setCursor({ year, month: mo })} className={`rounded-md border p-1.5 text-center transition hover:-translate-y-0.5 ${n ? (pnl >= 0 ? "border-[color-mix(in_srgb,var(--prism-accent)_60%,transparent)] bg-[color-mix(in_srgb,var(--prism-accent)_25%,transparent)] text-[var(--prism-accent-soft)]" : "border-[color-mix(in_srgb,var(--prism-loss)_60%,transparent)] bg-[color-mix(in_srgb,var(--prism-loss)_25%,transparent)] text-prism-loss") : "border-prism-line text-prism-muted2"} ${mo === month ? "ring-1 ring-prism-accent" : ""}`}>
            <span className="block text-[9px] uppercase">{new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(year, mo, 1))}</span>
            <b className="block font-mono text-[10px]">{n ? Math.round(pnl) : "—"}</b>
            {n > 0 && <small className="block text-[8px] opacity-70">{n}t</small>}
          </button>
        ))}
      </div>
    </div>
  );
}

function PropAccounts({ accounts, title, en }) {
  return (
    <Panel title={title} tag={`${accounts.length}`}>
      {!accounts.length ? <Link href="/accounts" className="text-xs font-bold text-prism-accent hover:underline">{en ? "Create an account" : "Créer un compte"} →</Link> : (
        <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
          {accounts.map(({ account, health }) => {
            const pnl = Number(health.cum) || 0;
            const target = Number(account.profit_target) || 0;
            const pct = target > 0 ? Math.max(0, Math.min(100, pnl / target * 100)) : 0;
            return (
              <Link key={account.id} href={`/accounts/${account.id}`} className="block rounded-md border border-prism-line p-2.5 transition hover:border-prism-accent/60">
                <div className="flex justify-between text-[11px]"><b className="truncate">{account.note || account.firm}</b><span className={`font-mono font-bold ${pnl < 0 ? "text-prism-loss" : "text-prism-win"}`}>{fmtMoney(pnl)}</span></div>
                {!health.isFunded && target > 0 && <div className="mt-2"><ProgressBar value={pct} tone={pnl >= 0 ? "gain" : "loss"} /></div>}
                {health.isFunded && <PayoutGauge account={account} health={health} en={en} />}
              </Link>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

// Jauge payout d'un compte financé : profit vers le minimum de retrait + délai.
function PayoutGauge({ account, health, en }) {
  const minimum = Number(account.payout_min) || 0;
  const pnl = Number(health.cum) || 0;
  const pct = minimum > 0 ? Math.max(0, Math.min(100, pnl / minimum * 100)) : 0;
  const status = health.payoutEligible
    ? (en ? "Payout available" : "Payout disponible")
    : health.daysToPayout != null ? (en ? `Payout in ${health.daysToPayout} d` : `Payout dans ${health.daysToPayout} j`)
    : health.minDaysLeft ? (en ? `${health.minDaysLeft} trading days left` : `${health.minDaysLeft} jours de trading restants`)
    : minimum ? (en ? "Toward payout" : "Vers le payout") : (en ? "Add the payout minimum on the account" : "Ajoute le minimum de payout au compte");
  return (
    <div className="mt-2">
      <div className="mb-1 flex justify-between text-[9px] text-prism-muted"><span className={health.payoutEligible ? "font-bold text-prism-accent" : ""}>{status}</span>{minimum > 0 && <span className="font-mono">{fmtMoney(Math.max(0, pnl))} / {fmtMoney(minimum)}</span>}</div>
      {minimum > 0 && <ProgressBar value={pct} tone="gain" />}
      {health.payoutCount > 0 && <p className="mt-1 text-[9px] text-prism-muted2">{health.payoutCount} payout(s) · {fmtMoney(health.payoutTotal)}</p>}
    </div>
  );
}

function Ledger({ trades, en }) {
  const head = en ? ["Date", "Session", "Dir", "Instrument", "Setup", "R", "P&L", ""] : ["Date", "Session", "Sens", "Instrument", "Setup", "R", "P&L", ""];
  if (!trades.length) return <div className="term-panel mt-6 p-6 text-sm text-prism-muted">—</div>;
  return (
    <div className="term-panel mt-6 overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-[11px]">
        <thead><tr className="border-b border-prism-line text-[9px] uppercase tracking-[.14em] text-prism-muted2">{head.map((cell, index) => <th key={index} className="px-4 py-3 font-bold">{cell}</th>)}</tr></thead>
        <tbody>
          {trades.map((trade) => {
            const long = String(trade.dir || "").toLowerCase() === "long";
            return (
              <tr key={trade.id} className="border-b border-prism-line/60 transition last:border-0 hover:bg-prism-panel2/60">
                <td className="px-4 py-2.5 font-mono">{frDate(trade.date)}</td>
                <td className="px-4 py-2.5 text-prism-muted">{trade.session || "—"}</td>
                <td className={`px-4 py-2.5 font-bold ${long ? "text-prism-accent" : "text-prism-loss"}`}>{long ? "Long" : "Short"}</td>
                <td className="px-4 py-2.5">{trade.symbol || "—"}</td>
                <td className="px-4 py-2.5 text-prism-muted">{trade.setup || "—"}</td>
                <td className="px-4 py-2.5 font-mono">{fmtR(Number(trade.r) || 0)}</td>
                <td className={`px-4 py-2.5 font-mono font-bold ${pnlOf(trade) < 0 ? "text-prism-loss" : "text-prism-win"}`}>{fmtMoney(pnlOf(trade))}</td>
                <td className="px-4 py-2.5 text-right"><Link href={`/journal?edit=${trade.id}`} className="term-tag">{en ? "Inspect" : "Voir"} →</Link></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
