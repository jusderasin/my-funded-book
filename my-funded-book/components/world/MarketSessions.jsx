"use client";

// Sessions de marché (Sydney, Tokyo, Londres, New York) affichées dans le fuseau
// horaire de l'utilisateur. Les heures sont définies dans le fuseau de chaque
// place, donc les changements d'heure (été / hiver) sont gérés automatiquement.

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

const SESSIONS = [
  { id: "sydney", name: "Sydney", flag: "au", tz: "Australia/Sydney", open: [7, 0], close: [16, 0], color: "#a78bfa" },
  { id: "tokyo", name: "Tokyo · Asie", flag: "jp", tz: "Asia/Tokyo", open: [9, 0], close: [18, 0], color: "#f472b6" },
  { id: "london", name: "Londres", flag: "gb", tz: "Europe/London", open: [8, 0], close: [17, 0], color: "#60a5fa" },
  { id: "ny", name: "New York", flag: "us", tz: "America/New_York", open: [8, 0], close: [17, 0], color: "#4ade80", cash: [[9, 30], [16, 0]] },
];

// Décalage (ms) du fuseau tz à l'instant date.
function tzOffset(date, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(date).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(date.getTime() / 1000) * 1000;
}
// Date réelle de « y-m-d h:mi » à l'heure locale de tz.
function zoned(y, m, d, h, mi, tz) {
  const guess = Date.UTC(y, m, d, h, mi);
  const first = guess - tzOffset(new Date(guess), tz);
  return new Date(guess - tzOffset(new Date(first), tz));
}
function localDay(date, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric", weekday: "short" }).formatToParts(date).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month - 1, d: +p.day, weekend: p.weekday === "Sat" || p.weekday === "Sun" };
}

// Ouvertures de la session autour de now (hier → après-demain), hors week-end local.
function occurrences(s, now, [oh, om] = s.open, [ch, cm] = s.close) {
  const out = [];
  for (let k = -1; k <= 3; k++) {
    const day = localDay(new Date(now.getTime() + k * 86400_000), s.tz);
    if (day.weekend) continue;
    out.push({ open: zoned(day.y, day.m, day.d, oh, om, s.tz), close: zoned(day.y, day.m, day.d, ch, cm, s.tz) });
  }
  return out;
}

const hm = (d) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const left = (ms) => { const m = Math.round(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m} min`; };

export default function MarketSessions({ en }) {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!now) return null;

  const myTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 86400_000);
  const pct = (d) => ((d - dayStart) / 86400_000) * 100;

  const rows = SESSIONS.map((s) => {
    const occ = occurrences(s, now);
    const current = occ.find((o) => o.open <= now && now < o.close);
    const next = occ.find((o) => o.open > now);
    const today = occ.filter((o) => o.close > dayStart && o.open < dayEnd);
    const cash = s.cash ? occurrences(s, now, ...s.cash).filter((o) => o.close > dayStart && o.open < dayEnd) : [];
    return { ...s, current, next, today, cash };
  });
  const overlap = rows.filter((r) => r.current).length >= 2;

  return (
    <section className="term-panel mb-4 p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[11px] font-bold tracking-[.16em] text-prism-muted"><Clock className="h-3.5 w-3.5 text-prism-accent" />{en ? "MARKET SESSIONS" : "SESSIONS DE MARCHÉ"}</h2>
        <p className="font-mono text-[11px] text-prism-muted2">{en ? "your time" : "ton heure"} : <b className="text-prism-text">{hm(now)}</b> · {myTz}{overlap && <span className="ml-2 rounded bg-prism-accent/15 px-1.5 py-px font-bold text-prism-accent">{en ? "OVERLAP · high volume" : "CHEVAUCHEMENT · gros volume"}</span>}</p>
      </header>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg border px-3 py-2.5" style={{ borderColor: r.current ? r.color : "var(--prism-line, rgba(255,255,255,.1))", background: r.current ? `${r.color}14` : "transparent" }}>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-bold"><img src={`https://flagcdn.com/w40/${r.flag}.png`} alt="" className="h-3.5 w-5 rounded-sm object-cover" />{r.name}</span>
              <span className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: r.current ? r.color : undefined }}>
                <i className={`h-2 w-2 rounded-full ${r.current ? "animate-pulse" : "bg-prism-muted2"}`} style={r.current ? { background: r.color } : undefined} />
                {r.current ? (en ? "OPEN" : "OUVERTE") : en ? "CLOSED" : "FERMÉE"}
              </span>
            </div>
            <p className="mt-1 font-mono text-[12px] text-prism-muted">{hm((r.current || r.next).open)} → {hm((r.current || r.next).close)}</p>
            <p className="mt-0.5 text-[11px] text-prism-muted2">
              {r.current ? `${en ? "closes in" : "ferme dans"} ${left(r.current.close - now)}` : r.next ? `${en ? "opens in" : "ouvre dans"} ${left(r.next.open - now)}${r.next.open.getDate() !== now.getDate() ? ` (${r.next.open.toLocaleDateString(en ? "en-US" : "fr-FR", { weekday: "short" })})` : ""}` : ""}
            </p>
            {r.cash.length > 0 && <p className="mt-0.5 text-[10.5px] text-prism-muted2">{en ? "Wall St cash" : "Bourse (cash)"} : {hm(r.cash[0].open)} → {hm(r.cash[0].close)}</p>}
          </div>
        ))}
      </div>

      {/* Frise de ta journée : 0 h → 24 h à ton heure */}
      <div className="relative mt-3 select-none">
        <div className="relative space-y-1">
          {rows.map((r) => (
            <div key={r.id} className="relative h-3 rounded bg-white/[0.03]">
              {r.today.map((o, i) => {
                const a = Math.max(0, pct(o.open));
                const b = Math.min(100, pct(o.close));
                return <i key={i} className="absolute top-0 h-full rounded" style={{ left: `${a}%`, width: `${b - a}%`, background: r.color, opacity: r.current ? 0.85 : 0.4 }} title={`${r.name} ${hm(o.open)} → ${hm(o.close)}`} />;
              })}
            </div>
          ))}
          <i className="absolute -bottom-1 -top-1 w-0.5 rounded bg-white shadow-[0_0_6px_white]" style={{ left: `${pct(now)}%` }} />
        </div>
        <div className="mt-1 flex justify-between font-mono text-[9.5px] text-prism-muted2">
          {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => <span key={h}>{String(h).padStart(2, "0")}h</span>)}
        </div>
      </div>
    </section>
  );
}
