"use client";

import { useState } from "react";
import { Modal, GhostBtn, PrimaryBtn } from "@/components/ui";
import { KPI_CATALOG, MIN_KPIS, MAX_KPIS } from "@/lib/kpiCatalog";

export default function KpiCustomizer({ selected, onSave, onClose, lang }) {
  const L = lang === "en" ? "en" : "fr";
  const [picks, setPicks] = useState(Array.isArray(selected) ? [...selected] : []);

  const canRemove = picks.length > MIN_KPIS;
  const canAdd = picks.length < MAX_KPIS;
  const canSave = picks.length >= MIN_KPIS && picks.length <= MAX_KPIS;

  const toggle = (id) => {
    if (picks.includes(id)) {
      if (!canRemove) return;
      setPicks(picks.filter((p) => p !== id));
    } else {
      if (!canAdd) return;
      setPicks([...picks, id]);
    }
  };

  const move = (id, dir) => {
    const idx = picks.indexOf(id);
    if (idx < 0) return;
    const to = idx + dir;
    if (to < 0 || to >= picks.length) return;
    const next = [...picks];
    [next[idx], next[to]] = [next[to], next[idx]];
    setPicks(next);
  };

  const available = KPI_CATALOG.filter((k) => !picks.includes(k.id));

  return (
    <Modal
      title={L === "en" ? "Customize KPIs" : "Personnaliser les KPIs"}
      onClose={onClose}
      footer={
        <>
          <GhostBtn className="flex-1" onClick={onClose}>
            {L === "en" ? "Cancel" : "Annuler"}
          </GhostBtn>
          <PrimaryBtn
            className="flex-1"
            onClick={() => canSave && onSave(picks)}
            disabled={!canSave}
          >
            {L === "en" ? "Save" : "Enregistrer"}
          </PrimaryBtn>
        </>
      }
    >
      <div className="mb-4 rounded-lg border border-line bg-panel2 px-3 py-2 text-[12px] text-muted2">
        {L === "en"
          ? `Choose ${MIN_KPIS} to ${MAX_KPIS} KPIs.`
          : `Choisis entre ${MIN_KPIS} et ${MAX_KPIS} KPIs.`}
        <span className="ml-2 font-mono text-white">
          {picks.length}/{MAX_KPIS}
        </span>
      </div>

      <div className="mb-4">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted2">
          {L === "en" ? "Displayed (in order)" : "Affichés (dans l'ordre)"}
        </div>
        <div className="flex flex-col gap-1.5">
          {picks.map((id, i) => {
            const kpi = KPI_CATALOG.find((k) => k.id === id);
            if (!kpi) return null;
            return (
              <div
                key={id}
                className="flex items-center gap-2 rounded-lg border border-line bg-panel2 px-3 py-2"
              >
                <span className="w-5 font-mono text-[11px] text-muted2">{i + 1}</span>
                <span className="flex-1 text-[13px] text-white">{kpi.labels[L]}</span>
                <button
                  type="button"
                  onClick={() => move(id, -1)}
                  disabled={i === 0}
                  aria-label={L === "en" ? "Move up" : "Monter"}
                  className="rounded border border-line px-2 py-1 text-[11px] text-muted hover:border-line2 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(id, 1)}
                  disabled={i === picks.length - 1}
                  aria-label={L === "en" ? "Move down" : "Descendre"}
                  className="rounded border border-line px-2 py-1 text-[11px] text-muted hover:border-line2 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  disabled={!canRemove}
                  aria-label={L === "en" ? "Remove" : "Retirer"}
                  className="rounded border border-line px-2 py-1 text-[11px] text-loss hover:border-loss disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {available.length > 0 && (
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted2">
            {L === "en" ? "Available" : "Disponibles"}
          </div>
          <div className="flex flex-col gap-1.5">
            {available.map((kpi) => (
              <button
                key={kpi.id}
                type="button"
                onClick={() => toggle(kpi.id)}
                disabled={!canAdd}
                className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-left hover:border-line2 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <span className="flex-1 text-[13px] text-white">{kpi.labels[L]}</span>
                <span className="text-[13px] text-accent">+</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
