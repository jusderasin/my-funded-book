"use client";

// Filtres du globe : compagnie aérienne, type de navire, catégories de satellites.

import { useMemo } from "react";
import { Plane, Satellite, Ship, SlidersHorizontal } from "lucide-react";
import { AIRLINES, SAT_GROUPS, SHIP_TYPES, airlineCode } from "@/lib/worldCatalog";

const n = (v) => Number(v || 0).toLocaleString("fr-FR");

function Col({ icon: Icon, title, off, children }) {
  return (
    <div className={`min-w-0 ${off ? "opacity-40" : ""}`}>
      <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-bold tracking-[.14em] text-prism-muted"><Icon className="h-3.5 w-3.5 text-prism-accent" />{title}</p>
      {children}
    </div>
  );
}

const chip = (on) => `inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11px] font-semibold transition ${on ? "border-prism-accent/60 bg-prism-accent/10 text-prism-text" : "border-prism-line text-prism-muted2 hover:text-prism-text"}`;

export default function WorldFilters({ en, layers, flights, airline, setAirline, ships, shipOff, setShipOff, satOn, setSatOn, satData }) {
  // Compagnies présentes, classées par nombre d'avions en vol.
  const airlines = useMemo(() => {
    const count = {};
    for (const f of flights) { const c = airlineCode(f.call); if (c) count[c] = (count[c] || 0) + 1; }
    return Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 80);
  }, [flights]);
  const shipCount = useMemo(() => {
    const c = {};
    for (const s of ships) c[s.cat] = (c[s.cat] || 0) + 1;
    return c;
  }, [ships]);

  return (
    <section className="term-panel p-4">
      <h2 className="mb-3 flex items-center gap-2 text-[11px] font-bold tracking-[.16em] text-prism-muted"><SlidersHorizontal className="h-3.5 w-3.5 text-prism-accent" />{en ? "FILTERS" : "FILTRES"}</h2>
      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)_minmax(0,1.6fr)]">
        <Col icon={Plane} title={en ? "AIRCRAFT" : "AVIONS"} off={!layers.flights}>
          <select value={airline} onChange={(e) => setAirline(e.target.value)} className="h-8 w-full rounded-md border border-prism-line bg-prism-bg px-2 text-[12px] text-prism-text">
            <option value="">{en ? "All airlines" : "Toutes les compagnies"} ({n(flights.length)})</option>
            {airlines.map(([c, k]) => <option key={c} value={c}>{AIRLINES[c] || c} ({k})</option>)}
          </select>
          <p className="mt-1.5 text-[10.5px] text-prism-muted2">{en ? "Click a plane: route, departure, arrival." : "Clique un avion : trajet, départ, arrivée."}</p>
        </Col>

        <Col icon={Ship} title={en ? "SHIPS" : "BATEAUX"} off={!layers.ships}>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(SHIP_TYPES).map(([k, t]) => (
              <button key={k} type="button" onClick={() => setShipOff((o) => ({ ...o, [k]: !o[k] }))} className={chip(!shipOff[k])}>
                <i className="h-2.5 w-2.5 rounded-sm" style={{ background: t.color, opacity: shipOff[k] ? 0.3 : 1 }} />{t.label}<span className="font-mono text-[10px] opacity-60">{n(shipCount[k])}</span>
              </button>
            ))}
          </div>
        </Col>

        <Col icon={Satellite} title={en ? "SATELLITES BY USE" : "SATELLITES PAR USAGE"} off={!layers.sats}>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(SAT_GROUPS).map(([g, info]) => (
              <button key={g} type="button" title={info.hint} onClick={() => setSatOn((o) => ({ ...o, [g]: !o[g] }))} className={chip(satOn[g])}>
                <i className="h-2.5 w-2.5 rounded-full" style={{ background: info.color, opacity: satOn[g] ? 1 : 0.3 }} />{info.label}
                {satOn[g] && satData[g] && <span className="font-mono text-[10px] opacity-60">{satData[g].length ? n(satData[g].length) : "…"}</span>}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[10.5px] text-prism-muted2">{en ? "Click a satellite: its whole family lights up and its orbit is drawn." : "Clique un satellite : toute sa famille s'allume et son orbite est tracée."}</p>
        </Col>
      </div>
    </section>
  );
}
