"use client";

// Carte d'insight utilisée par la page /insights ("Rapport IA").
// Ce composant avait été supprimé du repo alors que la page qui l'utilise
// (app/(app)/insights/page.jsx) l'importe toujours à 7 endroits — d'où le
// "Module not found" qui cassait le build. Recréé ici avec exactement la même
// API (props) que celle attendue par la page, pour ne pas avoir à toucher
// à sa logique.
//
// Props :
//   icon          — emoji (string)
//   statusLabel   — libellé court affiché à côté de l'icône
//   statusColor   — classe Tailwind de couleur pour statusLabel (ex: "text-loss", "text-accent")
//   title         — titre de la carte
//   metric1/2/3   — { label, value, change } (change optionnel : "↑" | "↓" | null)
//   recommendation— texte de recommandation (string)
//   variant       — "critical" | "warning" | "success" | défaut neutre

const VARIANT_STYLES = {
  critical: { border: "border-loss/30", glow: "bg-lossDim", bar: "bg-loss" },
  warning: { border: "border-goldx/30", glow: "color-mix(in srgb, #f5b301 12%, transparent)", bar: "bg-goldx" },
  success: { border: "border-accent/30", glow: "bg-accentDim", bar: "bg-accent" },
  default: { border: "border-line", glow: "transparent", bar: "bg-line2" },
};

function Metric({ m }) {
  if (!m) return null;
  return (
    <div className="rounded-lg border border-line bg-ink2/40 px-2.5 py-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-muted2">{m.label}</div>
      <div className="mt-0.5 flex items-baseline gap-1 font-mono text-[13px] font-extrabold text-white">
        {m.value}
        {m.change != null && (
          <span className={m.change === "↑" ? "text-accent" : m.change === "↓" ? "text-loss" : "text-muted2"}>
            {m.change}
          </span>
        )}
      </div>
    </div>
  );
}

export default function NovaInsightCard({
  icon,
  statusLabel,
  statusColor = "text-muted2",
  title,
  metric1,
  metric2,
  metric3,
  recommendation,
  variant = "default",
}) {
  const v = VARIANT_STYLES[variant] || VARIANT_STYLES.default;
  return (
    <div className={`relative overflow-hidden rounded-2xl border ${v.border} bg-panel p-4`}>
      <div className={`absolute inset-x-0 top-0 h-[3px] ${v.bar}`} />
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[18px] leading-none">{icon}</span>
        <span className={`text-[10px] font-bold uppercase tracking-widest ${statusColor}`}>{statusLabel}</span>
      </div>
      <h3 className="mb-3 text-[14px] font-extrabold text-white">{title}</h3>
      <div className="mb-3 grid grid-cols-3 gap-2">
        <Metric m={metric1} />
        <Metric m={metric2} />
        <Metric m={metric3} />
      </div>
      {recommendation && (
        <div className="rounded-lg border border-line bg-ink2/30 p-2.5 text-[11.5px] leading-relaxed text-muted">
          {recommendation}
        </div>
      )}
    </div>
  );
}
