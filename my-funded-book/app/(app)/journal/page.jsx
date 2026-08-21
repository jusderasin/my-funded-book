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
  const { trades, deleteTrade, t } = useBook();
  const [editing, setEditing] = useState(null);
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted2">{t("jrn_title")}</div>
        <PrimaryBtn className="px-3 py-1.5 text-[12px]" onClick={() => setEditing("new")}>{t("jrn_add")}</PrimaryBtn>
      </div>
      {trades.length === 0 ? (
        <EmptyState icon="≡" title={t("jrn_empty_t")} sub={t("jrn_empty_s")} />
      ) : (
        <div className="flex flex-col gap-2.5">
          {trades.map((tr) => {
            const win = tr.pnl >= 0;
            return (
              <div key={tr.id} className={`rounded-xl border border-line bg-panel px-4 py-4 border-l-[3px] ${win ? "border-l-accent" : "border-l-loss"}`}>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className={`font-mono text-[18px] font-extrabold ${win ? "text-accent" : "text-loss"}`}>{(win ? "+" : "") + fmtMoney(tr.pnl)}</span>
                  <span className={`inline-flex h-[22px] w-[22px] items-center justify-center rounded-md font-mono text-[10px] font-extrabold ${gradeColors[gradeClass(tr.grade)]}`}>{tr.grade}</span>
                  <span className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted2">
                    <Pill tone="gray">{(tr.r >= 0 ? "+" : "") + Number(tr.r).toFixed(0)}R</Pill>
                    {tr.date} · <b className="text-muted">{tr.symbol}</b>
                    <Pill tone={tr.dir === "long" ? "green" : "red"}>{tr.dir === "long" ? "LONG" : "SHORT"}</Pill>
                    {tr.outcome && <Pill tone={tr.outcome === "TP" ? "green" : tr.outcome === "SL" ? "red" : "gray"}>{tr.outcome}</Pill>}
                    {tr.session} {tr.setup ? "· " + tr.setup : ""}
                  </span>
                </div>
                {tr.tags && tr.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">{tr.tags.map((x) => <Pill key={x} tone="red">{x}</Pill>)}</div>
                )}
                {tr.why && <div className="mt-2.5 text-[13px] leading-relaxed text-white/80"><b className="text-[11px] font-bold tracking-wide text-muted2">{t("jrn_why")}</b> {tr.why}</div>}
                {tr.screenshot_url && (
                  <a href={tr.screenshot_url} target="_blank" rel="noreferrer" className="mt-2.5 block w-fit">
                    <img src={tr.screenshot_url} alt="capture" loading="lazy" className="max-h-64 rounded-lg border border-line object-contain" />
                  </a>
                )}
                <div className="mt-2.5 flex gap-2">
                  <GhostBtn className="px-3 py-1.5 text-[12px]" onClick={() => setEditing(tr)}>{t("jrn_edit")}</GhostBtn>
                  <GhostBtn className="px-3 py-1.5 text-[12px]" onClick={() => deleteTrade(tr.id)}>{t("jrn_delete")}</GhostBtn>
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
