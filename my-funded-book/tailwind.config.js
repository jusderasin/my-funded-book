/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Tokens de thème — bind sur les CSS vars définies dans globals.css.
        // Les fallbacks reproduisent le thème "dark" pour que rien ne casse
        // en cas de bug CSS ou de rendu SSR avant hydratation.
        ink:    "var(--ink, #0D0F12)",
        ink2:   "var(--ink2, #0a0c10)",
        panel:  "var(--panel, #161920)",
        panel2: "var(--panel2, #1c2029)",
        line:   "var(--line, #242833)",
        line2:  "var(--line2, #2e3340)",
        muted:  "var(--muted, #8a93a6)",
        muted2: "var(--muted2, #6b7385)",
        // Accent gain / loss — posés par AccentPicker.
        // Fallback = identité TradeX Nova (vert/rouge de marque d'origine).
        accent: "var(--accent, #00d301)",
        accentDim: "color-mix(in srgb, var(--accent, #00d301) 12%, transparent)",
        loss: "var(--loss, #ff3b5c)",
        lossDim: "color-mix(in srgb, var(--loss, #ff3b5c) 12%, transparent)",
        // Couleurs de charts (invariantes selon le thème).
        pinkx: "#ff66e4",
        cyanx: "#00d4a0",
        purplex: "#8b5cf6",
        goldx: "#f5b301",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "'SF Mono'", "monospace"],
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.15rem",
      },
    },
  },
  plugins: [],
};
