"use client";

// Globe 3D en direct (globe.gl) : pays cliquables, avions et bateaux dessinés et
// orientés selon leur cap (cliquables), satellites par constellation propagés en
// temps réel depuis leurs TLE (CelesTrak) avec leurs orbites, séismes (USGS).

import { useEffect, useRef } from "react";
import * as THREE from "three";
import * as satellite from "satellite.js";

const EARTH_KM = 6371;

// Silhouettes vues du dessus, nez vers +Y (unités du globe : rayon 100).
const mirror = (half) => [...half, ...half.slice(1, -1).reverse().map(([x, y]) => [-x, y])];
const PLANE = mirror([[0, 0.5], [0.06, 0.4], [0.06, 0.12], [0.5, -0.06], [0.5, -0.14], [0.06, -0.06], [0.05, -0.3], [0.2, -0.42], [0.2, -0.48], [0, -0.44]]);
const SHIP = mirror([[0, 0.5], [0.15, 0.22], [0.15, -0.45], [0, -0.45]]);
function shapeGeometry(points, size) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x * size, y * size)));
  return new THREE.ShapeGeometry(shape);
}

// Un seul InstancedMesh par type : des milliers d'avions restent fluides.
function makeFleet(points, size, color) {
  const mesh = new THREE.InstancedMesh(shapeGeometry(points, size), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.95 }), 8000);
  mesh.count = 0;
  mesh.frustumCulled = false;
  return mesh;
}

const Y = new THREE.Vector3(0, 1, 0);
const tmp = { up: new THREE.Vector3(), east: new THREE.Vector3(), north: new THREE.Vector3(), fwd: new THREE.Vector3(), right: new THREE.Vector3(), m: new THREE.Matrix4() };
function placeFleet(g, mesh, list, alt) {
  let n = 0;
  for (const d of list) {
    if (n >= 8000) break;
    const { x, y, z } = g.getCoords(d.lat, d.lng, alt);
    const { up, east, north, fwd, right, m } = tmp;
    up.set(x, y, z).normalize();
    east.crossVectors(Y, up).normalize();
    north.crossVectors(up, east);
    const h = ((Number(d.heading) || 0) * Math.PI) / 180;
    fwd.copy(north).multiplyScalar(Math.cos(h)).addScaledVector(east, Math.sin(h));
    right.crossVectors(fwd, up);
    m.makeBasis(right, fwd, up).setPosition(x, y, z);
    mesh.setMatrixAt(n++, m);
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
}

export const SAT_GROUPS = {
  stations: { label: "Stations (ISS…)", color: "#ffffff", size: 3 },
  starlink: { label: "Starlink (SpaceX)", color: "#a5b4fc", size: 1 },
  oneweb: { label: "OneWeb", color: "#f472b6", size: 1.3 },
  kuiper: { label: "Kuiper (Amazon)", color: "#fb923c", size: 1.6 },
  gps: { label: "GPS (USA)", color: "#4ade80", size: 2.2 },
  galileo: { label: "Galileo (UE)", color: "#60a5fa", size: 2.2 },
  glonass: { label: "GLONASS (Russie)", color: "#f87171", size: 2.2 },
  beidou: { label: "BeiDou (Chine)", color: "#facc15", size: 2.2 },
  iridium: { label: "Iridium", color: "#2dd4bf", size: 1.6 },
  visual: { label: "Les plus brillants", color: "#7dd3fc", size: 1.4 },
};

function satPositions(recs, now) {
  const gmst = satellite.gstime(now);
  const out = [];
  for (const s of recs) {
    const pv = satellite.propagate(s.rec, now);
    if (!pv || !pv.position || typeof pv.position === "boolean") continue;
    const geo = satellite.eciToGeodetic(pv.position, gmst);
    out.push({ kind: "sat", name: s.name, group: s.group, station: s.station, rec: s.rec, lat: satellite.degreesLat(geo.latitude), lng: satellite.degreesLong(geo.longitude), alt: geo.height });
  }
  return out;
}

// Une orbite complète « figée » dans le repère terrestre actuel : un anneau fermé.
function orbitPath(rec, now, steps = 120) {
  const period = (2 * Math.PI) / rec.no; // minutes
  const gmst = satellite.gstime(now);
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const pv = satellite.propagate(rec, new Date(now.getTime() + (i / steps) * period * 60_000));
    if (!pv || !pv.position || typeof pv.position === "boolean") continue;
    const geo = satellite.eciToGeodetic(pv.position, gmst);
    pts.push([satellite.degreesLat(geo.latitude), satellite.degreesLong(geo.longitude), Math.min(5, geo.height / EARTH_KM)]);
  }
  return pts;
}

