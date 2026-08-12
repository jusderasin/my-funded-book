"use client";

import { useState, useMemo } from "react";
import { useBook } from "@/components/BookProvider";
import { Kpi, PrimaryBtn, Field, inputCls } from "@/components/ui";
import { fmtMoney, fmtK, todayISO } from "@/lib/format";

function weekStart(d = new Date()) {
  const day = d.getDay();
  const diff = (day + 6) % 7; // lundi = début
  const monday = new Date(d);
  monday.setDate(d.getDate() - diff);
  return monday.toISOString().slice(0, 10);
}

export default function ReviewPage() {
  const { stats: s, reviews, saveReview, t } = useBook();
  const wk = useMemo(() => weekStart(), []);
  const existing = reviews.find((r) => r.week_of === wk) || {};
  const [f, setF] = useState({ worked: existing.worked || "", cut: existing.cut || "", focus: existing.focus || "" });
  const set = (k, v) => setF((st) => ({ ...st, [k]: v }));

  const best = s.days.length ? Math.max(...s.days.map((d) => s.byDay[d])) : 0;
  const worst = s.days.length ? Math.min(...s.days.map((d) => s.byDay[d])) : 0;
  let costly = { pnl: 0, tag: "—" };
  s.losses.forEach((tr) => { if (tr.pnl < costly.pnl) costly = { pnl: tr.pnl, tag: (tr.tags && tr.tags[0]) || tr.setup || "—" }; });

  return (
    <div>
      <div className="mb-3.5 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Kpi label={t("rv_net")} tone={s.net >= 0 ? "pos" : "neg"} value={fmtMoney(s.net, true)} />
        <Kpi label={t("rv_trades_wr")} tone="neu" value={`${s.tr.length} · ${s.wr.toFixed(0)}%`} />
        <Kpi label={t("rv_best")} tone="pos" value={fmtK(best)} />
        <Kpi label={t("rv_worst")} tone="neg" value={fmtK(worst)} />
        <Kpi label={t("rv_plan")} tone="neu" value={`${s.tr.filter((tr) => tr.plan).length}/${s.tr.length}`} />
        <Kpi label={t("rv_costly")} tone="neg" value={costly.tag} sub={fmtK(costly.pnl)} />
      </div>

      <div className="rounded-2xl border border-line bg-panel p-[18px]">
        <h3 className="mb-3.5 text-[12px] font-semibold uppercase tracking-wide text-muted2">{t("rv_title")}</h3>
        <Field label={t("rv_worked")}>
          <textarea className={inputCls + " min-h-[70px] resize-y leading-relaxed"} value={f.worked} onChange={(e) => set("worked", e.target.value)} placeholder={t("rv_worked_ph")} />
        </Field>
        <Field label={t("rv_cut")}>
          <textarea className={inputCls + " min-h-[70px] resize-y leading-relaxed"} value={f.cut} onChange={(e) => set("cut", e.target.value)} placeholder={t("rv_cut_ph")} />
        </Field>
        <Field label={t("rv_focus")}>
          <textarea className={inputCls + " min-h-[70px] resize-y leading-relaxed"} value={f.focus} onChange={(e) => set("focus", e.target.value)} placeholder={t("rv_focus_ph")} />
        </Field>
        <PrimaryBtn onClick={() => saveReview(wk, f)}>{t("rv_save")}</PrimaryBtn>
      </div>
    </div>
  );
}
