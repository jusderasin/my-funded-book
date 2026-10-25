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
];

export const THEME_CACHE_KEY = "mtb-site-theme";

export const themeFromDb = (value) => SITE_THEMES.find((t) => t.db === value) || SITE_THEMES[0];
export const themeById = (id) => SITE_THEMES.find((t) => t.id === id) || SITE_THEMES[0];
