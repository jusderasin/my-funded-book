"use client";

import { useState } from "react";
import { useBook } from "@/components/BookProvider";
import { Kpi } from "@/components/ui";
import { Modal, GhostBtn } from "@/components/ui";
import { Radar, Area, Bars, Gauge, Calendar } from "@/components/charts";
import { fmtMoney, fmtK, frDate } from "@/lib/format";
import RiskBanner from "@/components/RiskBanner";
import { LogTradeModal } from "@/components/modals";

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

  return (
    <div>
      <RiskBanner />
      <div className="mb-3.5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label={t("kpi_net")} big tone={s.net >= 0 ? "pos" : "neg"} value={fmtMoney(s.net, true)} />
        <Kpi label={t("kpi_trade_wr")} tone={s.wr >= 50 ? "pos" : "warn"} value={s.wr.toFixed(2) + "%"} gauge={<Gauge pct={s.wr} color={s.wr >= 50 ? "#00E676" : "#f5b301"} />} />
        <Kpi label={t("kpi_pf")} tone={s.pf >= 1.5 ? "pos" : s.pf >= 1 ? "warn" : "neg"} value={s.pf.toFixed(2)} gauge={<Gauge pct={Math.min(100, (s.pf / 3) * 100)} />} />
        <Kpi label={t("kpi_day_wr")} tone={s.dayWr >= 50 ? "pos" : "warn"} value={s.dayWr.toFixed(2) + "%"} gauge={<Gauge pct={s.dayWr} />} />
        <Kpi label={t("kpi_avg_wl")} tone={s.wl >= 1 ? "pos" : "warn"} value={s.wl.toFixed(2)} sub={`${fmtK(s.avgW)} / -${fmtK(s.avgL).replace("-", "")}`} />
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
            <div className="relative my-2.5 h-[7px] rounded" style={{ background: "linear-gradient(90deg,#FF5252,#f5b301,#00E676)" }}>
              <div className="absolute -top-[3px] h-[13px] w-[3px] rounded bg-white shadow-[0_0_6px_#fff]" style={{ left: `${Math.max(0, Math.min(100, s.edge))}%` }} />
            </div>
            <div className="flex justify-between font-mono text-[9px] text-muted2"><span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span></div>
            <div className="mt-2 text-[11px] uppercase tracking-wide text-muted2">{t("your_edge")}</div>
            <div className="font-mono text-[30px] font-extrabold">{s.edge.toFixed(1)}</div>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-panel p-[18px]">
          <H>{t("daily_cum")}</H>
          <Area values={s.cumSeries} color="#00E676" fill="#00E676" />
          <H className="mt-5">{t("net_daily")}</H>
          <Bars byDay={s.byDay} days={s.days} />
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
          <Calendar byDay={s.byDay} tradesByDay={tradesByDay} month={cal} onShift={shift} t={t} onDayClick={setDayKey} />
        </div>
      </div>
      <div className="grid gap-3.5 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-panel p-[18px]">
          <H>{t("account_balance")} <span className={`float-right font-mono ${s.net >= 0 ? "text-accent" : "text-loss"}`}>{fmtMoney(s.balance)}</span></H>
          <div className="mb-2 text-[11px] text-muted2">{t("starting_balance_lbl")} <span className="font-mono text-white">{fmtMoney(profile.starting_balance)}</span></div>
          <Area values={s.curve.map((c) => c.eq)} color="#e8edf5" fill="#8a93a6" />
        </div>
        <div className="rounded-2xl border border-line bg-panel p-[18px]">
          <H>{t("drawdown")} <span className="float-right font-mono text-loss">{fmtMoney(-s.maxDD)}</span></H>
          <div className="h-[26px]" />
          <Area values={s.ddSeries} color="#ff66e4" fill="#ff66e4" />
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
    </div>
  );
}

function H({ children, className = "" }) {
  return <h3 className={`mb-3.5 text-[12px] font-semibold uppercase tracking-wide text-muted2 ${className}`}>{children}</h3>;
}

// Format R : 1 décimale + signe explicite (+2.5R / -1.0R)
function fmtR(r) {
  const n = Number(r) || 0;
  return (n >= 0 ? "+" : "") + n.toFixed(1) + "R";
}
