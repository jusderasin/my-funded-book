"use client";

import { useState, useEffect, useRef } from "react";
import { Clock, Check } from "lucide-react";
import { useBook } from "./BookProvider";

export const TIMEZONES = [
  { tz: "Europe/Paris", city: "Paris" },
  { tz: "Europe/London", city: "Londres" },
  { tz: "America/New_York", city: "New York" },
  { tz: "America/Chicago", city: "Chicago" },
  { tz: "Asia/Dubai", city: "Dubaï" },
  { tz: "Asia/Bangkok", city: "Bangkok" },
  { tz: "Asia/Tokyo", city: "Tokyo" },
];

export function cityFor(tz) {
  return (TIMEZONES.find((t) => t.tz === tz) || { city: tz }).city;
}

export function WorldClock() {
  const { profile, saveProfile } = useBook();
  const myTz = profile?.timezone || "Europe/Paris";
  const [now, setNow] = useState(() => Date.now());
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const fmt = (tz, withSec) =>
    new Date(now).toLocaleTimeString("fr-FR", { timeZone: tz, hour: "2-digit", minute: "2-digit", ...(withSec ? { second: "2-digit" } : {}) });

  function pick(tz) { saveProfile({ timezone: tz }); setOpen(false); }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1.5 rounded-lg border border-line2 bg-panel2 px-2.5 py-1.5 font-mono text-[12px] font-semibold text-white hover:border-accent">
        <Clock size={14} className="text-accent" />
        <span>{fmt(myTz)}</span>
        <span className="hidden text-muted2 sm:inline">{cityFor(myTz)}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[70] w-[250px] overflow-hidden rounded-xl border border-line2 bg-panel shadow-2xl">
          <div className="border-b border-line px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted2">Fuseaux horaires</div>
          <div className="max-h-[320px] overflow-auto">
            {TIMEZONES.map((t) => {
              const active = t.tz === myTz;
              return (
                <button key={t.tz} onClick={() => pick(t.tz)} className={`flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-panel2 ${active ? "bg-accentDim" : ""}`}>
                  <span className={`text-[12.5px] ${active ? "font-bold text-accent" : "text-white"}`}>{t.city}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[12px] text-muted2">{fmt(t.tz, true)}</span>
                    {active && <Check size={13} className="text-accent" />}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="border-t border-line px-3 py-2 text-[10px] leading-relaxed text-muted2">Clique une ville pour la définir comme ton fuseau. Le calendrier s'affichera à cette heure.</div>
        </div>
      )}
    </div>
  );
}
