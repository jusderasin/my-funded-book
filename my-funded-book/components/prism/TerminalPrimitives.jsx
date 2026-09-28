"use client";

import { X } from "lucide-react";

export const inputCls = "h-10 w-full rounded-md border border-prism-line bg-prism-surface px-3 font-mono text-xs text-prism-text outline-none focus:border-prism-accent";

export function Card({ children, className = "", padding = "p-6" }) {
  return <section className={`rounded-xl border border-prism-line bg-prism-panel ${padding} ${className}`}>{children}</section>;
}

export function Field({ label, children, hint }) {
  return <label className="block text-[10px] font-semibold uppercase tracking-[.12em] text-prism-muted2"><span>{label}</span>{children}<span className="mt-1 block normal-case tracking-normal text-prism-muted">{hint}</span></label>;
}

export function Input(props) { return <input {...props} className={`${inputCls} ${props.className || ""}`} />; }
export function Select(props) { return <select {...props} className={`${inputCls} ${props.className || ""}`} />; }
export function Toggle({ checked, onChange, label }) { return <button type="button" onClick={() => onChange?.(!checked)} className="flex items-center gap-2 text-xs"><span className={`relative h-5 w-9 rounded-full ${checked ? "bg-prism-accent" : "bg-prism-panel2"}`}><i className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${checked ? "left-4" : "left-0.5"}`} /></span>{label}</button>; }
export function NotEnoughData({ children = "Pas assez de données pour cette analyse." }) { return <EmptyState title="PAS ASSEZ DE DONNÉES">{children}</EmptyState>; }
export function SettingRow({ title, description, children }) { return <div className="flex items-center justify-between gap-4 border-b border-prism-line py-4 last:border-0"><div><b className="text-sm">{title}</b><p className="mt-1 text-xs text-prism-muted">{description}</p></div>{children}</div>; }
export function RangeSlider(props) { return <input {...props} type="range" className="accent-prism-accent" />; }
export function AnimatedNumber({ value }) { return <span className="font-mono tabular-nums">{value}</span>; }

export function SectionLabel({ children, className = "" }) {
  return <div className={`flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[.18em] text-prism-muted ${className}`}><span>{children}</span><i className="h-px flex-1 bg-prism-line" /></div>;
}

export function Segmented({ options, value, onChange, className = "" }) {
  return <div className={`inline-flex rounded-md border border-prism-line bg-prism-panel2 p-0.5 ${className}`}>{options.map((option) => <button key={option.value} type="button" onClick={() => onChange?.(option.value)} className={`rounded px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.12em] ${value === option.value ? "bg-prism-accentDim text-prism-accent" : "text-prism-muted hover:text-prism-text"}`}>{option.label}</button>)}</div>;
}

export function Badge({ tone = "neutral", children }) {
  const tones = { accent: "border-prism-accent/30 bg-prism-accentDim text-prism-accent", gain: "border-prism-win/30 bg-prism-win/10 text-prism-win", loss: "border-prism-loss/30 bg-prism-loss/10 text-prism-loss", warn: "border-amber-400/30 bg-amber-400/10 text-amber-400", neutral: "border-prism-line bg-prism-panel2 text-prism-muted" };
  return <span className={`inline-flex rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-[.14em] border ${tones[tone] || tones.neutral}`}>{children}</span>;
}

export function ProgressBar({ value = 0, tone = "accent" }) {
  const colors = { accent: "bg-prism-accent", gain: "bg-prism-win", loss: "bg-prism-loss", warn: "bg-amber-400" };
  return <div className="h-1.5 overflow-hidden rounded-full bg-prism-panel2"><div className={`h-full rounded-full ${colors[tone] || colors.accent}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

export function EmptyState({ icon, title, children }) {
  return <div className="rounded-lg border border-dashed border-prism-line bg-prism-panel p-10 text-center">{icon && <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full border border-prism-line bg-prism-panel2 text-prism-accent">{icon}</div>}<p className="font-mono text-xs uppercase tracking-[.15em] text-prism-muted2">{title}</p>{children && <p className="mx-auto mt-2 max-w-sm text-sm text-prism-muted">{children}</p>}</div>;
}

export function Modal({ title, subtitle, onClose, children, footer, tone }) {
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}><section className={`w-full max-w-lg overflow-hidden rounded-lg border border-prism-line bg-prism-panel ${tone === "warn" ? "border-t-2 border-t-amber-400" : "border-t-2 border-t-prism-accent"}`}><header className="flex items-start justify-between border-b border-prism-line p-5"><div><h2 className="text-base font-semibold">{title}</h2>{subtitle && <p className="mt-1 text-sm text-prism-muted">{subtitle}</p>}<div className="mt-3 flex gap-1"><i className="h-1.5 w-1.5 rounded-full bg-prism-accent" /><i className="h-1.5 w-1.5 rounded-full bg-prism-accent" /><i className="h-1.5 w-5 rounded-full bg-prism-accent" /></div></div><button type="button" onClick={onClose} className="text-prism-muted hover:text-prism-text"><X size={18} /></button></header><div className="p-5">{children}</div>{footer && <footer className="flex justify-end gap-2 border-t border-prism-line p-4">{footer}</footer>}</section></div>;
}

export function ConfirmModal({ title, message, confirmLabel = "Confirmer", onClose, onConfirm }) {
  return <div className="fixed inset-0 z-[110] grid place-items-center bg-black/85 p-4 backdrop-blur-sm"><section className="w-full max-w-sm rounded-xl border border-amber-400/35 bg-prism-panel p-5 shadow-2xl"><h2 className="text-base font-bold text-prism-text">{title}</h2><p className="mt-2 text-sm text-prism-muted">{message}</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-md border border-prism-line px-3 py-2 text-xs font-bold text-prism-muted">Annuler</button><button type="button" onClick={onConfirm} className="rounded-md bg-amber-400 px-3 py-2 text-xs font-extrabold text-black">{confirmLabel}</button></div></section></div>;
}
