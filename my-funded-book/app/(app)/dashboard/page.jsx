"use client";

import { useState, useEffect } from "react";
import { useBook } from "@/components/BookProvider";
import { Kpi } from "@/components/ui";
import { Modal, GhostBtn } from "@/components/ui";
import { Radar, Area, Bars, Gauge, Calendar } from "@/components/charts";
import { fmtMoney, fmtK, frDate } from "@/lib/format";
import RiskBanner from "@/components/RiskBanner";
import { LogTradeModal } from "@/components/modals";
import KpiCustomizer from "@/components/KpiCustomizer";
import { KPI_CATALOG, DEFAULT_KPI_IDS, MIN_KPIS, MAX_KPIS } from "@/lib/kpiCatalog";
import { emotionScore, psychBucket } from "@/lib/constants";

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
  trades.forEach((t) => { tradesByDay[t.date] = (tradesByDay[t.date] || 0) + 1; });
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

  return (
    <div>
      <RiskBanner />
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={() => setCustomizing(true)}
          className="flex items-center gap-1.5 rounded-lg border border-line bg-panel px-2.5 py-1 text-[11px] text-muted2 hover:border-line2 hover:text-white"
          title={L === "en" ? "Customize KPIs" : "Personnaliser les KPIs"}
        >
          <span aria-hidden>⚙</span>
          <span>{L === "en" ? "Customize" : "Personnaliser"}</span>
        </button>
      </div>
      <div className={`mb-3.5 ${gridCls}`}>
        {kpiIds.map((id) => {
          const kpi = KPI_CATALOG.find((k) => k.id === id);
          if (!kpi) return null;
          const p = kpi.render(s, L);
          return (
            <Kpi
              key={id}
              label={kpi.labels[L]}
              value={p.value}
              tone={p.tone}
              big={p.big}
              sub={p.sub}
              gauge={p.gaugePct != null ? <Gauge pct={p.gaugePct} color={p.gaugeColor} /> : null}
            />
          );
        })}
      </div>
      <div className="mb-3.5 flex flex-wrap items-center gap-4 rounded-xl border border-line bg-panel px-4 py-3 text-[12.5px]">
        <span className="flex items-center gap-1.5 text-muted">🔥 <b className="font-mono font-extrabold text-white">{s.streak}</b> {t("streak_plan")}</span>
        <span className="flex items-center gap-1.5 text-muted"><b className="font-mono font-extrabold text-white">{s.days.length}</b> {t("streak_days")}</span>
        <span className="flex items-center gap-1.5 text-accent"><b className="font-mono font-extrabold">{s.planPct.toFixed(0)}%</b> {t("streak_adher")}</span>
        <span className="flex items-center gap-1.5 text-muted"><b className="font-mono font-extrabold text-white">{s.greenDays}</b> {t("streak_green")}</span>
      </div>
      <div className="mb-3.5 grid gap-3.5 lg:grid-cols-[340px_1fr]">
        <div className="rounded-2xl border border-line bg-panel p-[18px]">
          <H>{t("edge_score")}</H>
          <Radar axes={s.axes} />
          <div className="mt-1.5 text-center">
            <div className="relative my-2.5 h-[7px] rounded" style={{ background: "linear-gradient(90deg,var(--loss),#f5b301,var(--accent))" }}>
              <div className="absolute -top-[3px] h-[13px] w-[3px] rounded bg-white shadow-[0_0_6px_#fff]" style={{ left: `${Math.max(0, Math.min(100, s.edge))}%` }} />
            </div>
            <div className="flex justify-between font-mono text-[9px] text-muted2"><span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span></div>
            <div className="mt-2 text-[11px] uppercase tracking-wide text-muted2">{t("your_edge")}</div>
            <div className="font-mono text-[30px] font-extrabold">{s.edge.toFixed(1)}</div>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-panel p-[18px]">
          <H>{t("daily_cum")}</H>
          <Area
            values={s.cumSeries}
            color="var(--accent)"
            fill="var(--accent)"
            labels={s.days.map(frDate)}
            fmt={(v) => (v >= 0 ? "+" : "") + fmtMoney(v)}
          />
          <H className="mt-5">{t("net_daily")}</H>
          <Bars byDay={s.byDay} days={s.days} labels={s.days.map(frDate)} />
        </div>
      </div>
      <div className="mb-3.5 grid gap-3.5 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-line bg-panel p-[18px]">
          <H>{t("recent_trades")}</H>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-muted2">{t("no_trades")}</p>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-muted2">
                    <th className="pb-2.5 text-left font-bold">{t("th_close_date")}</th>
                    <th className="pb-2.5 text-left font-bold">{t("th_symbol")}</th>
                    <th className="pb-2.5 text-right font-bold">{t("th_net_pnl")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((tr) => (
                    <tr key={tr.id} className="border-t border-line text-[13px]">
                      <td className="py-2 font-mono text-muted2">{frDate(tr.date)}</td>
                      <td className="py-2 font-mono">{tr.symbol}</td>
                      <td className={`py-2 text-right font-mono ${tr.pnl >= 0 ? "text-accent" : "text-loss"}`}>{(tr.pnl >= 0 ? "+" : "") + fmtMoney(tr.pnl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex justify-between border-t border-line2 pt-3 font-mono text-[14px] font-extrabold">
                <span className="font-sans text-[12px] font-semibold uppercase tracking-wide text-muted2">{t("balance")}</span>
                <span className={s.net >= 0 ? "text-accent" : "text-loss"}>{fmtMoney(s.balance, true)}</span>
              </div>
            </>
          )}
        </div>
        <div className="rounded-2xl border border-line bg-panel p-[18px]">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setCalMode("pnl")}
                className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${calMode === "pnl" ? "border-accent bg-accentDim text-accent" : "border-line2 bg-panel2 text-muted2 hover:text-white"}`}
              >
                $ P&L
              </button>
              <button
                type="button"
                onClick={() => setCalMode("psych")}
                className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${calMode === "psych" ? "border-accent bg-accentDim text-accent" : "border-line2 bg-panel2 text-muted2 hover:text-white"}`}
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
            <div className="mt-3.5 border-t border-line pt-3">
              {psychAvg == null ? (
                <div className="text-center text-[11px] text-muted2">
                  {L === "en" ? "No emotion logged yet — set one when logging a trade." : "Aucune émotion renseignée pour l'instant — logge-la à la saisie d'un trade."}
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted2">
                      {L === "en" ? "Average mental state" : "État mental moyen"}
                    </div>
                    <div className="font-mono text-[22px] font-extrabold" style={{ color: psychBucketFn(psychAvg).color }}>
                      {Math.round(psychAvg)} <span className="text-[12px] font-semibold text-muted2">{psychBucketFn(psychAvg).label}</span>
                    </div>
                  </div>
                  <div className="flex gap-4 text-[11px]">
                    <span className="text-muted2">{L === "en" ? "Peak" : "Pic"} <b className="font-mono text-accent">{psychPeakDays}</b></span>
                    <span className="text-muted2">{L === "en" ? "Good" : "Bons"} <b className="font-mono" style={{ color: "#f5b301" }}>{psychGoodDays}</b></span>
                    <span className="text-muted2">{L === "en" ? "Challenging" : "Difficiles"} <b className="font-mono text-loss">{psychChallengingDays}</b></span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="grid gap-3.5 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-panel p-[18px]">
          <H>{t("account_balance")} <span className={`float-right font-mono ${s.net >= 0 ? "text-accent" : "text-loss"}`}>{fmtMoney(s.balance)}</span></H>
          <div className="mb-2 text-[11px] text-muted2">{t("starting_balance_lbl")} <span className="font-mono text-white">{fmtMoney(profile.starting_balance)}</span></div>
          <Area
            values={s.curve.map((c) => c.eq)}
            color="#e8edf5"
            fill="var(--muted)"
            labels={s.curve.map((c) => frDate(c.d))}
            fmt={fmtMoney}
          />
        </div>
        <div className="rounded-2xl border border-line bg-panel p-[18px]">
          <H>{t("drawdown")} <span className="float-right font-mono text-loss">{fmtMoney(-s.maxDD)}</span></H>
          <div className="h-[26px]" />
          <Area
            values={s.ddSeries}
            color="#ff66e4"
            fill="#ff66e4"
            labels={s.curve.map((c) => frDate(c.d))}
            fmt={fmtMoney}
          />
        </div>
      </div>
      {dayKey && (
        <Modal title={frDate(dayKey)} onClose={() => setDayKey(null)}
          footer={<GhostBtn className="flex-1" onClick={() => setDayKey(null)}>{L === "en" ? "Close" : "Fermer"}</GhostBtn>}>
          {dayTrades.length === 0 ? (
            <div className="py-4 text-center text-[12px] text-muted2">{L === "en" ? "No trade this day." : "Aucun trade ce jour."}</div>
          ) : (
            <div className="flex flex-col gap-2">
              {dayTrades.map((tr) => (
                <div key={tr.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-panel2 px-3 py-2.5">
                  <span className={`font-mono text-[15px] font-extrabold ${tr.pnl >= 0 ? "text-accent" : "text-loss"}`}>{(tr.pnl >= 0 ? "+" : "") + fmtMoney(tr.pnl)}</span>
                  <span className="font-mono text-[11px] text-muted2">{frDate(tr.date)} · {tr.symbol} · {tr.dir === "long" ? "LONG" : "SHORT"} · {fmtR(tr.r)}{tr.session ? " · " + tr.session : ""}</span>
                  <div className="flex-1" />
                  <GhostBtn className="px-3 py-1.5 text-[12px]" onClick={() => { setEditing(tr); setDayKey(null); }}>{L === "en" ? "Edit" : "Éditer"}</GhostBtn>
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

function H({ children, className = "" }) {
  return <h3 className={`mb-3.5 text-[12px] font-semibold uppercase tracking-wide text-muted2 ${className}`}>{children}</h3>;
}

function fmtR(r) {
  const n = Number(r) || 0;
  return (n >= 0 ? "+" : "") + n.toFixed(1) + "R";
}
