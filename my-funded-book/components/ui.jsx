"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

const toneText = {
  pos: "text-accent",
  neg: "text-loss",
  warn: "text-goldx",
  neu: "text-white",
  dim: "text-muted",
};

export function Kpi({ label, value, tone = "neu", sub, gauge, big }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-panel p-4 min-h-[92px]">
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted2 mb-2">{label}</div>
      <div className={`font-mono font-extrabold tabular-nums leading-none ${big ? "text-[26px]" : "text-[22px]"} ${toneText[tone]}`}>
        {value}
      </div>
      {sub && <div className="mt-1.5 font-mono text-[11px] text-muted2">{sub}</div>}
      {gauge && <div className="absolute top-3 right-3">{gauge}</div>}
    </div>
  );
}

const pillTone = {
  green: "bg-accentDim text-accent",
  red: "bg-lossDim text-loss",
  yellow: "bg-goldx/15 text-goldx",
  cyan: "bg-cyanx/15 text-cyanx",
  pink: "bg-pinkx/15 text-pinkx",
  purple: "bg-purplex/20 text-purplex",
  gray: "bg-panel2 text-muted",
};

export function Pill({ tone = "gray", children, className = "" }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[10.5px] font-bold tracking-wide ${pillTone[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function FirmDot({ color }) {
  return <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />;
}

export function EmptyState({ icon, title, sub }) {
  return (
    <div className="rounded-2xl border border-dashed border-line2 bg-panel py-11 px-5 text-center text-muted">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="text-[15px] font-bold text-white/90 mb-1.5">{title}</div>
      <div className="mx-auto max-w-[320px] text-[12.5px] leading-relaxed">{sub}</div>
    </div>
  );
}

export function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[560px] max-h-[92vh] overflow-y-auto rounded-t-2xl border border-line2 bg-ink2 p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-extrabold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-panel2 hover:text-white">
            <X size={18} />
          </button>
        </div>
        {children}
        {footer && <div className="mt-4 flex gap-2.5">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div className="mb-3.5">
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted2">{label}</label>
      {children}
    </div>
  );
}

export const inputCls =
  "w-full rounded-lg border border-line2 bg-panel2 px-3 py-2.5 text-[14px] text-white outline-none focus:border-accent";

export function Chip({ active, danger, children, ...props }) {
  return (
    <button
      type="button"
      className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition ${
        active
          ? danger
            ? "border-loss bg-lossDim text-loss"
            : "border-accent bg-accentDim text-accent"
          : "border-line2 bg-panel2 text-muted hover:text-white"
      }`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SegTabs({ tabs, active, onChange }) {
  return (
    <div className="mb-4 flex flex-wrap gap-1.5 rounded-xl border border-line bg-panel p-1">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`rounded-lg px-3.5 py-1.5 text-[12px] font-semibold ${
            active === t.value ? "bg-panel2 text-white" : "text-muted hover:text-white"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function PrimaryBtn({ children, className = "", ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-[13px] font-bold text-black transition hover:brightness-110 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function GhostBtn({ children, className = "", ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-line2 bg-panel2 px-4 py-2.5 text-[13px] font-semibold text-white/90 transition hover:bg-line ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
