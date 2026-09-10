"use client";

import { useState, useEffect } from "react";
import { Layers, Check } from "lucide-react";
import { PrimaryBtn } from "@/components/ui";

const DEFAULT_THEME = "dark";

// Palettes miroir de globals.css — utilisées uniquement pour le mini-preview
// dans les cards du picker (le vrai thème est appliqué via data-theme).
const THEMES = [
  {
    id: "dark",
    labelFr: "Dark",
    labelEn: "Dark",
    tokens: { ink: "#0D0F12", panel: "#161920", panel2: "#1c2029", line: "#242833", muted: "#8a93a6" },
  },
  {
    id: "oled",
    labelFr: "OLED",
    labelEn: "OLED",
    tokens: { ink: "#000000", panel: "#0a0a0a", panel2: "#141414", line: "#1f1f1f", muted: "#8a93a6" },
  },
  {
    id: "darker",
    labelFr: "Darker",
    labelEn: "Darker",
    tokens: { ink: "#05070a", panel: "#0e1116", panel2: "#151922", line: "#1e2230", muted: "#8a93a6" },
  },
  {
    id: "cyberpunk",
    labelFr: "Cyberpunk",
    labelEn: "Cyberpunk",
    tokens: { ink: "#0a0a1f", panel: "#12122e", panel2: "#1a1a3d", line: "#2a2a55", muted: "#a5b0d4" },
  },
];

function applyLive(themeId) {
  if (typeof document === "undefined") return;
  if (themeId === "dark") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", themeId);
  }
}

export function ThemePicker({ profile, saveProfile, lang }) {
  const L = lang === "en" ? "en" : "fr";
  const [current, setCurrent] = useState(profile?.theme || DEFAULT_THEME);
  const [saving, setSaving] = useState(false);

  // Sync si le profil change depuis un autre endroit
  useEffect(() => {
    setCurrent(profile?.theme || DEFAULT_THEME);
  }, [profile?.theme]);

  // Preview live sur toute l'app
  useEffect(() => {
    applyLive(current);
  }, [current]);

  const dirty = current !== (profile?.theme || DEFAULT_THEME);

  async function save() {
    setSaving(true);
    await saveProfile({ theme: current });
    setSaving(false);
  }

  return (
    <div className="rounded-2xl border border-line bg-panel p-[18px]">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted2">
        <Layers size={13} /> {L === "en" ? "Theme" : "Thème"}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {THEMES.map((th) => {
          const active = current === th.id;
          const label = L === "en" ? th.labelEn : th.labelFr;
          return (
            <button
              key={th.id}
              onClick={() => setCurrent(th.id)}
              className={`group flex flex-col gap-2 rounded-xl border p-2.5 text-left transition-colors ${
                active ? "border-white" : "border-line2 hover:border-muted2"
              }`}
              style={{ background: th.tokens.ink }}
            >
              {/* Mini preview — reproduit fidèlement l'aspect du thème */}
              <div
                className="rounded-md border p-1.5"
                style={{ background: th.tokens.panel, borderColor: th.tokens.line }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent, #00E676)" }} />
                  <span className="h-1 flex-1 rounded-full" style={{ background: th.tokens.panel2 }} />
                  <span className="h-1 w-3 rounded-full" style={{ background: th.tokens.line }} />
                </div>
                <div className="mt-1.5 flex items-center gap-1">
                  <span className="h-1 w-6 rounded-full" style={{ background: th.tokens.muted }} />
                  <span className="h-1 flex-1 rounded-full" style={{ background: th.tokens.line }} />
                </div>
              </div>

              <div className="flex items-center justify-between px-0.5">
                <span
                  className="text-[12px] font-semibold"
                  style={{ color: active ? "#ffffff" : th.tokens.muted }}
                >
                  {label}
                </span>
                {active && <Check size={12} className="text-white" />}
              </div>
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
