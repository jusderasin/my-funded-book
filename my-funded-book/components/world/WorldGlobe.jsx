"use client";

// Globe 3D en direct (globe.gl) : pays cliquables, avions (OpenSky), satellites
// propagés en temps réel depuis leurs TLE (CelesTrak), séismes (USGS).

import { useEffect, useRef } from "react";
import * as satellite from "satellite.js";

const EARTH_KM = 6371;

function satPositions(recs, now) {
  const gmst = satellite.gstime(now);
  const out = [];
  for (const s of recs) {
    const pv = satellite.propagate(s.rec, now);
    if (!pv || !pv.position || typeof pv.position === "boolean") continue;
    const geo = satellite.eciToGeodetic(pv.position, gmst);
    out.push({ kind: "sat", name: s.name, station: s.station, lat: satellite.degreesLat(geo.latitude), lng: satellite.degreesLong(geo.longitude), alt: geo.height });
  }
  return out;
}

export default function WorldGlobe({ countries, flights, ships, sats, quakes, layers, accent, selected, onSelect }) {
  const ref = useRef(null);
  const globe = useRef(null);
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
        .pointsMerge(true)
        .pointRadius(0.13)
        .pointAltitude(0.012)
        .pointColor((d) => (d.kind === "ship" ? "#34d399" : "#fbbf24"))
        .particleLat("lat")
        .particleLng("lng")
        .particleAltitude((d) => Math.min(0.6, d.alt / EARTH_KM))
        .particlesSize((list) => (list[0]?.station ? 2.6 : 1.4))
        .particlesSizeAttenuation(false)
        .particlesColor((list) => (list[0]?.station ? "#ffffff" : "#7dd3fc"))
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
      globe.current = g;
      const fit = () => ref.current && g.width(ref.current.clientWidth).height(ref.current.clientHeight);
      fit();
      ro = new ResizeObserver(fit);
      ro.observe(ref.current);
      if (state.current.countries) g.polygonsData(state.current.countries);
      draw();
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
      try { return { name: s.name, station: s.station, rec: satellite.twoline2satrec(s.l1, s.l2) }; } catch { return null; }
    }).filter(Boolean);
    draw();
    const id = setInterval(draw, 2000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sats]);

  function draw() {
    const g = globe.current;
    if (!g) return;
    const { flights: fl, ships: sh, quakes: qk, layers: ly, accent: ac, selected: sel } = state.current;
    const satPts = ly.sats ? satPositions(satRecs.current, new Date()) : [];
    g.pointsData([...(ly.flights ? fl || [] : []), ...(ly.ships ? (sh || []).map((x) => ({ ...x, kind: "ship" })) : [])]);
    g.particlesData([satPts.filter((s) => !s.station), satPts.filter((s) => s.station)].filter((l) => l.length));
    g.htmlElementsData(satPts.filter((s) => s.name.startsWith("ISS")).slice(0, 1).map((s) => ({ ...s, altitude: Math.min(0.6, s.alt / EARTH_KM) })));
    g.htmlAltitude((d) => d.altitude);
    g.ringsData(ly.quakes ? qk || [] : []);
    g.polygonCapColor((p) => (sel && p.properties.ADMIN === sel.ADMIN ? `${ac}aa` : "rgba(255,255,255,0.03)"));
  }

  useEffect(() => {
    if (countries && globe.current) globe.current.polygonsData(countries);
  }, [countries]);
  useEffect(draw, [flights, ships, quakes, layers, accent, selected]);
  useEffect(() => {
    if (!globe.current) return;
    globe.current.controls().autoRotate = !selected;
    if (selected?.LABEL_Y != null) globe.current.pointOfView({ lat: selected.LABEL_Y, lng: selected.LABEL_X, altitude: 1.6 }, 1200);
  }, [selected]);

  return <div ref={ref} className="h-full w-full cursor-grab" />;
}
