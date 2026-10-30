"use client";

// Espace « Monde » : globe 3D en direct (avions, satellites, séismes), un clic sur
// un pays ouvre ses actus et ses annonces économiques, et des chaînes TV en direct.

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, CalendarClock, Globe2, Newspaper, Plane, Radio, Satellite, Ship, Tv, Waves, X } from "lucide-react";
import { useBook } from "@/components/BookProvider";
import { SAT_GROUPS } from "@/components/world/WorldGlobe";
import MarketSessions from "@/components/world/MarketSessions";

const WorldGlobe = dynamic(() => import("@/components/world/WorldGlobe"), { ssr: false, loading: () => <div className="grid h-full place-items-center text-xs text-prism-muted">Chargement du globe…</div> });

const EURO = ["AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK"];
const CURRENCY = { US: "USD", GB: "GBP", JP: "JPY", CH: "CHF", CA: "CAD", AU: "AUD", NZ: "NZD", CN: "CNY", ...Object.fromEntries(EURO.map((c) => [c, "EUR"])) };

const CHANNELS = [
  { id: "UCIALMKvObZNtJ6AmdCLP7Lg", name: "Bloomberg", tag: "Marchés" },
  { id: "UCvJJ_dzjViJCoLf5uKUTwoA", name: "CNBC", tag: "Marchés" },
  { id: "UCEAZeUIeJs0IjQiqTCdVSIg", name: "Yahoo Finance", tag: "Marchés" },
  { id: "UCCCPCZNChQdGa9EkATeye4g", name: "France 24", tag: "FR" },
  { id: "UCQfwfsi5VrQ8yKZ-UWmAEFg", name: "France 24 EN", tag: "Monde" },
  { id: "UCNye-wNBqNL5ZzHSJj3l8Bg", name: "Al Jazeera", tag: "Monde" },
  { id: "UCoMdktPbSTixAyNGwb-UYkQ", name: "Sky News", tag: "Monde" },
  { id: "UCknLrEdhRCp1aegoMqRaCZg", name: "DW News", tag: "Monde" },
];

const Flag = ({ iso }) => (iso && iso.length === 2
  ? <img src={`https://flagcdn.com/w80/${iso.toLowerCase()}.png`} alt="" className="h-9 w-[54px] rounded-md border border-prism-line object-cover" />
  : <Globe2 className="h-9 w-9 text-prism-accent" />);
