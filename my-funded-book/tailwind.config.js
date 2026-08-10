/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0D0F12",
        ink2: "#0a0c10",
        panel: "#161920",
        panel2: "#1c2029",
        line: "#242833",
        line2: "#2e3340",
        muted: "#8a93a6",
        muted2: "#6b7385",
        accent: "#00E676",
        accentDim: "rgba(0,230,118,0.12)",
        loss: "#FF5252",
        lossDim: "rgba(255,82,82,0.12)",
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
