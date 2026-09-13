"use client";

import { useMemo } from "react";
import { useBook } from "@/components/BookProvider";
import { fmtMoney, todayISO } from "@/lib/format";
import { Building2, Info } from "lucide-react";

// Palette PRISM cohérente avec le design system.
// On garde des couleurs distinctes pour les 3 états (safe / warning / danger)
// mais alignées PRISM (vert/rouge plus doux, ambre inchangé).
const OK = "#22c55e";     // prism-win
const WARN = "#f59e0b";   // ambre
const DANGER = "#ef4444"; // prism-loss

// Montant signé lisible : -1 320 $ / +320 $
function signed(v) {
  const n = Number(v) || 0;
  return (n < 0 ? "−" : "") + fmtMoney(Math.abs(n));
}

function Cell({ label, sub, pct, color, bigLabel, bigValue }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="rounded-xl border border-prism-line bg-white/[0.02] p-4">
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-prism-muted2">{label}</span>
        <span className="font-mono text-[11px] text-prism-muted2 tabular-nums">{sub}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${clamped}%`, background: color }}
        />
      </div>
      <div className="mt-2.5 flex items-baseline gap-1.5">
        <span className="text-[11px] text-prism-muted2">{bigLabel}</span>
        <span className="font-mono text-base font-bold tabular-nums" style={{ color }}>
          {bigValue}
        </span>
      </div>
    </div>
  );
}

export default function RiskBanner() {
  const { accounts, trades, lang } = useBook();
  const L = lang === "en" ? "en" : "fr";

  const account = useMemo(
    () =>
      accounts.find((a) => a.type === "funded" && a.status === "active") ||
      accounts.find((a) => a.status === "active") ||
      accounts[0] ||
      null,
    [accounts]
  );

  const data = useMemo(() => {
    if (!account) return null;
    const size = Number(account.size) || 0;
    const dailyLimit = account.daily_loss_limit != null ? Number(account.daily_loss_limit) : null;
    const maxDD = account.max_drawdown != null ? Number(account.max_drawdown) : null;
    const profitTarget = account.profit_target != null ? Number(account.profit_target) : null;
    const trailing = account.trailing_drawdown !== false;

    const at = trades
      .filter((tr) => tr.account_id === account.id)
      .slice()
      .sort((a, b) =>
        a.date < b.date ? -1 : a.date > b.date ? 1 : (a.created_at || "") < (b.created_at || "") ? -1 : 1
      );

    let cum = 0;
    let peak = 0;
    for (const tr of at) {
      cum += Number(tr.pnl) || 0;
      if (cum > peak) peak = cum;
    }
    const balance = size + cum;
    const highWater = size + peak;

    let ddThreshold = null;
    let ddMargin = null;
    if (maxDD != null) {
      ddThreshold = trailing ? Math.min(highWater - maxDD, size) : size - maxDD;
      ddMargin = balance - ddThreshold;
    }

    const today = todayISO();
    let todayPnl = 0;
    for (const tr of at) if (tr.date === today) todayPnl += Number(tr.pnl) || 0;

    let dailyUsed = null;
    let dailyLeft = null;
    if (dailyLimit != null) {
      dailyUsed = todayPnl < 0 ? -todayPnl : 0;
      dailyLeft = dailyLimit - dailyUsed;
    }

    let profitLeft = null;
    if (profitTarget != null) {
      profitLeft = profitTarget - cum;
    }

    return {
      size, dailyLimit, maxDD, trailing, balance, ddThreshold, ddMargin, dailyUsed, dailyLeft,
      profitTarget, profitNet: cum, profitLeft,
    };
  }, [account, trades]);

  if (!account || !data) return null;
  if (data.dailyLimit == null && data.maxDD == null && data.profitTarget == null) return null;

  const dailyRatio = data.dailyLimit ? data.dailyUsed / data.dailyLimit : 0;
  const dailyColor = dailyRatio >= 0.85 ? DANGER : dailyRatio >= 0.6 ? WARN : OK;

  const ddRatio = data.maxDD ? data.ddMargin / data.maxDD : 1;
  const ddColor = ddRatio <= 0.2 ? DANGER : ddRatio <= 0.5 ? WARN : OK;

  const profitRatio = data.profitTarget ? data.profitNet / data.profitTarget : 0;
  const profitPct = Math.max(0, profitRatio * 100);
  const profitReached = data.profitTarget != null && data.profitNet >= data.profitTarget;

  return (
    <div className="mb-4 rounded-2xl border border-prism-line bg-prism-panel p-5">
      {/* Header : firm + status + balance */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-prism-accentDim text-prism-accent"
          >
            <Building2 className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm font-semibold text-white">
            {account.firm} · {fmtMoney(account.size)}
          </span>
          <span
            className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
            style={{ background: "rgba(34, 197, 94, 0.12)", color: OK }}
          >
            {account.type === "funded" ? "funded" : L === "en" ? "eval" : "éval"}
          </span>
        </div>
        <span className="font-mono text-xs text-prism-muted2 tabular-nums">
          {L === "en" ? "Balance" : "Solde"} ~ {fmtMoney(Math.round(data.balance))}
        </span>
      </div>

      {/* Cells */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.profitTarget != null && (
          <Cell
            label={L === "en" ? "Profit target" : "Objectif profit"}
            sub={`${fmtMoney(data.profitNet)} / ${fmtMoney(data.profitTarget)}`}
            pct={profitPct}
            color={OK}
            bigLabel={profitReached ? (L === "en" ? "reached" : "atteint") : (L === "en" ? "left" : "reste")}
            bigValue={profitReached ? "✓" : signed(data.profitLeft)}
          />
        )}
        {data.dailyLimit != null && (
          <Cell
            label={L === "en" ? "Day loss" : "Perte du jour"}
            sub={`${fmtMoney(data.dailyUsed)} / ${fmtMoney(data.dailyLimit)}`}
            pct={(data.dailyUsed / data.dailyLimit) * 100}
            color={dailyColor}
            bigLabel={L === "en" ? "left" : "reste"}
            bigValue={signed(data.dailyLeft)}
          />
        )}
        {data.maxDD != null && (
          <Cell
            label={L === "en" ? "Trailing DD margin" : "Marge trailing DD"}
            sub={`${L === "en" ? "floor" : "seuil"} ${fmtMoney(Math.round(data.ddThreshold))}`}
            pct={(data.ddMargin / data.maxDD) * 100}
            color={ddColor}
            bigLabel={L === "en" ? "left" : "reste"}
            bigValue={signed(data.ddMargin)}
          />
        )}
      </div>

      {/* Footer note */}
      <div className="mt-3 flex items-start gap-1.5 text-[11px] text-prism-muted2">
        <Info className="mt-px h-3 w-3 shrink-0 text-prism-muted2" />
        {L === "en"
          ? "Estimate from your logged trades (realized PnL), not intraday unrealized. Indicator, not the official firm value."
          : "Estimation basée sur tes trades loggés (PnL réalisé), pas l'unrealized intraday. Indicateur, pas la valeur officielle."}
      </div>
    </div>
  );
}
