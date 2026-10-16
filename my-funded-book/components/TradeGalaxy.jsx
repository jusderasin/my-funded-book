"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fmtMoney, frDate } from "@/lib/format";

/**
 * Galaxie des trades — sphère 3D en canvas (sans dépendance).
 * Chaque trade est une étoile : vert = gain, rouge = perte, taille = |P&L|.
 * Les trades d'un même setup forment une constellation reliée par des lignes.
 * Glisser pour tourner, survoler pour lire, cliquer pour ouvrir le trade.
 */
const LIME = [198, 244, 50];
const RED = [255, 82, 82];
const GREY = [160, 160, 170];

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

export default function TradeGalaxy({ trades, lang = "fr", className = "h-[340px] sm:h-[460px]" }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const router = useRouter();
  const [hover, setHover] = useState(null);
  const en = lang === "en";

  // Chaque setup reçoit une « région » du ciel ; ses trades s'y regroupent.
  const { stars, clusters } = useMemo(() => {
    const setups = [...new Set(trades.map((trade) => trade.setup || "—"))];
    const centers = Object.fromEntries(setups.map((setup, index) => {
      const y = setups.length === 1 ? 0 : 1 - (index / (setups.length - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = index * 2.399963;
      return [setup, [Math.cos(theta) * radius, y * 0.85, Math.sin(theta) * radius]];
    }));
    const maxAbs = Math.max(1, ...trades.map((trade) => Math.abs(Number(trade.pnl) || 0)));
    const list = trades.map((trade, index) => {
      const center = centers[trade.setup || "—"];
      const seed = hash(`${trade.id || index}`);
      const spread = 0.42;
      const offset = [Math.sin(seed * 91) * spread, Math.cos(seed * 57) * spread, Math.sin(seed * 33 + 1) * spread];
      const vector = center.map((value, axis) => value + offset[axis]);
      const length = Math.hypot(...vector) || 1;
      const pnl = Number(trade.pnl) || 0;
      return { trade, pos: vector.map((value) => value / length), pnl, size: 2.2 + Math.sqrt(Math.abs(pnl) / maxAbs) * 6, color: pnl > 0 ? LIME : pnl < 0 ? RED : GREY, setup: trade.setup || "—" };
    });
    return { stars: list, clusters: Object.entries(centers).map(([setup, pos]) => ({ setup, pos, count: list.filter((star) => star.setup === setup).length })) };
  }, [trades]);

  const dust = useMemo(() => Array.from({ length: 260 }, (_, index) => {
    const y = 1 - (index / 259) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = index * 2.399963;
    return [Math.cos(theta) * radius * 1.35, y * 1.35, Math.sin(theta) * radius * 1.35];
  }), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;
    const context = canvas.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let frame = 0;
    let rotY = 0.6;
    let rotX = -0.25;
    let velocity = reduce ? 0 : 0.0025;
    let drag = null;
    let pointer = null;
    let projected = [];
    let raf = 0;

    const resize = () => {
      width = wrap.clientWidth;
      height = wrap.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const project = ([x, y, z], scale) => {
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY), cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;
      const y1 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;
      const perspective = 2.6 / (2.6 + z2);
      return { x: width / 2 + x1 * scale * perspective, y: height / 2 + y1 * scale * perspective, depth: z2, perspective };
    };

    const draw = () => {
      frame += 1;
      if (!drag) rotY += velocity;
      const scale = Math.min(width, height) * 0.36;
      context.clearRect(0, 0, width, height);

      // Halo du noyau.
      const glow = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, scale * 1.2);
      glow.addColorStop(0, "rgba(198,244,50,.16)");
      glow.addColorStop(0.45, "rgba(198,244,50,.04)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      // Poussière d'étoiles en arrière-plan.
      dust.forEach((point) => {
        const p = project(point, scale);
        context.fillStyle = `rgba(255,255,255,${0.05 + (1 - (p.depth + 1.4) / 2.8) * 0.25})`;
        context.fillRect(p.x, p.y, 1, 1);
      });

      // Anneaux orbitaux.
      [[1.18, 0], [1.32, 0.35]].forEach(([radius, tilt], ringIndex) => {
        context.beginPath();
        for (let step = 0; step <= 96; step += 1) {
          const angle = (step / 96) * Math.PI * 2 + (ringIndex ? -frame * 0.002 : frame * 0.0015);
          const point = [Math.cos(angle) * radius, Math.sin(angle) * radius * Math.sin(tilt), Math.sin(angle) * radius * Math.cos(tilt)];
          const p = project(point, scale);
          if (step) context.lineTo(p.x, p.y); else context.moveTo(p.x, p.y);
        }
        context.strokeStyle = ringIndex ? "rgba(255,255,255,.08)" : "rgba(198,244,50,.22)";
        context.lineWidth = 1;
        context.stroke();
      });

      // Latitudes de la sphère (effet hologramme).
      for (let lat = -2; lat <= 2; lat += 1) {
        const y = lat * 0.33;
        const radius = Math.sqrt(1 - y * y);
        context.beginPath();
        for (let step = 0; step <= 64; step += 1) {
          const angle = (step / 64) * Math.PI * 2;
          const p = project([Math.cos(angle) * radius, y, Math.sin(angle) * radius], scale);
          if (step) context.lineTo(p.x, p.y); else context.moveTo(p.x, p.y);
        }
        context.strokeStyle = "rgba(198,244,50,.05)";
        context.stroke();
      }

      projected = stars.map((star) => ({ star, ...project(star.pos, scale) }));

      // Constellations : relie les trades d'un même setup au plus proche suivant.
      const bySetup = {};
      projected.forEach((p) => (bySetup[p.star.setup] ||= []).push(p));
      Object.values(bySetup).forEach((group) => {
        group.forEach((p, index) => {
          const next = group[index + 1];
          if (!next) return;
          const alpha = 0.06 + (1 - (p.depth + 1) / 2) * 0.16;
          context.strokeStyle = `rgba(198,244,50,${alpha})`;
          context.beginPath();
          context.moveTo(p.x, p.y);
          context.lineTo(next.x, next.y);
          context.stroke();
        });
      });

      // Étoiles, triées par profondeur.
      let nearest = null;
      projected.sort((a, b) => b.depth - a.depth).forEach((p) => {
        const front = 1 - (p.depth + 1) / 2;
        const radius = p.star.size * p.perspective * (0.6 + front * 0.6);
        const [r, g, b] = p.star.color;
        const pulse = 1 + Math.sin(frame * 0.05 + p.star.size) * 0.12;
        const halo = context.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 3.2 * pulse);
        halo.addColorStop(0, `rgba(${r},${g},${b},${0.35 * (0.4 + front)})`);
        halo.addColorStop(1, `rgba(${r},${g},${b},0)`);
        context.fillStyle = halo;
        context.beginPath();
        context.arc(p.x, p.y, radius * 3.2 * pulse, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = `rgba(${r},${g},${b},${0.45 + front * 0.55})`;
        context.beginPath();
        context.arc(p.x, p.y, radius, 0, Math.PI * 2);
        context.fill();
        if (pointer) {
          const distance = Math.hypot(pointer.x - p.x, pointer.y - p.y);
          if (distance < Math.max(12, radius * 2) && (!nearest || distance < nearest.distance)) nearest = { ...p, distance };
        }
      });

      // Étiquettes des constellations (face avant uniquement).
      context.font = "600 10px 'JetBrains Mono', monospace";
      clusters.forEach((cluster) => {
        const p = project(cluster.pos.map((value) => value * 1.12), scale);
        if (p.depth > 0.1) return;
        context.fillStyle = "rgba(198,244,50,.85)";
        context.fillText(`${cluster.setup.toUpperCase()} · ${cluster.count}`, p.x + 8, p.y - 8);
      });

      if (nearest) {
        context.strokeStyle = "rgba(255,255,255,.9)";
        context.beginPath();
        context.arc(nearest.x, nearest.y, 11, 0, Math.PI * 2);
        context.stroke();
      }
      setHover((current) => (current?.star === nearest?.star && current?.x === nearest?.x ? current : nearest ? { star: nearest.star, x: nearest.x, y: nearest.y } : null));
      raf = requestAnimationFrame(draw);
    };

    const local = (event) => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const onDown = (event) => { pointer = local(event); drag = { ...local(event), rotX, rotY, moved: false }; canvas.setPointerCapture?.(event.pointerId); };
    const onMove = (event) => {
      pointer = local(event);
      if (!drag) return;
      const dx = pointer.x - drag.x;
      const dy = pointer.y - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      rotY = drag.rotY + dx * 0.008;
      rotX = Math.max(-1.2, Math.min(1.2, drag.rotX + dy * 0.008));
    };
    const onUp = (event) => {
      const wasClick = drag && !drag.moved;
      drag = null;
      if (wasClick && event.pointerType !== "touch") {
        const hit = projected.find((p) => Math.hypot(p.x - pointer.x, p.y - pointer.y) < 12);
        if (hit?.star.trade.id) router.push(`/journal?edit=${hit.star.trade.id}`);
      }
    };
    const onLeave = () => { pointer = null; };

    resize();
    draw();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [stars, clusters, dust, router]);

  const wins = stars.filter((star) => star.pnl > 0).length;
  return (
    <div ref={wrapRef} className={`relative w-full select-none overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="block cursor-grab touch-none active:cursor-grabbing" aria-label={en ? "3D map of your trades" : "Carte 3D de tes trades"} />
      <div className="pointer-events-none absolute left-3 top-3 space-y-1 font-mono text-[10px] text-prism-muted">
        <p><span className="text-prism-accent">●</span> {wins} {en ? "winners" : "gagnants"}</p>
        <p><span className="text-[#ff5252]">●</span> {stars.length - wins} {en ? "losers / BE" : "perdants / BE"}</p>
        <p className="text-prism-muted2">{en ? "drag · hover · click" : "glisse · survole · clique"}</p>
      </div>
      {!stars.length && <p className="absolute inset-0 grid place-items-center text-sm text-prism-muted">{en ? "Log trades to light up your galaxy." : "Logue des trades pour allumer ta galaxie."}</p>}
      {hover && (
        <div className="pointer-events-none absolute z-10 min-w-[160px] rounded-md border border-prism-accent/40 bg-black/85 px-3 py-2 text-[11px] shadow-[0_0_30px_-8px_rgba(198,244,50,.6)] backdrop-blur" style={{ left: Math.min(hover.x + 14, (wrapRef.current?.clientWidth || 0) - 180), top: Math.max(8, hover.y - 70) }}>
          <p className="font-mono text-prism-muted">{frDate(hover.star.trade.date)} · {hover.star.trade.session || "—"}</p>
          <p className="mt-0.5 font-bold text-prism-text">{hover.star.trade.symbol || "—"} · {String(hover.star.trade.dir || "").toUpperCase()} · {hover.star.setup}</p>
          <p className={`mt-0.5 font-mono font-bold ${hover.star.pnl < 0 ? "text-prism-loss" : "text-prism-win"}`}>{fmtMoney(hover.star.pnl)}</p>
        </div>
      )}
    </div>
  );
}
