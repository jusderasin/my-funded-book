// Thèmes de couleur du site. Le choix est enregistré dans profiles.theme pour suivre
// le compte sur tous les appareils. La contrainte SQL n'autorise qu'une liste fixe de
// valeurs : on réutilise donc des valeurs historiques inutilisées comme clés de stockage.
//
// Les variables complètes de chaque thème sont dans globals.css (:root[data-theme=…]).
// Ici on ne garde que celles posées en inline sur :root (accent, gain, perte), qui
// priment sur la feuille de style.

export const SITE_THEMES = [
  {
    id: "prism", db: "prism", fr: "Classique", en: "Classic",
    swatch: "linear-gradient(135deg,#c6f432,#0e0e11)",
    vars: { accent: "#c6f432", soft: "#e2ff6b", win: "#22c55e", loss: "#ef4444" },
  },
  {
    id: "mono", db: "oled", fr: "Noir & blanc", en: "Black & white",
    swatch: "linear-gradient(90deg,#fff 50%,#000 50%)",
    vars: { accent: "#ffffff", soft: "#e5e5e5", win: "#f5f5f5", loss: "#7c7c7c" },
  },
  {
    id: "caba", db: "blue", fr: "Caba", en: "Caba",
    swatch: "linear-gradient(135deg,#4f8bff,#b14cff)",
    vars: { accent: "#7c5cff", soft: "#a78bfa", win: "#4f8bff", loss: "#b14cff" },
  },
  // Thèmes à palette complète : fond, panneaux, lignes et texte posés en inline par
  // applyTheme. Les effets de survol (halo, reflets, bordures) suivent l'accent.
  ...[
    ["noir-rouge", "Noir & rouge", "Black & red", "#ff2d2d", "#ff6b6b", "#f5f5f5", "#ff2d2d", ["#000000", "#060606", "#0c0c0c", "#151515"], "#ffffff", "#a3a3a3", "#666666"],
    ["blanc-rouge", "Blanc & rouge", "White & red", "#ffffff", "#ffd4d4", "#ffffff", "#ff3b3b", ["#0b0b0b", "#111111", "#171717", "#202020"], "#ffffff", "#b3b3b3", "#737373"],
    ["sang", "Rouge sang", "Blood", "#dc2626", "#f87171", "#fca5a5", "#7f1d1d", ["#0d0203", "#140405", "#1c0709", "#270b0e"], "#fde8e8", "#c9a0a0", "#8a5c5c"],
    ["or", "Noir & or", "Black & gold", "#d4af37", "#f1d77a", "#e7c766", "#b45309", ["#050403", "#0a0806", "#110e09", "#1a150d"], "#fbf3dc", "#b8a985", "#7d7155"],
    ["ocean", "Océan", "Ocean", "#06b6d4", "#67e8f9", "#22d3ee", "#f43f5e", ["#02070b", "#040d14", "#07131d", "#0c1d2b"], "#e6f7fb", "#8fb3c2", "#5a7b89"],
    ["emeraude", "Émeraude", "Emerald", "#10b981", "#6ee7b7", "#34d399", "#f97316", ["#020805", "#04100a", "#071810", "#0c2318"], "#e7fbf2", "#8fbfa9", "#5a8a74"],
    ["neon", "Néon", "Neon", "#ff2bd6", "#ff8ef0", "#22d3ee", "#ff2bd6", ["#06020a", "#0c0414", "#12071d", "#1b0b2b"], "#fbe9ff", "#b79cc4", "#7d6488"],
    ["matrix", "Matrix", "Matrix", "#00ff66", "#7dffaf", "#00ff66", "#ff3355", ["#000400", "#010801", "#030d04", "#061607"], "#d6ffe2", "#6fae84", "#457056"],
    ["sunset", "Coucher de soleil", "Sunset", "#fb923c", "#fdba74", "#fbbf24", "#e11d48", ["#0b0503", "#130906", "#1b0e09", "#26140d"], "#fff1e6", "#c4a28c", "#87695a"],
    ["arctique", "Arctique", "Arctic", "#93c5fd", "#dbeafe", "#bae6fd", "#f87171", ["#06090d", "#0b1017", "#111822", "#18212e"], "#f0f6ff", "#9fb0c6", "#66778d"],
    ["violet", "Améthyste", "Amethyst", "#a855f7", "#d8b4fe", "#c084fc", "#f43f5e", ["#07030b", "#0d0614", "#140a1d", "#1d0f2a"], "#f5ecff", "#ae9cc4", "#76668b"],
    ["cuivre", "Cuivre", "Copper", "#c2703d", "#e3a77f", "#d6a46c", "#9f1239", ["#080504", "#0f0a07", "#16100c", "#211812"], "#fbefe6", "#bba493", "#806c5e"],
    ["acier", "Acier", "Steel", "#94a3b8", "#cbd5e1", "#e2e8f0", "#ef4444", ["#08090b", "#0d0f12", "#13161a", "#1b1f25"], "#f1f5f9", "#9aa4b2", "#5f6875"],
  ].map(([id, fr, en, accent, soft, win, loss, [bg, surface, panel, panel2], text, muted, muted2]) => ({
    id, db: id, base: "prism", fr, en,
    swatch: `linear-gradient(135deg,${accent} 0 45%,${bg} 45%)`,
    vars: { accent, soft, win, loss },
    palette: { bg, surface, panel, panel2, text, muted, muted2 },
  })),
];

export const THEME_CACHE_KEY = "mtb-site-theme";

export const themeFromDb = (value) => SITE_THEMES.find((t) => t.db === value || t.id === value) || SITE_THEMES[0];
export const themeById = (id) => SITE_THEMES.find((t) => t.id === id) || SITE_THEMES[0];
