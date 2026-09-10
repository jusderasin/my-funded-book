import { fmtMoney, fmtK } from "./format";

// Chaque KPI :
// - id : clé stable stockée en localStorage
// - labels : { fr, en } affichés dans le sélecteur et le KPI card
// - render(s, lang) : renvoie { value, tone, big?, sub?, gaugePct?, gaugeColor? }
//   Toutes les valeurs sont dérivées de `s` (stats déjà calculées dans BookProvider).

export const KPI_CATALOG = [
  {
    id: "net",
    labels: { fr: "Net P&L", en: "Net P&L" },
    render: (s) => ({
      value: fmtMoney(s.net, true),
      tone: s.net >= 0 ? "pos" : "neg",
      big: true,
    }),
  },
  {
    id: "wr",
    labels: { fr: "WR par trade", en: "Trade WR" },
    render: (s) => ({
      value: s.wr.toFixed(2) + "%",
      tone: s.wr >= 50 ? "pos" : "warn",
      gaugePct: s.wr,
      gaugeColor: s.wr >= 50 ? "var(--accent)" : "#f5b301",
    }),
  },
  {
    id: "pf",
    labels: { fr: "Profit Factor", en: "Profit Factor" },
    render: (s) => ({
      value: s.pf.toFixed(2),
      tone: s.pf >= 1.5 ? "pos" : s.pf >= 1 ? "warn" : "neg",
      gaugePct: Math.min(100, (s.pf / 3) * 100),
    }),
  },
  {
    id: "dayWr",
    labels: { fr: "WR par jour", en: "Day WR" },
    render: (s) => ({
      value: s.dayWr.toFixed(2) + "%",
      tone: s.dayWr >= 50 ? "pos" : "warn",
      gaugePct: s.dayWr,
    }),
  },
  {
    id: "wl",
    labels: { fr: "Ratio Gain/Perte", en: "Avg W/L" },
    render: (s) => ({
      value: s.wl.toFixed(2),
      tone: s.wl >= 1 ? "pos" : "warn",
      sub: `${fmtK(s.avgW)} / -${fmtK(s.avgL).replace("-", "")}`,
    }),
  },
  {
    id: "balance",
    labels: { fr: "Solde du compte", en: "Balance" },
    render: (s) => ({
      value: fmtMoney(s.balance, true),
      tone: s.net >= 0 ? "pos" : "neg",
    }),
  },
  {
    id: "maxDD",
    labels: { fr: "Max Drawdown", en: "Max Drawdown" },
    render: (s) => ({
      value: fmtMoney(-Math.abs(s.maxDD)),
      tone: "neg",
    }),
  },
  {
    id: "edge",
    labels: { fr: "Edge Score", en: "Edge Score" },
    render: (s) => ({
      value: s.edge.toFixed(1),
      tone: s.edge >= 60 ? "pos" : s.edge >= 40 ? "warn" : "neg",
      gaugePct: s.edge,
    }),
  },
  {
    id: "streak",
    labels: { fr: "Streak plan", en: "Plan streak" },
    render: (s, lang) => ({
      value: String(s.streak),
      tone: s.streak >= 3 ? "pos" : "warn",
      sub: lang === "en" ? "in a row" : "d'affilée",
    }),
  },
  {
    id: "planPct",
    labels: { fr: "Adhérence au plan", en: "Plan adherence" },
    render: (s) => ({
      value: s.planPct.toFixed(0) + "%",
      tone: s.planPct >= 70 ? "pos" : s.planPct >= 50 ? "warn" : "neg",
      gaugePct: s.planPct,
    }),
  },
  {
    id: "greenDays",
    labels: { fr: "Jours verts", en: "Green days" },
    render: (s, lang) => ({
      value: String(s.greenDays),
      tone: "pos",
      sub: lang === "en" ? `of ${s.days.length}` : `sur ${s.days.length}`,
    }),
  },
  {
    id: "avgW",
    labels: { fr: "Gain moyen", en: "Avg win" },
    render: (s) => ({
      value: fmtMoney(s.avgW),
      tone: "pos",
    }),
  },
  {
    id: "avgL",
    labels: { fr: "Perte moyenne", en: "Avg loss" },
    render: (s) => ({
      value: fmtMoney(-Math.abs(s.avgL)),
      tone: "neg",
    }),
  },
  {
    id: "daysTraded",
    labels: { fr: "Jours tradés", en: "Days traded" },
    render: (s) => ({
      value: String(s.days.length),
      tone: "pos",
    }),
  },
];

export const DEFAULT_KPI_IDS = ["net", "wr", "pf", "dayWr", "wl"];
export const MIN_KPIS = 4;
export const MAX_KPIS = 6;

export function getKpiById(id) {
  return KPI_CATALOG.find((k) => k.id === id) || null;
}
