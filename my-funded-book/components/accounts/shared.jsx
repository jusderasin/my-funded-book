"use client";

// Briques visuelles partagées par la liste des comptes, la fiche compte et le
// wizard de création. Même langage que la page Journal.

import { PROP_RULES, FIRMS } from "@/lib/constants";

export const INPUT = "h-10 w-full rounded-md border border-prism-line bg-prism-surface px-3 font-mono text-xs text-prism-text placeholder:text-prism-muted2 outline-none transition focus:border-prism-accent";
export const LABEL = "mb-1.5 block text-[10px] font-semibold uppercase tracking-[.12em] text-prism-muted";
export const GHOST = "inline-flex h-9 items-center gap-1.5 rounded-md border border-prism-line px-3 text-[11px] font-semibold text-prism-muted transition hover:border-prism-line2 hover:text-prism-text disabled:opacity-40";
export const OUTLINE_CYAN = "inline-flex h-10 items-center gap-2 rounded-lg border border-[rgba(6,182,212,0.45)] bg-[rgba(6,182,212,0.06)] px-4 text-sm font-medium text-prism-accent transition hover:bg-[rgba(6,182,212,0.12)]";

export const GREEN = "#22c55e";
export const RED = "#ef4444";
export const CYAN = "#06b6d4";
export const AMBER = "#f59e0b";

export const money = (n, dec = true) => {
  const v = Number(n) || 0;
  const s = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: dec ? 2 : 0, maximumFractionDigits: dec ? 2 : 0 });
  return `${v < 0 ? "-" : ""}$${s}`;
};
export const moneyK = (n) => {
  const v = Number(n) || 0;
  return Math.abs(v) >= 1000 ? `$${(v / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}K` : `$${v}`;
};

export const isFundedAccount = (a) => a?.type === "funded" || a?.status === "funded" || a?.status === "passed";
export const phaseOf = (a, h) => {
  if (a?.status === "failed" || h?.breached) return "failed";
  if (a?.status === "paid") return "paid";
  return isFundedAccount(a) ? "funded" : "eval";
};
export const PHASE_TONE = { eval: "warn", funded: "gain", failed: "loss", paid: "neutral" };
export const accountName = (a) => a?.note || firmLabel(a?.firm) || "Compte";
export const firmLabel = (firm) => PROP_RULES[firm]?.label || FIRMS[firm]?.n || firm || "";
export const firmInitial = (firm) => String(firmLabel(firm) || "?").trim().charAt(0).toUpperCase();

export function FirmAvatar({ firm, size = 40 }) {
  const color = FIRMS[firm]?.c || "#8a8a93";
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full border border-prism-line bg-prism-surface font-bold"
      style={{ width: size, height: size, color, fontSize: size * 0.38 }}
    >
      {firmInitial(firm)}
    </span>
  );
}

export function Badge({ tone = "neutral", children }) {
  const tones = {
    warn: "border-[rgba(245,158,11,0.45)] bg-[rgba(245,158,11,0.10)] text-amber-400",
    gain: "border-[rgba(34,197,94,0.45)] bg-[rgba(34,197,94,0.10)] text-prism-win",
    loss: "border-[rgba(239,68,68,0.45)] bg-[rgba(239,68,68,0.10)] text-prism-loss",
    accent: "border-[rgba(6,182,212,0.45)] bg-prism-accentDim text-prism-accent",
    neutral: "border-prism-line bg-prism-panel2 text-prism-muted",
  };
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.12em] ${tones[tone] || tones.neutral}`}>{children}</span>;
}

export function Bar({ pct = 0, color = CYAN, height = 6 }) {
  return (
    <div className="w-full overflow-hidden rounded-full bg-prism-panel2" style={{ height }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
    </div>
  );
}

export function Kpi({ label, value, color }) {
  return (
    <div className="rounded-xl border border-prism-line bg-prism-panel px-5 py-5">
      <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-prism-muted">{label}</p>
      <p className="mt-3 font-mono text-xl font-bold" style={color ? { color } : undefined}>{value}</p>
    </div>
  );
}

export function Field({ label, children, className = "" }) {
  return <label className={`block ${className}`}><span className={LABEL}>{label}</span>{children}</label>;
}
