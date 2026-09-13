"use client";

import { useState, useEffect } from "react";
import { useBook } from "@/components/BookProvider";
import { Modal, GhostBtn } from "@/components/ui";
import { Area, Bars, Calendar } from "@/components/charts";
import { fmtMoney, frDate } from "@/lib/format";
import { LogTradeModal } from "@/components/modals";
import KpiCustomizer from "@/components/KpiCustomizer";
import { KPI_CATALOG, DEFAULT_KPI_IDS, MIN_KPIS, MAX_KPIS } from "@/lib/kpiCatalog";
import { emotionScore, psychBucket } from "@/lib/constants";
import { Gauge as PrismGauge, Card } from "@/components/prism";
import { Settings2, Flame, Sparkles } from "lucide-react";

const KPI_STORAGE_KEY = "mfb.dashboard.kpis";

export default function DashboardPage() {
  const { stats: s, profile, trades, t, lang } = useBook();
  const L = lang === "en" ? "en" : "fr";
  const [cal, setCal] = useState(() => {
    const last = s.days[s.days.length - 1] || new Date().toISOString().slice(0, 10);
    const [y, m] = last.split("-");
    return { y: +y, m: +m };
  });
  const [dayKey, setDayKey] = useState(null);
  const [editing, setEditing] = useState(null);
  const [kpiIds, setKpiIds] = useState(DEFAULT_KPI_IDS);
  const [customizing, setCustomizing] = useState(false);
  const [calMode, setCalMode] = useState("pnl"); // "pnl" | "psych"

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KPI_STORAGE_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return;
      const valid = arr.filter((id) => KPI_CATALOG.some((k) => k.id === id));
      if (valid.length >= MIN_KPIS && valid.length <= MAX_KPIS) {
        setKpiIds(valid);
      }
    } catch {}
  }, []);

  const saveKpis = (ids) => {
    setKpiIds(ids);
    try {
      localStorage.setItem(KPI_STORAGE_KEY, JSON.stringify(ids));
    } catch {}
    setCustomizing(false);
  };

  const shift = (dir) => {
    let m = cal.m + dir, y = cal.y;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setCal({ y, m });
  };

  const tradesByDay = {};
  trades.forEach((tr) => { tradesByDay[tr.date] = (tradesByDay[tr.date] || 0) + 1; });
  const recent = trades.slice(0, 8);
  const dayTrades = dayKey ? trades.filter((tr) => tr.date === dayKey) : [];

  // --- Vue "Psych" du calendrier : état mental moyen par jour, dérivé du champ emotion ---
  const psychSums = {};
  trades.forEach((tr) => {
    const sc = emotionScore(tr.emotion);
    if (sc == null) return;
    if (!psychSums[tr.date]) psychSums[tr.date] = { sum: 0, n: 0 };
    psychSums[tr.date].sum += sc;
    psychSums[tr.date].n += 1;
  });
  const psychByDay = {};
  Object.keys(psychSums).forEach((d) => { psychByDay[d] = psychSums[d].sum / psychSums[d].n; });
  const psychBucketFn = (score) => {
    const b = psychBucket(score);
    return { color: b.color, label: L === "en" ? b.en : b.fr };
  };
  const psychDayScores = Object.values(psychByDay);
  const psychAvg = psychDayScores.length ? psychDayScores.reduce((a, v) => a + v, 0) / psychDayScores.length : null;
  const psychPeakDays = psychDayScores.filter((v) => v >= 75).length;
  const psychGoodDays = psychDayScores.filter((v) => v >= 45 && v < 75).length;
  const psychChallengingDays = psychDayScores.filter((v) => v < 45).length;

  const kpiCount = kpiIds.length;
  const gridCls =
    kpiCount === 4
      ? "grid grid-cols-2 gap-3 md:grid-cols-4"
      : kpiCount === 6
      ? "grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
      : "grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5";

  // Sublabel PRISM Score : nombre total de trades
  const gaugeSublabel =
    trades.length > 0
      ? L === "en"
        ? `Based on ${trades.length} trades`
        : `Basé sur ${trades.length} trades`
      : L === "en"
      ? "No trades yet"
      : "Aucun trade";

  return (
    <div className="min-h-full bg-black text-white p-4 sm:p-6 lg:p-8">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-prism-accent">
            {L === "en" ? "Trading journal" : "Journal de trading"}
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">
            {L === "en" ? "Performance overview" : "Vue d'ensemble"}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setCustomizing(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-prism-line bg-prism-panel px-3 py-1.5 text-xs font-medium text-prism-muted hover:border-prism-line2 hover:text-white transition-colors"
          title={L === "en" ? "Customize KPIs" : "Personnaliser les KPIs"}
        >
          <Settings2 className="h-3.5 w-3.5" />
          <span>{L === "en" ? "Personnaliser" : "Personnaliser"}</span>
        </button>
      </div>

      {/* KPIs grid */}
      <div className={`mb-4 ${gridCls}`}>
        {kpiIds.map((id) => {
          const kpi = KPI_CATALOG.find((k) => k.id === id);
          if (!kpi) return null;
          const p = kpi.render(s, L);
          return (
            <KpiPrism
              key={id}
              label={kpi.labels[L]}
              value={p.value}
              tone={p.tone}
              sub={p.sub}
              className={kpiCount === 5 && kpiIds.indexOf(id) === 4 ? "hidden sm:block" : ""}
            />
          );
        })}
      </div>

      {/* Streak bandeau */}
      <Card padding="p-4" className="mb-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <span className="inline-flex items-center gap-2 text-prism-muted">
            <Flame className="h-4 w-4 text-prism-accent" />
            <b className="font-mono font-bold text-white tabular-nums">{s.streak}</b>
            <span>{t("streak_plan")}</span>
          </span>
          <span className="inline-flex items-center gap-2 text-prism-muted">
            <b className="font-mono font-bold text-white tabular-nums">{s.days.length}</b>
            <span>{t("streak_days")}</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <b className="font-mono font-bold text-prism-accent tabular-nums">{s.planPct.toFixed(0)}%</b>
            <span className="text-prism-muted">{t("streak_adher")}</span>
          </span>
          <span className="inline-flex items-center gap-2 text-prism-muted">
            <b className="font-mono font-bold text-prism-win tabular-nums">{s.greenDays}</b>
            <span>{t("streak_green")}</span>
          </span>
        </div>
      </Card>

      {/* Row : PRISM Score + Charts */}
      <div className="mb-4 grid gap-4 lg:grid-cols-[380px_1fr]">
        {/* PRISM Score card */}
        <Card padding="p-6">
          <SectionHeader icon={<Sparkles className="h-4 w-4" />}>
            {L === "en" ? "PRISM Score" : "Score PRISM"}
          </SectionHeader>

          <div className="flex flex-col items-center pt-2 pb-4">
            <PrismGauge
              value={s.edge}
              max={100}
              label="PRISM"
              sublabel={gaugeSublabel}
              size={180}
              strokeWidth={10}
            />
          </div>

          {/* Score Breakdown en progress bars */}
          <div className="mt-2 space-y-3">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-prism-muted2 pb-1">
              {L === "en" ? "Score Breakdown" : "Décomposition"}
            </div>
            {(Array.isArray(s.axes) ? s.axes : []).map((axis, i) => {
              const name = axis?.label || axis?.name || axis?.k || `Axe ${i + 1}`;
              const value = Number(axis?.value ?? axis?.v ?? axis?.pct ?? 0);
              const pct = Math.max(0, Math.min(100, value));
              return (
                <div key={i}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-prism-muted">{name}</span>
                    <span className="text-white font-semibold tabular-nums">{pct.toFixed(0)}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-prism-accent transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Charts card : Cumul + Bars */}
        <Card padding="p-6">
          <SectionHeader>{t("daily_cum")}</SectionHeader>
          <Area
            values={s.cumSeries}
            color="#3b82f6"
            fill="#3b82f6"
            labels={s.days.map(frDate)}
            fmt={(v) => (v >= 0 ? "+" : "") + fmtMoney(v)}
          />
          <SectionHeader className="mt-6">{t("net_daily")}</SectionHeader>
          <Bars byDay={s.byDay} days={s.days} labels={s.days.map(frDate)} />
        </Card>
      </div>

      {/* Row : Recent trades + Calendar */}
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        {/* Recent trades */}
        <Card padding="p-6">
          <SectionHeader>{t("recent_trades")}</SectionHeader>
          {recent.length === 0 ? (
            <p className="py-8 text-center text-xs text-prism-muted2">{t("no_trades")}</p>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-prism-muted2">
                    <th className="pb-3 text-left font-semibold">{t("th_close_date")}</th>
                    <th className="pb-3 text-left font-semibold">{t("th_symbol")}</th>
                    <th className="pb-3 text-right font-semibold">{t("th_net_pnl")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((tr) => (
                    <tr key={tr.id} className="border-t border-prism-line text-sm">
                      <td className="py-2.5 font-mono text-prism-muted">{frDate(tr.date)}</td>
                      <td className="py-2.5 font-mono text-white">{tr.symbol}</td>
                      <td className={`py-2.5 text-right font-mono tabular-nums ${tr.pnl >= 0 ? "text-prism-win" : "text-prism-loss"}`}>
                        {(tr.pnl >= 0 ? "+" : "") + fmtMoney(tr.pnl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 flex justify-between border-t border-prism-line2 pt-4 font-mono text-base font-bold">
                <span className="font-sans text-xs font-semibold uppercase tracking-widest text-prism-muted2">
                  {t("balance")}
                </span>
                <span className={`tabular-nums ${s.net >= 0 ? "text-prism-win" : "text-prism-loss"}`}>
                  {fmtMoney(s.balance, true)}
                </span>
              </div>
            </>
          )}
        </Card>

        {/* Calendar dual mode */}
        <Card padding="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setCalMode("pnl")}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  calMode === "pnl"
                    ? "border-prism-accent bg-prism-accentDim text-prism-accent"
                    : "border-prism-line bg-transparent text-prism-muted hover:text-white hover:border-prism-line2"
                }`}
              >
                $ P&L
              </button>
              <button
                type="button"
                onClick={() => setCalMode("psych")}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  calMode === "psych"
                    ? "border-prism-accent bg-prism-accentDim text-prism-accent"
                    : "border-prism-line bg-transparent text-prism-muted hover:text-white hover:border-prism-line2"
                }`}
              >
                {L === "en" ? "Psych" : "Psycho"}
              </button>
            </div>
          </div>
          <Calendar
            byDay={s.byDay}
            tradesByDay={tradesByDay}
            month={cal}
            onShift={shift}
            t={t}
            onDayClick={setDayKey}
            mode={calMode}
            psychByDay={psychByDay}
            psychBucketFn={psychBucketFn}
          />
          {calMode === "psych" && (
            <div className="mt-4 border-t border-prism-line pt-4">
              {psychAvg == null ? (
                <div className="text-center text-xs text-prism-muted2">
                  {L === "en"
                    ? "No emotion logged yet — set one when logging a trade."
                    : "Aucune émotion renseignée pour l'instant — logge-la à la saisie d'un trade."}
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-prism-muted2">
                      {L === "en" ? "Average mental state" : "État mental moyen"}
                    </div>
                    <div
                      className="font-mono text-2xl font-bold tabular-nums"
                      style={{ color: psychBucketFn(psychAvg).color }}
                    >
                      {Math.round(psychAvg)}{" "}
                      <span className="text-xs font-semibold text-prism-muted2">
                        {psychBucketFn(psychAvg).label}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <span className="text-prism-muted2">
                      {L === "en" ? "Peak" : "Pic"}{" "}
                      <b className="font-mono text-prism-accent tabular-nums">{psychPeakDays}</b>
                    </span>
                    <span className="text-prism-muted2">
                      {L === "en" ? "Good" : "Bons"}{" "}
                      <b className="font-mono tabular-nums" style={{ color: "#f5b301" }}>
                        {psychGoodDays}
                      </b>
                    </span>
                    <span className="text-prism-muted2">
                      {L === "en" ? "Challenging" : "Difficiles"}{" "}
                      <b className="font-mono text-prism-loss tabular-nums">{psychChallengingDays}</b>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Row : Account balance + Drawdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card padding="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-prism-muted2">
              {t("account_balance")}
            </div>
            <span className={`font-mono text-sm font-bold tabular-nums ${s.net >= 0 ? "text-prism-win" : "text-prism-loss"}`}>
              {fmtMoney(s.balance)}
            </span>
          </div>
          <div className="mb-2 text-xs text-prism-muted2">
            {t("starting_balance_lbl")}{" "}
            <span className="font-mono text-white tabular-nums">{fmtMoney(profile.starting_balance)}</span>
          </div>
          <Area
            values={s.curve.map((c) => c.eq)}
            color="#e8edf5"
            fill="#8b95a8"
            labels={s.curve.map((c) => frDate(c.d))}
            fmt={fmtMoney}
          />
        </Card>

        <Card padding="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-prism-muted2">
              {t("drawdown")}
            </div>
            <span className="font-mono text-sm font-bold text-prism-loss tabular-nums">
              {fmtMoney(-s.maxDD)}
            </span>
          </div>
          <div className="h-[26px]" />
          <Area
            values={s.ddSeries}
            color="#ef4444"
            fill="#ef4444"
            labels={s.curve.map((c) => frDate(c.d))}
            fmt={fmtMoney}
          />
        </Card>
      </div>

      {/* Modals */}
      {dayKey && (
        <Modal
          title={frDate(dayKey)}
          onClose={() => setDayKey(null)}
          footer={
            <GhostBtn className="flex-1" onClick={() => setDayKey(null)}>
              {L === "en" ? "Close" : "Fermer"}
            </GhostBtn>
          }
        >
          {dayTrades.length === 0 ? (
            <div className="py-4 text-center text-xs text-prism-muted2">
              {L === "en" ? "No trade this day." : "Aucun trade ce jour."}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {dayTrades.map((tr) => (
                <div
                  key={tr.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-prism-line bg-white/[0.02] px-3 py-2.5"
                >
                  <span
                    className={`font-mono text-base font-bold tabular-nums ${
                      tr.pnl >= 0 ? "text-prism-win" : "text-prism-loss"
                    }`}
                  >
                    {(tr.pnl >= 0 ? "+" : "") + fmtMoney(tr.pnl)}
                  </span>
                  <span className="font-mono text-[11px] text-prism-muted2">
                    {frDate(tr.date)} · {tr.symbol} · {tr.dir === "long" ? "LONG" : "SHORT"} · {fmtR(tr.r)}
                    {tr.session ? " · " + tr.session : ""}
                  </span>
                  <div className="flex-1" />
                  <GhostBtn
                    className="px-3 py-1.5 text-xs"
                    onClick={() => {
                      setEditing(tr);
                      setDayKey(null);
                    }}
                  >
                    {L === "en" ? "Edit" : "Éditer"}
                  </GhostBtn>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {editing && <LogTradeModal editing={editing} onClose={() => setEditing(null)} />}

      {customizing && (
        <KpiCustomizer
          selected={kpiIds}
          onSave={saveKpis}
          onClose={() => setCustomizing(false)}
          lang={L}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sous-composants locaux                                             */
/* ------------------------------------------------------------------ */

/**
 * KpiPrism — carte de KPI dans le style PRISM (label muted + valeur massive).
 * Remplace le composant Kpi legacy sur ce dashboard uniquement pour matcher
 * le look TradeXNova. Prend les mêmes {value, tone, sub} que kpi.render() renvoie.
 */
function KpiPrism({ label, value, tone, sub, className = "" }) {
  const toneClass =
    tone === "positive" || tone === "up" || tone === "good"
      ? "text-prism-win"
      : tone === "negative" || tone === "down" || tone === "bad"
      ? "text-prism-loss"
      : "text-white";

  return (
    <div className={`rounded-2xl border border-prism-line bg-prism-panel p-4 sm:p-5 ${className}`}>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-prism-muted2 mb-2">
        {label}
      </div>
      <div className={`text-2xl sm:text-3xl font-bold tracking-tight tabular-nums ${toneClass}`}>
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-[11px] text-prism-muted2">{sub}</div>
      )}
    </div>
  );
}

/** SectionHeader — libellé de section discret style TradeXNova. */
function SectionHeader({ children, icon, className = "" }) {
  return (
    <h3
      className={`mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-prism-muted2 ${className}`}
    >
      {icon && <span className="text-prism-accent">{icon}</span>}
      {children}
    </h3>
  );
}

function fmtR(r) {
  const n = Number(r) || 0;
  return (n >= 0 ? "+" : "") + n.toFixed(1) + "R";
}
