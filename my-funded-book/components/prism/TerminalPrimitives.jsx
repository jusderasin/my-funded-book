"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
export function RangeSlider({ value = 0, onChange, min = -100, max = 100, step = 1, label }) { return <label className="block"><span className="mb-2 flex justify-between text-[10px] font-bold uppercase tracking-[.12em] text-prism-muted2">{label}<b className="font-mono text-prism-accent">{value >= 0 ? "+" : ""}{value}</b></span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange?.(Number(event.target.value))} className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[linear-gradient(90deg,#ef4444_0%,#27272a_50%,#06b6d4_100%)] accent-prism-accent" /></label>; }
export function AnimatedNumber({ value }) {
  const numeric = Number(value);
  const [display, setDisplay] = useState(Number.isFinite(numeric) ? 0 : value);
  useEffect(() => {
    if (!Number.isFinite(numeric) || localStorage.getItem("mtb.animations") === "off") { setDisplay(value); return; }
    const start = performance.now();
    const frame = (now) => { const p = Math.min(1, (now - start) / 600); setDisplay(numeric * (1 - (1 - p) ** 3)); if (p < 1) requestAnimationFrame(frame); };
    const id = requestAnimationFrame(frame); return () => cancelAnimationFrame(id);
  }, [numeric, value]);
  return <span className="font-mono tabular-nums">{Number.isFinite(numeric) ? display.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) : display}</span>;
}

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

export function Modal({ title, subtitle, onClose, children, footer, tone, steps }) {
  const modal = <div className="fixed inset-0 z-[100] grid overflow-x-hidden overflow-y-auto bg-black/80 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}><section className={`m-auto w-full max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-prism-line bg-prism-panel ${tone === "warn" ? "border-t-2 border-t-amber-400" : "border-t-2 border-t-prism-accent"}`}><header className="flex items-start justify-between border-b border-prism-line p-5"><div><h2 className="text-base font-semibold">{title}</h2>{subtitle && <p className="mt-1 text-sm text-prism-muted">{subtitle}</p>}{steps && <div className="mt-3 flex gap-1"><i className="h-1.5 w-1.5 rounded-full bg-prism-accent" /><i className="h-1.5 w-1.5 rounded-full bg-prism-accent" /><i className="h-1.5 w-5 rounded-full bg-prism-accent" /></div>}</div><button type="button" onClick={onClose} className="text-prism-muted hover:text-prism-text"><X size={18} /></button></header><div className="p-5">{children}</div>{footer && <footer className="flex justify-end gap-2 border-t border-prism-line p-4">{footer}</footer>}</section></div>;
  return typeof document === "undefined" ? modal : createPortal(modal, document.body);
}

export function ConfirmModal({ title, message, confirmLabel = "Confirmer", onClose, onConfirm }) {
  const modal = <div className="fixed inset-0 z-[110] grid overflow-x-hidden overflow-y-auto bg-black/85 p-4 backdrop-blur-sm"><section className="m-auto w-full max-w-[calc(100vw-2rem)] rounded-xl border border-amber-400/35 bg-prism-panel p-5 shadow-2xl sm:max-w-sm"><h2 className="text-base font-bold text-prism-text">{title}</h2><p className="mt-2 text-sm text-prism-muted">{message}</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-md border border-prism-line px-3 py-2 text-xs font-bold text-prism-muted">Annuler</button><button type="button" onClick={onConfirm} className="rounded-md bg-amber-400 px-3 py-2 text-xs font-extrabold text-black">{confirmLabel}</button></div></section></div>;
  return typeof document === "undefined" ? modal : createPortal(modal, document.body);
}

export function StatCard({ label, value, sublabel, ring, tone = "accent" }) { const color = tone === "loss" ? "#ef4444" : tone === "gain" ? "#22c55e" : "#06b6d4"; const sub = typeof sublabel === "object" ? sublabel.text : sublabel; const subTone = typeof sublabel === "object" ? sublabel.tone : "neutral"; const subClass = subTone === "gain" ? "text-prism-win" : subTone === "loss" ? "text-prism-loss" : "text-prism-muted"; return <Card padding="p-3 sm:p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[9px] font-bold uppercase tracking-[.12em] text-prism-muted2">{label}</p><b className="mt-2 block truncate font-mono text-lg text-prism-text sm:text-xl">{value}</b></div>{ring != null && <svg className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" viewBox="0 0 36 36"><circle cx="18" cy="18" r="14" fill="none" stroke="#27272a" strokeWidth="3"/><circle cx="18" cy="18" r="14" fill="none" stroke={color} strokeWidth="3" strokeDasharray={`${Math.min(100,Math.max(0,ring))} 100`} pathLength="100" transform="rotate(-90 18 18)"/></svg>}</div>{sub && <p className={`mt-3 line-clamp-2 border-t border-prism-line pt-2 text-[10px] ${subClass}`}>{sub}</p>}</Card>; }
export function StepperModal({ title, steps = [], step = 0, children, onClose }) { return <Modal title={title} onClose={onClose}><div className="mb-5 flex gap-2">{steps.map((name, index) => <span key={name} className={`flex-1 border-b-2 pb-2 text-center text-[9px] font-bold uppercase ${index <= step ? "border-prism-accent text-prism-accent" : "border-prism-line text-prism-muted2"}`}>{index + 1}. {name}</span>)}</div>{children}</Modal>; }
export function LockedGate({ title = "Fonction verrouillée", description, children }) { return <Card className="text-center" padding="p-8"><p className="text-[10px] font-bold tracking-[.16em] text-amber-300">VERROUILLÉ</p><h3 className="mt-2 text-lg font-bold">{title}</h3><p className="mx-auto mt-2 max-w-md text-sm text-prism-muted">{description}</p>{children && <div className="mt-5">{children}</div>}</Card>; }
