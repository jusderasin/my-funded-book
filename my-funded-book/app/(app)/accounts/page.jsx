"use client";

import { useState } from "react";
import { useBook } from "@/components/BookProvider";
import { Pill, FirmDot, EmptyState, SegTabs, PrimaryBtn } from "@/components/ui";
import { AccountModal } from "@/components/modals";
import { firmColor, STATUS_LABEL } from "@/lib/constants";
import { fmtMoney, frDate } from "@/lib/format";
import { X } from "lucide-react";

export default function AccountsPage() {
  const { accounts, deleteAccount, t } = useBook();
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(false);

  let list = accounts;
  if (filter === "eval") list = list.filter((a) => a.type === "eval");
  if (filter === "funded") list = list.filter((a) => a.type === "funded" || a.status === "passed");

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted2">{t("acc_title")}</div>
        <PrimaryBtn className="px-3 py-1.5 text-[12px]" onClick={() => setModal(true)}>{t("acc_add")}</PrimaryBtn>
      </div>
      <SegTabs active={filter} onChange={setFilter}
        tabs={[{ value: "all", label: t("acc_tab_all") }, { value: "eval", label: t("acc_tab_eval") }, { value: "funded", label: t("acc_tab_funded") }]} />

      {list.length === 0 ? (
        <EmptyState icon="▤" title={t("acc_empty_t")} sub={t("acc_empty_s")} />
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((a) => {
            const st = STATUS_LABEL[a.status] || ["gray", a.status];
            return (
              <div key={a.id} className="flex items-center gap-3.5 rounded-xl border border-line bg-panel px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-[14px] font-semibold">
                    <span className="inline-flex items-center gap-1.5"><FirmDot color={firmColor(a.firm)} />{a.firm}</span>
                    <Pill tone="gray">{fmtMoney(a.size)}</Pill>
                    <Pill tone={a.type === "funded" ? "green" : "yellow"}>{a.type === "funded" ? t("acc_funded") : t("acc_eval")}</Pill>
                    <Pill tone={st[0]}>{st[1]}</Pill>
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-muted2">{frDate(a.date)}{a.note ? " · " + a.note : ""}</div>
                </div>
                <div className={`whitespace-nowrap text-right font-mono text-[16px] font-extrabold ${a.cost > 0 ? "text-loss" : "text-white"}`}>
                  {a.cost > 0 ? "-" + fmtMoney(a.cost) : t("acc_free")}
                </div>
                <button onClick={() => deleteAccount(a.id)} className="rounded-md p-1 text-muted2 hover:bg-lossDim hover:text-loss"><X size={16} /></button>
              </div>
            );
          })}
        </div>
      )}
      {modal && <AccountModal onClose={() => setModal(false)} />}
    </div>
  );
}
