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
import { ArrowLeft, FileDown, Pencil, Trash2, Info, TrendingUp, TrendingDown } from "lucide-react";

const GREEN = "var(--accent)";
const AMBER = "#f59e0b";
const RED = "var(--loss)";

const alertColor = (lvl) => (lvl === "danger" ? RED : lvl === "warn" ? AMBER : lvl === "ok" ? GREEN : "#6b7385");
const alertBg = (lvl) =>
  lvl === "danger"
    ? "color-mix(in srgb, var(--loss) 10%, transparent)"
    : lvl === "warn"
    ? "rgba(245,158,11,.10)"
    : lvl === "ok"
    ? "color-mix(in srgb, var(--accent) 10%, transparent)"
    : "rgba(255,255,255,.04)";

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

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const { accounts, trades, certificates, deleteAccount, notify, t, lang, loading } = useBook();
  const L = lang === "en" ? "en" : "fr";

  const [editing, setEditing] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false); // câblé à l'étape 3

  const account = useMemo(() => accounts.find((a) => a.id === id) || null, [accounts, id]);
  const h = useMemo(
    () => (account ? accountHealth(account, trades, certificates, L) : null),
    [account, trades, certificates, L]
  );

  // Trades du compte (le provider a déjà trié par date desc, on filtre juste)
  const acctTrades = useMemo(
    () => (account ? trades.filter((tr) => tr.account_id === account.id) : []),
    [trades, account]
  );

  // Payouts liés à la firm (même règle que accountHealth : match par firm)
  const payouts = useMemo(
    () =>
      account
        ? certificates
            .filter((c) => c.type === "payout" && c.firm === account.firm)
            .slice()
            .sort((a, b) => (a.date < b.date ? 1 : -1))
        : [],
    [certificates, account]
  );

  // --- Loading & 404 ---
  if (loading) {
    return (
      <div className="py-16 text-center text-[12px] text-muted2">
        {L === "en" ? "Loading…" : "Chargement…"}
      </div>
    );
  }

  if (!account) {
    return (
      <div>
        <Link
          href="/accounts"
          className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-muted2 hover:text-white"
        >
          <ArrowLeft size={14} /> {L === "en" ? "Back to accounts" : "Retour aux comptes"}
        </Link>
        <EmptyState
          icon="◇"
          title={L === "en" ? "Account not found" : "Compte introuvable"}
          sub={L === "en" ? "This account may have been deleted." : "Ce compte a peut-être été supprimé."}
        />
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
    // Placeholder — l'étape 3 câblera @react-pdf/renderer (dynamic import) ici.
    setPdfBusy(true);
    notify(L === "en" ? "PDF export coming soon" : "Export PDF — bientôt disponible");
    setTimeout(() => setPdfBusy(false), 400);
  };

  return (
    <div>
      {/* Fil d'ariane */}
      <Link
        href="/accounts"
        className="mb-3 inline-flex items-center gap-1.5 text-[12px] text-muted2 hover:text-white"
      >
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
          {account.note ? (
            <div className="mt-1.5 font-mono text-[11px] text-muted2">{account.note}</div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <PrimaryBtn
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px]"
            onClick={onExportPdf}
            disabled={pdfBusy}
          >
            <FileDown size={14} />
            {pdfBusy ? (L === "en" ? "Preparing…" : "Préparation…") : "Export PDF"}
          </PrimaryBtn>
          <GhostBtn
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px]"
            onClick={() => setEditing(true)}
          >
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

      {/* Alertes live */}
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

      {/* Grid principale */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Col gauche — Santé */}
        <div
          className="rounded-2xl border bg-panel p-4"
          style={{ borderColor: h.breached ? RED : "#242833" }}
        >
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted2">
            {L === "en" ? "Health" : "Santé"}
          </div>

          {/* Headline balance + cushion */}
          <div className="mb-3 flex items-center justify-between rounded-xl bg-panel2 px-3.5 py-3">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted2">
                {L === "en" ? "Margin before breach" : "Marge avant breach"}
                {h.maxDD != null ? " · " + (h.trailing ? "trailing" : "static") : ""}
              </div>
              <div className="font-mono text-[22px] font-extrabold leading-tight" style={{ color: ddColor }}>
                {cushionTxt}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-muted2">
                {L === "en" ? "Balance" : "Solde"}
              </div>
              <div className="font-mono text-[15px] font-bold text-white">
                ~ {fmtMoney(Math.round(h.balance))}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-muted2">
                {L === "en" ? "High-water " : "Plus haut "} {fmtMoney(Math.round(h.highWater))}
              </div>
            </div>
          </div>

          {/* Meters */}
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

          {/* Payout status (funded) */}
          {!isEval && (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-panel2 px-3 py-2">
              <span className="text-[10px] uppercase tracking-wide text-muted2">Payout</span>
              <span
                className="font-mono text-[12px] font-bold"
                style={{ color: h.payoutEligible ? GREEN : "#8a93a6" }}
              >
                {h.payoutEligible
                  ? (L === "en" ? "✅ Available" : "✅ Disponible")
                  : h.daysToPayout != null && h.daysToPayout > 0
                  ? "⏳ " + h.daysToPayout + (L === "en" ? "d" : "j")
                  : h.minDaysLeft > 0
                  ? h.minDaysLeft + (L === "en" ? "d min" : "j min")
                  : "—"}
              </span>
            </div>
          )}

          {/* Mini stats */}
          <div className={"mt-3 grid " + (isEval ? "grid-cols-3" : "grid-cols-4") + " gap-1.5"}>
            <Stat
              label="Trades"
              value={
                <span>
                  {h.trades} <span className="text-[10px] text-accent">{h.wins}W</span>{" "}
                  <span className="text-[10px] text-loss">{h.losses}L</span>
                </span>
              }
            />
            <Stat label="PnL" value={signedMoney(h.cum)} color={h.cum >= 0 ? GREEN : RED} />
            <Stat label={L === "en" ? "Days" : "Jours"} value={h.tradingDays} />
            {!isEval && <Stat label="Payouts" value={fmtMoney(h.payoutTotal)} color="#ff66e4" />}
          </div>
        </div>

        {/* Col droite — Trades récents + payouts */}
        <div className="flex flex-col gap-4">
          {/* Trades du compte */}
          <div className="rounded-2xl border border-line bg-panel p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted2">
                {L === "en" ? "Recent trades" : "Trades récents"}
              </div>
              <span className="font-mono text-[11px] text-muted2">
                {acctTrades.length} {L === "en" ? "total" : "total"}
              </span>
            </div>

            {acctTrades.length === 0 ? (
              <div className="rounded-lg bg-panel2 px-3 py-6 text-center text-[12px] text-muted2">
                {L === "en" ? "No trades on this account yet." : "Aucun trade sur ce compte pour l'instant."}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {acctTrades.slice(0, 15).map((tr) => {
                  const p = Number(tr.pnl) || 0;
                  const win = p > 0;
                  const dir = tr.direction || tr.side || null;
                  return (
                    <div
                      key={tr.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-panel2 px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                          style={{
                            background: win
                              ? "color-mix(in srgb, var(--accent) 15%, transparent)"
                              : "color-mix(in srgb, var(--loss) 15%, transparent)",
                            color: win ? GREEN : RED,
                          }}
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
                                style={{
                                  background: dir === "short" ? "rgba(255,59,92,.12)" : "rgba(0,211,1,.12)",
                                  color: dir === "short" ? RED : GREEN,
                                }}
                              >
                                {dir}
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[10.5px] text-muted2">
                            {frDate(String(tr.date || "").slice(0, 10))}
                          </div>
                        </div>
                      </div>
                      <div className="font-mono text-[13px] font-bold" style={{ color: win ? GREEN : RED }}>
                        {signedMoney(p)}
                      </div>
                    </div>
                  );
                })}
                {acctTrades.length > 15 && (
                  <div className="pt-1 text-center font-mono text-[10.5px] text-muted2">
                    + {acctTrades.length - 15} {L === "en" ? "more" : "de plus"}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payouts (funded uniquement) */}
          {!isEval && (
            <div className="rounded-2xl border border-line bg-panel p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted2">
                  {L === "en" ? "Payout history" : "Historique payouts"}
                </div>
                <span className="font-mono text-[11px]" style={{ color: "#ff66e4" }}>
                  {fmtMoney(h.payoutTotal)} · {h.payoutCount}
                </span>
              </div>

              {payouts.length === 0 ? (
                <div className="rounded-lg bg-panel2 px-3 py-5 text-center text-[12px] text-muted2">
                  {L === "en" ? "No payout yet." : "Aucun payout pour l'instant."}
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {payouts.slice(0, 10).map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg bg-panel2 px-3 py-2">
                      <div className="font-mono text-[11px] text-muted2">
                        {frDate(String(c.date || "").slice(0, 10))}
                      </div>
                      <div className="font-mono text-[13px] font-bold" style={{ color: "#ff66e4" }}>
                        {fmtMoney(Number(c.amount) || 0)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
