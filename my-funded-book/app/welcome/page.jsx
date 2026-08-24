import { ArrowRight, Play, ShieldAlert, TrendingUp, ChevronDown } from "lucide-react";

export const metadata = {
  title: "MyTradeBook — Le journal de trading des traders financés",
  description:
    "Logge chaque trade, respecte tes règles prop firm (daily loss, drawdown) et transforme tes stats en edge. Journal, Edge Score et analyse IA pour traders MFF, TopStep, Apex.",
  metadataBase: new URL("https://mytradebook.com"),
  openGraph: {
    title: "MyTradeBook — Le journal de trading des traders financés",
    description:
      "Le journal des traders prop firm : risk banner daily loss / drawdown, Edge Score et rapport IA.",
    type: "website",
    url: "https://mytradebook.com",
    siteName: "MyTradeBook",
  },
  twitter: {
    card: "summary_large_image",
    title: "MyTradeBook — Le journal de trading des traders financés",
    description: "Le journal des traders financés : risk banner, Edge Score, rapport IA.",
  },
};

/* --- helpers de tracé (exécutés au build, produisent des strings) -------- */
const EQUITY = [10, 15, 12, 21, 27, 23, 19, 31, 39, 35, 29, 43, 51, 47, 44, 58, 66, 61, 55, 70, 78, 73, 86, 95];
function smoothPath(pts, k = 0.16) {
  const d = [`M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) * k, c1y = p1[1] + (p2[1] - p0[1]) * k;
    const c2x = p2[0] - (p3[0] - p1[0]) * k, c2y = p2[1] - (p3[1] - p1[1]) * k;
    d.push(`C ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`);
  }
  return d.join(" ");
}
const EQ = (() => {
  const W = 560, H = 150, pL = 6, pR = 8, pT = 14, pB = 14, n = EQUITY.length;
  const pw = W - pL - pR, ph = H - pT - pB;
  const pts = EQUITY.map((h, i) => [pL + (i / (n - 1)) * pw, pT + (1 - h / 100) * ph]);
  const line = smoothPath(pts);
  return { W, H, pB, line, area: `${line} L ${pts[n - 1][0].toFixed(1)},${H - pB} L ${pts[0][0].toFixed(1)},${H - pB} Z`, last: pts[n - 1] };
})();

const AXES = [
  { label: "Win %", v: 0.80 }, { label: "Profit factor", v: 0.92 }, { label: "Avg W/L", v: 0.60 },
  { label: "Recovery", v: 0.72 }, { label: "Max DD", v: 0.66 }, { label: "Consistency", v: 0.86 },
];
const RADAR = (() => {
  const cx = 130, cy = 100, R = 56, N = AXES.length;
  const ang = (i) => (-90 + i * (360 / N)) * Math.PI / 180;
  const pt = (i, r) => [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))];
  const poly = (rFn) => AXES.map((_, i) => pt(i, rFn(i)).map((x) => x.toFixed(1)).join(",")).join(" ");
  const rings = [0.33, 0.66, 1].map((l) => poly(() => R * l));
  const spokes = AXES.map((_, i) => pt(i, R));
  const labels = AXES.map((a, i) => {
    const [x, y] = pt(i, R + 14), c = Math.cos(ang(i));
    return { x, y, label: a.label, anchor: c > 0.3 ? "start" : c < -0.3 ? "end" : "middle" };
  });
  const dots = AXES.map((a, i) => pt(i, R * a.v));
  return { cx, cy, data: poly((i) => R * AXES[i].v), rings, spokes, labels, dots };
})();

const FIRMS = ["MyFundedFutures", "TopStep", "Apex", "FundingPips", "Take Profit Trader", "MFF"];

const CSS = `
@keyframes mtbRise{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
@keyframes mtbGlow{0%,100%{opacity:.5}50%{opacity:.9}}
@keyframes mtbFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes mtbDraw{to{stroke-dashoffset:0}}
@keyframes mtbFade{to{opacity:1}}
@keyframes mtbBarX{to{transform:scaleX(1)}}
@keyframes mtbPop{to{transform:scale(1);opacity:1}}
@keyframes mtbBeam{0%,100%{transform:translate(-50%,0) rotate(8deg)}50%{transform:translate(-42%,-4%) rotate(6deg)}}
@keyframes mtbBeam2{0%,100%{transform:translate(-50%,0) rotate(-10deg)}50%{transform:translate(-58%,3%) rotate(-8deg)}}
@keyframes mtbMarquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes mtbBounce{0%,100%{transform:translateY(0);opacity:.5}50%{transform:translateY(6px);opacity:1}}
.mtb-rise{animation:mtbRise .8s cubic-bezier(.22,1,.36,1) both}
.mtb-glow{animation:mtbGlow 6s ease-in-out infinite}
.mtb-float{animation:mtbFloat 7s ease-in-out infinite}
.mtb-beam{animation:mtbBeam 16s ease-in-out infinite}
.mtb-beam2{animation:mtbBeam2 19s ease-in-out infinite}
.mtb-eqline{stroke-dashoffset:1;animation:mtbDraw 1.9s .6s cubic-bezier(.22,1,.36,1) forwards}
.mtb-eqarea{opacity:0;animation:mtbFade 1s .9s forwards}
.mtb-eqdot{opacity:0;animation:mtbFade .4s 2.2s forwards}
.mtb-riskfill{transform-origin:left;transform:scaleX(0);animation:mtbBarX 1.1s .3s cubic-bezier(.22,1,.36,1) forwards}
.mtb-radar{transform-box:view-box;transform-origin:${RADAR.cx}px ${RADAR.cy}px;transform:scale(.15);opacity:0;animation:mtbPop 1s .8s cubic-bezier(.22,1,.36,1) forwards}
.mtb-tilt{transform:perspective(1600px) rotateX(9deg);transform-origin:center top}
.mtb-track{display:flex;width:max-content;animation:mtbMarquee 26s linear infinite}
.mtb-bounce{animation:mtbBounce 2.2s ease-in-out infinite}
@media (max-width:768px){ .mtb-tilt{transform:none} }
@media (prefers-reduced-motion:reduce){
  .mtb-rise,.mtb-glow,.mtb-float,.mtb-beam,.mtb-beam2,.mtb-eqline,.mtb-eqarea,.mtb-eqdot,.mtb-riskfill,.mtb-radar,.mtb-track,.mtb-bounce{animation:none!important}
  .mtb-eqline{stroke-dashoffset:0}.mtb-eqarea,.mtb-eqdot{opacity:1}.mtb-riskfill{transform:scaleX(1)}.mtb-radar{transform:none;opacity:1}
}
`;

function Kpi({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-line bg-panel2 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-widest text-muted2">{label}</div>
      <div className={`mt-1 font-mono text-lg font-extrabold ${accent ? "text-accent" : "text-white"}`}>{value}</div>
    </div>
  );
}

function DashboardMock() {
  return (
    <div className="mtb-tilt">
      <div className="mtb-float overflow-hidden rounded-2xl border border-line bg-ink2 shadow-[0_50px_120px_-50px_rgba(0,0,0,0.9)]">
        <div className="flex items-center gap-2 border-b border-line bg-panel px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ff3b5c" }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#f5b301" }} />
          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="ml-3 font-mono text-xs text-muted2">app.mytradebook.com/dashboard</span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-accent">
            <span className="mtb-glow h-1.5 w-1.5 rounded-full bg-accent" /> LIVE
          </span>
        </div>

        <div className="flex flex-col gap-3.5 p-4">
          <div className="rounded-xl border border-line bg-panel p-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">Marge avant daily loss</span>
              <span className="font-mono text-loss">-$180 / -$500</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-line2">
              <div className="mtb-riskfill h-full rounded-full" style={{ width: "36%", background: "linear-gradient(90deg,#f5b301,#ff3b5c)" }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="P&L net" value="+$1,240" accent />
            <Kpi label="Win rate" value="58%" />
            <Kpi label="Profit factor" value="1.9" />
            <Kpi label="R du jour" value="+3.2R" accent />
          </div>

          <div className="grid gap-3.5 md:grid-cols-[1fr_240px]">
            <div className="rounded-xl border border-line bg-panel p-3.5">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-muted">P&amp;L net cumulé</span>
                <span className="inline-flex items-center gap-1 font-mono text-xs text-accent"><TrendingUp className="h-3.5 w-3.5" /> +18,4 %</span>
              </div>
              <svg viewBox={`0 0 ${EQ.W} ${EQ.H}`} preserveAspectRatio="none" className="h-[150px] w-full overflow-visible">
                <defs>
                  <linearGradient id="mtbEqFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00d301" stopOpacity="0.16" />
                    <stop offset="100%" stopColor="#00d301" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0, 33, 66, 100].map((g) => {
                  const y = 14 + (1 - g / 100) * (EQ.H - 28);
                  return <line key={g} x1="6" y1={y} x2={EQ.W - 8} y2={y} stroke="#1f232b" strokeWidth="1" strokeDasharray="2 7" />;
                })}
                <path className="mtb-eqarea" d={EQ.area} fill="url(#mtbEqFill)" />
                <path className="mtb-eqline text-accent" d={EQ.line} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" pathLength={1} style={{ strokeDasharray: 1 }} />
                <circle className="mtb-eqdot" cx={EQ.last[0]} cy={EQ.last[1]} r="3" fill="#00d301" />
              </svg>
            </div>

            <div className="rounded-xl border border-line bg-panel p-3.5">
              <div className="text-[10px] uppercase tracking-widest text-muted2">Edge Score</div>
              <svg viewBox="0 0 260 200" className="mt-1 w-full overflow-visible">
                {RADAR.rings.map((pts, i) => <polygon key={i} points={pts} fill="none" stroke="#1f232b" strokeWidth="1" />)}
                {RADAR.spokes.map(([x, y], i) => <line key={i} x1={RADAR.cx} y1={RADAR.cy} x2={x} y2={y} stroke="#1f232b" strokeWidth="1" />)}
                <g className="mtb-radar">
                  <polygon points={RADAR.data} fill="rgba(0,211,1,0.14)" stroke="#00d301" strokeWidth="2" strokeLinejoin="round" />
                  {RADAR.dots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.3" fill="#00d301" />)}
                </g>
                {RADAR.labels.map((l, i) => (
                  <text key={i} x={l.x} y={l.y} fontSize="8.5" fill="#6b7488" textAnchor={l.anchor} dominantBaseline="middle">{l.label}</text>
                ))}
              </svg>
              <div className="mt-1 h-1.5 rounded-full" style={{ background: "linear-gradient(90deg,#ff3b5c,#f5b301 52%,#00d301)" }} />
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-[10px] uppercase tracking-widest text-muted2">Ton score</span>
                <span className="font-mono text-base font-extrabold text-accent">86.1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-ink text-white antialiased">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-line bg-ink/70 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <a href="/" className="font-mono text-lg font-extrabold tracking-[0.18em] text-white">
            My<span className="text-accent">Trade</span>Book
          </a>
          <div className="flex items-center gap-3">
            <a href="/login" className="hidden text-sm text-muted transition-colors hover:text-white sm:block">Connexion</a>
            <a href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-black transition-transform hover:-translate-y-0.5">
              Commencer <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className="relative px-5 pb-8 pt-16 sm:pt-20">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle,#2a2f3d_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_60%_45%_at_50%_22%,#000,transparent)] [-webkit-mask-image:radial-gradient(ellipse_60%_45%_at_50%_22%,#000,transparent)]" />
          <div className="mtb-beam absolute left-1/2 top-[-20%] h-[560px] w-[420px] rounded-full opacity-70 blur-[120px]" style={{ background: "radial-gradient(closest-side,rgba(0,211,1,0.20),transparent)" }} />
          <div className="mtb-beam2 absolute left-1/2 top-[-10%] h-[520px] w-[520px] rounded-full opacity-50 blur-[130px]" style={{ background: "radial-gradient(closest-side,rgba(0,211,1,0.10),transparent)" }} />
          <div className="absolute inset-x-0 bottom-0 h-[300px] [perspective:600px]">
            <div className="absolute inset-0 origin-bottom [transform:rotateX(68deg)] bg-[linear-gradient(#1e223088_1px,transparent_1px),linear-gradient(90deg,#1e223088_1px,transparent_1px)] [background-size:44px_44px] [mask-image:linear-gradient(to_top,#000,transparent_75%)] [-webkit-mask-image:linear-gradient(to_top,#000,transparent_75%)]" />
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-5xl text-center">
          <div className="mtb-rise mb-7 inline-flex items-center gap-2 rounded-full border border-line bg-panel2 px-4 py-1.5 text-sm text-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            En bêta · NQ / MNQ
          </div>

          <h1 className="text-[clamp(2.5rem,7vw,5rem)] font-extrabold leading-[1.02] tracking-tight text-white">
            <span className="mtb-rise block" style={{ animationDelay: "60ms" }}>Le journal de trading</span>
            <span className="mtb-rise block" style={{ animationDelay: "160ms" }}>des traders <span className="text-accent">financés.</span></span>
          </h1>

          <p className="mtb-rise mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted" style={{ animationDelay: "260ms" }}>
            Logge chaque trade, respecte tes règles prop firm, transforme tes stats en edge.
          </p>

          <div className="mtb-rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ animationDelay: "340ms" }}>
            <a href="/signup" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3.5 font-bold text-black shadow-[0_0_36px_-8px_#00d301] transition-transform hover:-translate-y-0.5 sm:w-auto">
              Commencer <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#demo" className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line2 bg-panel2 px-6 py-3.5 font-semibold text-white transition-colors hover:border-muted2 sm:w-auto">
              <Play className="h-4 w-4" /> Voir la démo
            </a>
          </div>

          <div className="mtb-rise mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted2" style={{ animationDelay: "420ms" }}>
            <span className="inline-flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5 text-accent" /> Risk banner daily loss / drawdown</span>
            <span className="inline-flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-accent" /> Edge Score & rapport IA</span>
          </div>
        </div>

        <div id="demo" className="mtb-rise relative mx-auto mt-16 w-full max-w-4xl [transform-style:preserve-3d]" style={{ animationDelay: "500ms" }}>
          <DashboardMock />
          <div className="pointer-events-none absolute inset-x-0 -bottom-2 h-40 bg-gradient-to-t from-ink to-transparent" />
        </div>

        <div className="relative mx-auto mt-10 max-w-5xl overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)] [-webkit-mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
          <div className="mb-3 text-center text-[11px] uppercase tracking-widest text-muted2">Pensé pour les comptes financés</div>
          <div className="mtb-track gap-10">
            {[...FIRMS, ...FIRMS].map((f, i) => (
              <span key={i} className="whitespace-nowrap font-mono text-sm font-bold tracking-wide text-muted2">{f}</span>
            ))}
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <ChevronDown className="mtb-bounce h-5 w-5 text-muted2" />
        </div>
      </section>
    </div>
  );
}
