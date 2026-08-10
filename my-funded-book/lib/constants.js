export const FIRMS = {
  MFF: { n: "My Funded Futures", c: "#00E676" },
  Lucid: { n: "Lucid Trading", c: "#00d4a0" },
  Phidias: { n: "Phidias", c: "#ff66e4" },
  Topstep: { n: "Topstep", c: "#f5b301" },
  Apex: { n: "Apex Trader Funding", c: "#8b5cf6" },
  Alpha: { n: "Alpha Futures", c: "#4ea1ff" },
  Tradeify: { n: "Tradeify", c: "#00d4a0" },
  Autre: { n: "Autre", c: "#8a93a6" },
};

export const firmColor = (f) => (FIRMS[f] || FIRMS.Autre).c;

export const SESSIONS = ["NY AM", "NY PM", "London", "Asia"];
export const GRADES = ["A+", "A", "B", "C", "F"];
export const TAG_LIB = [
  "Chased",
  "FOMO entry",
  "Revenge",
  "Oversized",
  "Early",
  "Late",
  "A+ setup",
  "Perfect exec",
];

export const gradeClass = (g) =>
  ({ "A+": "ap", A: "a", B: "b", C: "c", F: "f" }[g] || "b");

export const STATUS_LABEL = {
  active: ["cyan", "En cours"],
  passed: ["green", "Validé"],
  funded: ["green", "Funded"],
  failed: ["red", "Cramé"],
  paid: ["purple", "Payé"],
};
