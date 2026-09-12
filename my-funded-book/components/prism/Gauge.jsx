"use client";
import React from "react";

/**
 * PRISM Gauge — jauge circulaire style TradeXNova (NOVA Score).
 * Arc de 270° avec ouverture en bas, remplissage proportionnel à value/max,
 * chiffre gros au centre + label PRISM + sublabel optionnel.
 *
 * Props:
 *   value       : Number — valeur actuelle (0..max)
 *   max         : Number — max (défaut 100)
 *   label       : String — libellé sous le chiffre (défaut "PRISM")
 *   sublabel    : String — libellé secondaire (ex: "Based on 7 trades")
 *   size        : Number — diamètre en px (défaut 160)
 *   strokeWidth : Number — épaisseur de l'arc (défaut 8)
 *   className   : String
 */
export default function Gauge({
  value = 0,
  max = 100,
  label = "PRISM",
  sublabel,
  size = 160,
  strokeWidth = 8,
  className = "",
}) {
  const clamped = Math.max(0, Math.min(value, max));
  const pct = max > 0 ? clamped / max : 0;

  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // Arc de 270° avec ouverture en bas.
  // Start = 225° (bas-gauche, 7h30), end = 495° (bas-droit, 4h30) via le haut.
  const startAngle = 225;
  const arcSpan = 270;
  const endAngle = startAngle + arcSpan * pct;
  const fullEndAngle = startAngle + arcSpan;

  const polarToCartesian = (centerX, centerY, r, angleDeg) => {
    const angleRad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: centerX + r * Math.cos(angleRad),
      y: centerY + r * Math.sin(angleRad),
    };
  };

  const describeArc = (startAngleDeg, endAngleDeg) => {
    const start = polarToCartesian(cx, cy, radius, startAngleDeg);
    const end = polarToCartesian(cx, cy, radius, endAngleDeg);
    const largeArcFlag = endAngleDeg - startAngleDeg > 180 ? "1" : "0";
    // sweep-flag = 1 → arc dans le sens des angles croissants (clockwise)
    return [
      "M", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 1, end.x, end.y,
    ].join(" ");
  };

  const bgArc = describeArc(startAngle, fullEndAngle);
  const fgArc = pct > 0 ? describeArc(startAngle, endAngle) : null;

  return (
    <div className={`relative inline-flex flex-col items-center justify-center ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <path
          d={bgArc}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {fgArc && (
          <path
            d={fgArc}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 8px rgba(59,130,246,0.5))" }}
          />
        )}
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
      >
        <span className="text-4xl font-bold text-white tabular-nums leading-none">
          {Math.round(clamped)}
        </span>
        {label && (
          <span className="text-[10px] font-semibold tracking-[0.15em] text-prism-accent uppercase mt-1">
            {label}
          </span>
        )}
      </div>
      {sublabel && (
        <div className="mt-3 text-xs text-prism-muted2 text-center">{sublabel}</div>
      )}
    </div>
  );
}
