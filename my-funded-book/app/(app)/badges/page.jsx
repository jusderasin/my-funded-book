"use client";

import { useEffect, useMemo, useState } from "react";
import { useBook } from "@/components/BookProvider";
import { createClient } from "@/lib/supabase/client";
import { computeBadges, badgeSummary, TIER_NAMES } from "@/lib/badges";

const TIER_COLOR = ["#3a3f4a", "#cd7f3f", "#c3ccd6", "#f5b301", "#00d301", "#ff66e4"];
const TIER_GLYPH = ["#6b7280", "#e0975a", "#dfe6ec", "#ffd54a", "#3ef05a", "#ff9ff0"];

function Emblem({ type, color }) {
  const s = { fill: "none", stroke: color, strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (type) {
    case "shield": return <g><path d="M0 -10 L8 -6 L8 4 Q8 11 0 14 Q-8 11 -8 4 L-8 -6 Z" {...s} /><path d="M-4 0 L-1 3 L5 -5" {...s} strokeWidth={2.1} /></g>;
    case "lines": return <path d="M-7 -6 h14 M-7 0 h14 M-7 6 h9" {...s} />;
    case "drop": return <path d="M0 -11 Q7 0 7 4 A7 7 0 1 1 -7 4 Q-7 0 0 -11 Z" {...s} />;
    case "R": return <text x="0" y="6" textAnchor="middle" style={{ fontFamily: "sans-serif", fontSize: 18, fontWeight: 600, fill: color }}>R</text>;
    case "target": return <g><circle r="9" {...s} /><circle r="3" style={{ fill: color }} /></g>;
    case "flame": return <path d="M-6 6 Q-6 -2 0 -10 Q2 -3 5 -1 Q8 3 5 6 A6 6 0 0 1 -6 6 Z" {...s} />;
    case "flask": return <path d="M-4 -9 h8 M-3 -9 v6 L-8 8 a2 2 0 0 0 2 3 h12 a2 2 0 0 0 2 -3 L3 -3 v-6 M-6 4 h12" {...s} />;
    case "bank": return <path d="M-9 -4 L0 -9 L9 -4 M-7 -2 v8 M0 -2 v8 M7 -2 v8 M-9 7 h18" {...s} strokeWidth={1.7} />;
    case "calendar": return <g><rect x="-8" y="-7" width="16" height="14" rx="2" {...s} /><path d="M-8 -3 h16 M-4 -10 v4 M4 -10 v4" {...s} /></g>;
    case "hourglass": return <path d="M-7 -9 h14 M-7 9 h14 M-7 -9 L7 9 M7 -9 L-7 9" {...s} strokeWidth={1.7} />;
    case "star": return <path d="M0 -10 L2.4 -3 L9 -3 L3.8 1 L5.8 8 L0 4 L-5.8 8 L-3.8 1 L-9 -3 L-2.4 -3 Z" {...s} />;
    case "hash": return <path d="M-6 -8 L-8 8 M6 -8 L4 8 M-9 -3 h18 M-9 3 h18" {...s} />;
    case "spark": return <path d="M0 -10 L2 -2 L10 0 L2 2 L0 10 L-2 2 L-10 0 L-2 -2 Z" {...s} />;
    default: return <circle r="4" style={{ fill: color }} />;
  }
}

function BadgeMedal({ tier }) {
  const c = TIER_COLOR[tier];
  const g = TIER_GLYPH[tier];
  if (tier <= 0) {
    return (
      <g>
        <path d="M46 60 L64 60 L64 78 Q64 92 46 100 Q28 92 28 78 L28 60 Z" fill="#14171c" stroke="#3a3f4a" strokeWidth="2.2" />
      </g>
    );
  }
  if (tier === 1) return <path d="M46 60 L64 60 L64 78 Q64 92 46 100 Q28 92 28 78 L28 60 Z" fill="#14171c" stroke={c} strokeWidth="2.4" />;
  if (tier === 2) return (
    <g>
      <path d="M46 60 L64 60 L64 78 Q64 92 46 100 Q28 92 28 78 L28 60 Z" fill="#14171c" stroke={c} strokeWidth="2.4" />
      <path d="M30 66 Q22 80 30 96" fill="none" stroke="#8a93a6" strokeWidth="1.3" strokeDasharray="2 3" />
      <path d="M62 66 Q70 80 62 96" fill="none" stroke="#8a93a6" strokeWidth="1.3" strokeDasharray="2 3" />
    </g>
  );
  if (tier === 3) return (
    <g>
      <circle cx="46" cy="80" r="21" fill="none" stroke={c} strokeWidth="6" strokeDasharray="2 6" />
      <circle cx="46" cy="80" r="17.5" fill="#1c1808" stroke={c} strokeWidth="1.4" />
    </g>
  );
  if (tier === 4) return (
    <g>
      <path d="M70 80 L58 100.8 L34 100.8 L22 80 L34 59.2 L58 59.2 Z" fill="#0c1a10" stroke={c} strokeWidth="2.4" />
      <g fill={c}><circle cx="70" cy="80" r="2.2" /><circle cx="22" cy="80" r="2.2" /><circle cx="58" cy="100.8" r="2.2" /><circle cx="34" cy="100.8" r="2.2" /><circle cx="58" cy="59.2" r="2.2" /><circle cx="34" cy="59.2" r="2.2" /></g>
    </g>
  );
  return (
    <g>
      <path className="badge-pulse" d="M73 80 L59 104.2 L33 104.2 L19 80 L33 55.8 L59 55.8 Z" fill="none" stroke="#ff66e4" strokeWidth="2.4" />
      <path d="M69 80 L57 100.8 L35 100.8 L23 80 L35 59.2 L57 59.2 Z" fill="#1a0c18" stroke="#00d301" strokeWidth="1.9" />
      <g fill="#ff66e4"><circle cx="42" cy="63" r="1.6" /><circle cx="46" cy="61" r="1.6" /><circle cx="50" cy="63" r="1.6" /></g>
    </g>
  );
}

export default function BadgesPage() {
  const { trades, accounts, certificates, profile, lang, notify, t } = useBook();
  const supabase = useMemo(() => createClient(), []);
  const [btCount, setBtCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const L = lang === "en" ? "en" : "fr";

  useEffect(() => {
    (async () => {
      const { count } = await supabase.from("bt_sessions").select("id", { count: "exact", head: true });
      setBtCount(count || 0);
      setLoaded(true);
    })();
  }, [supabase]);

  const badges = useMemo(
    () => computeBadges({ trades, accounts, certificates, profile, btCount }),
    [trades, accounts, certificates, profile, btCount]
  );
  const sum = badgeSummary(badges);

  // Persiste les déblocages + notifie les nouveaux paliers
  useEffect(() => {
    if (!loaded) return;
    (async () => {
      const { data: rows } = await supabase.from("badge_unlocks").select("badge_id, tier");
      const stored = {};
      (rows || []).forEach((r) => { stored[r.badge_id] = r.tier; });
      const ups = [];
      for (const b of badges) {
        const prev = stored[b.id] ?? 0;
        if (b.tier > prev) {
          ups.push({ badge_id: b.id, tier: b.tier, updated_at: new Date().toISOString() });
          if (prev === 0) notify(`\ud83c\udfc5 Badge d\u00e9bloqu\u00e9 : ${b.name[L]} !`);
          else notify(`\u2b06\ufe0f ${b.name[L]} \u2192 ${TIER_NAMES[b.tier][L]} !`);
        }
      }
      if (ups.length) await supabase.from("badge_unlocks").upsert(ups, { onConflict: "user_id,badge_id" });
    })();
  }, [loaded, badges, supabase, L, notify]);

  const CATS = {
    process: L === "en" ? "Process & discipline" : "Process & discipline",
    perf: L === "en" ? "Performance" : "Performance",
    prop: L === "en" ? "Prop firm" : "Prop firm",
    meta: L === "en" ? "Milestones" : "Progression",
  };
  const order = ["process", "perf", "prop", "meta"];

  return (
    <div>
      <style>{`.badge-pulse{animation:bpz 2.6s ease-in-out infinite}@keyframes bpz{0%,100%{opacity:.45}50%{opacity:1}}`}</style>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-panel px-5 py-4">
        <div className="flex items-center gap-2 text-[16px] font-extrabold"><span className="text-accent">🏅</span> {L === "en" ? "Badges" : "Badges"}</div>
        <div className="flex-1" />
        <div className="flex gap-5 text-center">
          <div><div className="font-mono text-[20px] font-extrabold text-accent">{sum.unlocked}<span className="text-muted2">/{sum.total}</span></div><div className="text-[10px] uppercase tracking-wide text-muted2">{L === "en" ? "unlocked" : "débloqués"}</div></div>
          <div><div className="font-mono text-[20px] font-extrabold text-white">{sum.earnedTiers}<span className="text-muted2">/{sum.totalTiers}</span></div><div className="text-[10px] uppercase tracking-wide text-muted2">{L === "en" ? "tiers" : "paliers"}</div></div>
        </div>
      </div>

      {order.map((cat) => {
        const list = badges.filter((b) => b.cat === cat);
        if (!list.length) return null;
        return (
          <div key={cat} className="mb-4">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted2">{CATS[cat]}</div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
              {list.map((b) => {
                const c = TIER_COLOR[b.tier];
                const g = TIER_GLYPH[b.tier];
                return (
                  <div key={b.id} className={`rounded-xl border bg-panel p-3 ${b.unlocked ? "border-line2" : "border-line"}`}>
                    <div className="flex flex-col items-center text-center">
                      <svg width="92" height="118" viewBox="0 0 92 130">
                        <BadgeMedal tier={b.tier} />
                        <g transform="translate(46,80)"><Emblem type={b.emblem} color={g} /></g>
                      </svg>
                      <div className={`text-[12.5px] font-bold ${b.unlocked ? "text-white" : "text-muted2"}`}>{b.name[L]}</div>
                      <div className="mt-0.5 text-[10px]" style={{ color: b.unlocked ? c : "#6b7280" }}>
                        {b.tier > 0 ? TIER_NAMES[b.tier][L] : (L === "en" ? "Locked" : "Verrouillé")}
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-panel2">
                        <div className="h-full rounded-full" style={{ width: `${Math.round(b.progress * 100)}%`, background: b.unlocked ? c : "#3a3f4a" }} />
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-muted2">
                        {b.maxed ? (L === "en" ? "MAX" : "MAX") : `${b.value} / ${b.nextThreshold} ${b.unit}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="mt-2 rounded-xl border border-dashed border-line bg-panel/50 p-3 text-center text-[11px] text-muted2">
        {L === "en" ? "Social badges (trader of the month, leaderboard…) coming with the leaderboard." : "Badges sociaux (trader du mois, classement…) à venir avec le leaderboard."}
      </div>
    </div>
  );
}
