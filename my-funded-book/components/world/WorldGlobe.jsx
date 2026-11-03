"use client";

// Globe « God's Eye View » (CesiumJS, chargé depuis le CDN) : imagerie satellite
// Esri, relief 3D, avions et bateaux qui avancent en continu selon leur cap et
// leur vitesse, satellites propagés en direct (ISS et Tiangong en grand avec
// leur orbite), caméras publiques cliquables, séismes, et modes de vision
// NVG / FLIR / CRT en shaders. Le globe tourne seul jusqu'au premier geste.

import { useEffect, useRef } from "react";
import * as satellite from "satellite.js";
import { SAT_GROUPS, airlineName, satFamily, SHIP_TYPES } from "@/lib/worldCatalog";

export { SAT_GROUPS };

const CESIUM = "https://cdn.jsdelivr.net/npm/cesium@1.140.0/Build/Cesium/";
const EARTH_KM = 6371;
const STATIONS = /^(ISS|CSS|TIANHE)/;

// Icônes dessinées une fois en canvas (nez vers le haut, tournées par le cap).
function icon(draw, size = 32) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const x = c.getContext("2d");
  x.translate(size / 2, size / 2);
  draw(x, size / 2);
  return c;
}
const poly = (x, pts, fill) => { x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fillStyle = fill; x.fill(); };
const PLANE_PTS = (r) => [[0, -r], [r * 0.12, -r * 0.6], [r * 0.12, -r * 0.2], [r, r * 0.15], [r, r * 0.3], [r * 0.12, r * 0.15], [r * 0.1, r * 0.6], [r * 0.4, r * 0.85], [r * 0.4, r * 0.95], [0, r * 0.85], [-r * 0.4, r * 0.95], [-r * 0.4, r * 0.85], [-r * 0.1, r * 0.6], [-r * 0.12, r * 0.15], [-r, r * 0.3], [-r, r * 0.15], [-r * 0.12, -r * 0.2], [-r * 0.12, -r * 0.6]];

// Shaders des modes de vision (post-traitement plein écran).
const SHADERS = {
  nvg: `uniform sampler2D colorTexture; in vec2 v_textureCoordinates;
    void main() { vec3 c = texture(colorTexture, v_textureCoordinates).rgb; float l = dot(c, vec3(.3,.59,.11));
      float n = fract(sin(dot(v_textureCoordinates * czm_frameNumber, vec2(12.9898,78.233))) * 43758.5453) * .08;
      float v = 1. - smoothstep(.45, .85, distance(v_textureCoordinates, vec2(.5)));
      out_FragColor = vec4(vec3(.15, 1., .25) * (pow(l, 1.3) * 1.15 + n) * v, 1.); }`,
  flir: `uniform sampler2D colorTexture; in vec2 v_textureCoordinates;
    void main() { vec3 c = texture(colorTexture, v_textureCoordinates).rgb; float l = clamp(dot(c, vec3(.3,.59,.11)) * 1.5, 0., 1.);
      out_FragColor = vec4(vec3(l * 1.1, l, l * .95), 1.); }`,
  crt: `uniform sampler2D colorTexture; in vec2 v_textureCoordinates;
    void main() { vec2 uv = v_textureCoordinates; float o = .0015;
      vec3 c = vec3(texture(colorTexture, uv + vec2(o, 0.)).r, texture(colorTexture, uv).g, texture(colorTexture, uv - vec2(o, 0.)).b);
      c *= .82 + .18 * sin(uv.y * 1400.); c *= 1. - smoothstep(.5, .9, distance(uv, vec2(.5)));
      out_FragColor = vec4(c * vec3(1.05, 1.1, .95), 1.); }`,
};

function loadCesium() {
  if (window.Cesium) return Promise.resolve(window.Cesium);
  if (window.__cesiumLoading) return window.__cesiumLoading;
  window.CESIUM_BASE_URL = CESIUM;
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = `${CESIUM}Widgets/widgets.css`;
  document.head.appendChild(css);
  window.__cesiumLoading = new Promise((ok, ko) => {
    const s = document.createElement("script");
    s.src = `${CESIUM}Cesium.js`;
    s.onload = () => ok(window.Cesium);
    s.onerror = ko;
    document.head.appendChild(s);
  });
  return window.__cesiumLoading;
}

