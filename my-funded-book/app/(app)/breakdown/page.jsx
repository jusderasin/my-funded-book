"use client";

import { useState } from "react";
import { useBook } from "@/components/BookProvider";
import { SegTabs } from "@/components/ui";
import { fmtMoney } from "@/lib/format";

const GREEN = "#00d301";
const RED = "#ff3b5c";
const GOLD = "#f5b301";

const num = (v) => Number(v) || 0;
const WD_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const WD_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function aggregate(trades, dim, lang) {
  const map = {};
  const add = (k, tr) => {
    if (!map[k]) map[k] = { key: k, n: 0, wins: 0, pnl: 0, r: 0 };
    map[k].n++;
    map[k].pnl += num(tr.pnl);
    map[k].r += num(tr.r);
    if (num(tr.pnl) > 0) map[k].wins++;
  };
  trades.forEach((tr) => {
    if (dim === "tag") {
      (Array.isArray(tr.tags) ? tr.tags : []).forEach((tag) => add(tag, tr));
    } else if (dim === "weekday") {
      const d = new Date(tr.date + "T00:00:00");
      const arr = lang === "en" ? WD_EN : WD_FR;
      add(arr[d.getDay()] || "—", tr);
    } else if (dim === "outcome") {
      add(tr.outcome || "—", tr);
    } else {
      add(tr[dim] || "—", tr);
    }
  });
  return Object.values(map)
    .map((x) => ({ ...x, wr: x.n ? (x.wins / x.n) * 100 : 0, r: Math.round(x.r * 10) / 10 }))
    .sort((a, b) => b.pnl - a.pnl);
}

export default function BreakdownPage() {
  const { trades, t, lang } = useBook();
  const [key, setKey] = useState("setup");
  const L = lang === "en" ? "en" : "fr";
  const rows = aggregate(trades, key, lang);
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.pnl)));
  const best = rows[0];
  const worst = rows[rows.length - 1];

  return (
    <div>
      <SegTabs active={key} onChange={setKey}
        tabs={[
          { value: "setup", label: t("brk_by_setup") },
          { value: "session", label: t("brk_by_session") },
          { value: "symbol", label: t("brk_by_symbol") },
          { value: "grade", label: t("brk_by_grade") },
          { value: "tag", label: t("brk_by_tag") },
          { value: "outcome", label: L === "en" ? "By exit" : "Par sortie" },
          { value: "weekday", label: L === "en" ? "By weekday" : "Par jour" },
        ]} />

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-line bg-panel p-10 text-center text-[12.5px] text-muted2">{t("brk_empty")}</div>
      ) : (
        <>
          {rows.length >= 2 && (
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border p-4" style={{ borderColor: "rgba(0,211,1,.3)", background: "rgba(0,211,1,.05)" }}>
                <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: GREEN }}>{L === "en" ? "Best" : "Meilleur"}</div>
                <div className="mt-1 truncate text-[15px] font-extrabold">{best.key}</div>
                <div className="mt-0.5 font-mono text-[12px] text-muted2">{best.n} tr · {best.wr.toFixed(0)}% · <b style={{ color: best.pnl >= 0 ? GREEN : RED }}>{(best.pnl >= 0 ? "+" : "") + fmtMoney(best.pnl)}</b></div>
              </div>
              <div className="rounded-2xl border p-4" style={{ borderColor: "rgba(255,59,92,.3)", background: "rgba(255,59,92,.05)" }}>
                <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: RED }}>{L === "en" ? "Watch out" : "À surveiller"}</div>
                <div className="mt-1 truncate text-[15px] font-extrabold">{worst.key}</div>
                <div className="mt-0.5 font-mono text-[12px] text-muted2">{worst.n} tr · {worst.wr.toFixed(0)}% · <b style={{ color: worst.pnl >= 0 ? GREEN : RED }}>{(worst.pnl >= 0 ? "+" : "") + fmtMoney(worst.pnl)}</b></div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-line bg-panel p-[18px]">
            <div className="mb-3 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-muted2">
              <span className="w-28 shrink-0 capitalize">{key}</span>
              <span className="flex-1">{L === "en" ? "Net PnL" : "PnL net"}</span>
              <span className="w-16 shrink-0 text-right">{t("brk_trades")}</span>
              <span className="w-14 shrink-0 text-right">{t("brk_wr")}</span>
              <span className="w-24 shrink-0 text-right">R</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {rows.map((r) => {
                const c = r.pnl >= 0 ? GREEN : RED;
                const bw = Math.max(4, (Math.abs(r.pnl) / maxAbs) * 100);
                return (
                  <div key={r.key} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-[13px]">{r.key}</span>
                    <div className="flex flex-1 items-center gap-2">
                      <div className="h-6 flex-1 overflow-hidden rounded-md" style={{ background: "#1e2230" }}>
                        <div className="h-full rounded-md" style={{ width: bw + "%", background: c }} />
                      </div>
                      <span className="w-20 shrink-0 text-right font-mono text-[12.5px] font-bold" style={{ color: c }}>{(r.pnl >= 0 ? "+" : "") + fmtMoney(r.pnl)}</span>
                    </div>
                    <span className="w-16 shrink-0 text-right font-mono text-[11px] text-muted2">{r.n} tr</span>
                    <span className="w-14 shrink-0 text-right font-mono text-[11px]" style={{ color: r.wr >= 50 ? GREEN : GOLD }}>{r.wr.toFixed(0)}%</span>
                    <span className="w-24 shrink-0 text-right font-mono text-[11.5px] text-muted2">{(r.r >= 0 ? "+" : "") + r.r}R</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
