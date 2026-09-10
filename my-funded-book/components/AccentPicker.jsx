"use client";

import { useState, useEffect } from "react";
import { Palette, Check } from "lucide-react";
import { PrimaryBtn } from "@/components/ui";

const DEFAULT_GAIN = "#00E676";
const DEFAULT_LOSS = "#FF5252";

const PALETTES = [
  { name: "Emerald & Red", gain: "#00E676", loss: "#FF5252" },
  { name: "Cyan & Rose", gain: "#00E5FF", loss: "#FF4081" },
  { name: "Gold & Coral", gain: "#FFD700", loss: "#FF6B6B" },
  { name: "Purple & Amber", gain: "#B388FF", loss: "#FFAB40" },
];

export function AccentPicker({ profile, saveProfile, lang }) {
  const L = lang === "en" ? "en" : "fr";
  const [gain, setGain] = useState(profile?.accent_gain || DEFAULT_GAIN);
  const [loss, setLoss] = useState(profile?.accent_loss || DEFAULT_LOSS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setGain(profile?.accent_gain || DEFAULT_GAIN);
    setLoss(profile?.accent_loss || DEFAULT_LOSS);
  }, [profile?.accent_gain, profile?.accent_loss]);

  const dirty = gain !== (profile?.accent_gain || DEFAULT_GAIN) || loss !== (profile?.accent_loss || DEFAULT_LOSS);

  async function save() {
    setSaving(true);
    await saveProfile({ accent_gain: gain, accent_loss: loss });
    setSaving(false);
  }

  return (
    <div className="rounded-2xl border border-line bg-panel p-[18px]">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted2">
        <Palette size={13} /> {L === "en" ? "Accent Colors" : "Couleurs d'accentuation"}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PALETTES.map((p) => {
          const active = gain === p.gain && loss === p.loss;
          return (
            <button
              key={p.name}
              onClick={() => {
                setGain(p.gain);
                setLoss(p.loss);
              }}
              className={`flex items-center justify-between rounded-xl border p-3 transition-colors ${
                active ? "border-white bg-panel2" : "border-line2 bg-ink hover:border-muted2"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: p.gain }} />
                <span className="h-3 w-3 rounded-full" style={{ background: p.loss }} />
                <span className="text-[12px] font-medium text-white">{p.name}</span>
              </div>
              {active && <Check size={12} className="text-white" />}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-end">
        <PrimaryBtn className="px-4 py-2 text-[12px]" onClick={save} disabled={!dirty || saving}>
          {saving ? "…" : L === "en" ? "Save" : "Enregistrer"}
        </PrimaryBtn>
      </div>
    </div>
  );
}
