"use client";

import { useState } from "react";
import { useBook } from "@/components/BookProvider";
import { Sparkles, Copy, FileDown } from "lucide-react";

const PERIODS = [
  { v: "week", fr: "Semaine", en: "Week" },
  { v: "month", fr: "Mois", en: "Month" },
  { v: "year", fr: "Année", en: "Year" },
  { v: "all", fr: "Tout", en: "All" },
];

const GREEN = "#00d301";
const RED = "#ff3b5c";
const GRAY = "#8a93a6";

function Inline({ text }) {
  const parts = String(text).split(/\*\*/);
  return parts.map((p, i) => (i % 2 === 1 ? <strong key={i} className="text-white">{p}</strong> : <span key={i}>{p}</span>));
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
          /^\d+[.)]\s/.test(line) ||
          (line.length >= 6 && line === line.toUpperCase() && /[A-ZÀ-Ÿ]/.test(line));
        if (isHeading) {
          const clean = line.replace(/^#{1,3}\s/, "");
          return (
            <h3 key={i} className="mt-4 border-b border-line pb-1.5 text-[12.5px] font-extrabold uppercase tracking-wide text-accent">
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

function Kpi({ label, value, color }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted2">{label}</div>
      <div className="mt-1 font-mono text-[19px] font-extrabold" style={color ? { color } : undefined}>{value}</div>
    </div>
  );
}

function CumChart({ data }) {
  if (!data || data.length < 2) return null;
  const w = 640, h = 150, pad = 8;
  const vals = data.map((d) => d.cumR);
  const min = Math.min(0, ...vals), max = Math.max(0, ...vals);
  const range = max - min || 1;
  const n = data.length;
  const x = (i) => pad + (i / (n - 1)) * (w - 2 * pad);
  const y = (v) => h - pad - ((v - min) / range) * (h - 2 * pad);
  const pts = data.map((d, i) => `${x(i).toFixed(1)},${y(d.cumR).toFixed(1)}`).join(" ");
  const last = vals[vals.length - 1];
  const color = last >= 0 ? GREEN : RED;
  const areaPts = `${x(0).toFixed(1)},${y(min).toFixed(1)} ${pts} ${x(n - 1).toFixed(1)},${y(min).toFixed(1)}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 150 }} preserveAspectRatio="none">
      <line x1={pad} y1={y(0).toFixed(1)} x2={w - pad} y2={y(0).toFixed(1)} stroke="#2a2f3d" strokeWidth="1" strokeDasharray="4 4" />
      <polygon points={areaPts} fill={color} opacity="0.12" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

function BarList({ title, rows, labelKey }) {
  if (!rows || rows.length === 0) return null;
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.r)));
  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted2">{title}</div>
      <div className="flex flex-col gap-2.5">
        {rows.map((r) => {
          const c = r.r >= 0 ? GREEN : RED;
          const bw = Math.max(4, (Math.abs(r.r) / maxAbs) * 100);
          return (
            <div key={r[labelKey]} className="flex items-center gap-2.5">
              <span className="w-24 shrink-0 truncate text-[12px] text-muted2">{r[labelKey]}</span>
              <div className="h-5 flex-1 overflow-hidden rounded-md" style={{ background: "#1e2230" }}>
                <div className="h-full rounded-md" style={{ width: bw + "%", background: c }} />
              </div>
              <span className="w-24 shrink-0 text-right font-mono text-[11.5px] text-muted2">{r.wr}% · <b style={{ color: c }}>{(r.r >= 0 ? "+" : "") + r.r}R</b></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OutcomeBar({ outcomes, lang }) {
  const { TP = 0, SL = 0, BE = 0 } = outcomes || {};
  const tot = TP + SL + BE;
  if (tot === 0) return null;
  const seg = [
    { k: "TP", n: TP, c: GREEN },
    { k: "BE", n: BE, c: GRAY },
    { k: "SL", n: SL, c: RED },
  ];
  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted2">{lang === "en" ? "Exits (TP / BE / SL)" : "Sorties (TP / BE / SL)"}</div>
      <div className="flex h-5 overflow-hidden rounded-md" style={{ background: "#1e2230" }}>
        {seg.map((s) => (s.n > 0 ? <div key={s.k} style={{ width: (s.n / tot) * 100 + "%", background: s.c }} /> : null))}
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-[12px]">
        {seg.map((s) => (
          <span key={s.k} className="flex items-center gap-1.5 text-muted2">
            <span className="h-2 w-2 rounded-full" style={{ background: s.c }} /> {s.k} <b className="font-mono text-white">{s.n}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ReportPage() {
  const { lang, profile } = useBook();
  const L = lang === "en" ? "en" : "fr";
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");

  async function generate() {
    setLoading(true);
    setErr("");
    setRes(null);
    try {
      const r = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const map = {
          no_trades: L === "en" ? "No trades over this period." : "Aucun trade sur cette période.",
          missing_groq_key: L === "en" ? "AI key not configured." : "Clé IA non configurée.",
          unauthenticated: L === "en" ? "Session expired." : "Session expirée, reconnecte-toi.",
        };
        setErr(map[data.error] || data.error || (L === "en" ? "Error" : "Erreur"));
        return;
      }
      setRes(data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  function copyReport() {
    if (res?.report && navigator.clipboard) navigator.clipboard.writeText(res.report);
  }

  function downloadPDF() {
    if (!res) return;
    const s = res.stats;
    const name = profile?.name || "Trader";
    const periodLabel = period === "week" ? "7 derniers jours" : period === "month" ? "Dernier mois" : period === "year" ? "Dernière année" : "Tout l'historique";
    const esc = (str) => String(str).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    const bodyHtml = esc(res.report)
      .split("\n")
      .map((line) => {
        const l = line.replace(/\s+$/, "");
        if (!l.trim()) return "";
        const bolded = l.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        if (/^#{1,3}\s/.test(l) || /^\d+[.)]\s/.test(l)) return `<h3>${bolded.replace(/^#{1,3}\s/, "")}</h3>`;
        if (/^[-*]\s/.test(l)) return `<li>${bolded.replace(/^[-*]\s/, "")}</li>`;
        return `<p>${bolded}</p>`;
      })
      .join("\n");
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Rapport MyTradeBook</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#111;max-width:760px;margin:32px auto;padding:0 24px;line-height:1.55;}
  h1{font-size:22px;margin:0 0 4px;} .sub{color:#666;font-size:13px;margin-bottom:22px;}
  .kpis{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:24px;}
  .kpi{border:1px solid #ddd;border-radius:8px;padding:10px 14px;min-width:100px;}
  .kpi .l{font-size:10px;text-transform:uppercase;color:#888;letter-spacing:.5px;}
  .kpi .v{font-size:18px;font-weight:800;font-family:monospace;}
  h3{font-size:14px;margin:18px 0 6px;color:#0a7a01;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #eee;padding-bottom:4px;}
  li{margin:4px 0;} p{margin:6px 0;} .foot{margin-top:28px;border-top:1px solid #eee;padding-top:10px;color:#999;font-size:11px;}
</style></head><body>
  <h1>Rapport d'analyse — ${esc(name)}</h1>
  <div class="sub">${esc(periodLabel)} · ${res.n_trades} trades · MyTradeBook</div>
  <div class="kpis">
    <div class="kpi"><div class="l">Win rate</div><div class="v">${esc(s.wr)}%</div></div>
    <div class="kpi"><div class="l">Profit factor</div><div class="v">${esc(s.pf)}</div></div>
    <div class="kpi"><div class="l">Total R</div><div class="v">${esc(s.totalR)}R</div></div>
    <div class="kpi"><div class="l">PnL</div><div class="v">${esc(s.totalPnl)} $</div></div>
    <div class="kpi"><div class="l">Expectancy</div><div class="v">${esc(s.exp)}R</div></div>
    <div class="kpi"><div class="l">Max DD</div><div class="v">${esc(s.maxDd)}R</div></div>
  </div>
  ${bodyHtml}
  <div class="foot">Généré par IA à partir de trades loggés. Ne constitue pas un conseil financier.</div>
</body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }

  const s = res?.stats;

  return (
    <div className="mx-auto max-w-[820px]">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-[18px] font-extrabold">
          <Sparkles size={18} className="text-accent" /> {L === "en" ? "AI Report" : "Rapport IA"}
        </h2>
        <div className="mt-0.5 text-[12px] text-muted2">{L === "en" ? "Deep AI analysis of your trading over a period." : "Analyse IA approfondie de ton trading sur une période."}</div>
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
          <Sparkles size={14} /> {loading ? (L === "en" ? "Analyzing…" : "Analyse…") : (L === "en" ? "Generate report" : "Générer mon rapport")}
        </button>
      </div>

      {err && (
        <div className="mb-4 rounded-xl border border-dashed border-line bg-panel/50 p-4 text-[12.5px]" style={{ color: RED }}>{err}</div>
      )}

      {loading && (
        <div className="rounded-2xl border border-line bg-panel p-10 text-center text-[13px] text-muted2">
          {L === "en" ? "The AI is analyzing your trades…" : "L'IA analyse tes trades…"}
        </div>
      )}

      {res && !loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
            <Kpi label="Win rate" value={s.wr + "%"} />
            <Kpi label="Profit factor" value={s.pf} color={Number(s.pf) >= 1.5 ? GREEN : GRAY} />
            <Kpi label="Total R" value={(Number(s.totalR) >= 0 ? "+" : "") + s.totalR + "R"} color={Number(s.totalR) >= 0 ? GREEN : RED} />
            <Kpi label="PnL" value={(Number(s.totalPnl) >= 0 ? "+" : "") + Number(s.totalPnl).toLocaleString(L === "en" ? "en-US" : "fr-FR") + " $"} color={Number(s.totalPnl) >= 0 ? GRAY : RED} />
            <Kpi label="Expectancy" value={s.exp + "R"} />
            <Kpi label="Max DD" value={s.maxDd + "R"} color={RED} />
          </div>

          {res.cumulative && res.cumulative.length >= 2 && (
            <div className="rounded-2xl border border-line bg-panel p-4">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted2">{L === "en" ? "Cumulative R" : "R cumulé"}</div>
              <CumChart data={res.cumulative} />
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <BarList title={L === "en" ? "By session" : "Par session"} rows={res.bySession} labelKey="session" />
            <BarList title={L === "en" ? "By setup" : "Par setup"} rows={res.bySetup} labelKey="setup" />
          </div>

          <OutcomeBar outcomes={res.outcomes} lang={lang} />

          <div className="rounded-2xl border border-line bg-panel p-5">
            <div className="mb-3 flex items-center justify-end gap-2">
              <button onClick={copyReport} className="inline-flex items-center gap-1.5 rounded-lg border border-line2 bg-panel2 px-2.5 py-1.5 text-[11px] font-semibold text-muted2 hover:text-white">
                <Copy size={12} /> {L === "en" ? "Copy" : "Copier"}
              </button>
              <button onClick={downloadPDF} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[11px] font-bold text-black hover:brightness-110">
                <FileDown size={12} /> PDF
              </button>
            </div>
            <Report text={res.report} />
            <div className="mt-4 border-t border-line pt-3 text-[10.5px] text-muted2">
              {L === "en" ? "Generated by AI from your logged trades. Not financial advice." : "Généré par IA à partir de tes trades loggés. Ne constitue pas un conseil financier."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}S