function propagate(rec, when, gmst) {
  const pv = satellite.propagate(rec, when);
  if (!pv || !pv.position || typeof pv.position === "boolean") return null;
  const geo = satellite.eciToGeodetic(pv.position, gmst);
  return { lat: satellite.degreesLat(geo.latitude), lng: satellite.degreesLong(geo.longitude), alt: geo.height, v: pv.velocity };
}

export function satDetails(s) {
  const p = propagate(s.rec, new Date(), satellite.gstime(new Date()));
  const v = p?.v && typeof p.v !== "boolean" ? Math.hypot(p.v.x, p.v.y, p.v.z) : null;
  return { kind: "sat", name: s.name, group: s.group, family: satFamily(s.name), lat: p?.lat ?? s.lat, lng: p?.lng ?? s.lng, altKm: Math.round(p?.alt ?? s.alt), speedKms: v, periodMin: (2 * Math.PI) / s.rec.no, inclination: (s.rec.inclo * 180) / Math.PI, norad: s.rec.satnum };
}

// Point d'arrivée après `km` parcourus au cap `deg` (approximation sphérique).
function advance(lat, lng, deg, km) {
  const d = km / EARTH_KM;
  const h = (deg * Math.PI) / 180;
  const la = (lat * Math.PI) / 180;
  const lo = (lng * Math.PI) / 180;
  const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(h));
  const lo2 = lo + Math.atan2(Math.sin(h) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
  return [(la2 * 180) / Math.PI, ((((lo2 * 180) / Math.PI) + 540) % 360) - 180];
}

const fmtDeg = (v, pos, neg) => `${Math.abs(v).toFixed(3)}°${v >= 0 ? pos : neg}`;
const describe = (k, d) => (k === "flight" ? `✈ ${d.call || d.id}${airlineName(d.call) ? ` · ${airlineName(d.call)}` : ""}` : k === "ship" ? `🚢 ${d.name || d.id}` : k === "cam" ? `📷 ${d.name}` : `🛰 ${d.name}`);

