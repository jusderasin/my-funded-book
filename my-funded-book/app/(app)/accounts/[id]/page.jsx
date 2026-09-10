"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useBook } from "@/components/BookProvider";
import { Pill, FirmDot } from "@/components/ui";
import { firmColor, STATUS_LABEL } from "@/lib/constants";
import { fmtMoney, frDate } from "@/lib/format";
import { accountHealth, signedMoney } from "@/lib/accountHealth";
import { ArrowLeft, Info } from "lucide-react";

const GREEN = "var(--accent)";
const AMBER = "#f59e0b";
const RED = "var(--loss)";

const PERIODS = [
  { v: "7d", fr: "7 jours", en: "7 days" },
  { v: "30d", fr: "30 jours", en: "30 days" },
  { v: "all", fr: "Depuis le début", en: "All time" },
];

// YYYY-MM-DD à `days` jours dans le passé, en heure locale (safe pour UTC-3 Cayenne)
function daysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function toneColor(tone) {
  if (tone === "ok") return GREEN;
  if (tone === "warn") return AMBER;
  if (tone === "danger") return RED;
  return "#8a93a6";
}

function ComplianceCell({ label, value, tone, sub }) {
  const color = toneColor(tone);
  const dot = tone === "ok" ? "#00d301" : tone === "warn" ? "#f5b301" : tone === "danger" ? "#ff3b5c" : "#6b7385";
  return (
    <div className="min-w-0 flex-1 px-3 py-2.5">
      <div className="text-[9.5px] font-bold uppercase tracking-wide text-muted2">{label}</div>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dot }} />
        <span className="truncate font-mono text-[13px] font-bold" style={{ color }}>{value}</span>
      </div>
      {sub && <div className="mt-0.5 truncate font-mono text-[10px] text-muted2">{sub}</div>}
    </div>
  );
}

function KPI({ label, value, tone }) {
  const color = tone === "pos" ? GREEN : tone === "neg" ? RED : undefined;
  return (
    <div className="rounded-xl border border-line bg-panel p-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted2">{label}</div>
      <div className="mt-1 font-mono text-[18px] font-extrabold" style={color ? { color } : undefined}>{value}</div>
    </div>
  );
}

function EquityCurve({ points, startingBalance, lang }) {
  if (!points || points.length < 2) {
    return <div className="py-8 text-center text-[12px] text-muted2">{lang === "en" ? "Not enough trades on this period." : "Pas assez de trades sur la période."}</div>;
  }
  const w = 720, h = 180, pad = 12;
  const eqs = points.map((p) => p.eq);
  const min = Math.min(startingBalance, ...eqs);
  const max = Math.max(startingBalance, ...eqs);
  const range = max - min || 1;
  const n = points.length;
  const x = (i) => pad + (i / (n - 1)) * (w - 2 * pad);
  const y = (v) => h - pad - ((v - min) / range) * (h - 2 * pad);
  const pts = points.map((p, i) => `${x(i).toFixed(1)},${y(p.eq).toFixed(1)}`).join(" ");
  const last = eqs[eqs.length - 1];
  const color = last >= startingBalance ? GREEN : RED;
  const areaPts = `${x(0).toFixed(1)},${y(min).toFixed(1)} ${pts} ${x(n - 1).toFixed(1)},${y(min).toFixed(1)}`;
  const baselineY = y(startingBalance).toFixed(1);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 180 }} preserveAspectRatio="none">
      <line x1={pad} y1={baselineY} x2={w - pad} y2={baselineY} stroke="#2a2f3d" strokeWidth="1" strokeDasharray="4 4" />
      <polygon points={areaPts} fill={color} opacity="0.12" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

