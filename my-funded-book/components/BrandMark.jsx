// Logo MyTradeBook : un prisme qui décompose un faisceau en courbe ascendante
// (le journal transforme tes trades bruts en lecture claire).
export function PrismGlyph({ size = 28, animated = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="mtb-prism-fill" x1="11" y1="4" x2="11" y2="23" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--prism-accent)" stopOpacity=".28" />
          <stop offset="1" stopColor="var(--prism-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M1 15.5 8.2 13.6" stroke="rgba(255,255,255,.55)" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M11 3.5 3.5 22.5h15L11 3.5Z" fill="url(#mtb-prism-fill)" stroke="rgba(255,255,255,.92)" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14.4 13.2 18.6 15.4l3.4-5 5-5" stroke="var(--prism-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={animated ? "brand-beam" : undefined} />
      <circle cx="27" cy="5.4" r="1.3" fill="var(--prism-accent)" />
    </svg>
  );
}

export default function BrandMark({ className = "", compact = false, variant = "full", size = 28 }) {
  const markOnly = compact || variant === "mark";
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <PrismGlyph size={size} />
      {!markOnly && (
        <span className="font-display text-[15px] font-semibold uppercase leading-none tracking-[.16em] text-prism-text">
          MyTrade<span className="text-[var(--prism-accent)]">Book</span>
        </span>
      )}
    </span>
  );
}
