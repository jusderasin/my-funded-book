"use client";

import { useEffect, useRef, useState } from "react";
import { useBook } from "@/components/BookProvider";
import { CalendarDays, Sun, Moon } from "lucide-react";

export default function CalendarPage() {
  const { lang } = useBook();
  const L = lang === "en" ? "en" : "fr";
  const ref = useRef(null);
  const [theme, setTheme] = useState("dark");
  const [ready, setReady] = useState(false);

  // Restaure le thème choisi
  useEffect(() => {
    try {
      const saved = localStorage.getItem("calendarTheme");
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch {}
    setReady(true);
  }, []);

  // (Re)charge le widget à chaque changement de thème/langue
  useEffect(() => {
    if (!ready) return;
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    el.appendChild(inner);
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify({
      colorTheme: theme,
      isTransparent: true,
      locale: L === "en" ? "en" : "fr",
      countryFilter: "us,eu,fr,gb,de,it,jp,ca,cn",
      importanceFilter: "-1,0,1",
      width: "100%",
      height: 640,
    });
    el.appendChild(script);
  }, [ready, L, theme]);

  function toggleTheme() {
    setTheme((t) => {
      const nv = t === "dark" ? "light" : "dark";
      try { localStorage.setItem("calendarTheme", nv); } catch {}
      return nv;
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[16px] font-extrabold">
            <CalendarDays size={18} className="text-accent" /> {L === "en" ? "Economic calendar" : "Calendrier économique"}
          </h2>
          <div className="mt-0.5 text-[12px] text-muted2">
            {L === "en"
              ? "All events, updated automatically. Filter by impact and country inside the widget."
              : "Tous les événements, à jour automatiquement. Filtre par impact et pays directement dans le widget."}
          </div>
        </div>
        <button
          onClick={toggleTheme}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line2 bg-panel2 px-3 py-2 text-[12px] font-semibold text-white hover:border-accent"
          title={L === "en" ? "Toggle theme" : "Changer le thème"}
        >
          {theme === "dark" ? <Sun size={14} className="text-accent" /> : <Moon size={14} className="text-accent" />}
          {theme === "dark" ? (L === "en" ? "Light" : "Clair") : (L === "en" ? "Dark" : "Sombre")}
        </button>
      </div>

      <div className={`overflow-hidden rounded-2xl border border-line p-2 ${theme === "light" ? "bg-white" : "bg-panel"}`}>
        <div key={`${theme}-${L}`} className="tradingview-widget-container" ref={ref}></div>
        <div className={`px-2 pb-1 pt-1 text-right text-[11px] ${theme === "light" ? "text-gray-400" : "text-muted2"}`}>
          <a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank" className="hover:text-accent">
            Track all markets on TradingView
          </a>
        </div>
      </div>
    </div>
  );
}
