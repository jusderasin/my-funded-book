"use client";

import { useState, useEffect } from "react";
import { useBook } from "@/components/BookProvider";
import { CalendarDays, Sun, Moon } from "lucide-react";

const CONTAINER_ID = "economic-calendar-1860";

export default function CalendarPage() {
  const { lang } = useBook();
  const L = lang === "en" ? "en" : "fr";
  const [theme, setTheme] = useState("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("calendarTheme");
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const el = document.getElementById(CONTAINER_ID);
    if (el) el.innerHTML = "";

    function render() {
      if (typeof window !== "undefined" && window.RemoteCalendar) {
        window.RemoteCalendar({
          DefaultTime: "this_week",
          DefaultTheme: theme,
          Url: "https://fxverify.com",
          SubPath: "economic-calendar",
          IsShowEmbedButton: false,
          ContainerId: CONTAINER_ID,
        });
      }
    }

    if (typeof window !== "undefined" && window.RemoteCalendar) {
      render();
    } else {
      const existing = document.getElementById("fxverify-cal-script");
      if (existing) {
        existing.addEventListener("load", render);
      } else {
        const script = document.createElement("script");
        script.id = "fxverify-cal-script";
        script.src = "https://fxverify.com/Content/remote/remote-calendar-widget.js";
        script.async = true;
        script.onload = render;
        document.body.appendChild(script);
      }
    }
  }, [ready, theme]);

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
            {L === "en" ? "All events, updated automatically." : "Tous les événements, à jour automatiquement."}
          </div>
        </div>
        <button onClick={toggleTheme} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line2 bg-panel2 px-3 py-2 text-[12px] font-semibold text-white hover:border-accent" title={L === "en" ? "Toggle theme" : "Changer le thème"}>
          {theme === "dark" ? <Sun size={14} className="text-accent" /> : <Moon size={14} className="text-accent" />}
          {theme === "dark" ? (L === "en" ? "Light" : "Clair") : (L === "en" ? "Dark" : "Sombre")}
        </button>
      </div>

      <div className={`overflow-hidden rounded-2xl border border-line p-2 ${theme === "light" ? "bg-white" : "bg-panel"}`}>
        <div id={CONTAINER_ID} key={theme} />
      </div>
    </div>
  );
}
