"use client";

// Fiche de l'avion, du bateau ou du satellite cliqué sur le globe.

import { Plane, Satellite, Ship, X } from "lucide-react";
import { SAT_GROUPS, SHIP_TYPES, airlineName } from "@/lib/worldCatalog";

const km = (a, b) => {
  const R = 6371;
  const toR = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toR;
  const dLng = (b.lng - a.lng) * toR;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const fmt = (n, d = 0) => (n == null || Number.isNaN(n) ? "—" : Number(n).toLocaleString("fr-FR", { maximumFractionDigits: d }));
const dur = (h) => (h == null || !Number.isFinite(h) ? "—" : `${Math.floor(h)} h ${String(Math.round((h % 1) * 60)).padStart(2, "0")}`);

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-[3px]">
      <span className="text-[10.5px] text-white/50">{label}</span>
      <span className="text-right font-mono text-[11.5px] text-white">{value}</span>
    </div>
  );
}

function Airport({ a, tag }) {
  if (!a) return null;
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[9.5px] font-bold tracking-wider text-white/40">{tag}</p>
      <p className="flex items-center gap-1.5 font-mono text-lg font-bold leading-tight">
        {a.iso && <img src={`https://flagcdn.com/w20/${a.iso.toLowerCase()}.png`} alt="" className="h-2.5 w-3.5 rounded-[2px]" />}{a.iata || a.icao}
      </p>
      <p className="truncate text-[10.5px] text-white/60" title={a.name}>{a.city || a.name}</p>
    </div>
  );
}

function Flight({ f, route, en }) {
  const o = route?.origin;
  const d = route?.destination;
  const speed = f.speed || 0;
  const total = o && d ? km(o, d) : null;
  const done = o ? km(o, f) : null;
  const left = d ? km(f, d) : null;
  const progress = total ? Math.min(100, Math.max(0, (done / (done + left)) * 100)) : null;
  const eta = left != null && speed > 150 ? left / speed : null;
  // Décollage estimé : distance parcourue à la vitesse de croisière + ~20 min de montée.
  const since = done != null && speed > 150 ? done / speed + 0.33 : null;
  const hhmm = (h) => new Date(Date.now() + h * 3600_000).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return (
    <>
      <p className="text-[11px] text-white/60">{route?.airline || airlineName(f.call) || (route ? (en ? "Unknown airline" : "Compagnie inconnue") : en ? "Looking up route…" : "Recherche de la route…")}</p>
      {o && d ? (
        <>
          <div className="mt-2 flex items-center gap-2">
            <Airport a={o} tag={en ? "FROM" : "DÉPART"} />
            <Plane className="h-4 w-4 shrink-0 rotate-45 text-amber-400" />
            <div className="text-right"><Airport a={d} tag={en ? "TO" : "ARRIVÉE"} /></div>
          </div>
          <div className="relative mt-2 h-1.5 rounded-full bg-white/10">
            <i className="absolute left-0 top-0 h-full rounded-full bg-amber-400" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 flex justify-between font-mono text-[10px] text-white/50"><span>{fmt(done)} km</span><span>{fmt(progress)} %</span><span>{fmt(left)} km</span></p>
        </>
      ) : route?.unknown ? (
        <p className="mt-2 text-[10.5px] text-white/50">{en ? "Route not published for this flight (private, cargo or military)." : "Route non publiée pour ce vol (privé, cargo ou militaire)."}</p>
      ) : null}
      <div className="mt-2 border-t border-white/10 pt-1.5">
        {since != null && <Row label={en ? "Took off (approx.)" : "Décollage (env.)"} value={`${hhmm(-since)} · ${en ? "" : "il y a "}${dur(since)}`} />}
        {eta != null && <Row label={en ? "Landing (approx.)" : "Atterrissage (env.)"} value={`${hhmm(eta)} · ${en ? "in " : "dans "}${dur(eta)}`} />}
        {total != null && <Row label={en ? "Total distance" : "Distance totale"} value={`${fmt(total)} km`} />}
        {total != null && speed > 150 && <Row label={en ? "Flight time (approx.)" : "Durée du vol (env.)"} value={dur(total / speed + 0.5)} />}
        <Row label={en ? "Speed" : "Vitesse"} value={`${fmt(speed)} km/h`} />
        <Row label="Altitude" value={`${fmt(f.alt)} m`} />
        <Row label={en ? "Heading" : "Cap"} value={`${fmt(f.heading)}°`} />
        {f.type && <Row label={en ? "Aircraft" : "Appareil"} value={f.type} />}
        {f.reg && <Row label={en ? "Registration" : "Immatriculation"} value={f.reg} />}
      </div>
    </>
  );
}

