"use client";

import { useState } from "react";
import { useBook } from "@/components/BookProvider";
import { Pill, EmptyState, PrimaryBtn, GhostBtn } from "@/components/ui";
import { LogTradeModal } from "@/components/modals";
import { gradeClass } from "@/lib/constants";
import { fmtMoney } from "@/lib/format";

const gradeColors = {
  ap: "bg-accentDim text-accent", a: "bg-cyanx/15 text-cyanx",
  b: "bg-goldx/15 text-goldx", c: "bg-pinkx/15 text-pinkx", f: "bg-lossDim text-loss",
};

export default function JournalPage() {
  const { trades, deleteTrade } = useBook();
  const [editing, setEditing] = useState(null);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted2">Journal de trades</div>
        <PrimaryBtn className="px-3 py-1.5 text-[12px]" onClick={() => setEditing("new")}>+ Log trade</PrimaryBtn>
      </div>

      {trades.length === 0 ? (
        <EmptyState icon="≡" title="Aucun trade" sub="Log tes NQ/MNQ : grade, session, R, PnL et surtout le WHY. C'est là que l'edge se muscle." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {trades.map((t) => {
            const win = t.pnl >= 0;
            return (
              <div key={t.id} className={`rounded-xl border border-line bg-panel px-4 py-4 border-l-[3px] ${win ? "border-l-accent" : "border-l-loss"}`}>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className={`font-mono text-[18px] font-extrabold ${win ? "text-accent" : "text-loss"}`}>{(win ? "+" : "") + fmtMoney(t.pnl)}</span>
                  <span className={`inline-flex h-[22px] w-[22px] items-center justify-center rounded-md font-mono text-[10px] font-extrabold ${gradeColors[gradeClass(t.grade)]}`}>{t.grade}</span>
                  <span className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted2">
                    <Pill tone="gray">{(t.r >= 0 ? "+" : "") + Number(t.r).toFixed(0)}R</Pill>
                    {t.date} · <b className="text-muted">{t.symbol}</b>
                    <Pill tone={t.dir === "long" ? "green" : "red"}>{t.dir === "long" ? "LONG" : "SHORT"}</Pill>
                    {t.session} {t.setup ? "· " + t.setup : ""}
                  </span>
                </div>
                {t.tags && t.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">{t.tags.map((x) => <Pill key={x} tone="red">{x}</Pill>)}</div>
                )}
                {t.why && <div className="mt-2.5 text-[13px] leading-relaxed text-white/80"><b className="text-[11px] font-bold tracking-wide text-muted2">WHY —</b> {t.why}</div>}
                {t.screenshot_url && (
                  <a href={t.screenshot_url} target="_blank" rel="noreferrer" className="mt-2.5 block w-fit">
                    <img src={t.screenshot_url} alt="capture du trade" loading="lazy" className="max-h-64 rounded-lg border border-line object-contain" />
                  </a>
                )}
                <div className="mt-2.5 flex gap-2">
                  <GhostBtn className="px-3 py-1.5 text-[12px]" onClick={() => setEditing(t)}>Éditer</GhostBtn>
                  <GhostBtn className="px-3 py-1.5 text-[12px]" onClick={() => deleteTrade(t.id)}>Supprimer</GhostBtn>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {editing && <LogTradeModal editing={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
