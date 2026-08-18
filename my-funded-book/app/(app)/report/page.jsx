"use client";

import { useState } from "react";
import { useBook } from "@/components/BookProvider";
import { Sparkles, Copy, Download } from "lucide-react";

const PERIODS = [
  { v: "week", fr: "Semaine", en: "Week" },
  { v: "month", fr: "Mois", en: "Month" },
  { v: "year", fr: "Année", en: "Year" },
  { v: "all", fr: "Tout", en: "All" },
];

function Inline({ text }) {
  const parts = String(text).split(/\*\*/);
  return parts.map((p, i) =>
    i % 2 === 1 ? <strong key={i} className="text-white">{p}</strong> : <span key={i}>{p}</span>
  );
}

function Report({ text }) {
  const lines = String(text).split("\n");
  return (
    <div className="text-[13.5px] leading-relaxed text-muted">
      {lines.map((raw, i) => {
        const line = raw.replace(/\s+$/, "");
        if (!line.trim()) return <div key={i} className="h-2" />;
        const isHeading =
          /^#{1,3}\s/.test(line) ||
          /^\d+\.\s/.test(line) ||
          (line.length >= 6 && line === line.toUpperCase() && /[A-ZÀ-Ÿ]/.test(line));
        if (isHeading) {
          const clean = line.replace(/^#{1,3}\s/, "");
          return (
            <h3 key={i} className="mt-4 border-b border-line pb-1.5 text-[13px] font-extrabold uppercase tracking-wide text-accent">
              <Inline text={clean} />
            </h3>
          );
        }
        if (/^[-*]\s/.test(line)) {
          return (
            <div key={i} className="mt-1 flex gap-2 pl-1">
              <span className="text-accent">•</span>
              <span><Inline text={line.replace(/^[-*]\s/, "")} /></span>
            </div>
          );
        }
        return <p key={i} className="mt-1.5"><Inline text={line} /></p>;
      })}
    </div>
  );
}

export default function ReportPage() {
  const { lang } = useBook();
  const L = lang === "en" ? "en" : "fr";
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState("");
  const [err, setErr] = useState("");

  async function generate() {
    setLoading(true);
    setErr("");
    setReport("");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const map = {
          no_trades: L === "en" ? "No trades over this period." : "Aucun trade sur cette période.",
          missing_groq_key: L === "en" ? "AI key not configured (GROQ_API_KEY)." : "Clé IA non configurée (GROQ_API_KEY).",
          unauthenticated: L === "en" ? "Session expired, reconnect." : "Session expirée, reconnecte-toi.",
        };
        setErr(map[data.error] || data.error || (L === "en" ? "Error" : "Erreur"));
        return;
      }
      setReport(data.report || "");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  function copyReport() {
    if (report && navigator.clipboard) navigator.clipboard.writeText(report);
  }
  function downloadReport() {
    const a = document.createElement("a");
    a.href = "data:text/plain;charset=utf-8," + encodeURIComponent(report);
    a.download = `rapport-mytradebook-${period}.txt`;
    a.click();
  }

  return (
    <div className="mx-auto max-w-[760px]">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-[18px] font-extrabold">
          <Sparkles size={18} className="text-accent" /> {L === "en" ? "AI Report" : "Rapport IA"}
        </h2>
        <div className="mt-0.5 text-[12px] text-muted2">
          {L === "en" ? "AI analysis of your trading over a period." : "Analyse IA de ton trading sur une période."}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-panel p-4">
        <div className="flex flex-wrap gap-1.5">
          {PERIODS.map((p) => (
            <button key={p.v} onClick={() => setPeriod(p.v)} disabled={loading}
              className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold ${period === p.v ? "border-accent bg-accentDim text-accent" : "border-line2 bg-panel2 text-muted2 hover:text-white"}`}>
              {L === "en" ? p.en : p.fr}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button onClick={generate} disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[12px] font-bold text-black hover:brightness-110 disabled:opacity-60">
          <Sparkles size={14} /> {loading ? (L === "en" ? "Generating…" : "Génération…") : (L === "en" ? "Generate report" : "Générer mon rapport")}
        </button>
      </div>

      {err && (
        <div className="mb-4 rounded-xl border border-dashed border-line bg-panel/50 p-4 text-[12.5px]" style={{ color: "#ff3b5c" }}>
          {err}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-line bg-panel p-10 text-center text-[13px] text-muted2">
          {L === "en" ? "The AI is analyzing your trades…" : "L'IA analyse tes trades…"}
        </div>
      )}

      {report && !loading && (
        <div className="rounded-2xl border border-line bg-panel p-5">
          <div className="mb-3 flex items-center justify-end gap-2">
            <button onClick={copyReport} className="inline-flex items-center gap-1.5 rounded-lg border border-line2 bg-panel2 px-2.5 py-1.5 text-[11px] font-semibold text-muted2 hover:text-white">
              <Copy size={12} /> {L === "en" ? "Copy" : "Copier"}
            </button>
            <button onClick={downloadReport} className="inline-flex items-center gap-1.5 rounded-lg border border-line2 bg-panel2 px-2.5 py-1.5 text-[11px] font-semibold text-muted2 hover:text-white">
              <Download size={12} /> {L === "en" ? "Download" : "Télécharger"}
            </button>
          </div>
          <Report text={report} />
          <div className="mt-4 border-t border-line pt-3 text-[10.5px] text-muted2">
            {L === "en"
              ? "Generated by AI from your logged trades. Not financial advice."
              : "Généré par IA à partir de tes trades loggés. Ne constitue pas un conseil financier."}
          </div>
        </div>
      )}
    </div>
  );
}
