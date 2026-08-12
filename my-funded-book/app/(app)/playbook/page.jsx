"use client";

import { useState } from "react";
import { useBook } from "@/components/BookProvider";
import { Pill, EmptyState, PrimaryBtn, Field, inputCls } from "@/components/ui";
import { fmtK } from "@/lib/format";
import { X } from "lucide-react";

export default function PlaybookPage() {
  const { playbooks, addSetup, deleteSetup, trades, t } = useBook();
  const [f, setF] = useState({ name: "", description: "", rules: "" });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function submit() {
    if (!f.name.trim()) return;
    const rules = f.rules.split("\n").map((x) => x.trim()).filter(Boolean);
    await addSetup({ name: f.name.trim(), description: f.description.trim() || null, rules });
    setF({ name: "", description: "", rules: "" });
  }

  return (
    <div>
      <div className="mb-3.5 rounded-2xl border border-line bg-panel p-[18px]">
        <h3 className="mb-3.5 text-[12px] font-semibold uppercase tracking-wide text-muted2">{t("pb_add_title")}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("pb_name")}><input className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder={t("pb_name_ph")} /></Field>
          <Field label={t("pb_desc")}><input className={inputCls} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder={t("pb_desc_ph")} /></Field>
        </div>
        <Field label={t("pb_rules")}>
          <textarea className={inputCls + " min-h-[90px] resize-y leading-relaxed"} value={f.rules} onChange={(e) => set("rules", e.target.value)} placeholder={"Liquidity swept above Asia high\nDisplacement through structure\nEntry on FVG retrace\nStop beyond sweep, min 2R target"} />
        </Field>
        <PrimaryBtn onClick={submit}>{t("pb_add_btn")}</PrimaryBtn>
      </div>

      {playbooks.length === 0 ? (
        <EmptyState icon="◈" title={t("pb_empty_t")} sub={t("pb_empty_s")} />
      ) : (
        <div className="flex flex-col gap-2.5">
          {playbooks.map((sp) => {
            const used = trades.filter((tr) => tr.setup === sp.name);
            const w = used.filter((tr) => tr.pnl > 0).length;
            const wr = used.length ? ((w / used.length) * 100).toFixed(0) : "—";
            const net = used.reduce((a, tr) => a + Number(tr.pnl), 0);
            return (
              <div key={sp.id} className="rounded-xl border border-line bg-panel px-4 py-3.5">
                <div className="flex items-center justify-between gap-2.5">
                  <div className="text-[14px] font-semibold">{sp.name}</div>
                  <div className="flex items-center gap-2">
                    <Pill tone="gray">{used.length} {t("pb_trades")}</Pill>
                    <Pill tone={wr !== "—" && +wr >= 50 ? "green" : "yellow"}>WR {wr}{wr !== "—" ? "%" : ""}</Pill>
                    <Pill tone={net >= 0 ? "green" : "red"}>{fmtK(net)}</Pill>
                    <button onClick={() => deleteSetup(sp.id)} className="rounded-md p-1 text-muted2 hover:bg-lossDim hover:text-loss"><X size={15} /></button>
                  </div>
                </div>
                {sp.description && <div className="mt-1.5 text-[12.5px] text-muted">{sp.description}</div>}
                {sp.rules && sp.rules.length > 0 && (
                  <div className="mt-2 border-t border-line pt-2">
                    {sp.rules.map((r, i) => (
                      <div key={i} className="flex gap-2 py-0.5 text-[12.5px] text-white/80"><span className="text-muted2">▢</span>{r}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
