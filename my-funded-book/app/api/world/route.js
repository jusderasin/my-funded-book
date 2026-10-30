// Données « Monde » : proxy + cache des sources publiques que le navigateur ne peut
// pas appeler directement (CORS, limites de débit, IP cloud bloquées).
//   ?kind=flights            avions en vol (adsb.lol par zones)
//   ?kind=route&call=AFR006  départ / arrivée d'un vol (adsbdb)
//   ?kind=ships              navires (AIS, aisstream.io : clé AISSTREAM_API_KEY)
//   ?kind=news&q=France      actus de sources fiables, filtrées par pays et recoupées
//   ?kind=sats&group=starlink  une constellation de satellites (CelesTrak, TLE)
//   ?kind=calendar           calendrier économique de la semaine (ForexFactory)
import { NextResponse } from "next/server";
import WebSocket from "ws";
import { countryKeywords, crossCheck, NEWS_SOURCES, parseRss } from "@/lib/worldNews";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const cache = new Map();
async function cached(key, ttlMs, load) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.data;
  try {
    const data = await load();
    cache.set(key, { at: Date.now(), data });
    return data;
  } catch (error) {
    if (hit) return hit.data;
    throw error;
  }
}

// revalidate : cache de données Next partagé entre instances (en plus du cache mémoire).
async function getJson(url, revalidate = 60, timeout = 15000) {
  const res = await fetch(url, { headers: { "User-Agent": "MyTradeBook/1.0" }, next: { revalidate }, signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

// adsb.lol n'a pas d'endpoint mondial : on interroge des cercles de 250 NM sur les
// grandes zones de trafic, puis on dédoublonne par identifiant (hex).
const HUBS = [
  [40.7, -74], [33.9, -118.4], [41.9, -87.9], [32.9, -97], [33.6, -84.4], [47.4, -122.3], [39.8, -104.7], [25.8, -80.3], [29.9, -95.3], [45.5, -73.6], [43.7, -79.6], [19.4, -99.1],
  [51.5, -0.5], [49, 2.5], [50, 8.6], [52.3, 4.8], [40.5, -3.6], [41.8, 12.3], [48.4, 11.8], [47.5, 8.5], [55.6, 12.6], [59.6, 17.9], [52.2, 21], [41.3, 28.8], [38, 23.9], [55.4, 37.9],
  [25.3, 55.4], [25.3, 51.6], [24.9, 46.7], [32, 34.9], [30.1, 31.4],
  [35.6, 139.8], [37.5, 126.4], [31.1, 121.8], [40.1, 116.6], [22.3, 113.9], [1.4, 104], [13.7, 100.7], [28.6, 77.1], [19.1, 72.9], [-6.1, 106.7], [14.5, 121],
  [-33.9, 151.2], [-37.7, 144.8], [-23.4, -46.5], [-34.8, -58.5], [4.7, -74.1], [-33.9, 18.6], [-26.1, 28.2], [6.6, 3.3], [33.4, -7.6],
];

async function flights() {
  const seen = new Map();
  const results = await Promise.allSettled(HUBS.map(([lat, lng]) => getJson(`https://api.adsb.lol/v2/point/${lat}/${lng}/250`, 60, 12000)));
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const a of r.value.ac || []) {
      if (a.lat == null || a.lon == null || a.alt_baro === "ground") continue;
      seen.set(a.hex, { id: a.hex, call: String(a.flight || "").trim(), type: a.t || "", reg: a.r || "", lat: a.lat, lng: a.lon, alt: Math.round((Number(a.alt_geom ?? a.alt_baro) || 0) * 0.3048), speed: Math.round((a.gs || 0) * 1.852), heading: Math.round(a.track || 0) });
    }
  }
  const all = [...seen.values()];
  const step = Math.max(1, Math.ceil(all.length / 6000));
  return all.filter((_, i) => i % step === 0);
}

// Instantané AIS : on écoute le flux mondial quelques secondes et on garde la
// dernière position de chaque navire.
function ships() {
  const key = process.env.AISSTREAM_API_KEY;
  if (!key) return Promise.resolve({ needsKey: true, ships: [] });
  return new Promise((resolve) => {
    const found = new Map();
    const info = new Map();
    const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
    const done = () => { try { ws.close(); } catch {} resolve({ ships: [...found.values()].map((x) => ({ ...x, ...info.get(x.id) })) }); };
    const timer = setTimeout(done, 9000);
    ws.on("open", () => ws.send(JSON.stringify({ APIKey: key, BoundingBoxes: [[[-90, -180], [90, 180]]], FilterMessageTypes: ["PositionReport", "ShipStaticData"] })));
    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const m = msg.MetaData || {};
        const st = msg.Message?.ShipStaticData;
        if (st) {
          const eta = st.Eta?.Month ? { month: st.Eta.Month, day: st.Eta.Day, hour: st.Eta.Hour, minute: st.Eta.Minute } : null;
          info.set(m.MMSI, { dest: String(st.Destination || "").replace(/@+/g, "").trim(), eta, type: st.Type || null, length: (st.Dimension?.A || 0) + (st.Dimension?.B || 0) || null });
          return;
        }
        const p = msg.Message?.PositionReport || {};
        if (m.latitude == null || m.longitude == null) return;
        found.set(m.MMSI, { id: m.MMSI, name: String(m.ShipName || "").trim(), lat: m.latitude, lng: m.longitude, speed: p.Sog ?? null, heading: p.TrueHeading ?? null });
        if (found.size >= 4000) { clearTimeout(timer); done(); }
      } catch { /* message ignoré */ }
    });
    ws.on("error", () => { clearTimeout(timer); done(); });
  });
}