function Vessel({ s, en }) {
  const knots = s.speed;
  return (
    <>
      <p className="text-[11px] text-white/60">{SHIP_TYPES[s.cat]?.label.replace(/s( |$)/, "$1") || (en ? "Vessel" : "Navire")}{s.length ? ` · ${s.length} m` : ""}</p>
      <div className="mt-2 border-t border-white/10 pt-1.5">
        <Row label={en ? "Destination" : "Destination"} value={s.dest || "—"} />
        {s.eta && <Row label={en ? "Announced ETA (UTC)" : "Arrivée prévue (UTC)"} value={`${String(s.eta.day).padStart(2, "0")}/${String(s.eta.month).padStart(2, "0")} ${String(s.eta.hour).padStart(2, "0")}:${String(s.eta.minute).padStart(2, "0")}`} />}
        <Row label={en ? "Speed" : "Vitesse"} value={knots != null ? `${fmt(knots, 1)} nœuds · ${fmt(knots * 1.852, 1)} km/h` : "—"} />
        <Row label={en ? "Heading" : "Cap"} value={s.heading != null && s.heading < 360 ? `${s.heading}°` : "—"} />
        <Row label="MMSI" value={s.id} />
      </div>
    </>
  );
}

function Sat({ s, en }) {
  const g = SAT_GROUPS[s.group];
  return (
    <>
      <p className="flex items-center gap-1.5 text-[11px] text-white/60"><i className="h-2 w-2 rounded-full" style={{ background: g?.color }} />{s.family || g?.label || s.group}{s.family && g ? ` · ${g.label}` : ""}</p>
      <div className="mt-2 border-t border-white/10 pt-1.5">
        <Row label="Altitude" value={`${fmt(s.altKm)} km`} />
        <Row label={en ? "Speed" : "Vitesse"} value={s.speedKms ? `${fmt(s.speedKms, 2)} km/s · ${fmt(s.speedKms * 3600)} km/h` : "—"} />
        <Row label={en ? "One orbit in" : "Un tour de Terre en"} value={`${fmt(s.periodMin)} min`} />
        <Row label={en ? "Orbits per day" : "Tours par jour"} value={fmt(1440 / s.periodMin, 1)} />
        <Row label="Inclinaison" value={`${fmt(s.inclination, 1)}°`} />
        <Row label={en ? "Position" : "Au-dessus de"} value={`${fmt(s.lat, 1)}°, ${fmt(s.lng, 1)}°`} />
        <Row label="NORAD" value={s.norad} />
      </div>
      <p className="mt-1.5 text-[10px] text-white/45">{en ? "Its full orbit is drawn in white." : "Son orbite est tracée en blanc, sa famille ressort en blanc et les autres satellites s'effacent."}</p>
    </>
  );
}

export default function PickedCard({ item, route, en, onClose }) {
  const Icon = item.kind === "flight" ? Plane : item.kind === "ship" ? Ship : Satellite;
  const title = item.kind === "flight" ? route?.flight || item.call || item.id : item.name || item.id;
  return (
    <div className="absolute right-3 top-14 z-10 w-[290px] max-w-[calc(100%-1.5rem)] rounded-xl border border-white/15 bg-black/75 p-3 text-white shadow-2xl backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 text-base font-bold">
          <Icon className={`h-4 w-4 shrink-0 ${item.kind === "flight" ? "text-amber-400" : item.kind === "ship" ? "text-emerald-400" : "text-sky-300"}`} />
          <span className="truncate">{title || "—"}</span>
        </h3>
        <button type="button" onClick={onClose} className="rounded p-0.5 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Fermer"><X className="h-4 w-4" /></button>
      </div>
      {item.kind === "flight" && <Flight f={item} route={route} en={en} />}
      {item.kind === "ship" && <Vessel s={item} en={en} />}
      {item.kind === "sat" && <Sat s={item} en={en} />}
    </div>
  );
}
