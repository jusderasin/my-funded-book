"use client";

// Petit personnage en SVG pour chaque agent PRISM (style figurine, sans 3D).
// look = { skin, hair, style: short|long|curly|bun|bald, outfit, glasses }
export const HAIR_STYLES = ["short", "long", "curly", "bun", "bald"];

function Hair({ style, color }) {
  if (style === "bald") return null;
  if (style === "long") return <path d="M17 27c0-11 7-17 15-17s15 6 15 17v19c-3 0-5-2-5-6V29c-4-1-7-4-9-7-3 4-8 7-13 7v11c0 4-2 6-5 6V27Z" fill={color} />;
  if (style === "curly") return <g fill={color}>{[[20, 22], [26, 15], [33, 12], [40, 15], [45, 22], [18, 30], [46, 30]].map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="6.5" />)}</g>;
  if (style === "bun") return <g fill={color}><circle cx="32" cy="8" r="6" /><path d="M17 28c0-10 7-16 15-16s15 6 15 16c-4-1-8-4-10-8-3 4-12 8-20 8Z" /></g>;
  return <path d="M17 28c0-10 7-16 15-16s15 6 15 16c-5 0-10-3-13-7-4 4-11 7-17 7Z" fill={color} />;
}

export default function AgentAvatar({ look, size = 56, active = false, idle = true }) {
  const { skin = "#f1c7a5", hair = "#2b1d16", style = "short", outfit = "var(--prism-accent)", glasses = false } = look || {};
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={idle ? "agent-idle" : undefined}>
      {active && <ellipse cx="32" cy="60" rx="20" ry="3.5" fill="none" stroke="var(--prism-accent)" strokeOpacity=".7" strokeWidth="1.5" className="agent-ring" />}
      <ellipse cx="32" cy="60" rx="13" ry="2.5" fill="#000" opacity=".35" />
      {/* Corps */}
      <path d="M18 58c0-10 6-16 14-16s14 6 14 16Z" fill={outfit} />
      <path d="M28 42h8l-4 7Z" fill="#fff" opacity=".85" />
      <rect x="22" y="51" width="5" height="3" rx="1" fill="#000" opacity=".18" />
      {/* Tête */}
      <rect x="28.5" y="36" width="7" height="7" rx="2" fill={skin} />
      <circle cx="32" cy="27" r="14" fill={skin} />
      <Hair style={style} color={hair} />
      <circle cx="26.5" cy="29" r="1.8" fill="#1a1a1a" />
      <circle cx="37.5" cy="29" r="1.8" fill="#1a1a1a" />
      <path d="M28.5 34.5c2 1.6 5 1.6 7 0" stroke="#1a1a1a" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <circle cx="23" cy="33" r="2.2" fill="#ff7a7a" opacity=".25" />
      <circle cx="41" cy="33" r="2.2" fill="#ff7a7a" opacity=".25" />
      {glasses && <g fill="none" stroke="#111" strokeWidth="1.4"><circle cx="26.5" cy="29" r="4" /><circle cx="37.5" cy="29" r="4" /><path d="M30.5 29h3" /></g>}
    </svg>
  );
}
