"use client";
import React from "react";
import Card from "./Card";

/**
 * PRISM StatCard — carte de KPI style TradeXNova.
 * Structure : icône bleue optionnelle + label muted + valeur MASSIVE en blanc
 * + hint muted2 optionnel en dessous.
 *
 * Props:
 *   label     : String — label court en haut (ex: "Total P&L")
 *   value     : String | Number — valeur principale (ex: "$5,000.00", "50.0%")
 *   hint      : String — précision en bas (ex: "4 trades")
 *   icon      : ReactNode — icône lucide-react optionnelle (rendue dans un badge)
 *   tone      : "default" | "win" | "loss" | "accent" — couleur de la valeur
 *   size      : "sm" | "md" | "lg" — taille de la valeur
 *   className : String
 */
export default function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
  size = "md",
  className = "",
}) {
  const toneClasses = {
    default: "text-white",
    win: "text-prism-win",
    loss: "text-prism-loss",
    accent: "text-prism-accent",
  };
  const toneClass = toneClasses[tone] || toneClasses.default;

  const sizeClasses = {
    sm: "text-2xl",
    md: "text-3xl",
    lg: "text-4xl",
  };
  const valueSize = sizeClasses[size] || sizeClasses.md;

  return (
    <Card padding="p-5" className={className}>
      {(icon || label) && (
        <div className="flex items-center gap-2 mb-3">
          {icon && (
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-prism-accentDim text-prism-accent">
              {icon}
            </span>
          )}
          {label && (
            <span className="text-xs font-medium text-prism-muted">{label}</span>
          )}
        </div>
      )}
      <div className={`${valueSize} font-bold tracking-tight tabular-nums ${toneClass}`}>
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-xs text-prism-muted2">{hint}</div>
      )}
    </Card>
  );
}