export default function AccountDetailPage({ params }) {
  const { accounts, trades, certificates, lang, t, loading } = useBook();
  const L = lang === "en" ? "en" : "fr";
  const [period, setPeriod] = useState("30d");

  const account = useMemo(() => accounts.find((a) => a.id === params.id), [accounts, params.id]);

  // Health live : jamais filtrée par période — DD, daily loss, payout sont toujours calculées sur tous les trades.
  const health = useMemo(
    () => (account ? accountHealth(account, trades, certificates, L) : null),
    [account, trades, certificates, L]
  );

  // Trades du compte filtrés par période, triés chrono ascendant (pour la courbe).
  const filteredTrades = useMemo(() => {
    if (!account) return [];
    const cutoff = period === "7d" ? daysAgoISO(7) : period === "30d" ? daysAgoISO(30) : null;
    let list = trades.filter((tr) => tr.account_id === account.id);
    if (cutoff) list = list.filter((tr) => tr.date && String(tr.date).slice(0, 10) >= cutoff);
    return list.slice().sort((a, b) => (a.date + (a.created_at || "")).localeCompare(b.date + (b.created_at || "")));
  }, [trades, account, period]);

  // Stats période : cum, win rate, R:R, expectancy, max DD, courbe equity, breakdown journalier.
  const periodStats = useMemo(() => {
    if (!account) return null;
    const size = Number(account.size) || 0;
    const wins = filteredTrades.filter((tr) => Number(tr.pnl) > 0);
    const losses = filteredTrades.filter((tr) => Number(tr.pnl) < 0);
    const cum = filteredTrades.reduce((s, tr) => s + Number(tr.pnl || 0), 0);
    const total = filteredTrades.length;
    const wr = total ? (wins.length / total) * 100 : 0;
    const gp = wins.reduce((s, tr) => s + Number(tr.pnl), 0);
    const gl = Math.abs(losses.reduce((s, tr) => s + Number(tr.pnl), 0));
    const avgW = wins.length ? gp / wins.length : 0;
    const avgL = losses.length ? gl / losses.length : 0;
    const rr = avgL > 0 ? avgW / avgL : avgW > 0 ? Infinity : 0;
    const expec = total ? cum / total : 0;

    // agrégation par jour + courbe equity (part de size, ajoute cumul par jour)
    const byDay = {};
    filteredTrades.forEach((tr) => { byDay[tr.date] = (byDay[tr.date] || 0) + Number(tr.pnl || 0); });
    const sortedDays = Object.keys(byDay).sort();
    let running = 0;
    const curve = [{ eq: size, date: sortedDays[0] || null }];
    sortedDays.forEach((d) => { running += byDay[d]; curve.push({ eq: size + running, date: d }); });
    let peak = size, maxDD = 0;
    for (const p of curve) { if (p.eq > peak) peak = p.eq; const dd = peak - p.eq; if (dd > maxDD) maxDD = dd; }

    // breakdown journalier (récent en haut)
    let cumulative = size;
    const rows = sortedDays.map((d) => {
      cumulative += byDay[d];
      const dayTrades = filteredTrades.filter((tr) => tr.date === d);
      return {
        date: d,
        trades: dayTrades.length,
        wins: dayTrades.filter((tr) => Number(tr.pnl) > 0).length,
        pnl: byDay[d],
        cumulative,
      };
    });
    rows.reverse();

    return { size, cum, total, wins: wins.length, losses: losses.length, wr, rr, expec, maxDD, curve, rows };
  }, [account, filteredTrades]);

  // Loading state (avant que BookProvider ait fini son fetch)
  if (loading) {
    return <div className="rounded-2xl border border-dashed border-line2 bg-panel p-8 text-center text-[12px] text-muted2">{L === "en" ? "Loading…" : "Chargement…"}</div>;
  }

  if (!account) {
    return (
      <div className="rounded-2xl border border-dashed border-line2 bg-panel p-8 text-center">
        <div className="mb-1 text-[14px] font-bold text-white">{L === "en" ? "Account not found" : "Compte introuvable"}</div>
        <div className="mb-4 text-[12px] text-muted2">{L === "en" ? "This account was removed or is not accessible." : "Ce compte a été supprimé ou n'est plus accessible."}</div>
        <Link href="/accounts" className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[12px] font-bold text-black hover:brightness-110">
          <ArrowLeft size={14} /> {L === "en" ? "Back to accounts" : "Retour aux comptes"}
        </Link>
      </div>
    );
  }

  const h = health;
  const s = periodStats;
  const isEval = !(account.type === "funded" || account.status === "funded" || account.status === "passed");

  // Compliance strip tones (live)
  const ddTone = h.ddMargin == null ? "info" : h.breached ? "danger" : (h.ddMarginPct != null && h.ddMarginPct <= 20) ? "danger" : (h.ddMarginPct != null && h.ddMarginPct <= 50) ? "warn" : "ok";
  const dailyTone = h.dailyLimit == null ? "info" : h.dailyHit ? "danger" : (h.dailyPct || 0) >= 70 ? "warn" : "ok";

  // Consistency : max day PnL / cum PnL sur la période (indicateur, seuils Apex-like ~30%)
  const maxDayAbs = s.rows.length ? Math.max(...s.rows.map((r) => Math.abs(r.pnl))) : 0;
  const consistencyPct = s.cum > 0 ? (maxDayAbs / s.cum) * 100 : null;
  const consistencyTone = consistencyPct == null ? "info" : consistencyPct <= 30 ? "ok" : consistencyPct <= 50 ? "warn" : "danger";

  const payoutTone = !h.isFunded ? "info" : h.payoutEligible ? "ok" : (h.daysToPayout != null && h.daysToPayout > 0) ? "warn" : "info";

  const stStyle = STATUS_LABEL[account.status] || ["gray", account.status];
  const stKey = { active: "st_active", passed: "st_passed", funded: "st_funded", failed: "st_failed", paid: "st_paid" }[account.status];

  return (
    <div>
      {/* Header + retour */}
      <div className="mb-4">
        <Link href="/accounts" className="mb-2 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted2 hover:text-white">
          <ArrowLeft size={12} /> {L === "en" ? "Accounts" : "Comptes"}
        </Link>
        <div className="flex items-center gap-2 text-[19px] font-extrabold">
          <FirmDot color={firmColor(account.firm)} />
          <span className="truncate">{account.firm}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Pill tone="gray">{fmtMoney(account.size)}</Pill>
          <Pill tone={isEval ? "yellow" : "green"}>{isEval ? t("acc_eval") : t("acc_funded")}</Pill>
          <Pill tone={stStyle[0]}>{stKey ? t(stKey) : stStyle[1]}</Pill>
        </div>
        {account.note && <div className="mt-2 font-mono text-[12px] text-muted2">{account.note}</div>}
      </div>

      {/* Compliance strip (LIVE — jamais filtrée) */}
      <div className="mb-4 flex flex-wrap divide-x divide-line overflow-hidden rounded-2xl border border-line bg-panel">
        <ComplianceCell
          label={L === "en" ? "Trailing DD" : "Marge DD"}
          value={h.ddMargin != null ? (h.breached ? (L === "en" ? "BLOWN" : "CRAMÉ") : signedMoney(h.ddMargin) + (L === "en" ? " left" : " restant")) : "—"}
          sub={h.maxDD != null ? "/ " + fmtMoney(h.maxDD) : null}
          tone={ddTone}
        />
        <ComplianceCell
          label={L === "en" ? "Daily loss" : "Perte du jour"}
          value={h.dailyLimit != null ? fmtMoney(h.dailyUsed || 0) + " / " + fmtMoney(h.dailyLimit) : "—"}
          sub={h.dailyLimit != null ? Math.round(h.dailyPct || 0) + "% used" : null}
          tone={dailyTone}
        />
        <ComplianceCell
          label={L === "en" ? "Best day / total" : "Meilleur jour / total"}
          value={consistencyPct != null ? Math.round(consistencyPct) + "%" : "—"}
          sub={consistencyPct != null ? (L === "en" ? "Consistency" : "Consistance") : (L === "en" ? "Needs profit" : "Profit requis")}
          tone={consistencyTone}
        />
        <ComplianceCell
          label="Payout"
          value={!h.isFunded ? (L === "en" ? "Eval" : "Éval") : h.payoutEligible ? (L === "en" ? "Available" : "Disponible") : h.daysToPayout != null && h.daysToPayout > 0 ? h.daysToPayout + (L === "en" ? "d" : "j") : "—"}
          sub={h.isFunded ? fmtMoney(h.payoutTotal) + (L === "en" ? " received" : " reçu") : null}
          tone={payoutTone}
        />
      </div>

      {/* Alertes (live) */}
      {h.alerts.length > 0 && (
        <div className="mb-4 flex flex-col gap-1.5">
          {h.alerts.map((al, i) => {
            const c = toneColor(al.level === "info" ? null : al.level);
            const bg =
              al.level === "danger" ? "color-mix(in srgb, var(--loss) 10%, transparent)"
              : al.level === "warn" ? "rgba(245,158,11,.10)"
              : al.level === "ok" ? "color-mix(in srgb, var(--accent) 10%, transparent)"
              : "rgba(255,255,255,.04)";
            return (
              <div key={i} className="rounded-lg px-3 py-2 text-[12px] font-semibold" style={{ color: c, background: bg, borderLeft: "2px solid " + c }}>
                {al.msg}
              </div>
            );
          })}
        </div>
      )}

      {/* Sélecteur période */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="mr-1 text-[11px] font-bold uppercase tracking-wide text-muted2">{L === "en" ? "Period" : "Période"}</div>
        {PERIODS.map((p) => (
          <button key={p.v} onClick={() => setPeriod(p.v)}
            className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold ${period === p.v ? "border-accent bg-accentDim text-accent" : "border-line2 bg-panel2 text-muted2 hover:text-white"}`}>
            {L === "en" ? p.en : p.fr}
          </button>
        ))}
        <div className="flex-1" />
        <div className="font-mono text-[11px] text-muted2">{s.total} trades</div>
      </div>

      {/* KPIs période */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
        <KPI label={L === "en" ? "Net P&L" : "P&L net"} value={signedMoney(s.cum)} tone={s.cum >= 0 ? "pos" : "neg"} />
        <KPI label="Trades" value={s.total} />
        <KPI label="Win rate" value={s.total ? s.wr.toFixed(1) + "%" : "—"} />
        <KPI label={L === "en" ? "Avg R:R" : "R:R moyen"} value={s.rr === Infinity ? "∞" : s.rr > 0 ? s.rr.toFixed(2) : "—"} />
        <KPI label="Expectancy" value={s.total ? signedMoney(s.expec) : "—"} tone={s.expec > 0 ? "pos" : s.expec < 0 ? "neg" : undefined} />
        <KPI label="Max DD" value={fmtMoney(s.maxDD)} tone="neg" />
      </div>

      {/* Equity curve */}
      <div className="mb-4 rounded-2xl border border-line bg-panel p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[11px] font-bold uppercase tracking-widest text-muted2">{L === "en" ? "Account equity" : "Courbe d'equity"}</div>
          <div className="font-mono text-[10px] text-muted2">start {fmtMoney(s.size)}</div>
        </div>
        <EquityCurve points={s.curve} startingBalance={s.size} lang={L} />
      </div>

      {/* Breakdown journalier */}
      <div className="mb-4 overflow-hidden rounded-2xl border border-line bg-panel">
        <div className="border-b border-line px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-muted2">{L === "en" ? "Daily breakdown" : "Récap journalier"}</div>
        {s.rows.length === 0 ? (
          <div className="p-6 text-center text-[12px] text-muted2">{L === "en" ? "No trades on this period." : "Aucun trade sur cette période."}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-muted2">
                  <th className="px-4 py-2 font-semibold">Date</th>
                  <th className="px-4 py-2 text-right font-semibold">Trades</th>
                  <th className="px-4 py-2 text-right font-semibold">Win %</th>
                  <th className="px-4 py-2 text-right font-semibold">P&L</th>
                  <th className="px-4 py-2 text-right font-semibold">{L === "en" ? "Cumulative" : "Cumul"}</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {s.rows.map((r) => (
                  <tr key={r.date} className="border-b border-line/50 last:border-b-0">
                    <td className="px-4 py-2">{frDate(r.date)}</td>
                    <td className="px-4 py-2 text-right">{r.trades}</td>
                    <td className="px-4 py-2 text-right">{r.trades ? Math.round((r.wins / r.trades) * 100) + "%" : "—"}</td>
                    <td className="px-4 py-2 text-right" style={{ color: r.pnl >= 0 ? GREEN : RED }}>{signedMoney(r.pnl)}</td>
                    <td className="px-4 py-2 text-right text-white">{fmtMoney(Math.round(r.cumulative))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pied de page */}
      <div className="mt-3 flex items-start gap-1.5 text-[11px] text-muted2">
        <Info size={13} className="mt-px shrink-0" />
        {L === "en"
          ? "Live compliance figures reflect all logged trades. Period KPIs use only the selected window."
          : "Les chiffres de compliance sont live (tous les trades). Les KPI période ne comptent que la fenêtre choisie."}
      </div>
    </div>
  );
}
