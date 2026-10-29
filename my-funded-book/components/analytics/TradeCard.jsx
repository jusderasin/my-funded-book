"use client";

// Carte de trade à partager (format carré 1080×1080), dans l'esprit des cartes LIQUID :
// fond artistique, courbe, gros P&L, détails d'exécution. Le même canvas sert d'aperçu
// et d'export PNG : ce qu'on voit est exactement ce qui est téléchargé.

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, ImagePlus, Shuffle, X } from "lucide-react";
import { chrono, durationMin } from "@/lib/reports";
import { monthlyRecap, monthsOf, weeklyRecap, weeksOf } from "@/lib/analytics";
import { frDate } from "@/lib/format";

const S = 1080;
const THEMES = [
  { id: "mono", fr: "Noir & blanc", en: "Black & white" },
  { id: "graphite", fr: "Graphite", en: "Graphite" },
  { id: "midnight", fr: "Minuit", en: "Midnight" },
  { id: "bronze", fr: "Bronze", en: "Bronze" },
  { id: "aurora", fr: "Aurore", en: "Aurora" },
  { id: "blood", fr: "Rouge sang", en: "Blood" },
  { id: "caba", fr: "Caba", en: "Caba" },
];

const pnlOf = (t) => (t?.outcome === "BE" ? 0 : Number(t?.pnl) || 0);
const money = (v) => (v < 0 ? "-" : v > 0 ? "+" : "") + "$" + Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Générateur pseudo-aléatoire stable : la même graine redonne le même fond.
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function paintBackground(g, theme, seed, photo) {
  const rand = rng(seed);
  if (photo) {
    const k = Math.max(S / photo.width, S / photo.height);
    const w = photo.width * k; const h = photo.height * k;
    g.filter = "grayscale(0.35) contrast(1.05)";
    g.drawImage(photo, (S - w) / 2, (S - h) / 2, w, h);
    g.filter = "none";
    const v = g.createLinearGradient(0, 0, 0, S);
    v.addColorStop(0, "rgba(0,0,0,0.15)"); v.addColorStop(0.55, "rgba(0,0,0,0.35)"); v.addColorStop(1, "rgba(0,0,0,0.75)");
    g.fillStyle = v; g.fillRect(0, 0, S, S);
    return { text: "#fff", sub: "rgba(255,255,255,0.72)", line: "#fff" };
  }
  const palettes = {
    mono: { base: ["#000000", "#141414"], blobs: ["#ffffff", "#6b6b6b", "#2a2a2a"], text: "#fff", sub: "rgba(255,255,255,0.6)", line: "#fff" },
    graphite: { base: ["#5b5b61", "#2f2f34"], blobs: ["#d4d4d8", "#71717a", "#3f3f46"], text: "#fff", sub: "rgba(255,255,255,0.78)", line: "#fff" },
    midnight: { base: ["#05060a", "#0b1020"], blobs: ["#1d4ed8", "#7c3aed", "#0ea5e9"], text: "#fff", sub: "rgba(255,255,255,0.6)", line: "#93c5fd" },
    bronze: { base: ["#2a1a10", "#5a3a22"], blobs: ["#d6a46c", "#8a5a33", "#f2d3a6"], text: "#fff", sub: "rgba(255,240,220,0.75)", line: "#f7dcb4" },
    aurora: { base: ["#020a08", "#04140f"], blobs: ["#22c55e", "#14b8a6", "#a3e635"], text: "#fff", sub: "rgba(220,255,235,0.7)", line: "#bbf7d0" },
    caba: { base: ["#04060e", "#12183c"], blobs: ["#4f8bff", "#7c5cff", "#b14cff"], text: "#fff", sub: "rgba(220,225,255,0.72)", line: "#c7d2fe" },
    blood: { base: ["#120203", "#2a0507"], blobs: ["#ef4444", "#7f1d1d", "#f97316"], text: "#fff", sub: "rgba(255,220,220,0.7)", line: "#fecaca" },
  };
  const p = palettes[theme] || palettes.graphite;
  const lg = g.createLinearGradient(0, 0, S, S);
  lg.addColorStop(0, p.base[0]); lg.addColorStop(1, p.base[1]);
  g.fillStyle = lg; g.fillRect(0, 0, S, S);
  // Nappes de couleur floues
  g.filter = "blur(70px)";
  for (let i = 0; i < 7; i++) {
    g.globalAlpha = 0.35 + rand() * 0.35;
    g.fillStyle = p.blobs[i % p.blobs.length];
    g.beginPath();
    g.ellipse(rand() * S, rand() * S, 140 + rand() * 260, 90 + rand() * 200, rand() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  g.filter = "none"; g.globalAlpha = 1;
  // Traits fluides (effet « liquide »)
  g.lineCap = "round";
  for (let i = 0; i < 26; i++) {
    g.strokeStyle = p.blobs[i % p.blobs.length];
    g.globalAlpha = 0.08 + rand() * 0.18;
    g.lineWidth = 1 + rand() * 3;
    const y0 = rand() * S; const amp = 40 + rand() * 120; const f = 0.004 + rand() * 0.006; const ph = rand() * 6;
    g.beginPath();
    for (let x = -20; x <= S + 20; x += 12) {
      const y = y0 + Math.sin(x * f + ph) * amp + Math.sin(x * f * 2.3 + ph) * amp * 0.3;
      x === -20 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
  }
  g.globalAlpha = 1;
  // Grain
  const img = g.getImageData(0, 0, S, S); const d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (rand() - 0.5) * 18; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
  const v = g.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.75);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.45)");
  g.fillStyle = v; g.fillRect(0, 0, S, S);
  return p;
}

// Spécification d'une carte : un trade ou un mois, dessinés avec le même gabarit.
function tradeSpec(trade, curve, lang) {
  const en = lang === "en";
  const ex = trade.execution || {};
  const dur = durationMin(trade);
  const price = (v) => (v != null ? Number(v).toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—");
  const partials = Array.isArray(ex.partials) ? ex.partials.filter((p) => p && p.r != null) : [];
  const partialRow = partials.length ? [[en ? "Partials" : "Partiels", partials.map((p) => `${p.pct ? p.pct + "% @ " : ""}${p.r}R`).join(" · ")]] : [];
  return {
    icon: String(trade.dir || "").toLowerCase() === "short" ? "↘" : "↗",
    title: trade.symbol || "—",
    subtitle: `${frDate(trade.date)}${ex.entry_time ? " · " + String(ex.entry_time).slice(0, 5) : ""}${trade.setup ? " · " + trade.setup : ""}`,
    badge: String(trade.dir || "").toUpperCase(),
    value: pnlOf(trade),
    under: trade.r != null && trade.r !== "" ? `${Number(trade.r) >= 0 ? "+" : ""}${Number(trade.r).toFixed(2)}R` : "",
    rows: [
      [en ? "Entry" : "Entrée", price(ex.entry_price)],
      [en ? "Exit" : "Sortie", price(ex.exit_price)],
      ...(partialRow.length ? [] : [[en ? "Size" : "Taille", ex.size != null ? `${ex.size} ${en ? "contracts" : "contrats"}` : "—"]]),
      [en ? "Duration" : "Durée", dur != null ? (dur >= 60 ? `${Math.floor(dur / 60)}h${String(dur % 60).padStart(2, "0")}` : `${dur} min`) : "—"],
      ...partialRow,
    ],
    curve,
  };
}

const weekLabel = (week, en) => {
  const d = new Date(week + "T00:00:00Z"); const e = new Date(d); e.setUTCDate(e.getUTCDate() + 6);
  const f = (x, o) => x.toLocaleDateString(en ? "en-US" : "fr-FR", { timeZone: "UTC", ...o });
  return `${f(d, { day: "numeric", month: "short" })} → ${f(e, { day: "numeric", month: "short", year: "numeric" })}`;
};

function monthSpec(recap, lang) {
  const en = lang === "en";
  let name;
  if (recap.week) name = (en ? "Week of " : "Semaine du ") + weekLabel(recap.week, en).split(" → ")[0];
  else { const [y, m] = recap.month.split("-").map(Number); name = new Date(y, m - 1, 1).toLocaleDateString(en ? "en-US" : "fr-FR", { month: "long", year: "numeric" }); }
  let c = 0;
  const curve = [0, ...Object.keys(recap.byDay).sort().map((d) => (c += recap.byDay[d]))];
  return {
    icon: "◷",
    title: name.charAt(0).toUpperCase() + name.slice(1),
    subtitle: `${recap.count} trades · ${recap.days} ${en ? "trading days" : "jours tradés"}`,
    badge: recap.week ? (en ? "WEEK" : "SEMAINE") : en ? "MONTH" : "MOIS",
    value: recap.net,
    under: `${recap.totalR >= 0 ? "+" : ""}${recap.totalR.toFixed(1)}R`,
    rows: [
      ["Win rate", `${Math.round(recap.winRate)}%`],
      [en ? "Green days" : "Jours verts", `${recap.greenDays}/${recap.days}`],
      [en ? "Best day" : "Meilleur jour", money(recap.bestDay.pnl)],
      [en ? "Plan respected" : "Plan respecté", `${Math.round(recap.planPct)}%`],
    ],
    curve,
  };
}

function drawCard(canvas, { spec, theme, seed, photo, lang }) {
  const g = canvas.getContext("2d", { willReadFrequently: true });
  canvas.width = S; canvas.height = S;
  const p = paintBackground(g, theme, seed, photo);
  const font = (w, s, mono) => `${w} ${s}px ${mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "Inter, system-ui, sans-serif"}`;
  const pnl = spec.value;
  const mono = theme === "mono" || theme === "graphite";

  // En-tête
  g.fillStyle = "rgba(255,255,255,0.14)"; g.beginPath(); g.roundRect(70, 70, 64, 64, 18); g.fill();
  g.fillStyle = p.text; g.font = font(800, 30); g.textAlign = "center"; g.fillText(spec.icon, 102, 113);
  g.textAlign = "left"; g.font = font(800, 40); g.fillText(spec.title, 152, 104);
  g.fillStyle = p.sub; g.font = font(500, 26); g.fillText(spec.subtitle, 152, 138);
  if (spec.badge) {
    g.font = font(800, 24); const w = g.measureText(spec.badge).width + 36;
    g.fillStyle = mono ? (pnl >= 0 ? "#fff" : "rgba(255,255,255,0.18)") : pnl >= 0 ? "rgba(34,197,94,0.9)" : "rgba(239,68,68,0.9)"; g.beginPath(); g.roundRect(S - 70 - w, 82, w, 44, 22); g.fill();
    g.fillStyle = mono && pnl >= 0 ? "#000" : "#fff"; g.textAlign = "center"; g.fillText(spec.badge, S - 70 - w / 2, 113); g.textAlign = "left";
  }

  // Courbe
  const curve = spec.curve;
  if (curve.length > 1) {
    const x0 = 70, x1 = S - 70, y0 = 210, y1 = 450;
    const mn = Math.min(...curve), mx = Math.max(...curve);
    const X = (i) => x0 + (i / (curve.length - 1)) * (x1 - x0);
    const Y = (v) => y1 - ((v - mn) / Math.max(1, mx - mn)) * (y1 - y0);
    g.save(); g.shadowColor = p.line; g.shadowBlur = 18; g.strokeStyle = p.line; g.lineWidth = 4; g.lineJoin = "round";
    g.beginPath(); curve.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)))); g.stroke(); g.restore();
    const lx = X(curve.length - 1), ly = Y(curve[curve.length - 1]);
    g.fillStyle = "#fff"; g.beginPath(); g.arc(lx, ly, 9, 0, Math.PI * 2); g.fill();
    g.strokeStyle = mono ? "#000" : pnl >= 0 ? "#22c55e" : "#ef4444"; g.lineWidth = 4; g.stroke();
  }

  // Gros chiffre
  g.textAlign = "center";
  g.save(); g.shadowColor = "rgba(0,0,0,0.55)"; g.shadowBlur = 40; g.shadowOffsetY = 6;
  g.fillStyle = p.text; g.font = font(800, money(pnl).length > 11 ? 128 : 150);
  g.fillText(money(pnl), S / 2, 640); g.restore();
  if (spec.under) { g.fillStyle = p.sub; g.font = font(700, 34, true); g.fillText(spec.under, S / 2, 700); }

  // Détails
  spec.rows.forEach(([k, v], i) => {
    const y = 780 + i * 46;
    g.textAlign = "right"; g.fillStyle = p.sub; g.font = font(500, 28); g.fillText(k, S / 2 - 24, y);
    g.textAlign = "left"; g.fillStyle = p.text; g.font = font(700, 28, true); g.fillText(v, S / 2 + 24, y);
  });

  // Pied : marque
  g.textAlign = "left"; g.fillStyle = p.text; g.font = font(800, 28); g.fillText("MyTradeBook", 70, S - 62);
  g.textAlign = "right"; g.fillStyle = p.sub; g.font = font(500, 24); g.fillText(lang === "en" ? "trading journal" : "journal de trading", S - 70, S - 62);
}

