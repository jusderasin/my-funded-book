"use client";
import { useState } from "react";
import { useBook } from "@/components/BookProvider";
import { Kpi, FirmDot, EmptyState, PrimaryBtn } from "@/components/ui";
import { ExpenseModal } from "@/components/modals";
import { firmColor } from "@/lib/constants";
import { fmtMoney, frDate } from "@/lib/format";
import { X } from "lucide-react";
export default function ExpensesPage() {
  const { expenses, certificates, deleteExpense, t } = useBook();
  const [modal, setModal] = useState(false);
  const tot = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const payTot = certificates.filter((c) => c.type === "payout").reduce((s, c) => s + Number(c.amount), 0);
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Kpi label={t("exp_total")} tone="neg" value={fmtMoney(tot)} />
        <Kpi label={t("exp_payouts")} tone="pos" value={fmtMoney(payTot)} />
        <Kpi label={t("exp_net")} tone={payTot - tot >= 0 ? "pos" : "neg"} value={fmtMoney(payTot - tot)} />
      </div>
      <div className="mb-3 mt-3.5 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted2">{t("exp_tracker")}</div>
        <PrimaryBtn className="px-3 py-1.5 text-[12px]" onClick={() => setModal(true)}>{t("exp_add")}</PrimaryBtn>
      </div>
      {expenses.length === 0 ? (
        <EmptyState icon="▦" title={t("exp_empty_t")} sub={t("exp_empty_s")} />
      ) : (
        <div className="flex flex-col gap-2">
          {expenses.map((e) => (
            <div key={e.id} className="flex items-center gap-3.5 rounded-xl border border-line bg-panel px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[14px] font-semibold">
                  <span className="inline-flex items-center gap-1.5"><FirmDot color={firmColor(e.firm)} />{e.firm}</span>
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-muted2">{frDate(e.date)}{e.note ? " · " + e.note : ""}</div>
              </div>
              <div className="whitespace-nowrap text-right font-mono text-[16px] font-extrabold text-loss">-{fmtMoney(e.amount)}</div>
              <button onClick={() => deleteExpense(e.id)} className="rounded-md p-1 text-muted2 hover:bg-lossDim hover:text-loss"><X size={16} /></button>
            </div>
          ))}
        </div>
      )}
      {modal && <ExpenseModal onClose={() => setModal(false)} />}
    </div>
  );
}
