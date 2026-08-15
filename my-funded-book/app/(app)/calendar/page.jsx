"use client";

import { useEffect, useRef } from "react";
import { useBook } from "@/components/BookProvider";
import { CalendarDays } from "lucide-react";

export default function CalendarPage() {
  const { lang } = useBook();
  const L = lang === "en" ? "en" : "fr";
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify({
      colorTheme: "dark",
      isTransparent: true,
      locale: L === "en" ? "en" : "fr",
      countryFilter: "us,eu,fr,gb,de,it,jp,ca,cn",
      importanceFilter: "-1,0,1",
      width: "100%",
      height: 640,
    });
    el.appendChild(script);
  }, [L]);

  return (
    <div>
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-[16px] font-extrabold">
          <CalendarDays size={18} className="text-accent" /> {L === "en" ? "Economic calendar" : "Calendrier économique"}
        </h2>
        <div className="mt-0.5 text-[12px] text-muted2">
          {L === "en"
            ? "All events, updated automatically. Filter by impact and country inside the widget."
            : "Tous les événements, à jour automatiquement. Filtre par impact et pays directement dans le widget."}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-panel p-2">
        <div className="tradingview-widget-container" ref={ref}></div>
        <div className="px-2 pb-1 pt-1 text-right text-[11px] text-muted2">
          <a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank" className="hover:text-accent">
            Track all markets on TradingView
          </a>
        </div>
      </div>
    </div>
  );
}
