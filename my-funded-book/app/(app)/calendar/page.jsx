"use client";

import { useState, useEffect } from "react";
import { useBook } from "@/components/BookProvider";
import { CalendarDays, Sun, Moon } from "lucide-react";

export default function CalendarPage() {
  const { lang } = useBook();
  const L = lang === "en" ? "en" : "fr";
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("calendarTheme");
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch {}
  }, []);

  function toggleTheme() {
    setTheme((t) => {
      const nv = t === "dark" ? "light" : "dark";
      try { localStorage.setItem("calendarTheme", nv); } catch {}
      return nv;
    });
  }

  const themeParam = theme === "dark" ? "darkTheme" : "lightTheme";
  const src =
    "https://sslecal2.investing.com?" +
    "columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous" +
    "&features=datepicker,timezone,filters" +
    "&countries=5,22,4,17,35,37,6,10,72" +
    "&calType=week&timeZone=8" +
    "&lang=1" +
    "&theme=" + themeParam;

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

      <div className={`overflow-hidden rounded-2xl border border-line p-1 ${theme === "light" ? "bg-white" : "bg-panel"}`}>
        <iframe
          key={themeParam}
          src={src}
          width="100%"
          height="660"
          frameBorder="0"
          allowTransparency="true"
          marginWidth="0"
          marginHeight="0"
          style={{ display: "block", borderRadius: "12px" }}
          title="Calendrier économique"
        />
        <div className={`px-2 pb-1 pt-1 text-right text-[11px] ${theme === "light" ? "text-gray-400" : "text-muted2"}`}>
          <a href="https://www.investing.com/" rel="nofollow" target="_blank" className="hover:text-accent">
            Calendrier économique fourni par Investing.com
          </a>
        </div>
      </div>
    </div>
  );
}
