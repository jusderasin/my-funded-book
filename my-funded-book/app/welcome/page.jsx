"use client";

import { useEffect, useRef, useState, forwardRef } from "react";
import {
  ArrowRight, BookOpen, ShieldAlert, Target, CalendarDays, BarChart3, Gauge,
  Check, ChevronDown, Lock, Sparkles, TrendingUp, Clock, Activity,
} from "lucide-react";

/* ======================= TARIF (à remplacer) ======================= */
const PRICING = { currency: "€", annual: 149, monthly: 19, trialDays: 14 }; // monthly = placeholder
const monthlyEq = Math.round((PRICING.annual / 12) * 100) / 100;
const price = (n) => `${n}${PRICING.currency}`;
const fmtR = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}R`;

const PROP_FIRMS = ["MyFundedFutures", "TopStep", "Apex", "FundingPips", "Take Profit Trader"];

const SIM_TRADES = [
  { sym: "NQ", side: "Long", r: 2.5, why: "Breakout NY AM", time: "15:32" },
  { sym: "MNQ", side: "Short", r: -1.0, why: "Fade VWAP — invalidé", time: "15:47" },
  { sym: "NQ", side: "Long", r: 1.2, why: "Pullback tendance", time: "16:04" },
  { sym: "NQ", side: "Short", r: 1.8, why: "Rejet PDH", time: "16:22" },
];

const REASONS = [
  { icon: ShieldAlert, title: "Ne crame plus une éval", body: "La bannière de risque te garde dans ta daily loss, en direct. Le trade de trop en fin de session, tu le vois venir avant de le prendre.", accent: "text-loss", glow: "#ff3b5c" },
  { icon: Sparkles, title: "Ta review s'écrit toute seule", body: "Chaque trade fermé devient de la donnée propre : R, PnL, WHY, session. Plus de tableur qui casse — ta review ne dépend plus de ta mémoire.", accent: "text-accent", glow: "#00d301" },
  { icon: Target, title: "Ton edge, chiffré", body: "L'Edge Score te dit noir sur blanc quels setups et quelles sessions te rapportent. Tu concentres ton capital là où tu gagnes vraiment.", accent: "text-goldx", glow: "#f5b301" },
];

const TIMELINE = [
  { time: "15:32", title: "Tu prends ta position.", body: "NQ Long sur breakout NY AM. Tu notes ton WHY en deux secondes — la raison est capturée pendant que le trade est vivant, pas reconstruite le soir." },
  { time: "15:33", title: "La bannière de risque veille.", body: "Ta consommation de risque du jour s'affiche en permanence. Tu sais exactement combien de R il te reste avant ta daily loss." },
  { time: "15:41", title: "Le trade se ferme.", body: "+2.5R calculé automatiquement, PnL enregistré, courbe d'equity ancrée sur ton solde réel mise à jour au trade près." },
  { time: "15:41", title: "Ta review est déjà prête.", body: "Résumé, R, session, WHY : rien à ressaisir. Tu passes au trade suivant, le journal a déjà tout écrit." },
];

const FEATURES = [
  { icon: BookOpen, title: "Journal & WHY", accent: "text-accent", glow: "#00d301", body: "Chaque trade logué avec la raison qui l'a déclenché. Tes erreurs deviennent visibles, séance après séance.", demo: "why" },
  { icon: ShieldAlert, title: "Bannière de risque", accent: "text-loss", glow: "#ff3b5c", body: "Tu sais en permanence où tu en es sur ta daily loss. Plus de compte cramé pour un trade de trop.", demo: "risk" },
  { icon: Target, title: "Edge Score", accent: "text-goldx", glow: "#f5b301", body: "Quels setups et quelles sessions te rapportent réellement. Tu concentres ton capital là où ton edge existe.", demo: "score" },
  { icon: CalendarDays, title: "Calendrier & sessions", accent: "text-cyanx", glow: "#7fd0ff", body: "Jour par jour, semaine par semaine. Tu vois quelles journées portent tes résultats, au lieu de deviner.", demo: "cal" },
  { icon: BarChart3, title: "R-multiples & PnL", accent: "text-pinkx", glow: "#ff66e4", body: "Chaque trade converti en données propres : R, expectancy, PnL. Des stats structurées, pas un tableur bancal.", demo: "rbadge" },
  { icon: Gauge, title: "Courbe d'equity", accent: "text-accent", glow: "#00d301", body: "Une courbe ancrée sur ton solde réel, une distribution de R et une perf hebdo. Ta progression d'un coup d'œil.", demo: "spark" },
];

const FAQ = [
  { q: "C'est pour quel type de trader ?", a: "MyTradeBook est pensé pour le trader financé (prop firm, éval ou compte financé) qui veut tenir un journal discipliné et lire son edge sans y passer sa soirée." },
  { q: "Comment marche l'essai ?", a: `Tu as ${PRICING.trialDays} jours pour tester l'app en entier, sans engagement. Tu annules quand tu veux avant la fin, tu n'es pas débité.` },
  { q: "Mes données sont-elles en sécurité ?", a: "Tes trades et tes notes restent les tiens. Rien n'est revendu, rien n'est partagé. MyTradeBook est un outil de suivi, il ne trade jamais à ta place." },
  { q: "Est-ce un conseil en investissement ?", a: "Non. C'est un outil d'analyse et de tenue de journal. Le trading comporte un risque de perte en capital, et les performances passées ne préjugent pas des résultats futurs." },
];

/* --------------------------------- motion --------------------------------- */
const EASE = "cubic-bezier(.16,1,.3,1)";
const STYLES = `
@keyframes mtbFadeUp { from { opacity:0; transform:translateY(28px);} to { opacity:1; transform:none; } }
@keyframes mtbStream { from { opacity:0; transform:translateY(10px);} to { opacity:1; transform:none; } }
@keyframes mtbGlow { 0%,100% { opacity:.4; } 50% { opacity:.85; } }
@keyframes mtbMarquee { from { transform:translateX(0);} to { transform:translateX(-50%);} }
@keyframes mtbPulse { 0%,100% { opacity:.55; transform:scale(1);} 50% { opacity:1; transform:scale(1.22);} }
@keyframes mtbBlink { 0%,100% { opacity:.5;} 50% { opacity:1;} }