export default function TradeCard({ trades, lang = "fr", defaultTheme = "mono" }) {
  const en = lang === "en";
  const sorted = useMemo(() => chrono(trades), [trades]);
  const recent = useMemo(() => sorted.slice().reverse().slice(0, 60), [sorted]);
  const [tradeId, setTradeId] = useState("");
  const [theme, setTheme] = useState(defaultTheme);
  const [seed, setSeed] = useState(7);
  const [photo, setPhoto] = useState(null);
  const [mode, setMode] = useState("trade");
  const months = useMemo(() => monthsOf(trades), [trades]);
  const [month, setMonth] = useState("");
  const activeMonth = month || months[0] || "";
  const recap = useMemo(() => (activeMonth ? monthlyRecap(trades, activeMonth) : null), [trades, activeMonth]);
  const weeks = useMemo(() => weeksOf(trades), [trades]);
  const [week, setWeek] = useState("");
  const activeWeek = week || weeks[0] || "";
  const wRecap = useMemo(() => (activeWeek ? weeklyRecap(trades, activeWeek) : null), [trades, activeWeek]);
  const ref = useRef(null);
  const trade = recent.find((t) => String(t.id) === tradeId) || recent[0] || null;

  const curve = useMemo(() => {
    if (!trade) return [];
    const idx = sorted.findIndex((t) => t.id === trade.id);
    const slice = sorted.slice(Math.max(0, idx - 29), idx + 1);
    let c = 0;
    return [0, ...slice.map((t) => (c += pnlOf(t)))];
  }, [sorted, trade]);

  const spec = useMemo(() => (mode === "month" ? (recap ? monthSpec(recap, lang) : null) : mode === "week" ? (wRecap ? monthSpec(wRecap, lang) : null) : trade ? tradeSpec(trade, curve, lang) : null), [mode, recap, wRecap, trade, curve, lang]);
  useEffect(() => {
    if (spec && ref.current) drawCard(ref.current, { spec, theme, seed, photo, lang });
  }, [spec, theme, seed, photo, lang]);

  const onPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setPhoto(img);
    img.src = url;
    e.target.value = "";
  };

  const save = () => {
    ref.current?.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = mode === "month" ? `mois-${activeMonth}.png` : mode === "week" ? `semaine-${activeWeek}.png` : `trade-${trade.symbol || "card"}-${trade.date}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, "image/png");
  };

  if (!trade) return <div className="grid h-40 place-items-center rounded-lg border border-dashed border-prism-line text-xs text-prism-muted">{en ? "No trades yet." : "Pas encore de trades."}</div>;

  return (
    <div className="grid items-start gap-5 md:grid-cols-[minmax(0,440px)_1fr]">
      <canvas ref={ref} className="aspect-square w-full rounded-2xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]" />
      <div className="space-y-4">
        <div className="flex overflow-hidden rounded-lg border border-prism-line">
          {[["trade", en ? "One trade" : "Un trade"], ["week", en ? "Week" : "La semaine"], ["month", en ? "Whole month" : "Le mois"]].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setMode(k)} className={`h-9 flex-1 text-xs font-bold ${mode === k ? "bg-prism-text text-prism-bg" : "text-prism-muted hover:text-prism-text"}`}>{label}</button>
          ))}
        </div>
        {mode === "trade" ? (
          <label className="block">
            <span className="text-[10px] font-bold tracking-[.16em] text-prism-muted2">TRADE</span>
            <select value={String(trade.id)} onChange={(e) => setTradeId(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-prism-line bg-prism-panel px-3 text-sm">
              {recent.map((t) => <option key={t.id} value={String(t.id)}>{frDate(t.date)} · {t.symbol} · {String(t.dir || "").toUpperCase()} · {money(pnlOf(t))}</option>)}
            </select>
          </label>
        ) : mode === "week" ? (
          <label className="block">
            <span className="text-[10px] font-bold tracking-[.16em] text-prism-muted2">{en ? "WEEK" : "SEMAINE"}</span>
            <select value={activeWeek} onChange={(e) => setWeek(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-prism-line bg-prism-panel px-3 text-sm">
              {weeks.map((w) => <option key={w} value={w}>{weekLabel(w, en)}</option>)}
            </select>
          </label>
        ) : (
          <label className="block">
            <span className="text-[10px] font-bold tracking-[.16em] text-prism-muted2">{en ? "MONTH" : "MOIS"}</span>
            <select value={activeMonth} onChange={(e) => setMonth(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-prism-line bg-prism-panel px-3 text-sm capitalize">
              {months.map((m) => { const [y, mo] = m.split("-").map(Number); return <option key={m} value={m}>{new Date(y, mo - 1, 1).toLocaleDateString(en ? "en-US" : "fr-FR", { month: "long", year: "numeric" })}</option>; })}
            </select>
          </label>
        )}
        <div>
          <span className="text-[10px] font-bold tracking-[.16em] text-prism-muted2">{en ? "STYLE" : "STYLE"}</span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {THEMES.map((th) => (
              <button key={th.id} type="button" onClick={() => { setTheme(th.id); setPhoto(null); }} className={`h-9 rounded-lg border px-3 text-xs font-bold ${theme === th.id && !photo ? "border-prism-accent bg-prism-accentDim text-prism-accent" : "border-prism-line text-prism-muted hover:text-prism-text"}`}>{en ? th.en : th.fr}</button>
            ))}
            <button type="button" onClick={() => setSeed((s) => s + 1)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-prism-line px-3 text-xs font-bold text-prism-muted hover:text-prism-text" title={en ? "New variation" : "Nouvelle variation"}><Shuffle className="h-3.5 w-3.5" />{en ? "Remix" : "Remixer"}</button>
          </div>
        </div>
        <div>
          <span className="text-[10px] font-bold tracking-[.16em] text-prism-muted2">{en ? "YOUR PHOTO" : "TA PHOTO"}</span>
          <div className="mt-1.5 flex gap-2">
            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-prism-line px-3 text-xs font-bold text-prism-muted hover:text-prism-text">
              <ImagePlus className="h-3.5 w-3.5" />{en ? "Use a background photo" : "Mettre une photo en fond"}
              <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
            </label>
            {photo && <button type="button" onClick={() => setPhoto(null)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-prism-line px-3 text-xs text-prism-muted"><X className="h-3.5 w-3.5" />{en ? "Remove" : "Retirer"}</button>}
          </div>
          <p className="mt-1.5 text-[11px] text-prism-muted2">{en ? "Your car, your setup, your desk… it stays on your device." : "Ta voiture, ton setup, ton bureau… la photo reste sur ton appareil."}</p>
        </div>
        <button type="button" onClick={save} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-prism-accent text-xs font-extrabold tracking-[.14em] text-prism-bg">
          <Download className="h-4 w-4" />{en ? "SAVE CARD (1080×1080)" : "ENREGISTRER LA CARTE (1080×1080)"}
        </button>
      </div>
    </div>
  );
}
