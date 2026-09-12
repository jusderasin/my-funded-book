"use client";
import React from "react";

/**
 * PRISM Button — variants Primary (blanc), Ghost (transparent bordé), Icon.
 * Style TradeXNova : bouton blanc pur / texte noir pour Primary, bordure
 * white/8 pour Ghost, coins arrondis 2xl ou pill.
 *
 * Props:
 *   variant   : "primary" | "ghost" | "icon" (défaut "primary")
 *   size      : "sm" | "md" | "lg" (défaut "md")
 *   pill      : Boolean — rounded-full au lieu de rounded-2xl
 *   icon      : ReactNode — icône lucide à gauche
 *   iconRight : ReactNode — icône lucide à droite
 *   loading   : Boolean — disable + affiche un point pulse à la place
 *   children  : ReactNode
 *   className : String
 *   ...rest passe au <button>
 */
export default function Button({
  variant = "primary",
  size = "md",
  pill = false,
  icon,
  iconRight,
  loading = false,
  children,
  className = "",
  disabled,
  ...rest
}) {
  const sizeClasses = {
    sm: "h-9 px-3 text-sm gap-1.5",
    md: "h-11 px-5 text-sm gap-2",
    lg: "h-14 px-8 text-base gap-2.5",
  };
  const sizeCls = sizeClasses[size] || sizeClasses.md;

  const variantClasses = {
    primary: "bg-white text-black hover:bg-white/90 active:bg-white/80 shadow-prism-card",
    ghost:   "bg-transparent text-white border border-prism-line hover:bg-white/[0.03] hover:border-prism-line2",
    icon:    "bg-prism-panel border border-prism-line hover:border-prism-line2 text-prism-muted hover:text-white",
  };
  const variantCls = variantClasses[variant] || variantClasses.primary;

  const radiusCls = pill ? "rounded-full" : "rounded-2xl";
  const iconOnly = variant === "icon" && !children;

  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${iconOnly ? "h-10 w-10 p-0" : sizeCls} ${variantCls} ${radiusCls} ${className}`}
      {...rest}
    >
      {loading ? (
        <span className="inline-flex h-2 w-2 rounded-full bg-current animate-pulse" />
      ) : (
        <>
          {icon && <span className="inline-flex shrink-0">{icon}</span>}
          {children}
          {iconRight && <span className="inline-flex shrink-0">{iconRight}</span>}
        </>
      )}
    </button>
  );
}