export default function WorldGlobe({ countries, flights, ships, sats, cams, quakes, layers, accent, selected, onSelect, picked, onPick, route, mode = "normal" }) {
  const ref = useRef(null);
  const tip = useRef(null);
  const hud = useRef(null);
  const view = useRef(null);
  const C = useRef(null);
  const col = useRef(null);
  const satRecs = useRef([]);
  const state = useRef({});
  state.current = { countries, flights, ships, cams, quakes, layers, accent, selected, onSelect, picked, onPick, route, mode };

  // Création du globe (une seule fois).
  useEffect(() => {
    let disposed = false;
    let ro;
    let clock;
    loadCesium().then((Cesium) => {
      if (disposed || !ref.current) return;
      C.current = Cesium;
      const v = new Cesium.Viewer(ref.current, {
        baseLayer: Cesium.ImageryLayer.fromProviderAsync(Cesium.ArcGisMapServerImageryProvider.fromUrl("https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer")),
        animation: false, timeline: false, baseLayerPicker: false, geocoder: false, homeButton: false, sceneModePicker: false,
        navigationHelpButton: false, fullscreenButton: false, infoBox: false, selectionIndicator: false, creditContainer: document.createElement("div"),
        requestRenderMode: false,
      });
      view.current = v;
      const scene = v.scene;
      scene.globe.enableLighting = false;
      scene.skyAtmosphere.show = true;
      scene.globe.showGroundAtmosphere = true;
      scene.backgroundColor = Cesium.Color.TRANSPARENT;
      scene.fog.enabled = true;
      // Relief 3D gratuit (ArcGIS World Elevation, sans clé).
      Cesium.ArcGISTiledElevationTerrainProvider.fromUrl("https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer")
        .then((t) => { if (!disposed) v.terrainProvider = t; }).catch(() => {});
      // Clé Google facultative : bâtiments photoréalistes en 3D (NEXT_PUBLIC_GOOGLE_MAPS_KEY).
      const gkey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
      if (gkey) {
        Cesium.GoogleMaps.defaultApiKey = gkey;
        Cesium.createGooglePhotorealistic3DTileset().then((ts) => { if (!disposed) { scene.primitives.add(ts); scene.globe.show = true; } }).catch(() => {});
      }
      v.camera.setView({ destination: Cesium.Cartesian3.fromDegrees(-40, 30, 18_000_000) });

      const icons = {
        plane: icon((x, r) => poly(x, PLANE_PTS(r * 0.9), "#fbbf24")),
        ship: icon((x, r) => poly(x, [[0, -r * 0.9], [r * 0.35, -r * 0.35], [r * 0.35, r * 0.85], [-r * 0.35, r * 0.85], [-r * 0.35, -r * 0.35]], "#ffffff")),
        sat: icon((x, r) => { x.fillStyle = "#fff"; x.fillRect(-r * 0.2, -r * 0.2, r * 0.4, r * 0.4); x.fillRect(-r * 0.95, -r * 0.12, r * 0.6, r * 0.24); x.fillRect(r * 0.35, -r * 0.12, r * 0.6, r * 0.24); }),
        station: icon((x, r) => { x.fillStyle = "#fff"; x.fillRect(-r * 0.95, -r * 0.45, r * 0.5, r * 0.9); x.fillRect(r * 0.45, -r * 0.45, r * 0.5, r * 0.9); x.fillRect(-r * 0.45, -r * 0.06, r * 0.9, r * 0.12); x.fillRect(-r * 0.15, -r * 0.3, r * 0.3, r * 0.6); }, 48),
        cam: icon((x, r) => { x.fillStyle = "#22d3ee"; x.fillRect(-r * 0.6, -r * 0.35, r * 0.9, r * 0.7); poly(x, [[r * 0.3, -r * 0.15], [r * 0.85, -r * 0.45], [r * 0.85, r * 0.45], [r * 0.3, r * 0.15]], "#22d3ee"); }, 24),
      };
      const mk = () => {
        const b = scene.primitives.add(new Cesium.BillboardCollection({ scene }));
        return { b, items: [] };
      };
      col.current = {
        planes: mk(), ships: mk(), sats: mk(), cams: mk(),
        labels: scene.primitives.add(new Cesium.LabelCollection({ scene })),
        icons,
        quakes: new Cesium.CustomDataSource("quakes"),
        orbit: new Cesium.CustomDataSource("orbit"),
        countries: null,
        postFx: null,
      };
      v.dataSources.add(col.current.quakes);
      v.dataSources.add(col.current.orbit);

      // Rotation automatique jusqu'au premier geste.
      let spin = true;
      const stop = () => { spin = false; };
      ["pointerdown", "wheel"].forEach((e) => ref.current.addEventListener(e, stop, { passive: true }));
      let last = performance.now();
      scene.preRender.addEventListener(() => {
        const now = performance.now();
        const dt = (now - last) / 1000;
        last = now;
        if (spin) v.camera.rotate(Cesium.Cartesian3.UNIT_Z, -dt * 0.03);
        moveFleets(dt);
      });

      // Survol et clic.
      const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
      handler.setInputAction((m) => {
        const hit = scene.pick(m.endPosition);
        const d = hit?.primitive?.gev;
        if (tip.current) {
          tip.current.style.display = d ? "block" : "none";
          if (d) {
            tip.current.textContent = describe(d.kind, d.d);
            tip.current.style.transform = `translate(${m.endPosition.x + 14}px, ${m.endPosition.y - 10}px)`;
          }
        }
        ref.current.style.cursor = d || hit?.id?.properties?.ADMIN ? "pointer" : "grab";
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
      handler.setInputAction((c) => {
        const hit = scene.pick(c.position);
        const st = state.current;
        const g = hit?.primitive?.gev;
        if (g) {
          st.onPick?.(g.kind === "sat" ? satDetails(g.d) : { ...g.d, kind: g.kind });
          return;
        }
        st.onPick?.(null);
        const props = hit?.id?.properties;
        if (props?.ADMIN) st.onSelect?.(Object.fromEntries(props.propertyNames.map((k) => [k, props[k].getValue()])));
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      const fit = () => v.resize();
      ro = new ResizeObserver(fit);
      ro.observe(ref.current);
      clock = setInterval(() => { updateHud(); drawSats(); }, 1000);
      drawCountries();
      placeFleet("planes", "flight");
      placeFleet("ships", "ship");
      placeCams();
      drawSats();
      decorate();
      applyMode(state.current.mode);
    }).catch(() => {
      if (ref.current) ref.current.innerHTML = '<p style="padding:16px;color:#aaa;font-size:12px">Globe 3D indisponible (Cesium ne se charge pas).</p>';
    });
    return () => {
      disposed = true;
      clearInterval(clock);
      ro?.disconnect();
      if (view.current && !view.current.isDestroyed()) view.current.destroy();
      view.current = null;
      col.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateHud() {
    const v = view.current;
    const Cs = C.current;
    if (!v || !hud.current) return;
    const carto = v.camera.positionCartographic;
    const center = v.camera.pickEllipsoid(new Cs.Cartesian2(v.canvas.clientWidth / 2, v.canvas.clientHeight / 2));
    const c = center ? Cs.Cartographic.fromCartesian(center) : carto;
    const lat = Cs.Math.toDegrees(c.latitude);
    const lng = Cs.Math.toDegrees(c.longitude);
    hud.current.textContent = `${fmtDeg(lat, "N", "S")}  ${fmtDeg(lng, "E", "W")}  ·  ALT ${Math.round(carto.height / 1000).toLocaleString("fr-FR")} KM  ·  ${new Date().toISOString().slice(11, 19)} UTC`;
  }

  // Avions / bateaux : un billboard par appareil, tourné selon son cap.
  function placeFleet(key, kind) {
    const Cs = C.current;
    const k = col.current?.[key];
    if (!Cs || !k) return;
    const { flights: fl, ships: sh, layers: ly } = state.current;
    const list = kind === "flight" ? (ly.flights ? fl || [] : []) : ly.ships ? sh || [] : [];
    k.b.removeAll();
    k.items = list.map((d) => {
      const altM = kind === "flight" ? Math.max(200, d.alt || 0) : 0;
      const b = k.b.add({
        position: Cs.Cartesian3.fromDegrees(d.lng, d.lat, altM),
        image: kind === "flight" ? col.current.icons.plane : col.current.icons.ship,
        scale: kind === "flight" ? 0.55 : 0.45,
        rotation: -Cs.Math.toRadians(Number(d.heading) || 0),
        alignedAxis: Cs.Cartesian3.UNIT_Z,
        color: kind === "ship" ? Cs.Color.fromCssColorString(SHIP_TYPES[d.cat]?.color || SHIP_TYPES.other.color) : undefined,
        scaleByDistance: new Cs.NearFarScalar(2e4, 1.6, 2e7, 0.5),
      });
      b.gev = { kind, d };
      return { b, d, lat: d.lat, lng: d.lng, altM, kmh: kind === "flight" ? d.speed || 0 : (d.speed || 0) * 1.852 };
    });
    tagFlights();
  }

  // Les avions et bateaux avancent à chaque image entre deux mises à jour du flux.
  function moveFleets(dt) {
    const Cs = C.current;
    const c = col.current;
    if (!Cs || !c) return;
    for (const k of [c.planes, c.ships]) {
      for (const it of k.items) {
        if (!it.kmh || it.d.heading == null) continue;
        [it.lat, it.lng] = advance(it.lat, it.lng, Number(it.d.heading), (it.kmh / 3600) * dt);
        it.b.position = Cs.Cartesian3.fromDegrees(it.lng, it.lat, it.altM);
        if (it.label) it.label.position = it.b.position;
      }
    }
  }

  // Indicatifs : visibles seulement de près (sinon illisible).
  function tagFlights() {
    const Cs = C.current;
    const c = col.current;
    if (!Cs || !c) return;
    c.labels.removeAll();
    const pk = state.current.picked;
    for (const it of c.planes.items) {
      const mine = pk?.kind === "flight" && pk.id === it.d.id;
      it.label = c.labels.add({
        position: it.b.position,
        text: it.d.call || it.d.id,
        font: `${mine ? 700 : 600} ${mine ? 13 : 10}px ui-monospace, monospace`,
        fillColor: Cs.Color.fromCssColorString(mine ? "#ffffff" : "#fde68a"),
        outlineColor: Cs.Color.BLACK, outlineWidth: 3, style: Cs.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cs.Cartesian2(10, -10), horizontalOrigin: Cs.HorizontalOrigin.LEFT,
        distanceDisplayCondition: mine ? undefined : new Cs.DistanceDisplayCondition(0, 2.5e6),
      });
    }
  }

  function placeCams() {
    const Cs = C.current;
    const k = col.current?.cams;
    if (!Cs || !k) return;
    const { cams: list, layers: ly } = state.current;
    k.b.removeAll();
    k.items = (ly.cams ? list || [] : []).map((d) => {
      const b = k.b.add({ position: Cs.Cartesian3.fromDegrees(d.lng, d.lat, 30), image: col.current.icons.cam, scale: 0.8, distanceDisplayCondition: new Cs.DistanceDisplayCondition(0, 6e6), scaleByDistance: new Cs.NearFarScalar(1e3, 1.4, 6e6, 0.6), heightReference: Cs.HeightReference.RELATIVE_TO_GROUND });
      b.gev = { kind: "cam", d };
      return { b, d };
    });
  }

  // Satellites : repositionnés chaque seconde ; ISS / Tiangong en grand avec leur nom.
  function drawSats() {
    const Cs = C.current;
    const k = col.current?.sats;
    if (!Cs || !k) return;
    const { layers: ly, picked: pk } = state.current;
    const now = new Date();
    const gmst = satellite.gstime(now);
    const list = ly.sats ? satRecs.current : [];
    if (k.items.length !== list.length || k.items[0]?.s !== list[0]) {
      k.b.removeAll();
      k.items = list.map((s) => {
        const station = STATIONS.test(s.name);
        const b = k.b.add({ image: station ? col.current.icons.station : col.current.icons.sat, scale: station ? 0.9 : 0.32 * (SAT_GROUPS[s.group]?.size || 2) / 2, color: Cs.Color.fromCssColorString(station ? "#ffffff" : SAT_GROUPS[s.group]?.color || "#7dd3fc") });
        b.gev = { kind: "sat", d: s };
        return { b, s, station };
      });
      col.current.orbit.entities.removeAll();
    }
    const focus = pk?.kind === "sat";
    for (const it of k.items) {
      const p = propagate(it.s.rec, now, gmst);
      if (!p) { it.b.show = false; continue; }
      it.b.show = true;
      it.b.position = Cs.Cartesian3.fromDegrees(p.lng, p.lat, p.alt * 1000);
      Object.assign(it.s, { lat: p.lat, lng: p.lng, alt: p.alt });
      const mine = focus && pk.name === it.s.name;
      it.b.color = Cs.Color.fromCssColorString(mine || it.station ? "#ffffff" : SAT_GROUPS[it.s.group]?.color || "#7dd3fc").withAlpha(focus && !mine && pk.group !== it.s.group ? 0.15 : 1);
    }
    stationLabels();
  }

  // Étiquettes et orbites permanentes des stations + orbite du satellite choisi.
  function stationLabels() {
    const Cs = C.current;
    const c = col.current;
    if (!Cs || !c) return;
    const pk = state.current.picked;
    const wanted = c.sats.items.filter((it) => it.station || (pk?.kind === "sat" && pk.name === it.s.name));
    const ents = c.orbit.entities;
    for (const e of [...ents.values]) if (!wanted.some((w) => e.id.startsWith(`${w.s.name}|`))) ents.remove(e);
    for (const it of wanted) {
      if (!it.b.show) continue;
      const lid = `${it.s.name}|label`;
      const lab = ents.getById(lid) || ents.add({ id: lid, label: { text: it.s.name.replace(/ \(.*\)/, ""), font: "700 12px ui-monospace, monospace", fillColor: Cs.Color.WHITE, outlineColor: Cs.Color.BLACK, outlineWidth: 3, style: Cs.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new Cs.Cartesian2(16, -16), horizontalOrigin: Cs.HorizontalOrigin.LEFT } });
      lab.position = it.b.position;
      const oid = `${it.s.name}|orbit`;
      if (!ents.getById(oid)) {
        const period = (2 * Math.PI) / it.s.rec.no;
        const now = new Date();
        const pts = [];
        for (let i = 0; i <= 180; i++) {
          const when = new Date(now.getTime() + (i / 180) * period * 60_000);
          const p = propagate(it.s.rec, when, satellite.gstime(now));
          if (p) pts.push(Cs.Cartesian3.fromDegrees(p.lng, p.lat, p.alt * 1000));
        }
        ents.add({ id: oid, polyline: { positions: pts, width: it.station ? 1.5 : 2, material: Cs.Color.WHITE.withAlpha(it.station ? 0.45 : 0.85), arcType: Cs.ArcType.NONE } });
      }
    }
  }

  async function drawCountries() {
    const Cs = C.current;
    const v = view.current;
    const list = state.current.countries;
    if (!Cs || !v || !list || col.current.countries) return;
    const ds = await Cs.GeoJsonDataSource.load({ type: "FeatureCollection", features: list }, { stroke: Cs.Color.WHITE.withAlpha(0.35), fill: Cs.Color.WHITE.withAlpha(0.01), strokeWidth: 1, clampToGround: false });
    if (!view.current) return;
    ds.entities.values.forEach((e) => { if (e.polygon) { e.polygon.outline = true; e.polygon.outlineColor = Cs.Color.WHITE.withAlpha(0.3); e.polygon.height = 0; } });
    col.current.countries = ds;
    v.dataSources.add(ds);
    decorate();
  }

  // Éléments liés à la sélection : pays, séismes, trajet de l'avion choisi.
  function decorate() {
    const Cs = C.current;
    const c = col.current;
    if (!Cs || !c) return;
    const { quakes: qk, layers: ly, accent: ac, selected: sel, picked: pk, route: rt } = state.current;
    c.countries?.entities.values.forEach((e) => {
      if (!e.polygon) return;
      const mine = sel && e.properties?.ADMIN?.getValue() === sel.ADMIN;
      e.polygon.material = Cs.Color.fromCssColorString(mine ? ac : "#ffffff").withAlpha(mine ? 0.35 : 0.01);
    });
    c.quakes.entities.removeAll();
    if (ly.quakes) {
      for (const q of qk || []) {
        const r = 20_000 + q.mag * 25_000;
        const t0 = Date.now() + Math.random() * 1400;
        c.quakes.entities.add({
          position: Cs.Cartesian3.fromDegrees(q.lng, q.lat),
          ellipse: {
            semiMajorAxis: new Cs.CallbackProperty(() => r * (0.2 + (((Date.now() - t0) % 1400) / 1400) * 0.8), false),
            semiMinorAxis: new Cs.CallbackProperty(() => r * (0.2 + (((Date.now() - t0) % 1400) / 1400) * 0.8), false),
            material: new Cs.ColorMaterialProperty(new Cs.CallbackProperty(() => Cs.Color.RED.withAlpha(0.5 * (1 - ((Date.now() - t0) % 1400) / 1400)), false)),
            height: 0,
          },
        });
      }
    }
    if (rt) {
      c.quakes.entities.add({ polyline: { positions: Cs.Cartesian3.fromDegreesArray([rt.startLng, rt.startLat, rt.endLng, rt.endLat]), width: 2, arcType: Cs.ArcType.GEODESIC, material: new Cs.PolylineDashMaterialProperty({ color: Cs.Color.fromCssColorString("#fbbf24") }) } });
    }
    if (pk && pk.kind !== "sat") {
      c.quakes.entities.add({ position: Cs.Cartesian3.fromDegrees(pk.lng, pk.lat), ellipse: { semiMajorAxis: 40_000, semiMinorAxis: 40_000, material: Cs.Color.WHITE.withAlpha(0.15), outline: true, outlineColor: Cs.Color.WHITE, height: 0 } });
    }
  }

  function applyMode(m) {
    const Cs = C.current;
    const v = view.current;
    if (!Cs || !v) return;
    const stages = v.scene.postProcessStages;
    if (col.current.postFx) { stages.remove(col.current.postFx); col.current.postFx = null; }
    if (SHADERS[m]) col.current.postFx = stages.add(new Cs.PostProcessStage({ fragmentShader: SHADERS[m] }));
  }

  useEffect(() => {
    satRecs.current = (sats || []).map((s) => {
      try { return { name: s.name, group: s.group, rec: satellite.twoline2satrec(s.l1, s.l2) }; } catch { return null; }
    }).filter(Boolean);
    drawSats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sats]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { drawCountries(); }, [countries]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { placeFleet("planes", "flight"); }, [flights, layers]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { placeFleet("ships", "ship"); }, [ships, layers]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { placeCams(); }, [cams, layers]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { applyMode(mode); }, [mode]);
  useEffect(() => {
    drawSats();
    tagFlights();
    decorate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, layers, quakes, accent, selected, route]);
  // Pays ou objet choisi : la caméra y vole.
  useEffect(() => {
    const Cs = C.current;
    if (selected?.LABEL_Y != null && view.current) view.current.camera.flyTo({ destination: Cs.Cartesian3.fromDegrees(selected.LABEL_X, selected.LABEL_Y, 4_500_000), duration: 1.4 });
  }, [selected]);
  useEffect(() => {
    const Cs = C.current;
    if (!picked || !view.current || picked.kind === "sat") return;
    view.current.camera.flyTo({ destination: Cs.Cartesian3.fromDegrees(picked.lng, picked.lat, picked.kind === "cam" ? 2_500 : 600_000), duration: 1.6 });
  }, [picked]);

  return (
    <div className="relative h-full w-full">
      <div ref={ref} className="gev h-full w-full cursor-grab" />
      <style>{".gev .cesium-viewer-bottom,.gev .cesium-widget-credits{display:none!important}.gev .cesium-widget,.gev canvas{width:100%;height:100%}"}</style>
      {/* HUD : coins de visée, réticule et bandeau de coordonnées. */}
      <div className="pointer-events-none absolute inset-0">
        {["left-4 top-14 border-l border-t", "right-4 top-14 border-r border-t", "left-4 bottom-12 border-b border-l", "right-4 bottom-12 border-b border-r"].map((c) => <span key={c} className={`absolute h-6 w-6 border-white/45 ${c}`} />)}
        <span className="absolute left-1/2 top-1/2 h-7 w-px -translate-x-1/2 -translate-y-1/2 bg-white/35" />
        <span className="absolute left-1/2 top-1/2 h-px w-7 -translate-x-1/2 -translate-y-1/2 bg-white/35" />
        <p ref={hud} className="absolute bottom-3 right-3 rounded bg-black/55 px-2 py-1 font-mono text-[10px] tracking-wider text-white/80 backdrop-blur" />
      </div>
      <div ref={tip} className="pointer-events-none absolute left-0 top-0 z-10 hidden whitespace-nowrap rounded-md border border-white/25 bg-black/80 px-2 py-1 font-mono text-[11px] font-bold text-white" />
    </div>
  );
}
