"use client";

import { useState } from "react";
import { useBook } from "@/components/BookProvider";
import { Kpi, Pill, FirmDot, EmptyState, PrimaryBtn } from "@/components/ui";
import { CertModal } from "@/components/modals";
import { firmColor } from "@/lib/constants";
import { fmtMoney, fmtK, frDate } from "@/lib/format";
import { X } from "lucide-react";

export default function CertificatesPage() {
  const { certificates, accounts, deleteCert, t } = useBook();
  const [modal, setModal] = useState(false);

  const fundedCapital =
    accounts.filter((a) => a.type === "funded" || a.status === "passed" || a.status === "funded").reduce((s, a) => s + Number(a.size), 0) +
    certificates.filter((c) => c.type === "eval_passed").reduce((s, c) => s + Number(c.amount), 0);
  const payouts = certificates.filter((c) => c.type === "payout");
  const payTot = payouts.reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Kpi label={t("crt_funded_cap")} tone="pos" value={fmtK(fundedCapital)} />
        <Kpi label={t("crt_payouts")} tone="neu" value={payouts.length} />
        <Kpi label={t("crt_total_in")} tone="pos" value={fmtMoney(payTot)} />
      </div>

      <div className="mb-3 mt-3.5 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted2">{t("crt_wall")}</div>
        <PrimaryBtn className="px-3 py-1.5 text-[12px]" onClick={() => setModal(true)}>{t("crt_add")}</PrimaryBtn>
      </div>

      {certificates.length === 0 ? (
        <EmptyState icon="✦" title={t("crt_empty_t")} sub={t("crt_empty_s")} />
      ) : (
        <div className="flex flex-col gap-2">
          {certificates.map((c) => {
            const isP = c.type === "payout";
            return (
              <div key={c.id} className="flex items-center gap-3.5 rounded-xl border border-line bg-panel px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-[14px] font-semibold">
                    <span className="inline-flex items-center gap-1.5"><FirmDot color={firmColor(c.firm)} />{c.firm}</span>
                    <Pill tone={isP ? "cyan" : "green"}>{isP ? t("crt_payout") : t("crt_eval_pass")}</Pill>
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-muted2">{frDate(c.date)}{c.note ? " · " + c.note : ""}</div>
                </div>
                {c.file_url && (
                  /\.pdf($|\?)/i.test(c.file_url) ? (
                    <a href={c.file_url} target="_blank" rel="noreferrer" className="rounded-md bg-panel2 px-2 py-1 font-mono text-[10.5px] font-bold text-accent hover:bg-line">PDF</a>
                  ) : (
                    <a href={c.file_url} target="_blank" rel="noreferrer" className="shrink-0">
                      <img src={c.file_url} alt="certificat" loading="lazy" className="h-11 w-11 rounded-md border border-line object-cover" />
                    </a>
                  )
                )}
                <div className={`whitespace-nowrap text-right font-mono text-[16px] font-extrabold ${isP ? "text-accent" : "text-white"}`}>
                  {isP ? "+" + fmtMoney(c.amount) : fmtMoney(c.amount)}
                </div>
                <button onClick={() => deleteCert(c.id)} className="rounded-md p-1 text-muted2 hover:bg-lossDim hover:text-loss"><X size={16} /></button>
              </div>
            );
          })}
        </div>
      )}
      {modal && <CertModal onClose={() => setModal(false)} />}
    </div>
  );
}
