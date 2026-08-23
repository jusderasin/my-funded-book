"use client";

import { useState } from "react";
import { GripVertical, Eye, EyeOff, ChevronUp, ChevronDown, RotateCcw } from "lucide-react";
import { Modal, PrimaryBtn, GhostBtn } from "@/components/ui";

/* ────────────────────────────────────────────────────────────────────────────
   SQL — une seule fois dans Supabase. On stocke la préférence sur `profiles`
   (comme tutorial_seen / leaderboard_opt_in), donc rien de nouveau côté RLS :
   la policy existante de `profiles` (auth.uid() = id) couvre déjà cette colonne.

     alter table profiles
       add column if not exists nav_layout jsonb not null default '[]'::jsonb;

   Forme stockée : [{ "id": "/journal", "hidden": false }, ...]
   L'ordre du tableau = l'ordre d'affichage. On ne stocke que href + hidden :
   labels/icônes viennent toujours de la constante NAV côté code.
   ──────────────────────────────────────────────────────────────────────────── */

export function NavCustomizer({ layout, nav, t, lang, onClose, onSave }) {
  const L = lang === "en" ? "en" : "fr";
  const labelOf = (n) => n.label || t(n.key);

  // État local : on part de l'ordre + visibilité courants (déjà résolus par AppShell)
  const [items, setItems] = useState(() => layout.map((n) => ({ ...n })));
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const [saving, setSaving] = useState(false);

  function move(from, to) {
    if (to < 0 || to >= items.length || from === to) return;
    setItems((arr) => {
      const next = arr.slice();
      const [x] = next.splice(from, 1);
      next.splice(to, 0, x);
      return next;
    });
  }

  function toggleHidden(i) {
    setItems((arr) => arr.map((n, k) => (k === i ? { ...n, hidden: !n.hidden } : n)));
  }

  function resetDefault() {
    setItems(nav.map((n) => ({ ...n, hidden: false })));
  }

  // Drag natif (desktop). Les flèches ↑/↓ couvrent le tactile.
  function onDrop(i) {
    if (dragIdx !== null) move(dragIdx, i);
    setDragIdx(null);
    setOverIdx(null);
  }

  async function save() {
    setSaving(true);
    try {
      await onSave(items.map((n) => ({ id: n.href, hidden: !!n.hidden })));
    } finally {
      setSaving(false);
    }
  }

  const visibleCount = items.filter((n) => !n.hidden).length;

  return (
    <Modal
      title={L === "en" ? "Customize menu" : "Personnaliser le menu"}
      onClose={onClose}
      footer={
        <>
          <GhostBtn className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px]" onClick={resetDefault}>
            <RotateCcw size={13} /> {L === "en" ? "Reset" : "Réinitialiser"}
          </GhostBtn>
          <div className="flex-1" />
          <GhostBtn className="px-3 py-2 text-[12px]" onClick={onClose}>
            {L === "en" ? "Cancel" : "Annuler"}
          </GhostBtn>
          <PrimaryBtn className="px-4 py-2 text-[12px]" onClick={save} disabled={saving}>
            {saving ? "…" : L === "en" ? "Save" : "Enregistrer"}
          </PrimaryBtn>
        </>
      }
    >
      <p className="mb-3 text-[12px] text-muted2">
        {L === "en"
          ? "Drag to reorder (or use the arrows), and toggle visibility. Hidden tabs stay reachable by URL."
          : "Glisse pour réordonner (ou les flèches), et coupe la visibilité. Les onglets masqués restent accessibles par URL."}
      </p>

      <div className="flex flex-col gap-1.5">
        {items.map((n, i) => {
          const Icon = n.icon;
          const isOver = overIdx === i && dragIdx !== null && dragIdx !== i;
          return (
            <div
              key={n.href}
              draggable
              onDragStart={() => setDragIdx(i)}
              onDragOver={(e) => { e.preventDefault(); setOverIdx(i); }}
              onDrop={() => onDrop(i)}
              onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
              className={`flex items-center gap-2.5 rounded-lg border bg-panel2 px-2.5 py-2 transition-colors ${
                isOver ? "border-accent" : "border-line2"
              } ${dragIdx === i ? "opacity-40" : ""} ${n.hidden ? "opacity-50" : ""}`}
            >
              <span className="cursor-grab text-muted2 active:cursor-grabbing" title={L === "en" ? "Drag" : "Glisser"}>
                <GripVertical size={16} />
              </span>
              <Icon size={16} className="shrink-0 text-muted" />
              <span className={`flex-1 text-[13.5px] font-medium ${n.hidden ? "text-muted2 line-through" : "text-white"}`}>
                {labelOf(n)}
              </span>

              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => move(i, i - 1)}
                  disabled={i === 0}
                  className="rounded-md p-1 text-muted2 hover:bg-panel hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                  title={L === "en" ? "Up" : "Monter"}
                >
                  <ChevronUp size={15} />
                </button>
                <button
                  onClick={() => move(i, i + 1)}
                  disabled={i === items.length - 1}
                  className="rounded-md p-1 text-muted2 hover:bg-panel hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                  title={L === "en" ? "Down" : "Descendre"}
                >
                  <ChevronDown size={15} />
                </button>
                <button
                  onClick={() => toggleHidden(i)}
                  className={`ml-0.5 rounded-md p-1 ${n.hidden ? "text-muted2 hover:text-white" : "text-accent hover:brightness-110"} hover:bg-panel`}
                  title={n.hidden ? (L === "en" ? "Show" : "Afficher") : (L === "en" ? "Hide" : "Masquer")}
                >
                  {n.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-[11px] text-muted2">
        {visibleCount}/{items.length} {L === "en" ? "tabs visible" : "onglets visibles"}
      </div>
    </Modal>
  );
}
