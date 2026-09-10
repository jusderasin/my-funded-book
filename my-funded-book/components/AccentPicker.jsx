"use client";

import { useState, useEffect } from "react";
import { Palette, RotateCcw, Check } from "lucide-react";
import { PrimaryBtn, GhostBtn } from "@/components/ui";

const DEFAULT_GAIN = "#00E676";
const DEFAULT_LOSS = "#FF5252";

const PRESETS = [
  { name: "Classic",   gain: "#00E676", loss: "#FF5252" },
  { name: "Neon",      gain: "#00d4ff", loss: "#ff8c00" },
  { name: "Royal",     gain: "#f5b301", loss: "#8b5cf6" },
  { name: "Mono",      gain: "#e5e7eb", loss: "#6b7280" },
];

function applyLive(gain, loss) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--accent", gain);
  document.documentElement.style.setProperty("--loss", loss);
}

export function AccentPicker({ profile, saveProfile, lang, notify }) {
  const L = lang === "en" ? "en" : "fr";
  const [gain, setGain] = useState(profile?.accent_gain || DEFAULT_GAIN);
  const [loss, setLoss] = useState(profile?.accent_loss || DEFAULT_LOSS);
  const [saving, setSaving] = useState(false);

  // Sync si le profil change depuis un autre endroit
  useEffect(() => {
    setGain(profile?.accent_gain || DEFAULT_GAIN);
    setLoss(profile?.accent_loss || DEFAULT_LOSS);
  }, [profile?.accent_gain, profile?.accent_loss]);

  // Preview live sur toute l'app
  useEffect(() => {
    applyLive(gain, loss);
  }, [gain, loss]);

  const dirty = gain !== (profile?.accent_gain || DEFAULT_GAIN) || loss !== (profile?.accent_loss || DEFAULT_LOSS);

  function applyPreset(p) {
    setGain(p.gain);
    setLoss(p.loss);
  }

  function reset() {
    setGain(DEFAULT_GAIN);
    setLoss(DEFAULT_LOSS);
  }

  async function save() {
    setSaving(true);
    await saveProfile({ accent_gain: gain, accent_loss: loss });
    setSaving(false);
  }

  return (
    <div className="rounded-2xl border border-line bg-panel p-[18px]">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted2">
        <Palette size={13} /> {L === "en" ? "Colors" : "Couleurs"}
      </div>

      {/* Presets */}
      <div className="mb-4 flex flex-wrap gap-2">
        {PRESETS.map((p) => {
          const active = p.gain.toLowerCase() === gain.toLowerCase() && p.loss.toLowerCase() === loss.toLowerCase();
          return (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors ${active ? "border-white text-white" : "border-line2 text-muted2 hover:text-white"}`}
            >
              <span className="flex gap-0.5">
                <span className="h-3 w-3 rounded-sm" style={{ background: p.gain }} />
                <span className="h-3 w-3 rounded-sm" style={{ background: p.loss }} />
              </span>
              {p.name}
              {active && <Check size={12} />}
            </button>
          );
        })}
      </div>

      {/* Pickers custom */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <label className="rounded-xl border border-line bg-panel2 p-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted2">
            {L === "en" ? "Gain" : "Gain"}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={gain}
              onChange={(e) => setGain(e.target.value)}
              className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-line2 bg-transparent"
            />
            <input
              type="text"
              value={gain}
              onChange={(e) => setGain(e.target.value)}
              className="w-full rounded-md border border-line2 bg-ink px-2 py-1.5 font-mono text-[12px] text-white"
              maxLength={7}
            />
          </div>
        </label>

        <label className="rounded-xl border border-line bg-panel2 p-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted2">
            {L === "en" ? "Loss" : "Perte"}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={loss}
              onChange={(e) => setLoss(e.target.value)}
              className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-line2 bg-transparent"
            />
            <input
              type="text"
              value={loss}
              onChange={(e) => setLoss(e.target.value)}
              className="w-full rounded-md border border-line2 bg-ink px-2 py-1.5 font-mono text-[12px] text-white"
              maxLength={7}
            />
          </div>
        </label>
      </div>

      {/* Preview */}
      <div className="mb-4 rounded-xl border border-line bg-ink p-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted2">
          {L === "en" ? "Preview" : "Aperçu"}
        </div>
        <div className="flex gap-2">
          <div className="flex-1 rounded-lg border border-line bg-panel p-2.5">
            <div className="text-[10px] text-muted2">Win</div>
            <div className="font-mono text-[16px] font-extrabold" style={{ color: gain }}>+$1,234</div>
          </div>
          <div className="flex-1 rounded-lg border border-line bg-panel p-2.5">
            <div className="text-[10px] text-muted2">Loss</div>
            <div className="font-mono text-[16px] font-extrabold" style={{ color: loss }}>-$567</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <GhostBtn className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px]" onClick={reset}>
          <RotateCcw size={13} /> {L === "en" ? "Reset" : "Réinitialiser"}
        </GhostBtn>
        <div className="flex-1" />
        <PrimaryBtn className="px-4 py-2 text-[12px]" onClick={save} disabled={!dirty || saving}>
          {saving ? "…" : (L === "en" ? "Save" : "Enregistrer")}
        </PrimaryBtn>
      </div>
    </div>
  );
}