async function route(call) {
  const json = await getJson(`https://api.adsbdb.com/v0/callsign/${encodeURIComponent(call)}`, 21600, 8000);
  const r = json.response?.flightroute;
  if (!r) return { unknown: true };
  const ap = (a) => a && { iata: a.iata_code, icao: a.icao_code, name: a.name, city: a.municipality, country: a.country_name, iso: a.country_iso_name, lat: a.latitude, lng: a.longitude };
  return { airline: r.airline?.name || null, flight: r.callsign_iata || r.callsign, origin: ap(r.origin), destination: ap(r.destination) };
}

async function fetchFeed(source) {
  const res = await fetch(source.url, { headers: { "User-Agent": "Mozilla/5.0 (MyTradeBook news reader)" }, next: { revalidate: 600 }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`${res.status}`);
  return parseRss(await res.text()).map((item) => ({ ...item, source: source.name, tier: source.tier }));
}

async function allNews() {
  const results = await Promise.allSettled(NEWS_SOURCES.map(fetchFeed));
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

async function news(q, iso) {
  const items = await cached("news:all", 10 * 60_000, allNews);
  const keys = countryKeywords(q, iso);
  const match = keys ? items.filter((a) => keys.some((k) => k.test(a.title) || k.test(a.summary || ""))) : items;
  return crossCheck(match).slice(0, 40);
}

// Nom de groupe CelesTrak pour chaque constellation proposée.
const SAT_SOURCES = { stations: "stations", starlink: "starlink", oneweb: "oneweb", kuiper: "kuiper", gps: "gps-ops", galileo: "galileo", glonass: "glo-ops", beidou: "beidou", iridium: "iridium-NEXT", visual: "visual" };

async function sats(group) {
  // Starlink dépasse 2 Mo : trop gros pour le cache Next, le cache mémoire suffit.
  const res = await fetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${SAT_SOURCES[group]}&FORMAT=tle`, { cache: "no-store", signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${res.status}`);
  const lines = (await res.text()).split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean);
  const out = [];
  for (let i = 0; i + 2 < lines.length; i += 3) out.push({ name: lines[i].trim(), l1: lines[i + 1], l2: lines[i + 2], group });
  return out;
}

async function calendar() {
  const json = await getJson("https://nfs.faireconomy.media/ff_calendar_thisweek.json", 1800);
  return json.map((e) => ({ title: e.title, currency: e.country, date: e.date, impact: e.impact, forecast: e.forecast, previous: e.previous }));
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");
  try {
    if (kind === "flights") return NextResponse.json(await cached("flights", 60_000, flights));
    if (kind === "ships") return NextResponse.json(await cached("ships", 3 * 60_000, ships));
    if (kind === "route") {
      const call = String(searchParams.get("call") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
      if (!call) return NextResponse.json({ unknown: true });
      return NextResponse.json(await cached(`route:${call}`, 6 * 3600_000, () => route(call)).catch(() => ({ unknown: true })));
    }
    if (kind === "sats") {
      const group = searchParams.get("group") || "stations";
      if (!SAT_SOURCES[group]) return NextResponse.json({ error: "unknown group" }, { status: 400 });
      return NextResponse.json(await cached(`sats:${group}`, 6 * 3600_000, () => sats(group)), { headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" } });
    }
    if (kind === "calendar") return NextResponse.json(await cached("calendar", 30 * 60_000, calendar));
    if (kind === "news") {
      const q = String(searchParams.get("q") || "").slice(0, 60);
      const iso = String(searchParams.get("iso") || "").slice(0, 2).toUpperCase();
      return NextResponse.json(await news(q, iso));
    }
    return NextResponse.json({ error: "unknown kind" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error.message || error) }, { status: 502 });
  }
}