// Coupe le tracé au passage de l'antiméridien (sinon une corde traverse le globe).
function splitPath(pts) {
  const parts = [[]];
  for (let i = 0; i < pts.length; i++) {
    if (i && Math.abs(pts[i][1] - pts[i - 1][1]) > 180) parts.push([]);
    parts[parts.length - 1].push(pts[i]);
  }
  return parts.filter((p) => p.length > 1);
}
const rgba = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;

// Quelques orbites par constellation, réparties sur les plans orbitaux, pour voir sa forme.
function constellationOrbits(recs, now) {
  const byGroup = {};
  for (const s of recs) (byGroup[s.group] ||= []).push(s);
  const out = [];
  for (const [group, list] of Object.entries(byGroup)) {
    const max = group === "starlink" ? 48 : list[0]?.rec.no < 0.01 ? 12 : 24; // orbites hautes (GPS…) : moins de traits
    const sorted = [...list].sort((a, b) => a.rec.inclo - b.rec.inclo || a.rec.nodeo - b.rec.nodeo);
    const step = Math.max(1, sorted.length / max);
    for (let i = 0; i < sorted.length && out.length < 400; i += step) {
      const color = rgba(SAT_GROUPS[group]?.color || "#7dd3fc", 0.35);
      for (const pts of splitPath(orbitPath(sorted[Math.floor(i)].rec, now, 90))) out.push({ group, color, pts });
    }
  }
  return out;
}

export function satDetails(s) {
  const now = new Date();
  const pv = satellite.propagate(s.rec, now);
  const v = pv?.velocity && typeof pv.velocity !== "boolean" ? Math.hypot(pv.velocity.x, pv.velocity.y, pv.velocity.z) : null;
  return { kind: "sat", name: s.name, group: s.group, lat: s.lat, lng: s.lng, altKm: Math.round(s.alt), speedKms: v, periodMin: (2 * Math.PI) / s.rec.no, inclination: (s.rec.inclo * 180) / Math.PI, norad: s.rec.satnum };
}

