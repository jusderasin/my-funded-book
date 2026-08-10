"use client";

import { useState } from "react";
import { useBook } from "@/components/BookProvider";
import { SegTabs } from "@/components/ui";
import { breakdownBy } from "@/lib/stats";
import { fmtMoney } from "@/lib/format";

const KEYS = {
  setup: "setup", session: "session", symbol: "symbol", grade: "grade", tag: "tag",
};

export default function BreakdownPage() {
  const { trades } = useBook();
  const [key, setKey] = useState("setup");
  const rows = breakdownBy(trades, KEYS[key]);

  return (
    <div>
      <SegTabs active={key} onChange={setKey}
        tabs={[
          { value: "setup", label: "Par setup" }, { value: "session", label: "Par session" },
          { value: "symbol", label: "Par instrument" }, { value: "grade", label: "Par grade" },
          { value: "tag", label: "Par tag" },
        ]} />
      <div className="rounded-2xl border border-line bg-panel p-[18px]">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-muted2">Aucun trade à décomposer.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-muted2">
                <th className="pb-2.5 text-left font-bold capitalize">{key}</th>
                <th className="pb-2.5 text-right font-bold">Trades</th>
                <th className="pb-2.5 text-right font-bold">Win %</th>
                <th className="pb-2.5 text-right font-bold">Net P&L</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-t border-line text-[13px]">
                  <td className="py-2.5">{r.key}</td>
                  <td className="py-2.5 text-right font-mono">{r.n}</td>
                  <td className={`py-2.5 text-right font-mono ${r.wr >= 50 ? "text-accent" : "text-goldx"}`}>{r.wr.toFixed(0)}%</td>
                  <td className={`py-2.5 text-right font-mono ${r.pnl >= 0 ? "text-accent" : "text-loss"}`}>{(r.pnl >= 0 ? "+" : "") + fmtMoney(r.pnl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
