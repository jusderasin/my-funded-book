"use client";

// Globe 3D en direct (globe.gl) : pays cliquables, avions, bateaux et satellites
// dessinés (silhouettes) et cliquables, séismes (USGS). Le globe tourne seul
// jusqu'au premier geste de l'utilisateur, puis reste où il l'a laissé.

import { useEffect, useRef } from "react";
import * as THREE from "three";
import * as satellite from "satellite.js";
import { SAT_GROUPS, airlineName, satFamily, SHIP_TYPES } from "@/lib/worldCatalog";

export { SAT_GROUPS };

const EARTH_KM = 6371;
const PLANE_ALT = 0.012;
const SHIP_ALT = 0.004;
const HIT_PX = 16;

// Silhouettes vues de dessus, nez vers +Y (unités du globe : rayon 100).
const mirror = (half) => [...half, ...half.slice(1, -1).reverse().map(([x, y]) => [-x, y])];
const PLANE = mirror([[0, 0.5], [0.06, 0.4], [0.06, 0.12], [0.5, -0.06], [0.5, -0.14], [0.06, -0.06], [0.05, -0.3], [0.2, -0.42], [0.2, -0.48], [0, -0.44]]);
const SHIP = mirror([[0, 0.5], [0.15, 0.22], [0.15, -0.45], [0, -0.45]]);
// Satellite : corps carré + deux panneaux solaires.
const SAT = mirror([[0, 0.12], [0.1, 0.12], [0.1, 0.03], [0.18, 0.03], [0.18, 0.09], [0.5, 0.09], [0.5, -0.09], [0.18, -0.09], [0.18, -0.03], [0.1, -0.03], [0.1, -0.12], [0, -0.12]]);

function makeMesh(points, size, color, max) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x * size, y * size)));
  const mesh = new THREE.InstancedMesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.95, depthWrite: false }), max);
  mesh.count = 0;
  mesh.frustumCulled = false;
  return mesh;
}

const Y = new THREE.Vector3(0, 1, 0);
const V = { up: new THREE.Vector3(), east: new THREE.Vector3(), north: new THREE.Vector3(), fwd: new THREE.Vector3(), right: new THREE.Vector3(), m: new THREE.Matrix4(), c: new THREE.Color(), p: new THREE.Vector3(), s: new THREE.Vector3(1, 1, 1) };

