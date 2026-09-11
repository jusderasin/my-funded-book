"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBook } from "@/components/BookProvider";
import { Pill, FirmDot, EmptyState, PrimaryBtn, GhostBtn } from "@/components/ui";
import { AccountModal } from "@/components/modals";
import { firmColor, STATUS_LABEL } from "@/lib/constants";
import { fmtMoney, frDate } from "@/lib/format";
import { accountHealth, signedMoney } from "@/lib/accountHealth";
import { analyzeAccount } from "@/lib/accountAnalytics";
import {
  ArrowLeft, FileDown, Pencil, Trash2, Info, TrendingUp, TrendingDown,
  Lightbulb, Target, Shield, Activity, Droplets, Banknote,
} from "lucide-react";

const GREEN = "var(--accent)";
const AMBER = "#f59e0b";
const RED = "var(--loss)";
const PINK = "#ff66e4";

const alertColor = (lvl) => (lvl === "danger" ? RED : lvl === "warn" ? AMBER : lvl === "ok" ? GREEN : "#6b7385");
const alertBg = (lvl) =>
  lvl === "danger"
    ? "color-mix(in srgb, var(--loss) 10%, transparent)"
    : lvl === "warn"
    ? "rgba(245,158,11,.10)"
    : lvl === "ok"
    ? "color-mix(in srgb, var(--accent) 10%, transparent)"
    : "rgba(255,255,255,.04)";

// ============ Sub-components locaux ============

