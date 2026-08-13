"use client";

import { useState } from "react";
import { useBook } from "@/components/BookProvider";
import { Pill, EmptyState, PrimaryBtn, GhostBtn, Field, inputCls } from "@/components/ui";
import { fmtK } from "@/lib/format";
import { X, Pencil } from "lucide-react";

export default function PlaybookPage() {
  const { playbooks, addSetup, updateSetup, deleteSetup, trades, t } = useBook();
  const [f, setF] = useState({ name: "", description: "", rules: "" });
  const [editingId, setEditingId] = useState(null);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  function resetForm() {
    setF({ name: "", description: "", rules: "" });
    setEditingId(null);
  }

  function startEdit(sp) {
    setEditingId(sp.id);
    setF({
      name: sp.name || "",
      description: sp.description || "",
      rules: (sp.rules || []).join("\n"),
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    if (!f.name.trim()) return;
    const rules = f.rules.split("\n").map((x) => x.trim()).filter(Boolean);
    const payload = { name: f.name.trim(), description: f.description.trim() || null, rules };
    if (editingId) {
      await updateSetup(editingId, payload);
    } else {
      await addSetup(payload);
    }
    resetForm();
  }

  return (
    <div>
      <div className={`mb-3.5 rounded-2xl border bg-panel p-[18px] ${editingId ? "border-accent" : "border-line"}`}>
        <h3 className="mb-3.5 text-[12px] font-semibold uppercase tracking-wide text-muted2">
          {editingId ? t("pb_edit_title") : t("pb_add_title")}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("pb_name")}><input className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder={t("pb_name_ph")} /></Field>
          <Field label={t("pb_desc")}><input className={inputCls} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder={t("pb_desc_ph")} /></Field>
        </div>
        <Field label={t("pb_rules")}>
          <textarea className={inputCls + " min-h-[90px] resize-y leading-relaxed"} value={f.rules} onChange={(e) => set("rules", e.target.value)} placeholder={"Liquidity swept above Asia high\nDisplacement through structure\nEntry on FVG retrace\nStop beyond sweep, min 2R target"} />
        </Field>
        <div className="flex gap-2">
          <PrimaryBtn onClick={submit}>{editingId ? t("pb_save_btn") : t("pb_add_btn")}</PrimaryBtn>
          {editingId && <GhostBtn onClick={resetForm}>{t("m_cancel")}</GhostBtn>}
        </div>
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
            const isEditing = editingId === sp.id;
            return (
              <div key={sp.id} className={`rounded-xl border bg-panel px-4 py-3.5 ${isEditing ? "border-accent" : "border-line"}`}>
                <div className="flex items-center justify-between gap-2.5">
                  <div className="text-[14px] font-semibold">{sp.name}</div>
                  <div className="flex items-center gap-2">
                    <Pill tone="gray">{used.length} {t("pb_trades")}</Pill>
                    <Pill tone={wr !== "—" && +wr >= 50 ? "green" : "yellow"}>WR {wr}{wr !== "—" ? "%" : ""}</Pill>
                    <Pill tone={net >= 0 ? "green" : "red"}>{fmtK(net)}</Pill>
                    <button onClick={() => startEdit(sp)} className="rounded-md p-1 text-muted2 hover:bg-panel2 hover:text-white" title={t("pb_edit_title")}><Pencil size={14} /></button>
                    <button onClick={() => { if (editingId === sp.id) resetForm(); deleteSetup(sp.id); }} className="rounded-md p-1 text-muted2 hover:bg-lossDim hover:text-loss"><X size={15} /></button>
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
