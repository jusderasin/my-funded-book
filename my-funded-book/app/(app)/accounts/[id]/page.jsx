"use client";

// Fiche d'un compte prop firm : KPI, progression, solde vs règles,
// évaluation des règles, résumé des trades et assignation de trades.
// Les calculs de risque restent ceux de lib/accountHealth.js.

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle, ArrowLeft, Check, CircleDot, FileDown, Info, Pencil, PlusCircle, Rocket, Search, Trash2, X, XCircle,
} from "lucide-react";
import { useBook } from "@/components/BookProvider";
import { AccountModal, LogTradeModal } from "@/components/modals";
import { ConfirmModal } from "@/components/prism/TerminalPrimitives";
import { accountHealth } from "@/lib/accountHealth";
import { analyzeAccount } from "@/lib/accountAnalytics";
import { accountRuleSet } from "@/lib/constants";
import { frDate, todayISO } from "@/lib/format";
import {
  AMBER, Badge, Bar, CYAN, GHOST, GREEN, INPUT, Kpi, OUTLINE_CYAN, PHASE_TONE, RED,
  accountName, firmLabel, money, phaseOf,
} from "@/components/accounts/shared";

const FILTER = INPUT.replace("w-full ", "");

const TXT = {
  fr: {
    back: "Retour aux comptes", account: "compte", assign: "Assigner des trades", edit: "Modifier", pdf: "PDF", del: "Supprimer", promote: "Passer en Funded",
    phase: { eval: "Évaluation", funded: "Funded", failed: "Cramé", paid: "Payé" },
    balance: "SOLDE ACTUEL", pnl: "P&L TOTAL", wr: "WIN RATE", pf: "PROFIT FACTOR", sharpe: "SHARPE RATIO", mdd: "MAX DRAWDOWN",
    target: "Profit Target", ddUsed: "Drawdown utilisé", earned: "gagnés", used: "utilisés", remaining: "restants",
    overview: "Overview", trades: "Trades", chart: "ACCOUNT BALANCE", lBalance: "Solde", lMdd: "Max Drawdown", lTarget: "Profit Target",
    rules: "RULE EVALUATION", status: { progress: "EN COURS", passed: "VALIDÉ", failed: "ÉCHOUÉ", funded: "FUNDED", payout: "PAYOUT DISPO" },
    remainingTarget: "restants pour atteindre l'objectif", consistency: "Consistance", drawdown: "Drawdown", dailyLoss: "Perte du jour",
    evalStatus: "Statut de l'évaluation", passed: "Validée", notPassed: "Non validée", payout: "Payout", payoutReady: "Disponible",
    payoutIn: (d) => `Dans ${d} j`, payoutDays: (d) => `${d} jour(s) min restant(s)`, payoutNo: "Pas encore",
    toPass: (x) => `${x} restants pour valider l'évaluation.`, passedInfo: "Objectif atteint : tu peux passer ce compte en Funded.", blownInfo: "Drawdown dépassé : le compte est cramé.",
    fundedInfo: "Compte funded : surveille ton buffer de drawdown et ton cycle de payout.",
    start: "Solde de départ", maxLoss: "Limite de perte max", ddType: "Type de drawdown", floor: "Plancher actuel", buffer: "Buffer restant",
    summary: "TRADE SUMMARY", wins: "WINS", losses: "LOSSES", avg: "moy.", days: "JOURS DE TRADING", tradesDays: (t, d) => `${t} trades · ${d} jours`,
    noTrades: "Aucun trade assigné à ce compte.", assignCta: "Assigner des trades", unassign: "Retirer du compte",
    cols: ["DATE", "SYMBOLE", "DIRECTION", "P&L", "R", "STRATÉGIE", ""],
    notFound: "Compte introuvable", notFoundText: "Ce compte a peut-être été supprimé.", loading: "Chargement…",
    confirmDel: "Supprimer ce compte ?", confirmDelMsg: "Ses trades restent dans ton journal mais perdent le lien avec ce compte.",
    confirmPromote: "Passer en Funded ?", confirmPromoteMsg: "Tes trades et ton P&L restent liés à ce compte.",
    pdfFail: "Échec de l'export PDF", dd: { eod: "EOD", intraday: "Trailing intraday", static: "Static" },
    disclaimer: "Estimations basées sur tes trades loggés (P&L réalisé). Indicateur, pas la valeur officielle de la prop firm.",
  },
  en: {
    back: "Back to Accounts", account: "account", assign: "Assign Trades", edit: "Edit", pdf: "PDF", del: "Delete", promote: "Move to Funded",
    phase: { eval: "Evaluation", funded: "Funded", failed: "Blown", paid: "Paid" },
    balance: "CURRENT BALANCE", pnl: "TOTAL P&L", wr: "WIN RATE", pf: "PROFIT FACTOR", sharpe: "SHARPE RATIO", mdd: "MAX DRAWDOWN",
    target: "Profit Target", ddUsed: "Drawdown Used", earned: "earned", used: "used", remaining: "remaining",
    overview: "Overview", trades: "Trades", chart: "ACCOUNT BALANCE", lBalance: "Balance", lMdd: "Max Drawdown", lTarget: "Profit Target",
    rules: "RULE EVALUATION", status: { progress: "IN PROGRESS", passed: "PASSED", failed: "FAILED", funded: "FUNDED", payout: "PAYOUT READY" },
    remainingTarget: "remaining to target", consistency: "Consistency", drawdown: "Drawdown", dailyLoss: "Daily loss",
    evalStatus: "Evaluation Status", passed: "Passed", notPassed: "Not Passed", payout: "Payout", payoutReady: "Available",
    payoutIn: (d) => `In ${d}d`, payoutDays: (d) => `${d} min day(s) left`, payoutNo: "Not yet",
    toPass: (x) => `${x} remaining to pass evaluation.`, passedInfo: "Target reached: you can move this account to Funded.", blownInfo: "Drawdown exceeded: the account is blown.",
    fundedInfo: "Funded account: watch your drawdown buffer and payout cycle.",
    start: "Starting Balance", maxLoss: "Max Loss Limit", ddType: "Drawdown Type", floor: "Current Floor", buffer: "Remaining Buffer",
    summary: "TRADE SUMMARY", wins: "WINS", losses: "LOSSES", avg: "avg", days: "TRADING DAYS", tradesDays: (t, d) => `${t} trades · ${d} days`,
    noTrades: "No trades assigned to this account.", assignCta: "Assign trades", unassign: "Remove from account",
    cols: ["DATE", "SYMBOL", "DIRECTION", "P&L", "R", "STRATEGY", ""],
    notFound: "Account not found", notFoundText: "This account may have been deleted.", loading: "Loading…",
    confirmDel: "Delete this account?", confirmDelMsg: "Its trades stay in your journal but lose the link to this account.",
    confirmPromote: "Move to Funded?", confirmPromoteMsg: "Your trades and P&L stay linked to this account.",
    pdfFail: "PDF export failed", dd: { eod: "EOD", intraday: "Intraday trailing", static: "Static" },
    disclaimer: "Estimates from your logged trades (realized P&L). Indicator, not the firm's official value.",
  },
};

