"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useBook } from "@/components/BookProvider";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Camera, Award, Info } from "lucide-react";

const TIER_COLOR = ["#cd7f3f", "#c3ccd6", "#f5b301", "#ff66e4", "#00d301"];

function badgeLabel(id) {
  if (!id) return "Badge";
  return String(id).replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PublicProfilePage() {
  const { id } = useParams();
  const { profile, lang } = useBook();
  const supabase = useMemo(() => createClient(), []);
  const L = lang === "en" ? "en" : "fr";
  const [data, setData] = useState(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: res, error } = await supabase.rpc("get_public_profile", { p_user_id: id });
      if (!alive) return;
      setData(error ? null : res ?? null);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [id]);

  const isMe = data && profile?.id === data.user_id;

  const fmtR = (v) => (v > 0 ? "+" : "") + Number(v).toFixed(2) + "R";
  const fmtPnl = (v) =>
    (v > 0 ? "+" : "") +
    Number(v).toLocaleString(L === "en" ? "en-US" : "fr-FR", { maximumFractionDigits: 0 }) +
    " $";
  const fmtDate = (s) => {
    if (!s) return "—";
    try {
      return new Date(s).toLocaleDateString(L === "en" ? "en-US" : "fr-FR", { month: "long", year: "numeric" });
    } catch {
      return "—";
    }
  };

  const back = (
    <Link href="/leaderboard" className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted2 hover:text-white">
      <ArrowLeft size={14} /> {L === "en" ? "Back to leaderboard" : "Retour au classement"}
    </Link>
  );

  if (loading) {
    return <div>{back}<div className="py-10 text-center text-[13px] text-muted2">…</div></div>;
  }

  if (!data) {
    return (
      <div>
        {back}
        <div className="rounded-2xl border border-line bg-panel p-10 text-center">
          <div className="text-3xl">🔒</div>
          <div className="mt-2 text-[15px] font-bold">{L === "en" ? "Profile not available" : "Profil indisponible"}</div>
          <div className="mx-auto mt-1 max-w-[420px] text-[12.5px] text-muted2">
            {L === "en"
              ? "This trader isn't in the ranking, or the profile is private."
              : "Ce trader ne participe pas au classement, ou son profil est privé."}
          </div>
        </div>
      </div>
    );
  }

  const badges = Array.isArray(data.badges) ? data.badges : [];
  const hasTrades = Number(data.n_trades) > 0;
  const initial = (data.name || "?").trim().charAt(0).toUpperCase();

  const kpis = [
    { label: L === "en" ? "Verified trades" : "Trades vérifiés", value: data.n_trades },
    { label: "Win rate", value: Number(data.win_rate).toFixed(0) + "%" },
    { label: L === "en" ? "Cumulative R" : "R cumulé", value: fmtR(data.total_r), color: data.total_r >= 0 ? "#00d301" : "#ff3b5c" },
    { label: "PnL", value: fmtPnl(data.total_pnl), color: data.total_pnl >= 0 ? "#8a93a6" : "#ff3b5c" },
    { label: L === "en" ? "Best" : "Meilleur", value: data.best_r == null ? "—" : fmtR(data.best_r), color: "#00d301" },
    { label: L === "en" ? "Worst" : "Pire", value: data.worst_r == null ? "—" : fmtR(data.worst_r), color: "#ff3b5c" },
  ];

  return (
    <div>
      {back}

      <div className="mb-4 flex items-center gap-4 rounded-2xl border border-line bg-panel p-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-[24px] font-extrabold text-white"
          style={{ background: "linear-gradient(135deg, #612499, #ff66e4)" }}>
          {initial}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-[18px] font-extrabold text-white">{data.name || "trader"}</h2>
            {isMe && <span className="text-[10px] uppercase tracking-wide text-accent">{L === "en" ? "you" : "toi"}</span>}
          </div>
          <div className="mt-0.5 text-[12px] text-muted2">
            {L === "en" ? "Member since" : "Membre depuis"} {fmtDate(data.member_since)} · {badges.length} badges
          </div>
        </div>
      </div>

      {hasTrades ? (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-line bg-panel p-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted2">{k.label}</div>
              <div className="mt-1 font-mono text-[18px] font-extrabold" style={k.color ? { color: k.color } : undefined}>{k.value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-dashed border-line bg-panel/50 p-4 text-[12px] text-muted2">
          <Camera size={14} className="shrink-0 text-accent" />
          {L === "en"
            ? "No verified trades yet (trades need a screenshot to count)."
            : "Aucun trade vérifié pour l'instant (un trade doit avoir une capture pour compter)."}
        </div>
      )}

      <div className="rounded-2xl border border-line bg-panel p-5">
        <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted2">
          <Award size={13} className="text-accent" /> Badges
        </div>
        {badges.length === 0 ? (
          <div className="text-[12.5px] text-muted2">{L === "en" ? "No badge unlocked yet." : "Aucun badge débloqué pour l'instant."}</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {badges.map((b, idx) => {
              const t = Math.max(0, Math.min(TIER_COLOR.length - 1, (Number(b.tier) || 1) - 1));
              const c = TIER_COLOR[t];
              return (
                <span key={(b.badge_id || "b") + idx}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold"
                  style={{ borderColor: c + "55", background: c + "14", color: c }}>
                  <Award size={12} /> {badgeLabel(b.badge_id)}
                  <span className="font-mono text-[10px] opacity-80">T{b.tier ?? 1}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-start gap-1.5 rounded-xl border border-dashed border-line bg-panel/50 p-3 text-[11px] text-muted2">
        <Info size={13} className="mt-0.5 shrink-0" />
        {L === "en"
          ? "Public stats, based only on trades with a screenshot. Self-reported, not broker-verified."
          : "Stats publiques, basées uniquement sur les trades avec capture. Auto-déclaré, non vérifié auprès d'un broker."}
      </div>
    </div>
  );
}
