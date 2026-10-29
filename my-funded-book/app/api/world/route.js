// Données « Monde » : proxy + cache des sources publiques (pas de clé) que le
// navigateur ne peut pas appeler directement (CORS, limites de débit).
//   ?kind=flights            avions en vol (OpenSky), échantillonnés
//   ?kind=news&q=France      actus récentes d'un pays (GDELT)
//   ?kind=sats               satellites visibles + stations (CelesTrak, TLE)
//   ?kind=calendar           calendrier économique de la semaine (ForexFactory)
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
async function getJson(url, revalidate = 60) {
  const res = await fetch(url, { headers: { "User-Agent": "MyTradeBook/1.0" }, next: { revalidate }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function flights() {
  const json = await getJson("https://opensky-network.org/api/states/all", 60);
  const rows = (json.states || []).filter((s) => s[5] != null && s[6] != null && !s[8]);
  const step = Math.max(1, Math.floor(rows.length / 2500));
  return rows.filter((_, i) => i % step === 0).map((s) => ({
    id: s[0], call: String(s[1] || "").trim(), from: s[2], lng: s[5], lat: s[6],
    alt: Math.round(s[13] ?? s[7] ?? 0), speed: Math.round((s[9] || 0) * 3.6), heading: Math.round(s[10] || 0),
  }));
}

async function news(q) {
  const query = encodeURIComponent(`"${q}" (economy OR market OR government OR central bank OR war OR election)`);
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=25&format=json&sort=datedesc&timespan=2d`;
  // GDELT limite à une requête toutes les 5 s : on réessaie une fois après la pause.
  const json = await getJson(url, 1200).catch(async (error) => {
    if (error.message !== "429") throw error;
    await new Promise((r) => setTimeout(r, 5500));
    return getJson(url, 1200);
  });
  return (json.articles || []).map((a) => ({ title: a.title, url: a.url, domain: a.domain, date: a.seendate, lang: a.language, image: a.socialimage || null }));
}

async function sats() {
  const out = [];
  for (const group of ["stations", "visual"]) {
    const res = await fetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`, { next: { revalidate: 21600 }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) continue;
    const lines = (await res.text()).split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean);
    for (let i = 0; i + 2 < lines.length; i += 3) out.push({ name: lines[i].trim(), l1: lines[i + 1], l2: lines[i + 2], station: group === "stations" });
  }
  const seen = new Set();
  return out.filter((s) => (seen.has(s.l1.slice(2, 7)) ? false : seen.add(s.l1.slice(2, 7))));
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
    if (kind === "sats") return NextResponse.json(await cached("sats", 6 * 3600_000, sats));
    if (kind === "calendar") return NextResponse.json(await cached("calendar", 30 * 60_000, calendar));
    if (kind === "news") {
      const q = String(searchParams.get("q") || "").slice(0, 60).replace(/["]/g, "");
      if (!q) return NextResponse.json([]);
      return NextResponse.json(await cached(`news:${q}`, 20 * 60_000, () => news(q)));
    }
    return NextResponse.json({ error: "unknown kind" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error.message || error) }, { status: 502 });
  }
}