export default function AccountDetailPage() {
  const { id } = useParams() || {};
  const router = useRouter();
  const { accounts, trades, certificates, lang, loading, profile, notify, updateAccount, updateTrade, deleteAccount } = useBook();
  const L = lang === "en" ? "en" : "fr";
  const T = TXT[L];

  const [tab, setTab] = useState("overview");
  const [assignOpen, setAssignOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTrade, setEditTrade] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const account = useMemo(() => accounts.find((a) => a.id === id) || null, [accounts, id]);
  const h = useMemo(() => (account ? accountHealth(account, trades, certificates, L) : null), [account, trades, certificates, L]);
  const acctTrades = useMemo(() => (account ? trades.filter((t) => t.account_id === account.id) : []), [trades, account]);

  const stats = useMemo(() => {
    if (!account || !h) return null;
    const pnls = acctTrades.map((t) => Number(t.pnl) || 0);
    const wins = pnls.filter((p) => p > 0);
    const losses = pnls.filter((p) => p < 0);
    const gw = wins.reduce((s, p) => s + p, 0);
    const gl = Math.abs(losses.reduce((s, p) => s + p, 0));
    const dayKeys = Object.keys(h.byDay).sort();
    const daily = dayKeys.map((d) => h.byDay[d]);
    const mean = daily.length ? daily.reduce((s, x) => s + x, 0) / daily.length : 0;
    const sd = daily.length > 1 ? Math.sqrt(daily.reduce((s, x) => s + (x - mean) ** 2, 0) / (daily.length - 1)) : 0;
    // Série de solde jour par jour (point de départ = taille + progression existante).
    let bal = h.size + h.baseProfit;
    let peak = bal;
    let mdd = 0;
    const series = [{ d: null, v: bal }];
    dayKeys.forEach((d) => {
      bal += h.byDay[d];
      peak = Math.max(peak, bal);
      mdd = Math.max(mdd, peak - bal);
      series.push({ d, v: bal });
    });
    const bestDay = Math.max(h.priorBestDay || 0, ...daily, 0);
    return {
      winRate: pnls.length ? (wins.length / pnls.length) * 100 : 0,
      pf: gl ? gw / gl : gw ? Infinity : 0,
      sharpe: sd ? mean / sd : 0,
      mdd,
      series,
      avgWin: wins.length ? gw / wins.length : 0,
      avgLoss: losses.length ? -gl / losses.length : 0,
      wins: wins.length,
      losses: losses.length,
      bestDay,
      consistencyPct: h.cum > 0 ? (bestDay / h.cum) * 100 : 100,
    };
  }, [account, h, acctTrades]);

  if (loading) return <p className="py-20 text-center text-sm text-prism-muted">{T.loading}</p>;
  if (!account) {
    return (
      <div className="mx-auto max-w-[1280px] px-5 py-8 sm:px-10">
        <Link href="/accounts" className="inline-flex items-center gap-2 text-sm text-prism-muted hover:text-prism-text"><ArrowLeft className="h-4 w-4" />{T.back}</Link>
        <div className="py-24 text-center"><h2 className="text-lg font-bold">{T.notFound}</h2><p className="mt-2 text-sm text-prism-muted">{T.notFoundText}</p></div>
      </div>
    );
  }

  const phase = phaseOf(account, h);
  const rule = accountRuleSet(account);
  const consistencyLimit = rule?.consistency ?? null;
  const consistencyOk = consistencyLimit == null || stats.consistencyPct <= consistencyLimit;
  const hasTarget = h.target != null && h.target > 0;
  const hasDD = h.maxDD != null && h.maxDD > 0;
  const ddUsed = hasDD ? Math.max(0, h.maxDD - h.ddMargin) : 0;
  const ddPct = hasDD ? (ddUsed / h.maxDD) * 100 : 0;
  const remainingToTarget = hasTarget ? Math.max(0, h.target - h.cum) : 0;

  let status = "progress";
  if (h.breached || account.status === "failed") status = "failed";
  else if (phase === "funded") status = h.payoutEligible ? "payout" : "funded";
  else if (hasTarget && h.targetReached && consistencyOk) status = "passed";
  const statusTone = { progress: "warn", passed: "gain", failed: "loss", funded: "accent", payout: "gain" }[status];

  async function exportPdf() {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      const { exportPropfirmPdf } = await import("@/lib/pdf/propfirm");
      const analytics = analyzeAccount(account, trades, certificates, h, L);
      await exportPropfirmPdf({ account, health: h, analytics, trades: acctTrades, profile, lang: L });
    } catch (err) {
      console.error("[propfirm pdf]", err);
      notify(T.pdfFail, true);
    } finally {
      setPdfBusy(false);
    }
  }

  async function runConfirm() {
    const kind = confirm;
    setConfirm(null);
    if (kind === "delete") { await deleteAccount(account.id); router.push("/accounts"); }
    if (kind === "promote") await updateAccount(account.id, { type: "funded", status: "funded", funded_at: todayISO() });
  }

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-8 text-prism-text sm:px-10">
      <Link href="/accounts" className="inline-flex items-center gap-2 text-sm text-prism-muted hover:text-prism-text"><ArrowLeft className="h-4 w-4" />{T.back}</Link>

      {/* En-tête */}
      <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold uppercase tracking-[.14em] text-prism-accent">{firmLabel(account.firm)}</span>
            <span className="text-prism-muted2">·</span>
            <Badge tone={PHASE_TONE[phase]}>{T.phase[phase]}</Badge>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{accountName(account)}</h1>
          <p className="mt-1 text-sm text-prism-muted">{money(account.size, false)} {T.account}{account.date ? ` · ${frDate(String(account.date).slice(0, 10))}` : ""}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {phase === "eval" && <button type="button" onClick={() => setConfirm("promote")} className={GHOST}><Rocket className="h-3.5 w-3.5" />{T.promote}</button>}
          <button type="button" onClick={() => setEditing(true)} className={GHOST} title={T.edit}><Pencil className="h-3.5 w-3.5" />{T.edit}</button>
          <button type="button" onClick={exportPdf} disabled={pdfBusy} className={GHOST}><FileDown className="h-3.5 w-3.5" />{T.pdf}</button>
          <button type="button" onClick={() => setConfirm("delete")} className={`${GHOST} hover:border-[rgba(239,68,68,0.5)] hover:text-prism-loss`} aria-label={T.del}><Trash2 className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={() => setAssignOpen(true)} className={OUTLINE_CYAN}><PlusCircle className="h-4 w-4" />{T.assign}</button>
        </div>
      </header>

      {/* KPI */}
      <section className="mt-7 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Kpi label={T.balance} value={money(h.balance)} color={h.balance >= h.size ? GREEN : RED} />
        <Kpi label={T.pnl} value={money(h.cum)} color={h.cum >= 0 ? GREEN : RED} />
        <Kpi label={T.wr} value={`${stats.winRate.toFixed(1)}%`} />
        <Kpi label={T.pf} value={stats.pf === Infinity ? "∞" : stats.pf.toFixed(2)} />
        <Kpi label={T.sharpe} value={stats.sharpe.toFixed(2)} color={stats.sharpe < 0 ? RED : undefined} />
        <Kpi label={T.mdd} value={money(-stats.mdd)} color={stats.mdd > 0 ? RED : undefined} />
      </section>

      {/* Progression */}
      <section className="mt-5 grid gap-3 lg:grid-cols-2">
        <Progress
          label={T.target}
          pct={hasTarget ? Math.max(0, h.targetPct || 0) : 0}
          left={hasTarget ? `${money(Math.max(0, h.cum), false)} ${T.earned}` : "—"}
          right={hasTarget ? money(h.target, false) : "—"}
          color={h.targetReached ? GREEN : CYAN}
        />
        <Progress
          label={T.ddUsed}
          pct={ddPct}
          left={hasDD ? `${money(ddUsed, false)} ${T.used} · ${money(Math.max(0, h.ddMargin), false)} ${T.remaining}` : "—"}
          right={hasDD ? money(h.maxDD, false) : "—"}
          color={ddPct >= 80 || h.breached ? RED : ddPct >= 50 ? AMBER : CYAN}
        />
      </section>

      {/* Onglets */}
      <div className="mt-8 inline-flex rounded-xl border border-prism-line bg-prism-surface p-1">
        {["overview", "trades"].map((k) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`rounded-lg px-4 py-2 text-sm ${tab === k ? "bg-prism-panel2 font-medium text-prism-text" : "text-prism-muted"}`}>{T[k]}</button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-5">
            <BalanceChart T={T} series={stats.series} size={h.size} target={hasTarget ? h.size + h.target : null} targetAmount={h.target} floor={hasDD ? h.ddThreshold : null} maxDD={h.maxDD} />

            <section className="overflow-hidden rounded-xl border border-prism-line bg-prism-panel">
              <div className="flex items-center justify-between border-b border-prism-line px-5 py-4">
                <h2 className="text-[11px] font-bold tracking-[.16em]">{T.summary}</h2>
                <span className="font-mono text-[10px] text-prism-muted2">{T.tradesDays(h.trades, h.tradingDays)}</span>
              </div>
              <div className="grid grid-cols-2 border-b border-prism-line">
                <SummaryCell label={T.wins} value={stats.wins} sub={`${T.avg} ${money(stats.avgWin)}`} color={GREEN} />
                <SummaryCell label={T.losses} value={stats.losses} sub={`${T.avg} ${money(stats.avgLoss)}`} color={RED} border />
              </div>
              <div className="grid grid-cols-3">
                <SummaryCell small label={T.wr.toUpperCase()} value={h.trades ? `${stats.winRate.toFixed(1)}%` : "—"} />
                <SummaryCell small label={T.consistency.toUpperCase()} value={`${stats.consistencyPct.toFixed(1)}%`} border />
                <SummaryCell small label={T.days} value={h.tradingDays} border />
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="rounded-xl border border-prism-line bg-prism-panel p-5">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-[11px] font-bold tracking-[.16em]">{T.rules}</h2>
                <Badge tone={statusTone}>{T.status[status]}</Badge>
              </div>

              {hasTarget && (
                <div className="mb-4">
                  <RuleRow icon={<CircleDot className="h-4 w-4 text-prism-muted" />} label={T.target} value={`${money(Math.max(0, h.cum), false)} / ${money(h.target, false)}`} />
                  <div className="mt-2"><Bar pct={h.targetPct || 0} color={h.targetReached ? GREEN : CYAN} /></div>
                  <p className="mt-1.5 text-[10px] text-prism-muted2">{money(remainingToTarget, false)} {T.remainingTarget}</p>
                </div>
              )}
              {consistencyLimit != null && (
                <RuleRow ok={consistencyOk} label={T.consistency} value={`${stats.consistencyPct.toFixed(1)}% ≤ ${consistencyLimit}%`} />
              )}
              {hasDD && (
                <RuleRow ok={!h.breached} label={T.drawdown} value={`${money(Math.max(0, h.ddMargin), false)} ${T.remaining}`} />
              )}
              {h.dailyLimit != null && h.dailyLimit > 0 && (
                <RuleRow ok={!h.dailyHit} label={T.dailyLoss} value={`${money(h.dailyUsed, false)} / ${money(h.dailyLimit, false)}`} />
              )}

              <div className="my-4 border-t border-prism-line" />
              {phase === "funded" ? (
                <RuleRow
                  icon={<AlertTriangle className={`h-4 w-4 ${h.payoutEligible ? "text-prism-win" : "text-amber-400"}`} />}
                  label={T.payout}
                  value={h.payoutEligible ? T.payoutReady : h.daysToPayout > 0 ? T.payoutIn(h.daysToPayout) : h.minDaysLeft > 0 ? T.payoutDays(h.minDaysLeft) : T.payoutNo}
                  valueClass={h.payoutEligible ? "text-prism-win" : "text-amber-400"}
                />
              ) : (
                <RuleRow
                  icon={<AlertTriangle className={`h-4 w-4 ${status === "passed" ? "text-prism-win" : "text-amber-400"}`} />}
                  label={T.evalStatus}
                  value={status === "passed" ? T.passed : T.notPassed}
                  valueClass={status === "passed" ? "text-prism-win" : "text-amber-400"}
                />
              )}

              <p className="mt-4 flex items-start gap-2.5 rounded-lg border border-prism-line bg-prism-surface px-4 py-3 text-sm">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-prism-muted" />
                {status === "failed" ? T.blownInfo : phase === "funded" ? T.fundedInfo : status === "passed" ? T.passedInfo : hasTarget ? T.toPass(money(remainingToTarget, false)) : T.fundedInfo}
              </p>
            </section>

            <section className="space-y-2.5 rounded-xl border border-prism-line bg-prism-panel p-5 font-mono text-xs">
              <Line label={T.start} value={money(h.size, false)} />
              {hasTarget && <Line label={T.target} value={`+${money(h.target, false)}`} color={GREEN} />}
              {hasDD && <Line label={T.maxLoss} value={money(-h.maxDD, false)} color={RED} />}
              <Line label={T.ddType} value={T.dd[h.trailingType] || h.trailingType} />
              <div className="border-t border-prism-line" />
              {hasDD && <Line label={T.floor} value={money(h.ddThreshold, false)} color={RED} />}
              {hasDD && <Line label={T.buffer} value={money(Math.max(0, h.ddMargin), false)} />}
            </section>
          </div>
        </div>
      ) : (
        <section className="mt-5 overflow-x-auto rounded-xl border border-prism-line bg-prism-panel">
          {acctTrades.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-prism-muted">{T.noTrades}</p>
              <button type="button" onClick={() => setAssignOpen(true)} className={`${OUTLINE_CYAN} mt-5`}><PlusCircle className="h-4 w-4" />{T.assignCta}</button>
            </div>
          ) : (
            <table className="w-full min-w-[720px] font-mono text-xs">
              <thead>
                <tr className="border-b border-prism-line">{T.cols.map((c, i) => <th key={i} className="px-4 py-3 text-left text-[10px] font-semibold tracking-[.1em] text-prism-muted">{c}</th>)}</tr>
              </thead>
              <tbody>
                {acctTrades.map((t) => {
                  const p = Number(t.pnl) || 0;
                  return (
                    <tr key={t.id} onClick={() => setEditTrade(t)} className="h-11 cursor-pointer border-b border-prism-line last:border-0 hover:bg-prism-panel2">
                      <td className="px-4">{frDate(t.date)}</td>
                      <td className="px-4 font-bold">{t.symbol}</td>
                      <td className={`px-4 font-bold ${t.dir === "long" ? "text-prism-accent" : "text-prism-loss"}`}>{String(t.dir || "").toUpperCase()}</td>
                      <td className={`px-4 font-bold ${p > 0 ? "text-prism-win" : p < 0 ? "text-prism-loss" : "text-prism-muted"}`}>{money(p)}</td>
                      <td className="px-4">{Number(t.r) ? Number(t.r).toFixed(2) : "—"}</td>
                      <td className="px-4 font-sans">{t.setup || "—"}</td>
                      <td className="px-4 text-right">
                        <button type="button" title={T.unassign} aria-label={T.unassign} onClick={(e) => { e.stopPropagation(); updateTrade(t.id, { account_id: null }); }} className="text-prism-muted hover:text-prism-loss"><X className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      )}

      <p className="mt-8 flex items-start gap-2 text-[11px] text-prism-muted"><Info className="mt-px h-3.5 w-3.5 shrink-0" />{T.disclaimer}</p>

      {assignOpen && <AssignModal account={account} lang={L} onClose={() => setAssignOpen(false)} />}
      {editing && <AccountModal editing={account} onClose={() => setEditing(false)} />}
      {editTrade && <LogTradeModal editing={editTrade} onClose={() => setEditTrade(null)} />}
      {confirm && (
        <ConfirmModal
          title={confirm === "delete" ? T.confirmDel : T.confirmPromote}
          message={confirm === "delete" ? T.confirmDelMsg : T.confirmPromoteMsg}
          confirmLabel={confirm === "delete" ? T.del : T.promote}
          onClose={() => setConfirm(null)}
          onConfirm={runConfirm}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Progress({ label, pct, left, right, color }) {
  return (
    <div className="rounded-xl border border-prism-line bg-prism-panel px-5 py-4">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-mono text-xs font-bold">{Math.max(0, pct).toFixed(1)}%</span>
      </div>
      <Bar pct={pct} color={color} />
      <div className="mt-2.5 flex justify-between text-[10px] text-prism-muted2"><span>{left}</span><span>{right}</span></div>
    </div>
  );
}

function RuleRow({ ok, icon, label, value, valueClass }) {
  const mark = icon || (ok ? <Check className="h-4 w-4 rounded-full border border-prism-win p-0.5 text-prism-win" /> : <XCircle className="h-4 w-4 text-prism-loss" />);
  const color = valueClass || (ok === undefined ? "text-prism-text" : ok ? "text-prism-win" : "text-prism-loss");
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="flex items-center gap-2.5 text-sm">{mark}{label}</span>
      <span className={`font-mono text-sm ${color}`}>{value}</span>
    </div>
  );
}

function Line({ label, value, color }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="font-sans text-prism-muted">{label}</span>
      <span style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}

function SummaryCell({ label, value, sub, color, border, small }) {
  return (
    <div className={`px-5 py-4 ${border ? "border-l border-prism-line" : ""}`}>
      <p className="text-[10px] font-semibold tracking-[.14em] text-prism-muted">{label}</p>
      <p className={`mt-2 font-mono font-bold ${small ? "text-sm" : "text-xl"}`} style={color ? { color } : undefined}>{value}</p>
      {sub && <p className="mt-1 font-mono text-[11px] text-prism-muted">{sub}</p>}
    </div>
  );
}

// Graphe du solde : ligne blanche + objectif (vert pointillé) + plancher de drawdown (rouge pointillé).
function BalanceChart({ T, series, target, targetAmount, floor, maxDD }) {
  const W = 1000;
  const H = 300;
  const values = series.map((p) => p.v);
  const refs = [...values, target, floor].filter((v) => v != null);
  let lo = Math.min(...refs);
  let hi = Math.max(...refs);
  const padY = (hi - lo || hi * 0.02 || 100) * 0.12;
  lo -= padY;
  hi += padY;
  const y = (v) => ((hi - v) / (hi - lo)) * H;
  const x = (i) => (series.length > 1 ? (i / (series.length - 1)) * W : W / 2);
  const path = series.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const ticks = Array.from({ length: 5 }, (_, i) => hi - ((hi - lo) * i) / 4);
  const pctY = (v) => `${(y(v) / H) * 100}%`;
  const dates = series.filter((p) => p.d);

  return (
    <section className="rounded-xl border border-prism-line bg-prism-panel p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[11px] font-bold tracking-[.16em]">{T.chart}</h2>
        <div className="flex flex-wrap gap-4 text-[10px] text-prism-muted">
          <span className="flex items-center gap-1.5"><i className="h-0.5 w-4 bg-prism-text" />{T.lBalance}</span>
          {floor != null && <span className="flex items-center gap-1.5"><i className="h-0 w-4 border-t-2 border-dashed border-prism-loss" />{T.lMdd}</span>}
          {target != null && <span className="flex items-center gap-1.5"><i className="h-0 w-4 border-t-2 border-dashed border-prism-win" />{T.lTarget}</span>}
        </div>
      </div>
      <div className="relative ml-12 h-[280px]">
        {ticks.map((v) => (
          <div key={v} className="absolute -left-12 w-10 -translate-y-1/2 text-right font-mono text-[9px] text-prism-muted2" style={{ top: pctY(v) }}>{moneyShort(v)}</div>
        ))}
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          {ticks.map((v) => <line key={v} x1="0" x2={W} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.05)" vectorEffect="non-scaling-stroke" />)}
          {target != null && <line x1="0" x2={W} y1={y(target)} y2={y(target)} stroke={GREEN} strokeDasharray="6 5" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />}
          {floor != null && <line x1="0" x2={W} y1={y(floor)} y2={y(floor)} stroke={RED} strokeDasharray="6 5" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />}
          {series.length > 1 && <path d={path} fill="none" stroke="currentColor" className="text-prism-text" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
        </svg>
        {series.length === 1 && <span className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-prism-text" style={{ left: "50%", top: pctY(series[0].v) }} />}
        {target != null && (
          <span className="absolute right-1 -translate-y-full pb-1 font-mono text-[10px] text-prism-win" style={{ top: pctY(target) }}>
            {T.lTarget} +{moneyShort(targetAmount, true)} ({moneyShort(target, true)})
          </span>
        )}
        {floor != null && (
          <span className="absolute right-1 -translate-y-full pb-1 font-mono text-[10px] text-prism-loss" style={{ top: pctY(floor) }}>
            {T.lMdd} -{moneyShort(maxDD, true)} ({moneyShort(floor, true)})
          </span>
        )}
      </div>
      {dates.length > 0 && (
        <div className="ml-12 mt-2 flex justify-between font-mono text-[9px] text-prism-muted2">
          <span>{frDate(dates[0].d).slice(0, 5)}</span>
          {dates.length > 2 && <span>{frDate(dates[Math.floor(dates.length / 2)].d).slice(0, 5)}</span>}
          {dates.length > 1 && <span>{frDate(dates[dates.length - 1].d).slice(0, 5)}</span>}
        </div>
      )}
    </section>
  );
}

function moneyShort(v, full = false) {
  const n = Number(v) || 0;
  if (full) return `$${Math.round(Math.abs(n)).toLocaleString("en-US")}`;
  return Math.abs(n) >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.round(n)}`;
}

/* ------------------------------------------------------------------ */
/* Modal : assigner des trades au compte                               */
/* ------------------------------------------------------------------ */
function AssignModal({ account, lang, onClose }) {
  const { trades, accounts, updateTrade, notify } = useBook();
  const en = lang === "en";
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [symbol, setSymbol] = useState("");
  const [dir, setDir] = useState("");
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  const candidates = useMemo(() => trades.filter((t) => {
    if (t.account_id === account.id) return false;
    if (from && t.date < from) return false;
    if (to && t.date > to) return false;
    if (symbol && !String(t.symbol || "").toUpperCase().includes(symbol.toUpperCase())) return false;
    if (dir && t.dir !== dir) return false;
    return true;
  }), [trades, account.id, from, to, symbol, dir]);

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const accLabel = (id) => { const a = accounts.find((x) => x.id === id); return a ? accountName(a) : null; };

  async function done() {
    if (!selected.length) return onClose();
    setSaving(true);
    let ok = 0;
    for (const id of selected) if (await updateTrade(id, { account_id: account.id })) ok += 1;
    setSaving(false);
    if (ok) notify(en ? `${ok} trade(s) assigned` : `${ok} trade(s) assigné(s)`);
    onClose();
  }

  const modal = (
    <div className="fixed inset-0 z-[100] grid overflow-x-hidden overflow-y-auto bg-black/85 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="m-auto flex max-h-[88dvh] w-full max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-prism-line bg-prism-panel shadow-2xl sm:max-w-4xl">
        <header className="flex items-start justify-between border-b border-prism-line px-6 py-5">
          <div>
            <h2 className="text-lg font-bold">{en ? "Assign Trades" : "Assigner des trades"} — {accountName(account)}</h2>
            <p className="mt-1 text-sm text-prism-muted">{en ? "Select trades to link them to this account." : "Sélectionne les trades à lier à ce compte."}</p>
          </div>
          <button type="button" onClick={onClose} className="text-prism-muted hover:text-prism-text" aria-label="close"><X className="h-5 w-5" /></button>
        </header>

        <div className="flex flex-wrap items-center gap-3 border-b border-prism-line px-6 py-4">
          <input type="date" className={`${FILTER} w-40`} value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="text-sm text-prism-muted">{en ? "to" : "au"}</span>
          <input type="date" className={`${FILTER} w-40`} value={to} onChange={(e) => setTo(e.target.value)} />
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-prism-muted" />
            <input className={`${FILTER} w-36 pl-8`} placeholder={en ? "Symbol…" : "Symbole…"} value={symbol} onChange={(e) => setSymbol(e.target.value)} />
          </div>
          <select className={`${FILTER} w-44 font-sans`} value={dir} onChange={(e) => setDir(e.target.value)}>
            <option value="">{en ? "All Directions" : "Toutes directions"}</option>
            <option value="long">LONG</option>
            <option value="short">SHORT</option>
          </select>
        </div>

        <div className="min-h-[140px] flex-1 overflow-y-auto">
          {candidates.length === 0 ? (
            <p className="py-14 text-center text-sm text-prism-muted">{en ? "No trades found matching filters." : "Aucun trade ne correspond aux filtres."}</p>
          ) : (
            candidates.map((t) => {
              const checked = selected.includes(t.id);
              const p = Number(t.pnl) || 0;
              const current = accLabel(t.account_id);
              return (
                <button key={t.id} type="button" onClick={() => toggle(t.id)} className={`flex w-full items-center gap-4 border-b border-prism-line px-6 py-3 text-left font-mono text-xs transition hover:bg-prism-panel2 ${checked ? "bg-prism-accentDim" : ""}`}>
                  <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${checked ? "border-prism-accent bg-prism-accent text-black" : "border-prism-line2"}`}>{checked && <Check className="h-3 w-3" />}</span>
                  <span className="w-24">{frDate(t.date)}</span>
                  <span className="w-16 font-bold">{t.symbol}</span>
                  <span className={`w-14 font-bold ${t.dir === "long" ? "text-prism-accent" : "text-prism-loss"}`}>{String(t.dir || "").toUpperCase()}</span>
                  <span className={`w-24 font-bold ${p > 0 ? "text-prism-win" : p < 0 ? "text-prism-loss" : "text-prism-muted"}`}>{money(p)}</span>
                  <span className="flex-1 truncate font-sans text-prism-muted">{t.setup || ""}</span>
                  {current && <span className="shrink-0 rounded border border-prism-line px-2 py-0.5 font-sans text-[10px] text-prism-muted">{current}</span>}
                </button>
              );
            })
          )}
        </div>

        <footer className="flex flex-wrap items-center gap-4 border-t border-prism-line px-6 py-4 text-sm">
          <span className="text-prism-text">{selected.length} {en ? "selected" : "sélectionné(s)"}</span>
          <button type="button" onClick={() => setSelected(candidates.map((t) => t.id))} className="text-prism-accent">{en ? "Select All Visible" : "Tout sélectionner"}</button>
          <button type="button" onClick={() => setSelected([])} className="text-prism-muted">{en ? "Deselect All" : "Tout désélectionner"}</button>
          <button type="button" onClick={done} disabled={saving} className="ml-auto h-10 rounded-lg bg-white px-5 text-sm font-medium text-black disabled:opacity-60">{saving ? "…" : en ? "Done" : "Terminé"}</button>
        </footer>
      </section>
    </div>
  );
  return typeof document === "undefined" ? modal : createPortal(modal, document.body);
}
