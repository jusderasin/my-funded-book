"use client";

import { useMemo, useState } from "react";
import { useBook } from "@/components/BookProvider";
import { Pill, FirmDot, EmptyState, SegTabs, PrimaryBtn } from "@/components/ui";
import { AccountModal } from "@/components/modals";
import { firmColor, STATUS_LABEL } from "@/lib/constants";
import { fmtMoney, frDate } from "@/lib/format";
import { accountHealth, signedMoney } from "@/lib/accountHealth";
import { Rocket, Trash2, Info } from "lucide-react";

const GREEN = "#00d301";
const AMBER = "#f59e0b";
const RED = "#ff3b5c";

const alertColor = (lvl) => (lvl === "danger" ? RED : lvl === "warn" ? AMBER : lvl === "ok" ? GREEN : "#6b7385");
const alertBg = (lvl) =>
  lvl === "danger" ? "rgba(255,59,92,.10)" : lvl === "warn" ? "rgba(245,158,11,.10)" : lvl === "ok" ? "rgba(0,211,1,.10)" : "rgba(255,255,255,.04)";

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

export default function AccountsPage() {
  const { accounts, trades, certificates, updateAccount, deleteAccount, t, lang } = useBook();
  const L = lang === "en" ? "en" : "fr";
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(false);

  let list = accounts;
  if (filter === "eval") list = list.filter((a) => a.type === "eval" && a.status !== "funded" && a.status !== "passed");
  if (filter === "funded") list = list.filter((a) => a.type === "funded" || a.status === "funded" || a.status === "passed");

  const rows = useMemo(
    () => list.map((a) => ({ a, h: accountHealth(a, trades, certificates, L) })),
    [list, trades, certificates, L]
  );

  const promote = async (a) => {
    const ok = window.confirm(
      L === "en"
        ? `Move "${a.firm} \u00b7 ${fmtMoney(a.size)}" to Funded? Your trades and PnL stay linked.`
        : `Passer "${a.firm} \u00b7 ${fmtMoney(a.size)}" en Funded ? Tes trades et ton PnL restent li\u00e9s.`
    );
    if (!ok) return;
    await updateAccount(a.id, { type: "funded", status: "funded" });
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted2">{t("acc_title")}</div>
        <PrimaryBtn className="px-3 py-1.5 text-[12px]" onClick={() => setModal(true)}>{t("acc_add")}</PrimaryBtn>
      </div>
      <SegTabs active={filter} onChange={setFilter}
        tabs={[{ value: "all", label: t("acc_tab_all") }, { value: "eval", label: t("acc_tab_eval") }, { value: "funded", label: t("acc_tab_funded") }]} />

      {rows.length === 0 ? (
        <EmptyState icon="\u25a4" title={t("acc_empty_t")} sub={t("acc_empty_s")} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ a, h }) => {
            const stStyle = STATUS_LABEL[a.status] || ["gray", a.status];
            const stKey = { active: "st_active", passed: "st_passed", funded: "st_funded", failed: "st_failed", paid: "st_paid" }[a.status];
            const isEval = !(a.type === "funded" || a.status === "funded" || a.status === "passed");

            const hasDD = h.maxDD != null;
            const ddColor = !hasDD ? "#6b7385" : h.breached ? RED : h.ddMarginPct <= 20 ? RED : h.ddMarginPct <= 50 ? AMBER : GREEN;
            const cushionTxt = h.breached ? (L === "en" ? "BLOWN" : "CRAM\u00c9") : hasDD ? signedMoney(h.ddMargin) : "\u2014";

            return (
              <div key={a.id} className="rounded-2xl border bg-panel p-4" style={{ borderColor: h.breached ? RED : "#242833" }}>
                {/* Header */}
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[14px] font-semibold">
                      <FirmDot color={firmColor(a.firm)} />
                      <span className="truncate">{a.firm}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <Pill tone="gray">{fmtMoney(a.size)}</Pill>
                      <Pill tone={isEval ? "yellow" : "green"}>{isEval ? t("acc_eval") : t("acc_funded")}</Pill>
                      <Pill tone={stStyle[0]}>{stKey ? t(stKey) : stStyle[1]}</Pill>
                    </div>
                    {a.note ? <div className="mt-1 font-mono text-[11px] text-muted2">{a.note}</div> : null}
                  </div>
                  <button onClick={() => deleteAccount(a.id)} className="shrink-0 rounded-md p-1 text-muted2 hover:bg-lossDim hover:text-loss" aria-label="delete"><Trash2 size={15} /></button>
                </div>

                {/* Alertes live */}
                {h.alerts.length > 0 && (
                  <div className="mb-3 flex flex-col gap-1.5">
                    {h.alerts.map((al, i) => (
                      <div key={i} className="rounded-md px-2.5 py-1.5 text-[11px] font-semibold"
                        style={{ color: alertColor(al.level), background: alertBg(al.level), borderLeft: "2px solid " + alertColor(al.level) }}>
                        {al.msg}
                      </div>
                    ))}
                  </div>
                )}

                {/* Cushion avant breach (headline) */}
                <div className="mb-3 flex items-center justify-between rounded-xl bg-panel2 px-3.5 py-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted2">
                      {L === "en" ? "Margin before breach" : "Marge avant breach"}{h.maxDD != null ? " \u00b7 " + (h.trailing ? "trailing" : "static") : ""}
                    </div>
                    <div className="font-mono text-[20px] font-extrabold leading-tight" style={{ color: ddColor }}>{cushionTxt}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wide text-muted2">{L === "en" ? "Balance" : "Solde"}</div>
                    <div className="font-mono text-[13px] font-bold text-white">~ {fmtMoney(Math.round(h.balance))}</div>
                  </div>
                </div>

                {/* Objectif profit / payout */}
                {h.target != null && h.target > 0 && (
                  <Meter
                    label={isEval ? (L === "en" ? "Profit target" : "Objectif profit") : (L === "en" ? "Payout target" : "Objectif payout")}
                    sub={signedMoney(h.cum) + " / " + fmtMoney(h.target)}
                    pct={h.targetPct || 0}
                    color={h.targetReached ? GREEN : "#00E676"}
                  />
                )}

                {/* Drawdown utilisé */}
                {hasDD && (
                  <Meter
                    label={L === "en" ? "Drawdown used" : "Drawdown utilis\u00e9"}
                    sub={fmtMoney(Math.max(0, h.maxDD - h.ddMargin)) + " / " + fmtMoney(h.maxDD)}
                    pct={h.maxDD > 0 ? Math.max(0, 100 - (h.ddMargin / h.maxDD) * 100) : 0}
                    color={ddColor}
                  />
                )}

                {/* Daily loss (aujourd'hui) */}
                {h.dailyLimit != null && (
                  <Meter
                    label={L === "en" ? "Day loss (today)" : "Perte du jour"}
                    sub={fmtMoney(h.dailyUsed) + " / " + fmtMoney(h.dailyLimit)}
                    pct={h.dailyPct || 0}
                    color={h.dailyHit ? RED : (h.dailyPct || 0) >= 70 ? AMBER : GREEN}
                  />
                )}

                {/* Payout (funded) */}
                {!isEval && (
                  <div className="mb-3 flex items-center justify-between rounded-lg bg-panel2 px-3 py-2">
                    <span className="text-[10px] uppercase tracking-wide text-muted2">Payout</span>
                    <span className="font-mono text-[12px] font-bold" style={{ color: h.payoutEligible ? GREEN : "#8a93a6" }}>
                      {h.payoutEligible
                        ? (L === "en" ? "\u2705 Available" : "\u2705 Disponible")
                        : h.daysToPayout != null && h.daysToPayout > 0
                        ? "\u23f3 " + h.daysToPayout + (L === "en" ? "d" : "j")
                        : h.minDaysLeft > 0
                        ? h.minDaysLeft + (L === "en" ? "d min" : "j min")
                        : "\u2014"}
                    </span>
                  </div>
                )}

                {/* Mini stats */}
                <div className={"grid " + (isEval ? "grid-cols-3" : "grid-cols-4") + " gap-1.5"}>
                  <Stat label="Trades" value={<span>{h.trades} <span className="text-[10px] text-accent">{h.wins}W</span> <span className="text-[10px] text-loss">{h.losses}L</span></span>} />
                  <Stat label="PnL" value={signedMoney(h.cum)} color={h.cum >= 0 ? GREEN : RED} />
                  <Stat label={L === "en" ? "Days" : "Jours"} value={h.tradingDays} />
                  {!isEval && <Stat label="Payouts" value={fmtMoney(h.payoutTotal)} color="#ff66e4" />}
                </div>

                {/* Passer en funded (eval) */}
                {isEval && (
                  <button
                    onClick={() => promote(a)}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-bold text-ink transition"
                    style={{ background: h.targetReached && !h.breached ? GREEN : "#f5b301" }}
                  >
                    <Rocket size={14} /> {L === "en" ? "Move to Funded" : "Passer en Funded"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex items-start gap-1.5 text-[11px] text-muted2">
        <Info size={13} className="mt-px shrink-0" />
        {L === "en"
          ? "Estimates from your logged trades (realized PnL), not intraday unrealized. Indicator, not the firm's official value."
          : "Estimations bas\u00e9es sur tes trades logg\u00e9s (PnL r\u00e9alis\u00e9), pas l'unrealized intraday. Indicateur, pas la valeur officielle de la prop firm."}
      </div>

      {modal && <AccountModal onClose={() => setModal(false)} />}
    </div>
  );
}