export default function WorldGlobe({ countries, flights, ships, sats, quakes, layers, accent, selected, onSelect, picked, onPick, route }) {
  const ref = useRef(null);
  const globe = useRef(null);
  const fleets = useRef(null);
  const satRecs = useRef([]);
  const satNow = useRef([]);
  const orbits = useRef([]);
  const state = useRef({});
  state.current = { countries, flights, ships, quakes, layers, accent, selected, onSelect, picked, onPick, route };

  // Clic : on cherche d'abord l'avion / bateau / satellite le plus proche à l'écran,
  // sinon c'est un clic sur le pays.
  function handleClick(ev, poly) {
    const g = globe.current;
    const st = state.current;
    if (!g || !ref.current) return;
    const box = ref.current.getBoundingClientRect();
    const mx = ev.clientX - box.left;
    const my = ev.clientY - box.top;
    const cam = g.camera().position;
    const r2 = g.getGlobeRadius() ** 2;
    let best = null;
    let bestD = 14;
    const test = (d, alt, kind) => {
      const p = g.getCoords(d.lat, d.lng, alt);
      if (p.x * cam.x + p.y * cam.y + p.z * cam.z < r2) return; // derrière la Terre
      const s = g.getScreenCoords(d.lat, d.lng, alt);
      const dist = Math.hypot(s.x - mx, s.y - my);
      if (dist < bestD) { bestD = dist; best = { kind, d }; }
    };
    if (st.layers.flights) for (const d of st.flights || []) test(d, 0.012, "flight");
    if (st.layers.ships) for (const d of st.ships || []) test(d, 0.004, "ship");
    if (st.layers.sats) for (const d of satNow.current) test(d, Math.min(5, d.alt / EARTH_KM), "sat");
    if (best) {
      st.onPick?.(best.kind === "sat" ? satDetails(best.d) : { ...best.d, kind: best.kind });
      return;
    }
    st.onPick?.(null);
    if (poly) st.onSelect?.(poly);
  }

  // Création du globe (une seule fois).
  useEffect(() => {
    let disposed = false;
    let ro;
    import("globe.gl").then(({ default: Globe }) => {
      if (disposed || !ref.current) return;
      const g = Globe()(ref.current)
        .backgroundColor("rgba(0,0,0,0)")
        .globeImageUrl("https://unpkg.com/three-globe@2.41.12/example/img/earth-night.jpg")
        .bumpImageUrl("https://unpkg.com/three-globe@2.41.12/example/img/earth-topology.png")
        .showAtmosphere(true)
        .atmosphereAltitude(0.18)
        .polygonAltitude(0.006)
        .polygonSideColor(() => "rgba(0,0,0,0)")
        .polygonStrokeColor(() => "rgba(255,255,255,0.18)")
        .polygonLabel((d) => `<b>${d.properties.ADMIN}</b>`)
        .onPolygonHover((d) => {
          g.polygonAltitude((p) => (p === d ? 0.025 : 0.006));
          if (ref.current) ref.current.style.cursor = d ? "pointer" : "grab";
        })
        .onPolygonClick((d, ev) => handleClick(ev, d.properties))
        .onGlobeClick((_, ev) => handleClick(ev, null))
        .particleLat("lat")
        .particleLng("lng")
        .particleAltitude((d) => Math.min(5, d.alt / EARTH_KM))
        .particlesSize((list) => SAT_GROUPS[list[0]?.group]?.size || 1.4)
        .particlesSizeAttenuation(false)
        .particlesColor((list) => SAT_GROUPS[list[0]?.group]?.color || "#7dd3fc")
        .pathPoints("pts")
        .pathPointLat((p) => p[0])
        .pathPointLng((p) => p[1])
        .pathPointAlt((p) => p[2])
        .pathColor((d) => (d.hot ? "#ffffff" : d.color))
        .pathStroke((d) => (d.hot ? 1.2 : null))
        .pathTransitionDuration(0)
        .arcColor(() => ["#fbbf24", "#ffffff"])
        .arcStroke(0.5)
        .arcDashLength(0.4)
        .arcDashGap(0.15)
        .arcDashAnimateTime(2500)
        .arcAltitudeAutoScale(0.35)
        .ringColor((d) => (d.pick ? () => "rgba(255,255,255,0.9)" : (t) => `rgba(239,68,68,${1 - t})`))
        .ringMaxRadius((d) => (d.pick ? 1.2 : 1.5 + d.mag * 0.9))
        .ringPropagationSpeed((d) => (d.pick ? 1.5 : 2))
        .ringRepeatPeriod((d) => (d.pick ? 900 : 1400))
        .htmlElementsData([])
        .htmlElement((d) => {
          const el = document.createElement("div");
          el.innerHTML = `<div style="transform:translate(-50%,-140%);font:700 10px ui-monospace,monospace;color:#fff;background:rgba(0,0,0,.65);border:1px solid rgba(255,255,255,.35);padding:2px 6px;border-radius:6px;white-space:nowrap">${d.label}</div>`;
          return el;
        });
      g.controls().autoRotate = true;
      g.controls().autoRotateSpeed = 0.35;
      g.pointOfView({ lat: 30, lng: -40, altitude: 2.3 });
      fleets.current = { planes: makeFleet(PLANE, 1.1, "#fbbf24"), ships: makeFleet(SHIP, 0.9, "#34d399") };
      g.scene().add(fleets.current.planes, fleets.current.ships);
      globe.current = g;
      const fit = () => ref.current && g.width(ref.current.clientWidth).height(ref.current.clientHeight);
      fit();
      ro = new ResizeObserver(fit);
      ro.observe(ref.current);
      if (state.current.countries) g.polygonsData(state.current.countries);
      draw();
      placeAll();
    });
    return () => {
      disposed = true;
      ro?.disconnect();
      globe.current?._destructor?.();
      globe.current = null;
      if (ref.current) ref.current.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Satellites : TLE → orbites, repositionnés toutes les 2-3 s.
  useEffect(() => {
    satRecs.current = (sats || []).map((s) => {
      try { return { name: s.name, group: s.group, station: s.group === "stations", rec: satellite.twoline2satrec(s.l1, s.l2) }; } catch { return null; }
    }).filter(Boolean);
    orbits.current = constellationOrbits(satRecs.current, new Date());
    draw();
    const id = setInterval(draw, satRecs.current.length > 4000 ? 3000 : 2000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sats]);

  function draw() {
    const g = globe.current;
    if (!g) return;
    const { quakes: qk, layers: ly, accent: ac, selected: sel, picked: pk } = state.current;
    const satPts = ly.sats ? satPositions(satRecs.current, new Date()) : [];
    satNow.current = satPts;
    const byGroup = {};
    for (const s of satPts) (byGroup[s.group] ||= []).push(s);
    g.particlesData(Object.values(byGroup));

    // Satellite choisi : suivi en direct + orbite en surbrillance.
    const pickedSat = pk?.kind === "sat" ? satPts.find((s) => s.name === pk.name) : null;
    const labels = satPts.filter((s) => s.name.startsWith("ISS")).slice(0, 1).map((s) => ({ ...s, label: `🛰 ${s.name}` }));
    if (pickedSat && !pickedSat.name.startsWith("ISS")) labels.push({ ...pickedSat, label: `🛰 ${pickedSat.name}` });
    if (pk && pk.kind !== "sat") labels.push({ ...pk, alt: pk.kind === "flight" ? 0.03 * EARTH_KM : 0.01 * EARTH_KM, label: pk.kind === "flight" ? `✈ ${pk.call || pk.id}` : `🚢 ${pk.name || pk.id}` });
    g.htmlElementsData(labels);
    g.htmlAltitude((d) => Math.min(5, d.alt / EARTH_KM));

    const paths = ly.sats && ly.orbits ? [...orbits.current] : [];
    if (pickedSat) for (const pts of splitPath(orbitPath(pickedSat.rec, new Date()))) paths.push({ hot: true, pts });
    g.pathsData(paths);

    const rings = ly.quakes ? [...(qk || [])] : [];
    if (pk && pk.kind !== "sat") rings.push({ lat: pk.lat, lng: pk.lng, pick: true });
    g.ringsData(rings);
    g.polygonCapColor((p) => (sel && p.properties.ADMIN === sel.ADMIN ? `${ac}aa` : "rgba(255,255,255,0.03)"));
  }

  function placeAll() {
    const g = globe.current;
    const f = fleets.current;
    if (!g || !f) return;
    const { flights: fl, ships: sh, layers: ly } = state.current;
    placeFleet(g, f.planes, ly.flights ? fl || [] : [], 0.012);
    placeFleet(g, f.ships, ly.ships ? sh || [] : [], 0.004);
  }

  useEffect(() => {
    if (countries && globe.current) globe.current.polygonsData(countries);
  }, [countries]);
  useEffect(draw, [quakes, layers, accent, selected, picked]);
  // Avions et bateaux : repositionnés seulement quand leurs données changent.
  useEffect(placeAll, [flights, ships, layers]);
  useEffect(() => {
    const g = globe.current;
    if (!g) return;
    g.arcsData(route ? [route] : []);
    g.controls().autoRotate = !selected && !picked;
  }, [route, picked, selected]);
  useEffect(() => {
    if (!globe.current) return;
    globe.current.controls().autoRotate = !selected;
    if (selected?.LABEL_Y != null) globe.current.pointOfView({ lat: selected.LABEL_Y, lng: selected.LABEL_X, altitude: 1.6 }, 1200);
  }, [selected]);

  return <div ref={ref} className="h-full w-full cursor-grab" />;
}