// Avions / bateaux : posés à plat, orientés selon leur cap. Garde la position 3D
// de chacun pour le clic.
function placeFleet(g, mesh, list, alt, colorOf) {
  const pos = [];
  let n = 0;
  for (const d of list) {
    if (n >= mesh.instanceMatrix.count) break;
    const { x, y, z } = g.getCoords(d.lat, d.lng, alt);
    const { up, east, north, fwd, right, m } = V;
    up.set(x, y, z).normalize();
    east.crossVectors(Y, up).normalize();
    north.crossVectors(up, east);
    const h = ((Number(d.heading) || 0) * Math.PI) / 180;
    fwd.copy(north).multiplyScalar(Math.cos(h)).addScaledVector(east, Math.sin(h));
    right.crossVectors(fwd, up);
    m.makeBasis(right, fwd, up).setPosition(x, y, z);
    mesh.setMatrixAt(n, m);
    if (colorOf) mesh.setColorAt(n, V.c.set(colorOf(d)));
    pos.push([x, y, z, d]);
    n++;
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return pos;
}

// Satellites : toujours face à la caméra pour rester lisibles.
function orientSats(mesh, pos, camera, scale = 1) {
  V.s.setScalar(scale);
  pos.forEach(([x, y, z], i) => mesh.setMatrixAt(i, V.m.compose(V.p.set(x, y, z), camera.quaternion, V.s)));
  mesh.count = pos.length;
  mesh.instanceMatrix.needsUpdate = true;
}

function propagate(rec, when, gmst) {
  const pv = satellite.propagate(rec, when);
  if (!pv || !pv.position || typeof pv.position === "boolean") return null;
  const geo = satellite.eciToGeodetic(pv.position, gmst);
  return { lat: satellite.degreesLat(geo.latitude), lng: satellite.degreesLong(geo.longitude), alt: geo.height, v: pv.velocity };
}

// Orbite complète « figée » dans le repère terrestre actuel, coupée à l'antiméridien.
function orbitPaths(rec, now, steps = 160) {
  const period = (2 * Math.PI) / rec.no;
  const gmst = satellite.gstime(now);
  const parts = [[]];
  let prev = null;
  for (let i = 0; i <= steps; i++) {
    const p = propagate(rec, new Date(now.getTime() + (i / steps) * period * 60_000), gmst);
    if (!p) continue;
    if (prev && Math.abs(p.lng - prev.lng) > 180) parts.push([]);
    parts[parts.length - 1].push([p.lat, p.lng, Math.min(6, p.alt / EARTH_KM)]);
    prev = p;
  }
  return parts.filter((x) => x.length > 1).map((pts) => ({ pts }));
}

export function satDetails(s) {
  const p = propagate(s.rec, new Date(), satellite.gstime(new Date()));
  const v = p?.v && typeof p.v !== "boolean" ? Math.hypot(p.v.x, p.v.y, p.v.z) : null;
  return { kind: "sat", name: s.name, group: s.group, family: satFamily(s.name), lat: s.lat, lng: s.lng, altKm: Math.round(s.alt), speedKms: v, periodMin: (2 * Math.PI) / s.rec.no, inclination: (s.rec.inclo * 180) / Math.PI, norad: s.rec.satnum };
}

const describe = (k, d) => (k === "flight" ? `✈ ${d.call || d.id}${airlineName(d.call) ? ` · ${airlineName(d.call)}` : ""}` : k === "ship" ? `🚢 ${d.name || d.id}` : `🛰 ${d.name}`);

export default function WorldGlobe({ countries, flights, ships, sats, quakes, layers, accent, selected, onSelect, picked, onPick, route }) {
  const ref = useRef(null);
  const tip = useRef(null);
  const globe = useRef(null);
  const meshes = useRef(null);
  const hits = useRef({ flight: [], ship: [], sat: [] });
  const satRecs = useRef([]);
  const satPos = useRef({});
  const hoverPoly = useRef(null);
  const state = useRef({});
  state.current = { countries, flights, ships, quakes, layers, accent, selected, onSelect, picked, onPick, route };

  // Objet le plus proche du pointeur (à l'écran), en ignorant ce qui est derrière la Terre.
  function pickAt(mx, my) {
    const g = globe.current;
    if (!g) return null;
    const cam = g.camera();
    const r2 = g.getGlobeRadius() ** 2;
    const w = ref.current.clientWidth;
    const h = ref.current.clientHeight;
    const { layers: ly } = state.current;
    let best = null;
    let bestD = HIT_PX;
    const p = new THREE.Vector3();
    const scan = (list, kind) => {
      for (const [x, y, z, d] of list) {
        if (x * cam.position.x + y * cam.position.y + z * cam.position.z < r2) continue;
        p.set(x, y, z).project(cam);
        const dist = Math.hypot(((p.x + 1) / 2) * w - mx, ((1 - p.y) / 2) * h - my);
        if (dist < bestD) { bestD = dist; best = { kind, d }; }
      }
    };
    if (ly.flights) scan(hits.current.flight, "flight");
    if (ly.ships) scan(hits.current.ship, "ship");
    if (ly.sats) scan(hits.current.sat, "sat");
    return best;
  }

  // Création du globe (une seule fois).
  useEffect(() => {
    let disposed = false;
    let ro;
    const el = ref.current;
    let down = null;
    let raf = 0;
    const local = (ev) => { const b = el.getBoundingClientRect(); return [ev.clientX - b.left, ev.clientY - b.top]; };
    const onDown = (ev) => { down = { x: ev.clientX, y: ev.clientY, t: Date.now() }; };
    const onUp = (ev) => {
      if (!down || Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > 6 || Date.now() - down.t > 600) return;
      const hit = pickAt(...local(ev));
      const st = state.current;
      if (hit) st.onPick?.(hit.kind === "sat" ? satDetails(hit.d) : { ...hit.d, kind: hit.kind });
      else {
        st.onPick?.(null);
        if (hoverPoly.current) st.onSelect?.(hoverPoly.current.properties);
      }
    };
    const onMove = (ev) => {
      if (raf) return;
      const [mx, my] = local(ev);
      raf = requestAnimationFrame(() => {
        raf = 0;
        const hit = ev.buttons ? null : pickAt(mx, my);
        if (tip.current) {
          tip.current.style.display = hit ? "block" : "none";
          if (hit) {
            tip.current.textContent = describe(hit.kind, hit.d);
            tip.current.style.transform = `translate(${mx + 14}px, ${my - 10}px)`;
          }
        }
        el.style.cursor = hit || hoverPoly.current ? "pointer" : "grab";
      });
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointermove", onMove);

    import("globe.gl").then(({ default: Globe }) => {
      if (disposed || !el) return;
      const g = Globe()(el)
        .backgroundColor("rgba(0,0,0,0)")
        .globeImageUrl("https://unpkg.com/three-globe@2.41.12/example/img/earth-night.jpg")
        .bumpImageUrl("https://unpkg.com/three-globe@2.41.12/example/img/earth-topology.png")
        .showAtmosphere(true)
        .atmosphereAltitude(0.18)
        .polygonAltitude(0.006)
        .polygonSideColor(() => "rgba(0,0,0,0)")
        .polygonStrokeColor(() => "rgba(255,255,255,0.18)")
        .polygonLabel(() => "")
        .onPolygonHover((d) => {
          hoverPoly.current = d;
          g.polygonAltitude((p) => (p === d ? 0.012 : 0.006));
        })
        .pathPoints("pts")
        .pathPointLat((p) => p[0])
        .pathPointLng((p) => p[1])
        .pathPointAlt((p) => p[2])
        .pathColor(() => "rgba(255,255,255,0.85)")
        .pathStroke(1.2)
        .pathTransitionDuration(0)
        .arcColor(() => ["#fbbf24", "#ffffff"])
        .arcStroke(0.6)
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
          const div = document.createElement("div");
          div.innerHTML = `<div style="transform:translate(-50%,-160%);font:700 10px ui-monospace,monospace;color:#fff;background:rgba(0,0,0,.7);border:1px solid rgba(255,255,255,.4);padding:2px 6px;border-radius:6px;white-space:nowrap">${d.label}</div>`;
          return div;
        });
      const controls = g.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.35;
      controls.zoomSpeed = 0.8;
      // Premier geste : le globe arrête de tourner pour de bon.
      controls.addEventListener("start", () => { controls.autoRotate = false; });
      controls.addEventListener("change", () => orientAll());
      g.pointOfView({ lat: 30, lng: -40, altitude: 2.3 });
      meshes.current = { planes: makeMesh(PLANE, 1.1, "#fbbf24", 8000), ships: makeMesh(SHIP, 1, "#ffffff", 6000), sats: {} };
      g.scene().add(meshes.current.planes, meshes.current.ships);
      globe.current = g;
      const fit = () => g.width(el.clientWidth).height(el.clientHeight);
      fit();
      ro = new ResizeObserver(fit);
      ro.observe(el);
      if (state.current.countries) g.polygonsData(state.current.countries);
      drawSats();
      placeAll();
      decorate();
    });
    return () => {
      disposed = true;
      ro?.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointermove", onMove);
      globe.current?._destructor?.();
      globe.current = null;
      el.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function satMesh(group) {
    const m = meshes.current;
    if (!m.sats[group]) {
      m.sats[group] = makeMesh(SAT, SAT_GROUPS[group]?.size || 2, SAT_GROUPS[group]?.color || "#7dd3fc", 12000);
      globe.current.scene().add(m.sats[group]);
    }
    return m.sats[group];
  }

  function orientAll() {
    const g = globe.current;
    const m = meshes.current;
    if (!g || !m) return;
    const zoom = 2.2 * Math.max(0.35, Math.min(1.4, g.pointOfView().altitude / 2.3));
    const pk = state.current.picked;
    for (const [group, mesh] of Object.entries(m.sats)) {
      const pos = satPos.current[group] || [];
      orientSats(mesh, pos, g.camera(), zoom * (pk?.kind === "sat" && pk.group === group ? 1.4 : 1));
    }
  }

  // Satellites : positions recalculées toutes les 2-3 s ; si l'un est choisi, sa
  // famille ressort et les autres s'effacent.
  function drawSats() {
    const g = globe.current;
    const m = meshes.current;
    if (!g || !m) return;
    const { layers: ly, picked: pk } = state.current;
    const now = new Date();
    const gmst = satellite.gstime(now);
    const byGroup = {};
    const hitList = [];
    if (ly.sats) {
      for (const s of satRecs.current) {
        const p = propagate(s.rec, now, gmst);
        if (!p) continue;
        const alt = Math.min(6, p.alt / EARTH_KM);
        const { x, y, z } = g.getCoords(p.lat, p.lng, alt);
        const d = { ...s, lat: p.lat, lng: p.lng, alt: p.alt };
        (byGroup[s.group] ||= []).push([x, y, z, d]);
        hitList.push([x, y, z, d]);
      }
    }
    satPos.current = byGroup;
    hits.current.sat = hitList;
    for (const group of new Set([...Object.keys(byGroup), ...Object.keys(m.sats)])) {
      const mesh = satMesh(group);
      const focus = pk?.kind === "sat";
      const mine = focus && pk.group === group;
      mesh.material.color.set(mine ? "#ffffff" : SAT_GROUPS[group]?.color || "#7dd3fc");
      mesh.material.opacity = focus && !mine ? 0.15 : 0.95;
    }
    orientAll();
    // Le satellite choisi suit sa course.
    if (pk?.kind === "sat") {
      const cur = hitList.find(([, , , d]) => d.name === pk.name)?.[3];
      if (cur) state.current.pickedNow = cur;
    }
    decorate();
  }

  function placeAll() {
    const g = globe.current;
    const m = meshes.current;
    if (!g || !m) return;
    const { flights: fl, ships: sh, layers: ly } = state.current;
    hits.current.flight = placeFleet(g, m.planes, ly.flights ? fl || [] : [], PLANE_ALT);
    hits.current.ship = placeFleet(g, m.ships, ly.ships ? sh || [] : [], SHIP_ALT, (d) => SHIP_TYPES[d.cat]?.color || SHIP_TYPES.other.color);
  }

  // Éléments liés à la sélection : étiquette, anneau, trajet, orbite.
  function decorate() {
    const g = globe.current;
    if (!g) return;
    const { quakes: qk, layers: ly, accent: ac, selected: sel, picked: pk, route: rt, pickedNow } = state.current;
    const labels = [];
    const rings = ly.quakes ? [...(qk || [])] : [];
    let paths = [];
    if (pk?.kind === "sat") {
      const cur = pickedNow?.name === pk.name ? pickedNow : null;
      if (cur) {
        labels.push({ lat: cur.lat, lng: cur.lng, alt: cur.alt, label: `🛰 ${cur.name}` });
        paths = orbitPaths(cur.rec, new Date());
      }
    } else if (pk) {
      labels.push({ lat: pk.lat, lng: pk.lng, alt: (pk.kind === "flight" ? 0.03 : 0.012) * EARTH_KM, label: describe(pk.kind, pk) });
      rings.push({ lat: pk.lat, lng: pk.lng, pick: true });
    }
    g.htmlElementsData(labels);
    g.htmlAltitude((d) => Math.min(6, d.alt / EARTH_KM));
    g.pathsData(paths);
    g.ringsData(rings);
    g.arcsData(rt ? [rt] : []);
    g.polygonCapColor((p) => (sel && p.properties.ADMIN === sel.ADMIN ? `${ac}66` : "rgba(255,255,255,0.03)"));
  }

  useEffect(() => {
    satRecs.current = (sats || []).map((s) => {
      try { return { name: s.name, group: s.group, rec: satellite.twoline2satrec(s.l1, s.l2) }; } catch { return null; }
    }).filter(Boolean);
    drawSats();
    const id = setInterval(drawSats, satRecs.current.length > 4000 ? 3000 : 1500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sats]);
  useEffect(() => {
    if (countries && globe.current) globe.current.polygonsData(countries);
  }, [countries]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(placeAll, [flights, ships, layers]);
  useEffect(() => {
    drawSats();
    // Une sélection arrête la rotation automatique.
    if (globe.current && (picked || selected)) globe.current.controls().autoRotate = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, layers, quakes, accent, selected, route]);
  useEffect(() => {
    if (selected?.LABEL_Y != null && globe.current) globe.current.pointOfView({ lat: selected.LABEL_Y, lng: selected.LABEL_X, altitude: 1.4 }, 1200);
  }, [selected]);

  return (
    <div className="relative h-full w-full">
      <div ref={ref} className="h-full w-full cursor-grab" />
      <div ref={tip} className="pointer-events-none absolute left-0 top-0 z-10 hidden whitespace-nowrap rounded-md border border-white/25 bg-black/80 px-2 py-1 font-mono text-[11px] font-bold text-white" />
    </div>
  );
}
