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

        // === PRISM — nouveau design system look TradeXNova ===
        // Tokens fixes (non thémables) utilisés par les composants /components/prism/*.
        // On code toute la refonte visuelle contre ces tokens; l'ancienne app garde
        // ses tokens ink/panel/accent inchangés.
        prism: {
          bg:         "#000000",
          surface:    "#050505",
          panel:      "#0a0a0a",
          panel2:     "#141414",
          line:       "rgba(255, 255, 255, 0.08)",
          line2:      "rgba(255, 255, 255, 0.12)",
          text:       "#ffffff",
          muted:      "#a1a1aa",
          muted2:     "#71717a",
          accent:     "#3b82f6",
          accentSoft: "#60a5fa",
          accentDim:  "rgba(59, 130, 246, 0.12)",
          win:        "#22c55e",
          loss:       "#ef4444",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "'SF Mono'", "monospace"],
        display: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Tailles massives PRISM pour les hero titles style TradeXNova.
        "prism-hero": ["clamp(3rem, 8vw, 6rem)", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
        "prism-h1":   ["clamp(2.25rem, 5vw, 3.75rem)", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "prism-h2":   ["clamp(1.75rem, 3vw, 2.5rem)", { lineHeight: "1.15", letterSpacing: "-0.015em" }],
        "prism-h3":   ["1.5rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.15rem",
        "prism": "1rem",
        "prism-lg": "1.5rem",
      },
      backdropBlur: {
        prism: "12px",
      },
      boxShadow: {
        "prism-glow": "0 0 40px -8px rgba(59, 130, 246, 0.35)",
        "prism-card": "0 1px 3px 0 rgba(0, 0, 0, 0.5), 0 1px 2px 0 rgba(0, 0, 0, 0.3)",
      },
    },
  },
  plugins: [],
};