const ago = (d, en) => {
  if (!d) return "";
  const m = Math.max(1, Math.round((Date.now() - d.getTime()) / 60000));
  return m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} ${en ? "d" : "j"}`;
};
const IMPACT = { High: "bg-prism-loss", Medium: "bg-amber-400", Low: "bg-prism-muted2", Holiday: "bg-sky-400" };

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

function Panel({ icon: Icon, title, right, children, className = "" }) {
  return (
    <section className={`term-panel p-4 ${className}`}>
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[11px] font-bold tracking-[.16em] text-prism-muted"><Icon className="h-3.5 w-3.5 text-prism-accent" />{title}</h2>
        {right}
      </header>
      {children}
    </section>
  );
}

export default function WorldPage() {
  const { lang } = useBook() || {};
  const en = lang === "en";
  const [countries, setCountries] = useState(null);
  const [flights, setFlights] = useState([]);
  const [ships, setShips] = useState({ ships: [], needsKey: false });
  const [onlyConfirmed, setOnlyConfirmed] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("");
  const [satData, setSatData] = useState({});
  const [satOn, setSatOn] = useState({ stations: true, starlink: true, gps: true });
  const [quakes, setQuakes] = useState([]);
  const [calendar, setCalendar] = useState([]);
  const [layers, setLayers] = useState({ flights: true, ships: true, sats: true, quakes: true });
  const [selected, setSelected] = useState(null);
  const [news, setNews] = useState({ loading: false, items: [], error: "" });
  const [channel, setChannel] = useState(CHANNELS[0].id);
  const [accent, setAccent] = useState("#c6f432");
  const [updated, setUpdated] = useState(null);

  useEffect(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--prism-accent").trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) setAccent(v);
    fetch("/countries.geojson").then((r) => r.json()).then((d) => setCountries(d.features)).catch(() => {});
    getJson("/api/world?kind=calendar").then(setCalendar).catch(() => {});
    const loadLive = () => {
      getJson("/api/world?kind=flights").then((d) => { setFlights(Array.isArray(d) ? d : []); setUpdated(new Date()); }).catch(() => {});
      getJson("/api/world?kind=ships").then((d) => setShips({ ships: d.ships || [], needsKey: !!d.needsKey })).catch(() => {});
      getJson("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson")
        .then((d) => setQuakes(d.features.map((f) => ({ lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], mag: f.properties.mag, place: f.properties.place, time: f.properties.time }))))
        .catch(() => {});
    };
    loadLive();
    const id = setInterval(loadLive, 60_000);
    return () => clearInterval(id);
  }, []);

  // Chaque constellation n'est téléchargée qu'à sa première activation.
  useEffect(() => {
    Object.keys(satOn).filter((g) => satOn[g] && !satData[g]).forEach((g) => {
      setSatData((d) => ({ ...d, [g]: [] }));
      getJson(`/api/world?kind=sats&group=${g}`).then((list) => setSatData((d) => ({ ...d, [g]: Array.isArray(list) ? list : [] }))).catch(() => {});
    });
  }, [satOn, satData]);
  const sats = useMemo(() => Object.keys(satOn).filter((g) => satOn[g]).flatMap((g) => satData[g] || []), [satOn, satData]);

  // Actus du pays sélectionné (ou du monde).
  const topic = selected?.ADMIN || "";
  const iso = selected?.ISO_A2 || "";
  useEffect(() => {
    let live = true;
    setNews({ loading: true, items: [], error: "" });
    setSourceFilter("");
    getJson(`/api/world?kind=news&q=${encodeURIComponent(topic)}&iso=${iso}`)
      .then((items) => live && setNews({ loading: false, items: Array.isArray(items) ? items : [], error: "" }))
      .catch(() => live && setNews({ loading: false, items: [], error: en ? "News feed unavailable, try again in a moment." : "Flux d'actus indisponible, réessaie dans un instant." }));
    return () => { live = false; };
  }, [topic, iso, en]);

  const newsSources = useMemo(() => [...new Set(news.items.flatMap((a) => a.sources || [a.source]))], [news.items]);
  const shownNews = news.items.filter((a) => (!onlyConfirmed || a.confirmed) && (!sourceFilter || (a.sources || [a.source]).includes(sourceFilter)));

  const currency = selected ? CURRENCY[selected.ISO_A2] : null;
  const events = useMemo(() => {
    const now = Date.now() - 2 * 3600_000;
    const mine = calendar.filter((e) => (currency ? e.currency === currency : e.impact === "High"));
    const next = mine.filter((e) => new Date(e.date).getTime() >= now);
    // Plus rien à venir cette semaine : on montre les dernières publiées.
    return (next.length ? next.slice(0, 12) : mine.slice(-12).map((e) => ({ ...e, past: true })));
  }, [calendar, currency]);

  const countryQuakes = selected ? quakes.filter((q) => String(q.place || "").toLowerCase().includes(selected.ADMIN.toLowerCase())) : [];

  const toggles = [
    ["flights", Plane, en ? "Flights" : "Avions", flights.length],
    ["ships", Ship, en ? "Ships" : "Bateaux", ships.needsKey ? "—" : ships.ships.length],
    ["sats", Satellite, "Satellites", sats.length],
    ["quakes", Waves, en ? "Quakes" : "Séismes", quakes.length],
  ];

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 text-prism-text sm:px-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="term-eyebrow flex items-center gap-2"><Globe2 className="h-4 w-4" />{en ? "WORLD · LIVE" : "MONDE · EN DIRECT"}</p>
          <h1 className="term-title mt-2 text-[34px]">{en ? "World monitor" : "Le monde en direct"}</h1>
          <p className="mt-1 text-sm text-prism-muted">{en ? "Click a country: its news, its economic releases and what is happening there right now." : "Clique sur un pays : ses actus, ses annonces économiques et ce qui s'y passe en ce moment."}</p>
        </div>
        <p className="flex items-center gap-2 font-mono text-[11px] text-prism-muted2"><span className="h-2 w-2 animate-pulse rounded-full bg-prism-win" />{updated ? `${en ? "updated" : "mis à jour"} ${updated.toLocaleTimeString(en ? "en-US" : "fr-FR")}` : "…"}</p>
      </header>

      <MarketSessions en={en} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <section className="term-panel relative h-[460px] overflow-hidden sm:h-[640px]" style={{ background: "radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--prism-accent) 7%, transparent), transparent 60%), var(--prism-bg)" }}>
          <WorldGlobe countries={countries} flights={flights} ships={ships.ships} sats={sats} quakes={quakes} layers={layers} accent={accent} selected={selected} onSelect={setSelected} />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {toggles.map(([k, Icon, label, n]) => (
              <button key={k} type="button" onClick={() => setLayers((l) => ({ ...l, [k]: !l[k] }))}
                className={`fx-shine inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-bold backdrop-blur ${layers[k] ? "border-prism-accent bg-black/50 text-prism-accent" : "border-white/15 bg-black/40 text-white/50"}`}>
                <Icon className="h-3.5 w-3.5" />{label}<span className="font-mono opacity-70">{n ? n.toLocaleString("fr-FR") : "…"}</span>
              </button>
            ))}
          </div>
          {layers.sats && (
            <div className="absolute bottom-14 left-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1">
              {Object.entries(SAT_GROUPS).map(([g, info]) => (
                <button key={g} type="button" onClick={() => setSatOn((o) => ({ ...o, [g]: !o[g] }))}
                  className={`inline-flex h-6 items-center gap-1.5 rounded-md border px-2 text-[10px] font-semibold backdrop-blur ${satOn[g] ? "border-white/30 bg-black/60 text-white" : "border-white/10 bg-black/35 text-white/45"}`}>
                  <i className="h-2 w-2 rounded-full" style={{ background: info.color, opacity: satOn[g] ? 1 : 0.4 }} />{info.label}
                  {satOn[g] && satData[g] && <span className="font-mono opacity-60">{satData[g].length ? satData[g].length.toLocaleString("fr-FR") : "…"}</span>}
                </button>
              ))}
            </div>
          )}
          {layers.ships && ships.needsKey && (
            <p className="absolute left-3 top-14 max-w-[300px] rounded-lg bg-black/60 px-3 py-2 text-[10.5px] leading-4 text-white/75 backdrop-blur">{en ? "Ships need a free aisstream.io key (AISSTREAM_API_KEY on Vercel)." : "Les bateaux demandent une clé gratuite aisstream.io (AISSTREAM_API_KEY sur Vercel)."}</p>
          )}
          <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-3 rounded-lg bg-black/45 px-3 py-2 text-[10px] text-white/70 backdrop-blur">
            <span className="flex items-center gap-1.5"><Plane className="h-3.5 w-3.5 -rotate-45 fill-amber-400 text-amber-400" />{en ? "aircraft (points to its heading)" : "avion (pointe vers son cap)"}</span>
            <span className="flex items-center gap-1.5"><Ship className="h-3.5 w-3.5 text-emerald-400" />{en ? "ship" : "bateau"}</span>
            <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-sky-300" />{en ? "satellites (colour = constellation)" : "satellites (couleur = constellation)"}</span>
            <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-red-500" />{en ? "earthquake" : "séisme"}</span>
          </div>
          {selected && (
            <button type="button" onClick={() => setSelected(null)} className="absolute right-3 top-3 inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/15 bg-black/50 px-2.5 text-[11px] font-bold text-white backdrop-blur hover:border-prism-accent">
              <X className="h-3.5 w-3.5" />{en ? "Whole world" : "Monde entier"}
            </button>
          )}
        </section>

        <div className="space-y-4">
          <section className="term-panel p-4">
            <div className="flex items-center gap-3">
              <Flag iso={selected?.ISO_A2} />
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold">{selected ? selected.ADMIN : en ? "Whole world" : "Monde entier"}</h2>
                <p className="text-xs text-prism-muted">
                  {selected
                    ? [selected.CONTINENT, selected.POP_EST ? `${(selected.POP_EST / 1e6).toFixed(1)} M ${en ? "people" : "hab."}` : null, currency].filter(Boolean).join(" · ")
                    : en ? "Click any country on the globe." : "Clique sur un pays du globe."}
                </p>
              </div>
            </div>
            {selected && countryQuakes.length > 0 && <p className="mt-3 rounded-md bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-300">{countryQuakes.length} {en ? "earthquake(s) in the last 24h" : "séisme(s) sur les dernières 24 h"} · max M{Math.max(...countryQuakes.map((q) => q.mag)).toFixed(1)}</p>}
          </section>

          <Panel icon={CalendarClock} title={currency ? `${en ? "ECONOMIC RELEASES" : "ANNONCES ÉCO"} · ${currency}` : en ? "HIGH-IMPACT RELEASES" : "ANNONCES À FORT IMPACT"}>
            {events.length ? (
              <ul className="space-y-1.5">
                {events.map((e, i) => {
                  const d = new Date(e.date);
                  return (
                    <li key={i} className={`flex items-center gap-2.5 rounded-md px-1.5 py-1 text-xs hover:bg-white/[0.03] ${e.past ? "opacity-55" : ""}`}>
                      <i className={`h-2 w-2 shrink-0 rounded-full ${IMPACT[e.impact] || "bg-prism-muted2"}`} />
                      <span className="w-[86px] shrink-0 font-mono text-[11px] text-prism-muted">{d.toLocaleDateString(en ? "en-US" : "fr-FR", { weekday: "short" })} {d.toLocaleTimeString(en ? "en-US" : "fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                      <span className="w-9 shrink-0 font-mono text-[10px] font-bold text-prism-accent">{e.currency}</span>
                      <span className="min-w-0 flex-1 truncate">{e.title}</span>
                      {(e.forecast || e.previous) && <span className="shrink-0 font-mono text-[10px] text-prism-muted2">{e.forecast || "—"} / {e.previous || "—"}</span>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-prism-muted2">{currency === undefined && selected ? (en ? "No major currency tracked for this country." : "Pas de devise majeure suivie pour ce pays.") : en ? "Nothing scheduled this week." : "Rien de prévu cette semaine."}</p>
            )}
          </Panel>

          <Panel icon={Newspaper} title={en ? "VERIFIED NEWS" : "ACTUS VÉRIFIÉES"} right={
            <button type="button" onClick={() => setOnlyConfirmed((v) => !v)} className={`inline-flex h-6 items-center gap-1 rounded-md border px-2 text-[10px] font-bold ${onlyConfirmed ? "border-prism-accent text-prism-accent" : "border-prism-line text-prism-muted hover:text-prism-text"}`}>
              <BadgeCheck className="h-3 w-3" />{en ? "Cross-checked only" : "Recoupées seulement"}
            </button>
          }>
            {newsSources.length > 1 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {newsSources.map((src) => (
                  <button key={src} type="button" onClick={() => setSourceFilter((v) => (v === src ? "" : src))} className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${sourceFilter === src ? "bg-prism-accent text-black" : "bg-white/[0.05] text-prism-muted hover:text-prism-text"}`}>{src}</button>
                ))}
              </div>
            )}
            <div className="max-h-[340px] space-y-1 overflow-y-auto pr-1">
              {news.loading && <p className="text-xs text-prism-muted2">{en ? "Loading…" : "Chargement…"}</p>}
              {news.error && <p className="text-xs text-prism-loss">{news.error}</p>}
              {!news.loading && !news.error && !shownNews.length && <p className="text-xs text-prism-muted2">{selected ? (en ? "No recent article from our sources about this country." : "Aucun article récent de nos sources sur ce pays.") : en ? "No recent article." : "Aucun article récent."}</p>}
              {shownNews.map((a) => (
                <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer" className="block rounded-md px-1.5 py-1.5 hover:bg-white/[0.04]">
                  <p className="line-clamp-2 text-[12.5px] leading-snug">{a.title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-prism-muted2">
                    <span className={`rounded px-1.5 py-px font-bold ${a.tier === "officiel" ? "bg-sky-400/15 text-sky-300" : "bg-white/[0.06] text-prism-muted"}`}>{a.source}</span>
                    {a.confirmed && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-prism-win/15 px-1.5 py-px font-bold text-prism-win" title={(a.sources || []).join(", ")}>
                        <BadgeCheck className="h-3 w-3" />{a.tier === "officiel" && (a.sources || []).length < 2 ? (en ? "official" : "officiel") : `${(a.sources || []).length} sources`}
                      </span>
                    )}
                    <span className="font-mono">{a.date ? ago(new Date(a.date), en) : ""}</span>
                  </p>
                </a>
              ))}
            </div>
            <p className="mt-2 border-t border-prism-line pt-2 text-[10px] leading-4 text-prism-muted2">{en ? "Sources: Fed, ECB, Investing.com, FXStreet, CNBC, MarketWatch, BBC, Al Jazeera. “N sources” = same story reported by several outlets." : "Sources : Fed, BCE, Investing.com, FXStreet, CNBC, MarketWatch, BBC, Al Jazeera. « N sources » = même info reprise par plusieurs médias."}</p>
          </Panel>
        </div>
      </div>

      <Panel icon={Tv} title={en ? "LIVE TV" : "TV EN DIRECT"} className="mt-4" right={<span className="flex items-center gap-1.5 text-[10px] font-bold text-prism-loss"><Radio className="h-3 w-3" />LIVE</span>}>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {CHANNELS.map((c) => (
            <button key={c.id} type="button" onClick={() => setChannel(c.id)}
              className={`h-8 rounded-lg border px-3 text-[11px] font-bold ${channel === c.id ? "border-prism-accent bg-prism-accentDim text-prism-accent" : "border-prism-line text-prism-muted hover:text-prism-text"}`}>
              {c.name}<span className="ml-1.5 font-normal opacity-60">{c.tag}</span>
            </button>
          ))}
        </div>
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-prism-line bg-black">
          <iframe key={channel} title="Live TV" className="h-full w-full" src={`https://www.youtube.com/embed/live_stream?channel=${channel}&autoplay=1&mute=1`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
        </div>
      </Panel>
    </div>
  );
}
