"use client";
import React from "react";

/**
 * PRISM Card — primitive de base pour tous les blocs UI look TradeXNova.
 * Fond très sombre (bg-prism-panel), bordure subtile blanche/8, coins arrondis
 * 2xl. Options : glow bleu (`glow`) et effet verre dépoli (`glass`).
 *
 * Props:
 *   glow      : Boolean — ajoute une lueur bleue autour de la carte
 *   glass     : Boolean — fond semi-transparent + backdrop blur
 *   padding   : String  — classes Tailwind (défaut "p-6")
 *   className : String
 *   children, ...rest : passés au <div>
 */
export default function Card({
  children,
  className = "",
  glow = false,
  glass = false,
  padding = "p-6",
  ...rest
}) {
  const base = "rounded-2xl border border-prism-line bg-prism-panel transition-all";
  const glassCls = glass ? "prism-glass" : "";
  const glowCls = glow ? "prism-glow-blue" : "";

  return (
    <div
      className={`${base} ${glassCls} ${glowCls} ${padding} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
