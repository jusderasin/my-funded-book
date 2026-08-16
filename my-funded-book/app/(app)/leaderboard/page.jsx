"use client";

import { useEffect, useMemo, useState } from "react";
import { useBook } from "@/components/BookProvider";
import { createClient } from "@/lib/supabase/client";
import { Trophy, Camera, Info } from "lucide-react";

const MEDAL = ["#f5b301", "#c3ccd6", "#cd7f3f"];

export default function LeaderboardPage() {
  const { profile, saveProfile, lang } = useBook();
  const supabase = useMemo(() => createClient(), []);
  const L = lang === "en" ? "en" : "fr";
  const [period, setPeriod] = useState("month");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const optedIn = !!profile?.leaderboard_opt_in;

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_leaderboard", { p_period: period });
    if (!error) setRows(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [period]);

  async function toggleOptIn() {
    setSaving(true);
    await saveProfile({ leaderboard_opt_in: !optedIn });
    setSaving(false);
    load();
  }

  const myRow = rows.find((r) => r.user_id === profile?.id);

  const fmtR = (v) => (v > 0 ? "+" : "") + Number(v).toFixed(2) + "R";
  const fmtPnl = (v) => (v > 0 ? "+" : "") + Number(v).toLocaleString(L === "en" ? "en-US" : "fr-FR", { maximumFractionDigits: 0 }) + " $";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[16px] font-extrabold">
            <Trophy size={18} className="text-accent" /> {L === "en" ? "Leaderboard" : "Classement"}
          </h2>
          <div className="mt-0.5 text-[12px] text-muted2">
            {L === "en" ? "Ranked by cumulative R over the period." : "Classé sur le R cumulé de la période."}
          </div>
        </div>
        <div className="flex gap-1.5">
          {["week", "month", "year"].map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold ${period === p ? "border-accent bg-accentDim text-accent" : "border-line2 bg-panel2 text-muted2 hover:text-white"}`}>
              {p === "week" ? (L === "en" ? "This week" : "Semaine") : p === "month" ? (L === "en" ? "This month" : "Mois") : (L === "en" ? "This year" : "Année")}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel p-4">
        <div className="flex items-start gap-2">
          <Trophy size={16} className={optedIn ? "text-accent" : "text-muted2"} />
          <div>
            <div className="text-[13px] font-bold">{optedIn ? (L === "en" ? "You're in the ranking" : "Tu participes au classement") : (L === "en" ? "Join the ranking" : "Rejoins le classement")}</div>
            <div className="mt-0.5 text-[11.5px] text-muted2">
              {L === "en" ? "Only trades with a screenshot count. Min 3 in the period." : "Seuls les trades avec capture comptent. Minimum 3 sur la période."}
            </div>
          </div>
        </div>
        <button onClick={toggleOptIn} disabled={saving}
          className={`rounded-lg px-4 py-2 text-[12px] font-bold ${optedIn ? "border border-line2 bg-panel2 text-muted2 hover:text-white" : "bg-accent text-black hover:brightness-110"}`}>
          {saving ? "…" : optedIn ? (L === "en" ? "Leave" : "Quitter") : (L === "en" ? "Join" : "Participer")}
        </button>
      </div>

      {optedIn && !myRow && !loading && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-dashed border-line bg-panel/50 p-3 text-[12px] text-muted2">
          <Camera size={14} className="shrink-0 text-accent" />
          {L === "en" ? "Not eligible yet — you need at least 3 screenshotted trades this period." : "Pas encore éligible — il te faut au moins 3 trades avec capture sur cette période."}
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-[13px] text-muted2">…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-line bg-panel p-10 text-center">
          <div className="text-3xl">🏆</div>
          <div className="mt-2 text-[15px] font-bold">{L === "en" ? "No one ranked yet" : "Personne au classement"}</div>
          <div className="mx-auto mt-1 max-w-[420px] text-[12.5px] text-muted2">
            {L === "en" ? "Be the first — join and log screenshotted trades." : "Sois le premier — participe et logge des trades avec capture."}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-panel">
          <div className="flex items-center gap-3 border-b border-line px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted2">
            <span className="w-8 text-center">#</span>
            <span className="flex-1">Trader</span>
            <span className="w-16 text-right">Win</span>
            <span className="w-20 text-right">R</span>
            <span className="w-24 text-right">PnL</span>
          </div>
          {rows.map((r, i) => {
            const me = r.user_id === profile?.id;
            const medal = i < 3 ? MEDAL[i] : null;
            return (
              <div key={r.user_id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-line" : ""} ${me ? "bg-accentDim" : ""}`}>
                <span className="w-8 text-center">
                  {medal ? (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-extrabold text-black" style={{ background: medal }}>{i + 1}</span>
                  ) : (
                    <span className="font-mono text-[13px] text-muted2">{i + 1}</span>
                  )}
                </span>
                <span className="flex-1 truncate">
                  <span className={`text-[13.5px] font-semibold ${me ? "text-accent" : "text-white"}`}>{r.name || "trader"}</span>
                  {me && <span className="ml-2 text-[10px] uppercase tracking-wide text-accent">{L === "en" ? "you" : "toi"}</span>}
                  <span className="ml-2 font-mono text-[10px] text-muted2">{r.n_trades} tr</span>
                </span>
                <span className="w-16 text-right font-mono text-[12.5px] text-muted">{Number(r.win_rate).toFixed(0)}%</span>
                <span className="w-20 text-right font-mono text-[13px] font-bold" style={{ color: r.total_r >= 0 ? "#00d301" : "#ff3b5c" }}>{fmtR(r.total_r)}</span>
                <span className="w-24 text-right font-mono text-[12px]" style={{ color: r.total_pnl >= 0 ? "#8a93a6" : "#ff3b5c" }}>{fmtPnl(r.total_pnl)}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex items-start gap-1.5 rounded-xl border border-dashed border-line bg-panel/50 p-3 text-[11px] text-muted2">
        <Info size={13} className="mt-0.5 shrink-0" />
        {L === "en"
          ? "Self-reported ranking, based only on trades with a screenshot. Not broker-verified."
          : "Classement auto-déclaré, basé uniquement sur les trades avec capture. Non vérifié auprès d'un broker."}
      </div>
    </div>
  );
}
