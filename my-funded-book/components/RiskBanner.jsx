"use client";

import { useMemo } from "react";
import { useBook } from "@/components/BookProvider";
import { fmtMoney, todayISO } from "@/lib/format";

const GREEN = "#00d301";
const AMBER = "#f59e0b";
const RED = "#ff3b5c";

// Montant signé lisible : -1 320 $ / +320 $
function signed(v) {
  const n = Number(v) || 0;
  return (n < 0 ? "−" : "") + fmtMoney(Math.abs(n));
}

function Cell({ label, sub, pct, color, bigLabel, bigValue }) {
  return (
    <div className="rounded-xl border border-line2 bg-panel2 p-3.5">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted2">{label}</span>
        <span className="font-mono text-[11.5px] text-muted2">{sub}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-md" style={{ background: "#1e2230" }}>
        <div className="h-full rounded-md" style={{ width: Math.max(0, Math.min(100, pct)) + "%", background: color }} />
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-[11px] text-muted2">{bigLabel}</span>
        <span className="font-mono text-[15px] font-extrabold" style={{ color }}>{bigValue}</span>
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

    return { size, dailyLimit, maxDD, trailing, balance, ddThreshold, ddMargin, dailyUsed, dailyLeft };
  }, [account, trades]);

  if (!account || !data) return null;
  if (data.dailyLimit == null && data.maxDD == null) return null;

  const dailyRatio = data.dailyLimit ? data.dailyUsed / data.dailyLimit : 0;
  const dailyColor = dailyRatio >= 0.85 ? RED : dailyRatio >= 0.6 ? AMBER : GREEN;

  const ddRatio = data.maxDD ? data.ddMargin / data.maxDD : 1;
  const ddColor = ddRatio <= 0.2 ? RED : ddRatio <= 0.5 ? AMBER : GREEN;

  return (
    <div className="mb-4 rounded-2xl border border-line bg-panel p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: GREEN }} />
          <span className="text-[13px] font-extrabold">{account.firm} · {fmtMoney(account.size)}</span>
          <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{ background: "rgba(0,211,1,.12)", color: GREEN }}>
            {account.type === "funded" ? "funded" : (L === "en" ? "eval" : "éval")}
          </span>
        </div>
        <span className="font-mono text-[12px] text-muted2">{L === "en" ? "Balance" : "Solde"} ~ {fmtMoney(Math.round(data.balance))}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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

      <div className="mt-3 flex items-start gap-1.5 text-[11px] text-muted2">
        <span className="mt-px shrink-0">ⓘ</span>
        {L === "en"
          ? "Estimate from your logged trades (realized PnL), not intraday unrealized. Indicator, not the official firm value."
          : "Estimation basée sur tes trades loggés (PnL réalisé), pas l'unrealized intraday. Indicateur, pas la valeur officielle."}
      </div>
    </div>
  );
}
