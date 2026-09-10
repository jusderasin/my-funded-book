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
