export default function BrandMark({ className = "", compact = false, variant = "full", size = 28 }) {
  const markOnly = compact || variant === "mark";
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <rect x=".5" y=".5" width="27" height="27" rx="7" fill="#0e0e11" stroke="rgba(255,255,255,.18)" />
        <path d="M5 18.5V9.5l4.5 5 4.5-7 4.5 7 4.5-5v9" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {!markOnly && <span className="text-[13px] font-extrabold tracking-[.22em] text-prism-text">MYTRADE<span className="text-[#06b6d4]">BOOK</span></span>}
    </span>
  );
}
