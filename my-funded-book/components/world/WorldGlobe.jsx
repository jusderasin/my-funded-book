"use client";

// Globe 3D en direct (globe.gl) : pays cliquables, avions et bateaux dessinés et
// orientés selon leur cap, satellites par constellation propagés en temps réel
// depuis leurs TLE (CelesTrak), séismes (USGS).

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

function satPositions(recs, now) {
  const gmst = satellite.gstime(now);
  const out = [];
  for (const s of recs) {
    const pv = satellite.propagate(s.rec, now);
    if (!pv || !pv.position || typeof pv.position === "boolean") continue;
    const geo = satellite.eciToGeodetic(pv.position, gmst);
    out.push({ kind: "sat", name: s.name, group: s.group, station: s.station, lat: satellite.degreesLat(geo.latitude), lng: satellite.degreesLong(geo.longitude), alt: geo.height });
  }
  return out;
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

export default function WorldGlobe({ countries, flights, ships, sats, quakes, layers, accent, selected, onSelect }) {
  const ref = useRef(null);
  const globe = useRef(null);
  const fleets = useRef(null);
  const satRecs = useRef([]);
  const state = useRef({});
  state.current = { countries, flights, ships, quakes, layers, accent, selected, onSelect };

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
        .onPolygonClick((d) => state.current.onSelect?.(d.properties))
        .particleLat("lat")
        .particleLng("lng")
        .particleAltitude((d) => Math.min(0.6, d.alt / EARTH_KM))
        .particlesSize((list) => SAT_GROUPS[list[0]?.group]?.size || 1.4)
        .particlesSizeAttenuation(false)
        .particlesColor((list) => SAT_GROUPS[list[0]?.group]?.color || "#7dd3fc")
        .ringColor(() => (t) => `rgba(239,68,68,${1 - t})`)
        .ringMaxRadius((d) => 1.5 + d.mag * 0.9)
        .ringPropagationSpeed(2)
        .ringRepeatPeriod(1400)
        .htmlElementsData([])
        .htmlElement((d) => {
          const el = document.createElement("div");
          el.innerHTML = `<div style="transform:translate(-50%,-140%);font:700 10px ui-monospace,monospace;color:#fff;background:rgba(0,0,0,.65);border:1px solid rgba(255,255,255,.35);padding:2px 6px;border-radius:6px;white-space:nowrap">🛰 ${d.name}</div>`;
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

  // Satellites : TLE → orbites, repositionnées toutes les 2 s.
  useEffect(() => {
    satRecs.current = (sats || []).map((s) => {
      try { return { name: s.name, group: s.group, station: s.group === "stations", rec: satellite.twoline2satrec(s.l1, s.l2) }; } catch { return null; }
    }).filter(Boolean);
    draw();
    const id = setInterval(draw, satRecs.current.length > 4000 ? 3000 : 2000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sats]);

  function draw() {
    const g = globe.current;
    if (!g) return;
    const { flights: fl, ships: sh, quakes: qk, layers: ly, accent: ac, selected: sel } = state.current;
    const satPts = ly.sats ? satPositions(satRecs.current, new Date()) : [];
    const byGroup = {};
    for (const s of satPts) (byGroup[s.group] ||= []).push(s);
    g.particlesData(Object.values(byGroup));
    g.htmlElementsData(satPts.filter((s) => s.name.startsWith("ISS")).slice(0, 1).map((s) => ({ ...s, altitude: Math.min(0.6, s.alt / EARTH_KM) })));
    g.htmlAltitude((d) => d.altitude);
    g.ringsData(ly.quakes ? qk || [] : []);
    g.polygonCapColor((p) => (sel && p.properties.ADMIN === sel.ADMIN ? `${ac}aa` : "rgba(255,255,255,0.03)"));
  }

  useEffect(() => {
    if (countries && globe.current) globe.current.polygonsData(countries);
  }, [countries]);
  useEffect(draw, [quakes, layers, accent, selected]);
  // Avions et bateaux : repositionnés seulement quand leurs données changent.
  function placeAll() {
    const g = globe.current;
    const f = fleets.current;
    if (!g || !f) return;
    const { flights: fl, ships: sh, layers: ly } = state.current;
    placeFleet(g, f.planes, ly.flights ? fl || [] : [], 0.012);
    placeFleet(g, f.ships, ly.ships ? sh || [] : [], 0.004);
  }
  useEffect(placeAll, [flights, ships, layers]);
  useEffect(() => {
    if (!globe.current) return;
    globe.current.controls().autoRotate = !selected;
    if (selected?.LABEL_Y != null) globe.current.pointOfView({ lat: selected.LABEL_Y, lng: selected.LABEL_X, altitude: 1.6 }, 1200);
  }, [selected]);

  return <div ref={ref} className="h-full w-full cursor-grab" />;
}