function Section({ title, icon: Icon, children, className, right }) {
  return (
    <div className={"rounded-2xl border border-line bg-panel p-4 " + (className || "")}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted2">
          {Icon ? <Icon size={12} /> : null}
          {title}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Meter({ label, sub, pct, color }) {
  return (
    <div className="mb-2.5">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[11px] text-muted2">{label}</span>
        <span className="font-mono text-[11px] font-semibold" style={{ color }}>{sub}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-md" style={{ background: "#1e2230" }}>
        <div className="h-full rounded-md transition-all" style={{ width: Math.max(0, Math.min(100, pct)) + "%", background: color }} />
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="rounded-lg bg-panel2 px-2 py-1.5 text-center">
      <div className="text-[9.5px] uppercase tracking-wide text-muted2">{label}</div>
      <div className="font-mono text-[13px] font-bold" style={color ? { color } : undefined}>{value}</div>
    </div>
  );
}

function MetricRow({ label, value, color, hint }) {
  return (
    <div className="flex items-baseline justify-between py-1">
      <span className="text-[11.5px] text-muted2">
        {label}
        {hint ? <span className="ml-1 text-[10px] text-muted2/70">{hint}</span> : null}
      </span>
      <span className="font-mono text-[12.5px] font-bold" style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}

function BarRow({ label, sub, pnl, max }) {
  const pct = max > 0 ? Math.min(100, (Math.abs(pnl) / max) * 100) : 0;
  const color = pnl >= 0 ? GREEN : RED;
  return (
    <div className="mb-1.5 last:mb-0">
      <div className="mb-0.5 flex items-baseline justify-between text-[11px]">
        <span className="text-white">{label}</span>
        <span className="font-mono text-[11px]" style={{ color }}>{sub}</span>
      </div>
      <div className="h-1 rounded" style={{ background: "#1e2230" }}>
        <div className="h-full rounded" style={{ width: pct + "%", background: color }} />
      </div>
    </div>
  );
}

// Mini courbe d'équité + ligne du drawdown threshold
function EquityCurveSvg({ points, threshold }) {
  if (!points || points.length < 2) return null;
  const w = 320;
  const h = 64;
  const balances = points.map((p) => p.balance);
  let min = Math.min.apply(null, balances);
  let max = Math.max.apply(null, balances);
  if (threshold != null) min = Math.min(min, threshold);
  const range = max - min || 1;
  const y = (v) => h - ((v - min) / range) * h;
  const path = points
    .map((p, i) => (i === 0 ? "M" : "L") + ((i / (points.length - 1)) * w).toFixed(1) + "," + y(p.balance).toFixed(1))
    .join(" ");
  const last = points[points.length - 1];
  const up = last.cum >= 0;
  return (
    <svg viewBox={"0 0 " + w + " " + h} className="mt-1 h-16 w-full" preserveAspectRatio="none">
      {threshold != null && (
        <line x1={0} y1={y(threshold)} x2={w} y2={y(threshold)} stroke="#ff3b5c" strokeWidth={1} strokeDasharray="3 3" opacity={0.55} />
      )}
      <path d={path} fill="none" stroke={up ? "#00d301" : "#ff3b5c"} strokeWidth={1.6} />
    </svg>
  );
}

// ============ Page ============

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const { accounts, trades, certificates, deleteAccount, notify, t, lang, loading, profile } = useBook();
  const L = lang === "en" ? "en" : "fr";

  const [editing, setEditing] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false); // câblé à l'étape 3b

  const account = useMemo(() => accounts.find((a) => a.id === id) || null, [accounts, id]);
  const h = useMemo(() => (account ? accountHealth(account, trades, certificates, L) : null), [account, trades, certificates, L]);
  const A = useMemo(() => (account && h ? analyzeAccount(account, trades, certificates, h, L) : null), [account, trades, certificates, h, L]);

  // Trades du compte (déjà triés desc par le provider)
  const acctTrades = useMemo(
    () => (account ? trades.filter((tr) => tr.account_id === account.id) : []),
    [trades, account]
  );

  if (loading) {
    return <div className="py-16 text-center text-[12px] text-muted2">{L === "en" ? "Loading…" : "Chargement…"}</div>;
  }

  if (!account) {
    return (
      <div>
        <Link href="/accounts" className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-muted2 hover:text-white">
          <ArrowLeft size={14} /> {L === "en" ? "Back to accounts" : "Retour aux comptes"}
        </Link>
        <EmptyState icon="◇" title={L === "en" ? "Account not found" : "Compte introuvable"} sub={L === "en" ? "This account may have been deleted." : "Ce compte a peut-être été supprimé."} />
      </div>
    );
  }

  const stStyle = STATUS_LABEL[account.status] || ["gray", account.status];
  const stKey = { active: "st_active", passed: "st_passed", funded: "st_funded", failed: "st_failed", paid: "st_paid" }[account.status];
  const isEval = !(account.type === "funded" || account.status === "funded" || account.status === "passed");

  const hasDD = h.maxDD != null;
  const ddColor = !hasDD ? "#6b7385" : h.breached ? RED : h.ddMarginPct <= 20 ? RED : h.ddMarginPct <= 50 ? AMBER : GREEN;
  const cushionTxt = h.breached ? (L === "en" ? "BLOWN" : "CRAMÉ") : hasDD ? signedMoney(h.ddMargin) : "—";

  const onDelete = async () => {
    const ok = window.confirm(
      L === "en"
        ? `Delete "${account.firm} · ${fmtMoney(account.size)}"? Trades stay in your journal but lose the link.`
        : `Supprimer "${account.firm} · ${fmtMoney(account.size)}" ? Les trades restent dans ton journal mais perdent le lien.`
    );
    if (!ok) return;
    await deleteAccount(account.id);
    router.push("/accounts");
  };

  const onExportPdf = async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      const { exportPropfirmPdf } = await import("@/lib/pdf/propfirm");
      await exportPropfirmPdf({
        account,
        health: h,
        analytics: A,
        trades: acctTrades,
        profile,
        lang: L,
      });
    } catch (err) {
      console.error("[propfirm pdf]", err);
      notify(L === "en" ? "PDF export failed" : "Échec de l'export PDF", true);
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div>
      {/* Fil d'ariane */}
      <Link href="/accounts" className="mb-3 inline-flex items-center gap-1.5 text-[12px] text-muted2 hover:text-white">
        <ArrowLeft size={14} /> {L === "en" ? "Accounts" : "Comptes"}
      </Link>

      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[18px] font-semibold">
            <FirmDot color={firmColor(account.firm)} />
            <span className="truncate">{account.firm}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Pill tone="gray">{fmtMoney(account.size)}</Pill>
            <Pill tone={isEval ? "yellow" : "green"}>{isEval ? t("acc_eval") : t("acc_funded")}</Pill>
            <Pill tone={stStyle[0]}>{stKey ? t(stKey) : stStyle[1]}</Pill>
            {account.date ? (
              <span className="font-mono text-[11px] text-muted2">
                {L === "en" ? "Opened " : "Ouvert le "}{frDate(String(account.date).slice(0, 10))}
              </span>
            ) : null}
          </div>
          {account.note ? <div className="mt-1.5 font-mono text-[11px] text-muted2">{account.note}</div> : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <PrimaryBtn className="flex items-center gap-1.5 px-3 py-1.5 text-[12px]" onClick={onExportPdf} disabled={pdfBusy}>
            <FileDown size={14} />
            {pdfBusy ? (L === "en" ? "Preparing…" : "Préparation…") : "Export PDF"}
          </PrimaryBtn>
          <GhostBtn className="flex items-center gap-1.5 px-3 py-1.5 text-[12px]" onClick={() => setEditing(true)}>
            <Pencil size={13} /> {L === "en" ? "Edit" : "Éditer"}
          </GhostBtn>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-muted2 transition hover:border-loss hover:text-loss"
            title={L === "en" ? "Delete account" : "Supprimer le compte"}
          >
            <Trash2 size={13} /> {L === "en" ? "Delete" : "Supprimer"}
          </button>
        </div>
      </div>

      {/* Alertes actives */}
      {h.alerts.length > 0 && (
        <div className="mb-4 flex flex-col gap-1.5">
          {h.alerts.map((al, i) => (
            <div
              key={i}
              className="rounded-md px-2.5 py-1.5 text-[12px] font-semibold"
              style={{ color: alertColor(al.level), background: alertBg(al.level), borderLeft: "2px solid " + alertColor(al.level) }}
            >
              {al.msg}
            </div>
          ))}
        </div>
      )}

      {/* ============ Bandeau Recos actionables ============ */}
      {A && A.recos.length > 0 && (
        <div
          className="mb-4 rounded-2xl border p-4"
          style={{ borderColor: "color-mix(in srgb, var(--accent) 40%, #242833)", background: "color-mix(in srgb, var(--accent) 5%, transparent)" }}
        >
          <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: GREEN }}>
            <Lightbulb size={13} />
            {L === "en" ? "3 levers this week" : "3 leviers cette semaine"}
          </div>
          <div className="flex flex-col gap-2">
            {A.recos.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-[12.5px] leading-snug text-white">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-bold" style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: GREEN }}>
                  {i + 1}
                </span>
                <span>{r.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============ Row 1 : Santé + Trajectoire ============ */}
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        {/* Santé — cushion + meters + stats */}
        <div className="rounded-2xl border bg-panel p-4" style={{ borderColor: h.breached ? RED : "#242833" }}>
          <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted2">
            <Shield size={12} /> {L === "en" ? "Health" : "Santé"}
          </div>

          <div className="mb-3 flex items-center justify-between rounded-xl bg-panel2 px-3.5 py-3">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted2">
                {L === "en" ? "Margin before breach" : "Marge avant breach"}
                {h.maxDD != null ? " · " + (h.trailing ? "trailing" : "static") : ""}
              </div>
              <div className="font-mono text-[22px] font-extrabold leading-tight" style={{ color: ddColor }}>{cushionTxt}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-muted2">{L === "en" ? "Balance" : "Solde"}</div>
              <div className="font-mono text-[15px] font-bold text-white">~ {fmtMoney(Math.round(h.balance))}</div>
              <div className="mt-0.5 font-mono text-[10px] text-muted2">{L === "en" ? "High-water " : "Plus haut "}{fmtMoney(Math.round(h.highWater))}</div>
            </div>
          </div>

          {h.target != null && h.target > 0 && (
            <Meter
              label={isEval ? (L === "en" ? "Profit target" : "Objectif profit") : (L === "en" ? "Payout target" : "Objectif payout")}
              sub={signedMoney(h.cum) + " / " + fmtMoney(h.target)}
              pct={h.targetPct || 0}
              color={h.targetReached ? GREEN : "var(--accent)"}
            />
          )}

          {hasDD && (
            <Meter
              label={L === "en" ? "Drawdown used" : "Drawdown utilisé"}
              sub={fmtMoney(Math.max(0, h.maxDD - h.ddMargin)) + " / " + fmtMoney(h.maxDD)}
              pct={h.maxDD > 0 ? Math.max(0, 100 - (h.ddMargin / h.maxDD) * 100) : 0}
              color={ddColor}
            />
          )}

          {h.dailyLimit != null && (
            <Meter
              label={L === "en" ? "Day loss (today)" : "Perte du jour"}
              sub={fmtMoney(h.dailyUsed) + " / " + fmtMoney(h.dailyLimit)}
              pct={h.dailyPct || 0}
              color={h.dailyHit ? RED : (h.dailyPct || 0) >= 70 ? AMBER : GREEN}
            />
          )}

          <div className={"mt-3 grid " + (isEval ? "grid-cols-3" : "grid-cols-4") + " gap-1.5"}>
            <Stat label="Trades" value={<span>{h.trades} <span className="text-[10px] text-accent">{h.wins}W</span> <span className="text-[10px] text-loss">{h.losses}L</span></span>} />
            <Stat label="PnL" value={signedMoney(h.cum)} color={h.cum >= 0 ? GREEN : RED} />
            <Stat label={L === "en" ? "Days" : "Jours"} value={h.tradingDays} />
            {!isEval && <Stat label="Payouts" value={fmtMoney(h.payoutTotal)} color={PINK} />}
          </div>
        </div>

        {/* Trajectoire — projections + streaks + mini courbe */}
        <Section title={L === "en" ? "Trajectory" : "Trajectoire"} icon={Target}>
          {!A || !A.trajectory ? (
            <div className="py-4 text-center text-[12px] text-muted2">{L === "en" ? "Need more trades to project." : "Il faut plus de trades pour projeter."}</div>
          ) : (
            <>
              <MetricRow
                label={L === "en" ? "Recent pace" : "Rythme récent"}
                hint={"(" + A.trajectory.recentN + (L === "en" ? "d" : "j") + ")"}
                value={signedMoney(A.trajectory.recentPace) + "/" + (L === "en" ? "d" : "j")}
                color={A.trajectory.recentPace >= 0 ? GREEN : RED}
              />
              <MetricRow
                label={L === "en" ? "Avg pace" : "Rythme moyen"}
                value={signedMoney(A.trajectory.avgPace) + "/" + (L === "en" ? "d" : "j")}
                color={A.trajectory.avgPace >= 0 ? GREEN : RED}
              />

              {/* Projections */}
              {A.trajectory.daysToTarget != null && (
                <div className="mt-2 rounded-lg bg-panel2 px-3 py-2 text-[12px]">
                  <span className="text-muted2">{L === "en" ? "At this pace, target hit in " : "À ce rythme, objectif atteint dans "}</span>
                  <span className="font-mono font-bold text-white">~{A.trajectory.daysToTarget} {L === "en" ? "trading days" : "jours de trading"}</span>
                </div>
              )}
              {A.trajectory.daysToBlown != null && (
                <div className="mt-2 rounded-lg px-3 py-2 text-[12px]" style={{ background: "color-mix(in srgb, var(--loss) 8%, transparent)" }}>
                  <span className="text-muted2">{L === "en" ? "At this pace, blown in " : "À ce rythme, cramé dans "}</span>
                  <span className="font-mono font-bold" style={{ color: RED }}>~{A.trajectory.daysToBlown} {L === "en" ? "trading days" : "jours de trading"}</span>
                </div>
              )}

              {/* Mini courbe */}
              <EquityCurveSvg points={A.curve} threshold={h.ddThreshold} />

              {/* Streaks + best/worst day */}
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <Stat label={L === "en" ? "Best streak" : "Meilleure série"} value={A.trajectory.maxWinStreak + (L === "en" ? "d" : "j")} color={GREEN} />
                <Stat label={L === "en" ? "Worst streak" : "Pire série"} value={A.trajectory.maxLossStreak + (L === "en" ? "d" : "j")} color={RED} />
                {A.trajectory.bestDay && (
                  <Stat
                    label={L === "en" ? "Best day" : "Meilleur jour"}
                    value={signedMoney(A.trajectory.bestDay.pnl)}
                    color={GREEN}
                  />
                )}
                {A.trajectory.worstDay && (
                  <Stat
                    label={L === "en" ? "Worst day" : "Pire jour"}
                    value={signedMoney(A.trajectory.worstDay.pnl)}
                    color={RED}
                  />
                )}
              </div>
            </>
          )}
        </Section>
      </div>

      {/* ============ Row 2 : Edge + Discipline ============ */}
      {A && (
        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          {/* Edge */}
          <Section title={L === "en" ? "Real edge" : "Edge réel"} icon={Activity}>
            <MetricRow label={L === "en" ? "Expectancy" : "Expectancy"} value={signedMoney(A.edge.expectancy) + "/tr"} color={A.edge.expectancy >= 0 ? GREEN : RED} />
            <MetricRow label={L === "en" ? "Profit factor" : "Profit factor"} value={A.edge.profitFactor === Infinity ? "∞" : A.edge.profitFactor.toFixed(2)} color={A.edge.profitFactor >= 1.5 ? GREEN : A.edge.profitFactor >= 1 ? AMBER : RED} />
            <MetricRow label={L === "en" ? "Win rate" : "Win rate"} value={Math.round(A.edge.winRate) + "%"} />
            <MetricRow label={L === "en" ? "Avg R:R" : "R:R moyen"} value={A.edge.rr === Infinity ? "∞" : A.edge.rr.toFixed(2)} />
            <MetricRow label={L === "en" ? "Avg win / loss" : "Avg win / loss"} value={signedMoney(A.edge.avgWin) + " / " + signedMoney(-A.edge.avgLoss)} />

            {A.edge.bestTrade && (
              <div className="mt-2 rounded-lg bg-panel2 px-3 py-2 text-[11px]">
                <div className="text-muted2">{L === "en" ? "Best trade" : "Meilleur trade"}</div>
                <div className="mt-0.5 flex items-baseline justify-between">
                  <span className="font-mono text-white">{A.edge.bestTrade.symbol || "—"} · {frDate(String(A.edge.bestTrade.date || "").slice(0, 10))}</span>
                  <span className="font-mono font-bold" style={{ color: GREEN }}>{signedMoney(Number(A.edge.bestTrade.pnl) || 0)}</span>
                </div>
              </div>
            )}
            {A.edge.worstTrade && (
              <div className="mt-1.5 rounded-lg bg-panel2 px-3 py-2 text-[11px]">
                <div className="text-muted2">{L === "en" ? "Worst trade" : "Pire trade"}</div>
                <div className="mt-0.5 flex items-baseline justify-between">
                  <span className="font-mono text-white">{A.edge.worstTrade.symbol || "—"} · {frDate(String(A.edge.worstTrade.date || "").slice(0, 10))}</span>
                  <span className="font-mono font-bold" style={{ color: RED }}>{signedMoney(Number(A.edge.worstTrade.pnl) || 0)}</span>
                </div>
              </div>
            )}

            {/* In-plan vs off-plan (si data dispo) */}
            {A.leaks.planStats && (A.leaks.planStats.inPlan.count || A.leaks.planStats.offPlan.count) && (
              <div className="mt-3 border-t border-line pt-3">
                <div className="mb-1.5 text-[10.5px] uppercase tracking-wide text-muted2">{L === "en" ? "Playbook adherence" : "Adhérence playbook"}</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="rounded-lg bg-panel2 px-2 py-1.5">
                    <div className="text-[9.5px] uppercase tracking-wide text-muted2">In-plan</div>
                    <div className="font-mono text-[13px] font-bold" style={{ color: A.leaks.planStats.inPlan.avgPnl >= 0 ? GREEN : RED }}>
                      {signedMoney(A.leaks.planStats.inPlan.avgPnl)}/tr
                    </div>
                    <div className="font-mono text-[10px] text-muted2">{A.leaks.planStats.inPlan.count} tr · {Math.round(A.leaks.planStats.inPlan.winRate)}% WR</div>
                  </div>
                  <div className="rounded-lg bg-panel2 px-2 py-1.5">
                    <div className="text-[9.5px] uppercase tracking-wide text-muted2">Off-plan</div>
                    <div className="font-mono text-[13px] font-bold" style={{ color: A.leaks.planStats.offPlan.avgPnl >= 0 ? GREEN : RED }}>
                      {signedMoney(A.leaks.planStats.offPlan.avgPnl)}/tr
                    </div>
                    <div className="font-mono text-[10px] text-muted2">{A.leaks.planStats.offPlan.count} tr · {Math.round(A.leaks.planStats.offPlan.winRate)}% WR</div>
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* Discipline */}
          <Section title={L === "en" ? "Discipline & risk" : "Discipline & risque"} icon={Shield}>
            {/* Daily loss touché */}
            {h.dailyLimit != null && (
              <>
                <MetricRow
                  label={L === "en" ? "Daily loss hit" : "Daily loss touché"}
                  value={A.discipline.dailyTouched + "×"}
                  color={A.discipline.dailyTouched >= 2 ? RED : A.discipline.dailyTouched === 1 ? AMBER : GREEN}
                />
                <MetricRow
                  label={L === "en" ? "Daily loss near miss" : "Daily loss frôlé"}
                  hint={"(≥70%)"}
                  value={A.discipline.dailyNearMiss + "×"}
                  color={A.discipline.dailyNearMiss >= 2 ? AMBER : "#6b7385"}
                />
              </>
            )}

            {/* Consistency rule */}
            {A.discipline.consistencyRule && (
              <div className="mt-2 rounded-lg bg-panel2 px-3 py-2">
                <div className="flex items-baseline justify-between text-[11px]">
                  <span className="text-muted2">{L === "en" ? "Consistency rule" : "Consistency rule"} <span className="text-muted2/70">({A.discipline.consistencyRule.threshold}%)</span></span>
                  <span className="font-mono font-bold" style={{ color: A.discipline.consistencyRule.passed ? GREEN : RED }}>
                    {A.discipline.consistencyRule.passed ? "✓" : "✗"} {A.discipline.consistencyRule.bestDayPct.toFixed(0)}%
                  </span>
                </div>
                <div className="mt-0.5 font-mono text-[10.5px] text-muted2">
                  {L === "en" ? "Best day " : "Meilleur jour "}
                  {signedMoney(A.discipline.consistencyRule.bestDay.pnl)} = {A.discipline.consistencyRule.bestDayPct.toFixed(0)}% {L === "en" ? "of total profit" : "du profit total"}
                </div>
              </div>
            )}

            {/* Overtrading */}
            {A.discipline.overtrading.overCount > 0 && (
              <div className="mt-2 rounded-lg bg-panel2 px-3 py-2 text-[11px]">
                <div className="mb-1 text-muted2">
                  {L === "en" ? "Overtrading" : "Overtrading"} <span className="text-muted2/70">(&gt; {A.discipline.overtrading.threshold} tr/{L === "en" ? "d" : "j"})</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-white">{A.discipline.overtrading.overCount} {L === "en" ? "day(s)" : "jour(s)"}</span>
                  <span className="font-mono" style={{ color: A.discipline.overtrading.overAvgPnl >= 0 ? GREEN : RED }}>
                    {signedMoney(A.discipline.overtrading.overAvgPnl)}/{L === "en" ? "d" : "j"}
                  </span>
                </div>
                <div className="mt-0.5 font-mono text-[10px] text-muted2">
                  {L === "en" ? "Normal days " : "Jours normaux "}
                  <span style={{ color: A.discipline.overtrading.normalAvgPnl >= 0 ? GREEN : RED }}>
                    {signedMoney(A.discipline.overtrading.normalAvgPnl)}/{L === "en" ? "d" : "j"}
                  </span>
                </div>
              </div>
            )}
          </Section>
        </div>
      )}

      {/* ============ Row 3 : Fuites (pleine largeur, 4 blocs internes) ============ */}
      {A && (
        <Section title={L === "en" ? "Leaks" : "Fuites"} icon={Droplets} className="mb-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {/* Weekday */}
            {A.leaks.weekdayStats.length > 0 && (
              <div>
                <div className="mb-2 text-[10.5px] uppercase tracking-wide text-muted2">
                  {L === "en" ? "By weekday" : "Par jour de semaine"}
                </div>
                {(() => {
                  const maxAbs = Math.max.apply(null, A.leaks.weekdayStats.map((w) => Math.abs(w.pnl)).concat([1]));
                  return A.leaks.weekdayStats.map((w) => (
                    <BarRow
                      key={w.dow}
                      label={w.label + " · " + w.count + "tr · " + Math.round(w.winRate) + "%"}
                      sub={signedMoney(w.pnl)}
                      pnl={w.pnl}
                      max={maxAbs}
                    />
                  ));
                })()}
              </div>
            )}

            {/* Symbols */}
            {A.leaks.symbolStats.length > 0 && (
              <div>
                <div className="mb-2 text-[10.5px] uppercase tracking-wide text-muted2">
                  {L === "en" ? "By symbol" : "Par symbol"}
                </div>
                {(() => {
                  const maxAbs = Math.max.apply(null, A.leaks.symbolStats.map((s) => Math.abs(s.pnl)).concat([1]));
                  return A.leaks.symbolStats.slice(0, 6).map((s) => (
                    <BarRow
                      key={s.symbol}
                      label={s.symbol + " · " + s.count + "tr · " + Math.round(s.winRate) + "%"}
                      sub={signedMoney(s.pnl)}
                      pnl={s.pnl}
                      max={maxAbs}
                    />
                  ));
                })()}
              </div>
            )}

            {/* Emotions */}
            {A.leaks.emotionStats.length > 0 ? (
              <div>
                <div className="mb-2 text-[10.5px] uppercase tracking-wide text-muted2">
                  {L === "en" ? "By emotion" : "Par émotion"}
                </div>
                {(() => {
                  const maxAbs = Math.max.apply(null, A.leaks.emotionStats.map((e) => Math.abs(e.pnl)).concat([1]));
                  return A.leaks.emotionStats.map((e) => (
                    <BarRow
                      key={e.emotion}
                      label={e.emotion + " · " + e.count + "tr · " + Math.round(e.winRate) + "%"}
                      sub={signedMoney(e.pnl)}
                      pnl={e.pnl}
                      max={maxAbs}
                    />
                  ));
                })()}
              </div>
            ) : (
              <div>
                <div className="mb-2 text-[10.5px] uppercase tracking-wide text-muted2">
                  {L === "en" ? "By emotion" : "Par émotion"}
                </div>
                <div className="rounded-lg bg-panel2 px-3 py-3 text-center font-mono text-[10.5px] text-muted2">
                  {L === "en" ? "Tag emotions when logging trades to unlock this." : "Tagge les émotions à la log pour débloquer."}
                </div>
              </div>
            )}

            {/* Direction */}
            {(A.leaks.directionStats.long || A.leaks.directionStats.short) && (
              <div>
                <div className="mb-2 text-[10.5px] uppercase tracking-wide text-muted2">
                  {L === "en" ? "Long vs Short" : "Long vs Short"}
                </div>
                {A.leaks.directionStats.long && (
                  <div className="mb-2 rounded-lg bg-panel2 px-2.5 py-2">
                    <div className="flex items-baseline justify-between text-[11px]">
                      <span className="font-mono text-white">LONG</span>
                      <span className="font-mono font-bold" style={{ color: A.leaks.directionStats.long.pnl >= 0 ? GREEN : RED }}>
                        {signedMoney(A.leaks.directionStats.long.pnl)}
                      </span>
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-muted2">
                      {A.leaks.directionStats.long.count}tr · {Math.round(A.leaks.directionStats.long.winRate)}% WR
                    </div>
                  </div>
                )}
                {A.leaks.directionStats.short && (
                  <div className="rounded-lg bg-panel2 px-2.5 py-2">
                    <div className="flex items-baseline justify-between text-[11px]">
                      <span className="font-mono text-white">SHORT</span>
                      <span className="font-mono font-bold" style={{ color: A.leaks.directionStats.short.pnl >= 0 ? GREEN : RED }}>
                        {signedMoney(A.leaks.directionStats.short.pnl)}
                      </span>
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-muted2">
                      {A.leaks.directionStats.short.count}tr · {Math.round(A.leaks.directionStats.short.winRate)}% WR
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ============ Row 4 : Payout intelligence (funded uniquement) ============ */}
      {A && A.payoutIntel && !isEval && (
        <Section title={L === "en" ? "Payout intelligence" : "Payout intelligence"} icon={Banknote} className="mb-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Historique agrégé */}
            <div>
              <MetricRow label={L === "en" ? "Total received" : "Total touché"} value={fmtMoney(A.payoutIntel.total)} color={PINK} />
              <MetricRow label={L === "en" ? "Payout count" : "Nombre payouts"} value={A.payoutIntel.count} />
              <MetricRow label={L === "en" ? "Average" : "Moyenne"} value={fmtMoney(Math.round(A.payoutIntel.avg))} />
              {A.payoutIntel.avgFreq != null && (
                <MetricRow label={L === "en" ? "Avg frequency" : "Fréquence moyenne"} value={A.payoutIntel.avgFreq + (L === "en" ? "d" : "j")} />
              )}
              {A.payoutIntel.count >= 2 && (
                <MetricRow
                  label={L === "en" ? "Regularity (CV)" : "Régularité (CV)"}
                  value={A.payoutIntel.cv.toFixed(0) + "%"}
                  color={A.payoutIntel.cv < 20 ? GREEN : A.payoutIntel.cv < 50 ? AMBER : RED}
                  hint={A.payoutIntel.cv < 20 ? (L === "en" ? "(stable)" : "(stable)") : A.payoutIntel.cv < 50 ? (L === "en" ? "(moderate)" : "(modérée)") : (L === "en" ? "(erratic)" : "(erratique)")}
                />
              )}
            </div>

            {/* Prochain payout projeté */}
            <div>
              <div className="mb-2 text-[10.5px] uppercase tracking-wide text-muted2">
                {L === "en" ? "Next payout projection" : "Projection prochain payout"}
              </div>
              {A.payoutIntel.projected ? (
                <div className="rounded-lg px-3 py-3" style={{ background: "color-mix(in srgb, #ff66e4 8%, transparent)", border: "1px solid color-mix(in srgb, #ff66e4 30%, transparent)" }}>
                  <div className="font-mono text-[20px] font-extrabold" style={{ color: PINK }}>
                    ~{fmtMoney(Math.round(A.payoutIntel.projected.amount))}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-muted2">
                    {L === "en" ? "in ~" : "dans ~"}{A.payoutIntel.projected.days} {L === "en" ? "days" : "jours"}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-panel2 px-3 py-3 text-center font-mono text-[10.5px] text-muted2">
                  {L === "en" ? "Not enough data to project." : "Pas assez de données pour projeter."}
                </div>
              )}
            </div>

            {/* Historique liste */}
            <div>
              <div className="mb-2 text-[10.5px] uppercase tracking-wide text-muted2">
                {L === "en" ? "History" : "Historique"}
              </div>
              {A.payoutIntel.payouts.length === 0 ? (
                <div className="rounded-lg bg-panel2 px-3 py-3 text-center font-mono text-[10.5px] text-muted2">
                  {L === "en" ? "No payout yet." : "Aucun payout."}
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {A.payoutIntel.payouts.slice().reverse().slice(0, 8).map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg bg-panel2 px-2.5 py-1.5">
                      <span className="font-mono text-[10.5px] text-muted2">{frDate(String(c.date || "").slice(0, 10))}</span>
                      <span className="font-mono text-[12px] font-bold" style={{ color: PINK }}>{fmtMoney(Number(c.amount) || 0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* ============ Row 5 : Trades du compte (full log) ============ */}
      <Section
        title={L === "en" ? "Trade log" : "Journal du compte"}
        right={<span className="font-mono text-[11px] text-muted2">{acctTrades.length} {L === "en" ? "trades" : "trades"}</span>}
      >
        {acctTrades.length === 0 ? (
          <div className="rounded-lg bg-panel2 px-3 py-6 text-center text-[12px] text-muted2">
            {L === "en" ? "No trades on this account yet." : "Aucun trade sur ce compte pour l'instant."}
          </div>
        ) : (
          <div className="flex max-h-[480px] flex-col gap-1 overflow-y-auto pr-1">
            {acctTrades.map((tr) => {
              const p = Number(tr.pnl) || 0;
              const win = p > 0;
              const dir = tr.direction || tr.side || null;
              return (
                <div key={tr.id} className="flex items-center justify-between gap-2 rounded-lg bg-panel2 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                      style={{ background: win ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "color-mix(in srgb, var(--loss) 15%, transparent)", color: win ? GREEN : RED }}
                      aria-hidden
                    >
                      {win ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-[12px] font-semibold">
                        {tr.symbol ? <span className="truncate">{tr.symbol}</span> : <span className="text-muted2">—</span>}
                        {dir && (
                          <span
                            className="rounded-md px-1.5 py-px font-mono text-[9.5px] uppercase"
                            style={{ background: dir === "short" ? "rgba(255,59,92,.12)" : "rgba(0,211,1,.12)", color: dir === "short" ? RED : GREEN }}
                          >
                            {dir}
                          </span>
                        )}
                        {tr.emotion && tr.emotion !== "none" && (
                          <span className="rounded-md bg-panel px-1.5 py-px font-mono text-[9.5px] text-muted2">{tr.emotion}</span>
                        )}
                      </div>
                      <div className="font-mono text-[10.5px] text-muted2">
                        {frDate(String(tr.date || "").slice(0, 10))}
                        {tr.qty ? " · " + tr.qty + (L === "en" ? " ct" : " ct") : ""}
                      </div>
                    </div>
                  </div>
                  <div className="font-mono text-[13px] font-bold" style={{ color: win ? GREEN : RED }}>{signedMoney(p)}</div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <div className="mt-4 flex items-start gap-1.5 text-[11px] text-muted2">
        <Info size={13} className="mt-px shrink-0" />
        {L === "en"
          ? "Estimates from your logged trades (realized PnL), not intraday unrealized. Indicator, not the firm's official value."
          : "Estimations basées sur tes trades loggés (PnL réalisé), pas l'unrealized intraday. Indicateur, pas la valeur officielle de la prop firm."}
      </div>

      {editing && <AccountModal editing={account} onClose={() => setEditing(false)} />}
    </div>
  );
}