.hero-item { opacity:0; animation: mtbFadeUp .9s ${EASE} forwards; }
.mtb-motion .reveal { opacity:0; transform:translateY(28px); will-change:opacity,transform; transition: opacity .85s ease, transform .85s ${EASE}; }
.mtb-motion .reveal.in-view { opacity:1; transform:none; }
.mtb-stream { animation: mtbStream .55s ${EASE} both; }
.mtb-glow { animation: mtbGlow 6s ease-in-out infinite; }
.mtb-marquee { animation: mtbMarquee 34s linear infinite; }
.mtb-marquee-wrap:hover .mtb-marquee { animation-play-state:paused; }
.mtb-pulse { animation: mtbPulse 2.8s ease-in-out infinite; }
.mtb-livedot { animation: mtbBlink 1.6s ease-in-out infinite; }
.mtb-grid {
  background-image:
    linear-gradient(to right, rgba(255,255,255,0.045) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.045) 1px, transparent 1px);
  background-size: 46px 46px;
  -webkit-mask-image: radial-gradient(70% 55% at 50% 0%, #000, transparent 78%);
  mask-image: radial-gradient(70% 55% at 50% 0%, #000, transparent 78%);
}

/* --- spotlight couleur qui suit la souris (cartes du site) --- */
.mtb-spot { position:relative; isolation:isolate; }
.mtb-spot > :not(.mtb-spot-glow):not(.mtb-spot-border) { position:relative; z-index:1; }
.mtb-spot .mtb-spot-glow {
  position:absolute; inset:0; border-radius:inherit; pointer-events:none; z-index:0;
  opacity:0; transition:opacity .4s ease;
  background: radial-gradient(240px circle at var(--x,50%) var(--y,50%), var(--glow,#00d301), transparent 55%);
}
.mtb-spot:hover .mtb-spot-glow { opacity:.15; }
.mtb-spot .mtb-spot-border {
  position:absolute; inset:0; border-radius:inherit; pointer-events:none; z-index:2;
  opacity:0; transition:opacity .4s ease; padding:1px;
  background: radial-gradient(240px circle at var(--x,50%) var(--y,50%), var(--glow,#00d301), transparent 55%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
}
.mtb-spot:hover .mtb-spot-border { opacity:.5; }

@media (prefers-reduced-motion: reduce) {
  .hero-item,.mtb-stream,.mtb-glow,.mtb-marquee,.mtb-pulse,.mtb-livedot { animation:none !important; }
  .hero-item,.mtb-motion .reveal { opacity:1 !important; transform:none !important; }
}
`;

function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setR(m.matches);
    const h = (e) => setR(e.matches);
    m.addEventListener && m.addEventListener("change", h);
    return () => m.removeEventListener && m.removeEventListener("change", h);
  }, []);
  return r;
}

function useInView(threshold = 0.2) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function Reveal({ children, className = "", delay = 0 }) {
  const [ref, inView] = useInView(0.15);
  return (
    <div ref={ref} className={`reveal ${inView ? "in-view" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* --------------------------- signature : live sim ------------------------- */
function LiveJournal() {
  const reduced = useReducedMotion();
  const [tick, setTick] = useState(reduced ? SIM_TRADES.length : 1);
  const pathRef = useRef(null);
  const [len, setLen] = useState(0);

  useEffect(() => {
    if (reduced) { setTick(SIM_TRADES.length); return; }
    let id;
    let cur = 1;
    setTick(cur);
    const run = () => {
      const atEnd = cur >= SIM_TRADES.length;
      id = setTimeout(() => {
        cur = atEnd ? 1 : cur + 1;
        setTick(cur);
        run();
      }, atEnd ? 3200 : 2600); // pause plus longue en fin de cycle
    };
    run();
    return () => clearTimeout(id);
  }, [reduced]);

  useEffect(() => { if (pathRef.current) setLen(pathRef.current.getTotalLength()); }, []);

  const visible = SIM_TRADES.slice(0, tick);
  const dayR = visible.reduce((s, t) => s + t.r, 0);
  const wins = visible.filter((t) => t.r > 0).length;
  const winRate = visible.length ? Math.round((wins / visible.length) * 100) : 0;
  const lossUsed = Math.min(3, visible.reduce((s, t) => s + (t.r < 0 ? -t.r : 0), 0));
  const riskPct = (lossUsed / 3) * 100;
  const riskColor = riskPct > 80 ? "bg-loss" : riskPct > 45 ? "bg-goldx" : "bg-accent";

  // courbe complète (fixe) — révélée progressivement via stroke-dashoffset (fluide)
  let acc = 0;
  const cumAll = [0, ...SIM_TRADES.map((t) => (acc += t.r))];
  const coords = cumAll.map((v, i) => {
    const x = (i / SIM_TRADES.length) * 300;
    const y = 96 - ((Math.max(-2, Math.min(6, v)) + 2) / 8) * 84;
    return [x, y];
  });
  const linePath = coords.map((c, i) => `${i ? "L" : "M"}${c[0].toFixed(1)},${c[1].toFixed(1)}`).join(" ");
  const frac = tick / SIM_TRADES.length;
  const dot = coords[tick];

  return (
    <SpotCard glow="#00d301" className="w-full rounded-2xl border border-line bg-panel p-2.5 shadow-2xl">
      <div className="rounded-xl border border-line2 bg-ink2/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="mtb-livedot h-2 w-2 rounded-full bg-accent shadow-[0_0_10px] shadow-accent/70" />
            <span className="text-sm font-semibold text-white">Journal — Session US</span>
          </div>
          <span className="rounded-full border border-line2 px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted2">démo live</span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { l: "R du jour", v: fmtR(dayR), c: dayR >= 0 ? "text-accent" : "text-loss" },
            { l: "Win rate", v: `${winRate}%`, c: "text-white" },
            { l: "Trades", v: String(visible.length), c: "text-white" },
          ].map((k) => (
            <div key={k.l} className="rounded-lg border border-line2 bg-panel/60 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted2">{k.l}</p>
              <p className={`mt-1 font-mono text-lg font-bold transition-colors duration-500 ${k.c}`}>{k.v}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-lg border border-line2 bg-panel/40 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted2">Courbe d'equity</span>
            <TrendingUp size={12} className="text-accent" />
          </div>
          <svg viewBox="0 0 300 100" className="mt-1 h-24 w-full" role="img" aria-label="Courbe d'equity de démo">
            {[26, 54, 82].map((y) => (
              <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="currentColor" className="text-line2" strokeWidth="1" opacity="0.35" />
            ))}
            <path
              ref={pathRef}
              d={linePath}
              fill="none"
              stroke="#00d301"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: len || 1,
                strokeDashoffset: (len || 1) * (1 - frac),
                transition: reduced ? "none" : `stroke-dashoffset 1.5s ${EASE}`,
              }}
            />
            {dot && (
              <g style={{ transform: `translate(${dot[0]}px, ${dot[1]}px)`, transition: reduced ? "none" : `transform 1.5s ${EASE}` }}>
                <circle r="4.5" fill="#00d301" className="mtb-pulse" />
                <circle r="2" fill="#fff" />
              </g>
            )}
          </svg>
        </div>

        <div className="mt-3 rounded-lg border border-line2 bg-panel/40 p-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="uppercase tracking-wider text-muted2">Risque consommé</span>
            <span className="font-mono text-white">{lossUsed.toFixed(1)}R <span className="text-muted2">/ 3.0R</span></span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink2">
            <div className={`h-full rounded-full transition-all duration-1000 ease-out ${riskColor}`} style={{ width: `${Math.max(4, riskPct)}%` }} />
          </div>
        </div>

        {/* feed à hauteur fixe -> pas de saut de layout */}
        <div className="mt-3 flex min-h-[224px] flex-col gap-2">
          {visible.map((t, i) => (
            <div key={i} className={`flex items-center justify-between rounded-lg border border-line2 bg-panel/60 px-3 py-2 ${i === visible.length - 1 ? "mtb-stream" : ""}`}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-white">{t.sym}</span>
                  <span className={`text-[10px] uppercase tracking-wider ${t.side === "Long" ? "text-accent" : "text-loss"}`}>{t.side}</span>
                  <span className="text-[10px] text-muted2">{t.time}</span>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-muted">WHY : {t.why}</p>
              </div>
              <span className={`ml-3 shrink-0 rounded-md px-2 py-1 font-mono text-xs font-bold ${t.r >= 0 ? "bg-accent/10 text-accent" : "bg-loss/10 text-loss"}`}>{fmtR(t.r)}</span>
            </div>
          ))}
        </div>
      </div>
    </SpotCard>
  );
}

/* ------------------------------------------------------------------ */
function Logo() {
  return <span className="font-bold tracking-[0.25em] text-white select-none">My<span className="text-accent">Trade</span>Book</span>;
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-ink/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
          <a href="#reasons" className="transition-colors hover:text-white">Pourquoi</a>
          <a href="#features" className="transition-colors hover:text-white">Fonctionnalités</a>
          <a href="#tarif" className="transition-colors hover:text-white">Tarif</a>
          <a href="#faq" className="transition-colors hover:text-white">FAQ</a>
        </nav>
        <div className="flex items-center gap-3">
          <a href="/login" className="hidden text-sm text-muted transition-colors hover:text-white sm:block">Se connecter</a>
          <a href="/login" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-ink transition-transform hover:scale-[1.03]">Commencer</a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="mtb-grid pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden className="mtb-glow pointer-events-none absolute inset-0 -z-10" style={{ background: "radial-gradient(55% 45% at 50% 0%, rgba(0,211,1,0.13), transparent 72%)" }} />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 lg:grid-cols-2 lg:pt-24">
        <div className="text-center lg:text-left">
          <span className="hero-item inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-accent" style={{ animationDelay: "0s" }}>
            <span className="mtb-livedot h-1.5 w-1.5 rounded-full bg-accent" /> Le journal du trader financé
          </span>
          <h1 className="hero-item mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl" style={{ animationDelay: ".1s" }}>
            Ta séance se<br />journalise <span className="text-accent">toute seule.</span>
          </h1>
          <p className="hero-item mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted lg:mx-0" style={{ animationDelay: ".2s" }}>
            MyTradeBook logue chaque trade avec son WHY, calcule ton R et ton Edge Score, et te garde dans les clous de ta daily loss — en direct. Ta review ne dépend plus de ta mémoire.
          </p>
          <div className="hero-item mt-9 flex flex-col items-center gap-3 sm:flex-row lg:justify-start" style={{ animationDelay: ".3s" }}>
            <a href="/login" className="group inline-flex items-center gap-2 rounded-xl bg-accent px-7 py-3.5 text-base font-semibold text-ink transition-transform hover:scale-[1.03]">
              Démarrer l'essai {PRICING.trialDays} jours
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
            </a>
            <a href="#features" className="inline-flex items-center gap-2 rounded-xl border border-line2 px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-panel">Voir comment ça marche</a>
          </div>
          <p className="hero-item mt-4 text-xs text-muted2" style={{ animationDelay: ".4s" }}>Essai {PRICING.trialDays} jours · Sans engagement · Annulable à tout moment</p>
        </div>
        <div className="hero-item" style={{ animationDelay: ".35s" }}><LiveJournal /></div>
      </div>
    </section>
  );
}

function LogosMarquee() {
  const row = [...PROP_FIRMS, ...PROP_FIRMS];
  return (
    <section className="border-y border-line/60 bg-panel/30 py-10">
      <div className="mx-auto max-w-6xl px-5">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-muted2">Pensé pour tes comptes financés</p>
        <div className="mtb-marquee-wrap mt-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
          <div className="mtb-marquee flex w-max items-center gap-12">
            {row.map((f, i) => <span key={`${f}-${i}`} className="whitespace-nowrap font-mono text-sm uppercase tracking-widest text-muted/70">{f}</span>)}
          </div>
        </div>
      </div>
    </section>
  );
}

function Reasons() {
  return (
    <section id="reasons" className="mx-auto max-w-6xl px-5 py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Pourquoi MyTradeBook</span>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Un journal qui change ta séance, pour trois raisons.</h2>
      </Reveal>
      <div className="mt-16 grid gap-4 md:grid-cols-3">
        {REASONS.map(({ icon: Icon, title, body, accent, glow }, i) => (
          <Reveal key={title} delay={i * 100}>
            <SpotCard glow={glow} className="group h-full rounded-2xl border border-line bg-panel p-7 transition-transform duration-300 hover:-translate-y-1">
              <div className="mb-5 inline-flex rounded-xl border border-line2 bg-ink2/40 p-3 transition-transform group-hover:scale-110"><Icon size={22} className={accent} /></div>
              <h3 className="text-xl font-bold text-white">{title}</h3>
              <p className="mt-3 leading-relaxed text-muted">{body}</p>
            </SpotCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Timeline() {
  return (
    <section className="border-y border-line/60 bg-panel/20 py-24">
      <div className="mx-auto max-w-4xl px-5">
        <Reveal className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-cyanx">En direct</span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Ta séance, minute par minute.</h2>
          <p className="mt-4 text-muted">Voilà ce qui se passe pendant que tu trades — le journal fait le reste.</p>
        </Reveal>
        <div className="relative mt-16 pl-8">
          <div aria-hidden className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-accent/60 via-line2 to-transparent" />
          <div className="space-y-10">
            {TIMELINE.map((s, i) => (
              <Reveal key={i} delay={i * 60}>
                <div className="relative">
                  <span className="absolute -left-[29px] top-1 flex h-6 w-6 items-center justify-center rounded-full border border-accent/40 bg-ink"><span className="h-2 w-2 rounded-full bg-accent" /></span>
                  <div className="flex items-center gap-2 font-mono text-xs text-accent"><Clock size={12} /> {s.time}</div>
                  <h3 className="mt-1 text-lg font-bold text-white">{s.title}</h3>
                  <p className="mt-1.5 max-w-2xl leading-relaxed text-muted">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureDemo({ kind }) {
  if (kind === "why") return <span className="inline-flex rounded-md border border-line2 bg-ink2/50 px-2 py-1 font-mono text-[11px] text-accent">WHY : Breakout NY AM</span>;
  if (kind === "risk") return (<div className="w-full"><div className="h-2 overflow-hidden rounded-full bg-ink2"><div className="h-full w-1/3 rounded-full bg-goldx" /></div><p className="mt-1 font-mono text-[10px] text-muted2">1.0R / 3.0R</p></div>);
  if (kind === "score") return (<div className="flex items-center gap-2"><span className="font-mono text-2xl font-bold text-goldx">72</span><span className="text-[10px] uppercase tracking-wider text-muted2">/ 100</span></div>);
  if (kind === "cal") return (<div className="flex gap-1">{["bg-loss/60", "bg-accent/60", "bg-accent/70", "bg-loss/50", "bg-accent/80"].map((c, i) => <span key={i} className={`h-5 w-5 rounded ${c}`} />)}</div>);
  if (kind === "rbadge") return <span className="inline-flex rounded-md bg-accent/10 px-2.5 py-1 font-mono text-sm font-bold text-accent">+2.5R</span>;
  if (kind === "spark") return (<svg viewBox="0 0 120 32" className="w-28" aria-hidden><polyline points="0,26 20,22 40,24 60,14 80,18 100,8 120,4" fill="none" stroke="#00d301" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>);
  return null;
}

/* Carte generique avec lueur couleur qui suit la souris */
const SpotCard = forwardRef(function SpotCard({ glow = "#00d301", className = "", children, ...rest }, ref) {
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
  };
  return (
    <div ref={ref} onMouseMove={onMove} style={{ ["--glow"]: glow }} className={`mtb-spot ${className}`} {...rest}>
      <span className="mtb-spot-glow" aria-hidden />
      <span className="mtb-spot-border" aria-hidden />
      {children}
    </div>
  );
});

function FeatureCard({ f }) {
  const Icon = f.icon;
  return (
    <SpotCard glow={f.glow} className="group flex h-full flex-col rounded-2xl border border-line bg-panel p-6 transition-transform duration-300 hover:-translate-y-1">
      <div className="mb-4 inline-flex w-fit rounded-xl border border-line2 bg-ink2/40 p-2.5 transition-transform group-hover:scale-110"><Icon size={20} className={f.accent} /></div>
      <h3 className="text-lg font-semibold text-white">{f.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{f.body}</p>
      <div className="mt-5 flex min-h-[36px] items-center border-t border-line pt-4"><FeatureDemo kind={f.demo} /></div>
    </SpotCard>
  );
}

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-5 py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Ton edge, prouvé</span>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Tout ce qu'un journal devrait faire.</h2>
        <p className="mt-4 text-muted">Pas de gadget. Chaque brique existe pour te faire progresser trade après trade.</p>
      </Reveal>
      <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => <Reveal key={f.title} delay={(i % 3) * 90}><FeatureCard f={f} /></Reveal>)}
      </div>
    </section>
  );
}

function RDistribution() {
  const [ref, on] = useInView(0.3);
  const bars = [
    { h: 22, r: "-3R", loss: true }, { h: 40, r: "-2R", loss: true }, { h: 68, r: "-1R", loss: true },
    { h: 100, r: "0R", loss: false }, { h: 82, r: "+1R", loss: false }, { h: 55, r: "+2R", loss: false }, { h: 34, r: "+3R", loss: false },
  ];
  return (
    <SpotCard glow="#00d301" ref={ref} className="rounded-2xl border border-line bg-panel p-4 shadow-xl">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-medium text-white"><Activity size={13} className="text-accent" /> Distribution des R</span>
        <span className="rounded-full border border-line2 px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted2">aperçu</span>
      </div>
      <div className="mt-6 flex h-48 items-end gap-2">
        {bars.map((b, i) => (
          <div key={b.r} className="flex h-full flex-1 flex-col items-center justify-end">
            <div
              className={`w-full rounded-t ${b.loss ? "bg-loss/70" : "bg-accent/70"}`}
              style={{ height: on ? `${b.h}%` : "0%", transition: `height .9s ${EASE} ${i * 0.08}s` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {bars.map((b) => <span key={b.r} className="flex-1 text-center font-mono text-[10px] text-muted2">{b.r}</span>)}
      </div>
    </SpotCard>
  );
}

function Performance() {
  return (
    <section className="border-y border-line/60 bg-panel/20 py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
        <Reveal>
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-cyanx">Ta performance, reconstruite</span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Des trades bruts à une vraie lecture.</h2>
          <p className="mt-5 leading-relaxed text-muted">Chaque trade fermé devient de la donnée structurée : PnL, expectancy, R-multiples et courbe d'equity ancrée sur ton solde réel. Le calendrier montre ensuite quelles journées et quelles semaines portent tes résultats.</p>
          <ul className="mt-8 space-y-4">
            {["Import et saisie propres — pas de tableur qui casse.", "R affiché avec le signe et une décimale : +2.5R, -1.0R.", "Sessions et time-of-day : où ton edge se trouve vraiment.", "Bannière de risque toujours visible sur ta daily loss."].map((line) => (
              <li key={line} className="flex items-start gap-3"><span className="mt-0.5 inline-flex rounded-md bg-accent/10 p-1"><Check size={14} className="text-accent" /></span><span className="text-sm text-muted">{line}</span></li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={120}><RDistribution /></Reveal>
      </div>
    </section>
  );
}

function Pricing() {
  const [billing, setBilling] = useState("annual");
  const isA = billing === "annual";
  const yearlyIfMonthly = PRICING.monthly * 12;
  const savePct = Math.max(0, Math.round((1 - PRICING.annual / yearlyIfMonthly) * 100));

  return (
    <section id="tarif" className="mx-auto max-w-6xl px-5 py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Tarif</span>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Un seul plan. Tout inclus.</h2>
        <p className="mt-4 text-muted">Commence par {PRICING.trialDays} jours gratuits. Tu ne paies que si l'app te sert vraiment.</p>
      </Reveal>

      <Reveal className="mx-auto mt-10 flex w-fit items-center gap-1 rounded-full border border-line bg-panel p-1" delay={40}>
        <button onClick={() => setBilling("annual")} className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${isA ? "bg-accent text-ink" : "text-muted hover:text-white"}`}>
          Annuel{savePct > 0 && <span className={`ml-1.5 ${isA ? "text-ink/70" : "text-accent"}`}>-{savePct}%</span>}
        </button>
        <button onClick={() => setBilling("monthly")} className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${!isA ? "bg-accent text-ink" : "text-muted hover:text-white"}`}>
          Mensuel
        </button>
      </Reveal>

      <Reveal className="mx-auto mt-8 max-w-md" delay={80}>
        <SpotCard glow="#00d301" className="relative overflow-hidden rounded-3xl border border-accent/40 bg-panel p-8">
          <div aria-hidden className="mtb-glow pointer-events-none absolute inset-x-0 top-0 h-40" style={{ background: "radial-gradient(80% 100% at 50% 0%, rgba(0,211,1,0.15), transparent 70%)" }} />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="font-bold tracking-[0.2em] text-white">My<span className="text-accent">Trade</span>Book</span>
              <span className="rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">{isA ? "Annuel" : "Mensuel"}</span>
            </div>
            <div key={billing} className="mtb-stream">
              <div className="mt-8 flex items-end gap-2">
                <span className="font-mono text-5xl font-extrabold text-white">{price(isA ? PRICING.annual : PRICING.monthly)}</span>
                <span className="mb-1.5 text-sm text-muted">/ {isA ? "an" : "mois"}</span>
              </div>
              <p className="mt-1 font-mono text-sm text-muted2">{isA ? `soit ≈ ${price(monthlyEq)} / mois` : `soit ${price(yearlyIfMonthly)} / an · annulable chaque mois`}</p>
            </div>
            <a href="/login" className="group mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-base font-semibold text-ink transition-transform hover:scale-[1.02]">
              Démarrer l'essai {PRICING.trialDays} jours
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
            </a>
            <p className="mt-3 text-center text-xs text-muted2">{PRICING.trialDays} jours gratuits · Annulable à tout moment</p>
            <ul className="mt-8 space-y-3 border-t border-line pt-6">
              {["Journal illimité avec WHY par trade", "Edge Score, R-multiples et expectancy", "Calendrier, sessions et courbe d'equity", "Bannière de risque & suivi daily loss", "Menu personnalisable"].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm"><Check size={16} className="mt-0.5 shrink-0 text-accent" /><span className="text-muted">{item}</span></li>
              ))}
            </ul>
          </div>
        </SpotCard>
        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted2"><Lock size={12} /> Paiement sécurisé · Tes données restent les tiennes</p>
      </Reveal>
    </section>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-4 py-5 text-left">
        <span className="font-medium text-white">{q}</span>
        <ChevronDown size={18} className={`shrink-0 text-muted transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`grid transition-all duration-300 ${open ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden"><p className="text-sm leading-relaxed text-muted">{a}</p></div>
      </div>
    </div>
  );
}

function Faq() {
  return (
    <section id="faq" className="border-t border-line/60 bg-panel/20 py-24">
      <div className="mx-auto max-w-3xl px-5">
        <Reveal><h2 className="text-center text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Questions fréquentes</h2></Reveal>
        <Reveal className="mt-12" delay={80}>{FAQ.map((item) => <FaqItem key={item.q} {...item} />)}</Reveal>
      </div>
    </section>
  );
}

function CtaFooter() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24">
      <Reveal>
        <SpotCard glow="#00d301" className="relative overflow-hidden rounded-3xl border border-line bg-panel px-6 py-16 text-center">
          <div aria-hidden className="mtb-glow pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 80% at 50% 0%, rgba(0,211,1,0.13), transparent 70%)" }} />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">La prochaine séance que tu ne journalises pas, c'est l'erreur que tu répéteras.</h2>
            <a href="/login" className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-4 text-base font-semibold text-ink transition-transform hover:scale-[1.03]">
              Démarrer l'essai {PRICING.trialDays} jours
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        </SpotCard>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line/60">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <Logo />
          <nav className="flex items-center gap-6 text-sm text-muted">
            <a href="#features" className="hover:text-white">Fonctionnalités</a>
            <a href="#tarif" className="hover:text-white">Tarif</a>
            <a href="/login" className="hover:text-white">Se connecter</a>
          </nav>
        </div>
        <p className="mt-10 text-center text-xs leading-relaxed text-muted2">Le trading comporte un risque de perte en capital. Les expériences individuelles ne préjugent pas des résultats futurs. MyTradeBook est un outil de suivi et d'analyse, il ne fournit pas de conseil en investissement.</p>
        <p className="mt-6 text-center text-xs text-muted2">© {new Date().getFullYear()} MyTradeBook</p>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const rootRef = useRef(null);
  useEffect(() => { if (rootRef.current) rootRef.current.classList.add("mtb-motion"); }, []);
  return (
    <div ref={rootRef} className="min-h-screen bg-ink text-white">
      <style>{STYLES}</style>
      <Nav />
      <main>
        <Hero />
        <LogosMarquee />
        <Reasons />
        <Timeline />
        <Features />
        <Performance />
        <Pricing />
        <Faq />
        <CtaFooter />
      </main>
      <Footer />
    </div>
  );
}
