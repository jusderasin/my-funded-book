"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ShieldAlert,
  Target,
  CalendarDays,
  BarChart3,
  Gauge,
  Check,
  ChevronDown,
  Lock,
  Menu,
  X,
  TrendingUp,
  AlertTriangle,
  Clock,
  Sparkles,
} from "lucide-react";

/* =========================================================================
   TARIF — Erwann : remplace ces valeurs par les vraies.
   `annual` = prix payé une fois par an. Le "≈ X/mois" est calculé tout seul.
   ========================================================================= */
const PRICING = {
  currency: "€",
  annual: 149, // TODO: prix annuel réel
  trialDays: 14,
};

const monthlyEq = Math.round((PRICING.annual / 12) * 100) / 100;
const price = (n) => `${n}${PRICING.currency}`;

const PROP_FIRMS = [
  "MyFundedFutures",
  "TopStep",
  "Apex",
  "FundingPips",
  "Take Profit Trader",
];

const FEATURES = [
  {
    icon: BookOpen,
    title: "Journal & WHY",
    body: "Chaque trade est logué avec la raison qui l'a déclenché. Tu arrêtes de refaire les mêmes erreurs parce qu'elles deviennent visibles, séance après séance.",
    accent: "text-accent",
  },
  {
    icon: ShieldAlert,
    title: "Bannière de risque",
    body: "Tu sais en permanence où tu en es sur ta daily loss. Plus de compte cramé sur une éval pour un trade de trop pris à la fin de la session.",
    accent: "text-loss",
  },
  {
    icon: Target,
    title: "Edge Score",
    body: "Noir sur blanc : quels setups et quelles sessions te rapportent réellement. Tu concentres ton capital là où ton edge existe.",
    accent: "text-goldx",
  },
  {
    icon: CalendarDays,
    title: "Calendrier & sessions",
    body: "Jour par jour, semaine par semaine. Tu vois quelles journées et quelles sessions portent tes résultats, au lieu de deviner.",
    accent: "text-cyanx",
  },
  {
    icon: BarChart3,
    title: "R-multiples & PnL",
    body: "Chaque trade converti en données propres : R, expectancy, PnL. Des stats structurées plutôt qu'un tableur qui déraille.",
    accent: "text-pinkx",
  },
  {
    icon: Gauge,
    title: "Courbe d'equity",
    body: "Une courbe ancrée sur ton solde réel, une distribution de R et une performance hebdo. Ta progression, lisible d'un coup d'œil.",
    accent: "text-accent",
  },
];

const FAQ = [
  {
    q: "C'est pour quel type de trader ?",
    a: "MyTradeBook est pensé pour le trader financé (prop firm, éval ou compte financé) qui veut tenir un journal discipliné et lire son edge sans y passer sa soirée.",
  },
  {
    q: "Comment marche l'essai ?",
    a: `Tu as ${PRICING.trialDays} jours pour tester l'app en entier, sans engagement. Tu annules quand tu veux avant la fin, tu n'es pas débité.`,
  },
  {
    q: "Mes données sont-elles en sécurité ?",
    a: "Tes trades et tes notes restent les tiens. Rien n'est revendu, rien n'est partagé. MyTradeBook est un outil de suivi, il ne trade jamais à ta place.",
  },
  {
    q: "Est-ce un conseil en investissement ?",
    a: "Non. C'est un outil d'analyse et de tenue de journal. Le trading comporte un risque de perte en capital, et les performances passées ne préjugent pas des résultats futurs.",
  },
];

/* ---------- styles + motion ------ */
const STYLES = `
@keyframes mtbFadeUp { from { opacity:0; transform:translateY(24px);} to { opacity:1; transform:none; } }
@keyframes mtbGlow { 0%,100% { opacity:.45; } 50% { opacity:.85; } }
@keyframes mtbMarquee { from { transform:translateX(0);} to { transform:translateX(-50%);} }
@keyframes mtbDraw { to { stroke-dashoffset:0; } }
@keyframes mtbBar { from { transform:scaleY(0);} to { transform:scaleY(1);} }
@keyframes mtbPulse { 0%,100% { opacity:.35; transform:scale(1);} 50% { opacity:.9; transform:scale(1.35);} }
@keyframes mtbFloat { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }

.hero-item { opacity:0; animation: mtbFadeUp .7s cubic-bezier(.2,.7,.2,1) forwards; }
.mtb-motion .reveal { opacity:0; transform:translateY(24px); transition: opacity .7s ease, transform .7s cubic-bezier(.2,.7,.2,1); }
.mtb-motion .reveal.in-view { opacity:1; transform:none; }
.mtb-glow { animation: mtbGlow 6s ease-in-out infinite; }
.mtb-marquee { animation: mtbMarquee 32s linear infinite; }
.mtb-marquee-wrap:hover .mtb-marquee { animation-play-state:paused; }
.mtb-draw { stroke-dasharray:1200; stroke-dashoffset:1200; animation: mtbDraw 2.6s ease-out .3s forwards; }
.mtb-bar { transform-origin:bottom; transform:scaleY(0); animation: mtbBar .9s cubic-bezier(.2,.7,.2,1) forwards; }
.mtb-pulse { animation: mtbPulse 2.4s ease-in-out infinite; }
.mtb-float { animation: mtbFloat 4s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .hero-item, .mtb-glow, .mtb-marquee, .mtb-draw, .mtb-bar, .mtb-pulse, .mtb-float { animation:none !important; }
  .hero-item, .mtb-motion .reveal { opacity:1 !important; transform:none !important; }
  .mtb-draw { stroke-dashoffset:0 !important; }
  .mtb-bar { transform:none !important; }
}
`;

function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add("in-view");
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function Logo() {
  return (
    <span className="font-bold tracking-[0.25em] text-white select-none text-base">
      My<span className="text-accent">Trade</span>Book
    </span>
  );
}

function Nav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line/60 bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
          <a href="#features" className="transition-colors hover:text-white">Fonctionnalités</a>
          <a href="#demo" className="transition-colors hover:text-white">Aperçu</a>
          <a href="#tarif" className="transition-colors hover:text-white">Tarif</a>
          <a href="#faq" className="transition-colors hover:text-white">FAQ</a>
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <a href="/login" className="text-sm text-muted transition-colors hover:text-white">
            Se connecter
          </a>
          <a href="/login" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-ink shadow-lg shadow-accent/20 transition-all hover:scale-[1.03] active:scale-95">
            Commencer
          </a>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-lg p-2 text-muted hover:text-white md:hidden"
          aria-label="Menu"
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Menu Mobile */}
      {isOpen && (
        <div className="border-b border-line bg-ink/95 px-5 py-4 backdrop-blur-lg md:hidden">
          <nav className="flex flex-col gap-4 text-sm font-medium text-muted">
            <a href="#features" onClick={() => setIsOpen(false)} className="hover:text-white">Fonctionnalités</a>
            <a href="#demo" onClick={() => setIsOpen(false)} className="hover:text-white">Aperçu app</a>
            <a href="#tarif" onClick={() => setIsOpen(false)} className="hover:text-white">Tarif</a>
            <a href="#faq" onClick={() => setIsOpen(false)} className="hover:text-white">FAQ</a>
            <div className="pt-2 border-t border-line/60 flex flex-col gap-3">
              <a href="/login" className="text-center py-2 hover:text-white">Se connecter</a>
              <a href="/login" className="rounded-xl bg-accent py-2.5 text-center font-semibold text-ink">
                Essai gratuit {PRICING.trialDays} jours
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

/* Aperçu dynamique & interactif du dashboard */
function DynamicDashboard() {
  const [tab, setTab] = useState("equity");
  const [activeStat, setActiveStat] = useState("pnl");

  return (
    <div className="relative rounded-2xl border border-line bg-panel p-3 shadow-2xl transition-all hover:border-accent/30 sm:p-5">
      {/* Top Bar Dashboard */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-loss/80" />
            <span className="h-3 w-3 rounded-full bg-goldx/80" />
            <span className="h-3 w-3 rounded-full bg-accent/80" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-white">
            Session NY · <span className="text-accent">TopStep $50k</span>
          </span>
        </div>

        {/* Dynamic Tabs */}
        <div className="flex items-center rounded-lg border border-line2 bg-ink2/60 p-1 text-xs">
          <button
            onClick={() => setTab("equity")}
            className={`rounded-md px-3 py-1 font-medium transition-colors ${tab === "equity" ? "bg-panel text-accent shadow" : "text-muted hover:text-white"}`}
          >
            Courbe d'Equity
          </button>
          <button
            onClick={() => setTab("log")}
            className={`rounded-md px-3 py-1 font-medium transition-colors ${tab === "log" ? "bg-panel text-accent shadow" : "text-muted hover:text-white"}`}
          >
            Dernier Trade (WHY)
          </button>
        </div>
      </div>

      {/* KPI Cards Interactive */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { id: "pnl", label: "PnL Total", val: "+3 420.00 €", sub: "+14.2R cette semaine", color: "text-accent" },
          { id: "winrate", label: "Win Rate", val: "68.4 %", sub: "28 trades logués", color: "text-goldx" },
          { id: "edge", label: "Edge Score", val: "8.9/10", sub: "A+ Setup validé", color: "text-cyanx" },
          { id: "daily", label: "Daily Loss Buffer", val: "-350 € / -1200 €", sub: "Bannière Verte OK", color: "text-accent" },
        ].map((stat) => (
          <div
            key={stat.id}
            onClick={() => setActiveStat(stat.id)}
            className={`cursor-pointer rounded-xl border p-3 transition-all ${
              activeStat === stat.id ? "border-accent bg-ink2/80 scale-[1.02]" : "border-line2 bg-ink2/30 hover:border-line"
            }`}
          >
            <p className="text-[10px] uppercase tracking-wider text-muted2">{stat.label}</p>
            <p className={`mt-1 text-base font-bold sm:text-lg ${stat.color}`}>{stat.val}</p>
            <p className="text-[10px] text-muted">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Interactive Main View */}
      {tab === "equity" ? (
        <div className="mt-5 rounded-xl border border-line2 bg-ink2/40 p-4">
          <div className="flex items-center justify-between text-xs text-muted">
            <span className="flex items-center gap-1.5 text-accent font-medium">
              <TrendingUp size={14} /> Peak Performance (+18.4R)
            </span>
            <span className="font-mono text-[11px] text-muted2">NQ1! — 5m Chart Match</span>
          </div>

          <svg viewBox="0 0 400 160" className="mt-2 w-full overflow-visible" role="img" aria-label="Aperçu de courbe d'equity">
            <defs>
              <linearGradient id="mtbArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00d301" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#00d301" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[30, 70, 110].map((y) => (
              <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="currentColor" className="text-line2" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
            ))}
            <path d="M0,130 L40,125 80,135 120,95 160,105 200,70 240,80 280,45 320,55 360,25 400,15 L400,150 L0,150 Z" fill="url(#mtbArea)" opacity="0.9" />
            <path className="mtb-draw" d="M0,130 L40,125 80,135 120,95 160,120 200,70 240,80 280,45 320,55 360,25 400,15" fill="none" stroke="#00d301" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="400" cy="15" r="6" fill="#00d301" className="mtb-pulse" />
            <circle cx="400" cy="15" r="3" fill="#ffffff" />
          </svg>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-accent/40 bg-ink2/60 p-4 text-left">
          <div className="flex items-center justify-between border-b border-line/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="rounded bg-accent/20 px-2 py-0.5 text-xs font-bold text-accent">+3.2 R</span>
              <span className="text-sm font-semibold text-white">NQ Long — Swept Liquidity</span>
            </div>
            <span className="text-xs text-muted2">15:42 — Session NY</span>
          </div>
          <div className="mt-3 space-y-2 text-xs">
            <p className="text-muted"><strong className="text-white">Raison / WHY :</strong> Rejection propre de la FVG H1 après prise de liquidité Asia Low. Confluence avec l'Open NY.</p>
            <p className="text-muted"><strong className="text-white">Émotion :</strong> Calme (100% respect du plan).</p>
          </div>
        </div>
      )}

      {/* Bottom Floating Banner */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line2 bg-panel/80 px-4 py-2 text-xs">
        <div className="flex items-center gap-2">
          <ShieldAlert size={14} className="text-accent" />
          <span className="text-muted">Risque journalier autorisé : <strong className="text-white">1 200.00 €</strong></span>
        </div>
        <span className="rounded bg-accent/10 px-2 py-0.5 font-semibold text-accent">Compte Sécurisé</span>
      </div>
    </div>
  );
}

function Hero() {
  const containerRef = useRef(null);
  const [coords, setCoords] = useState({ x: 50, y: 0 });

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setCoords({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative overflow-hidden"
    >
      <div
        aria-hidden
        className="mtb-glow pointer-events-none absolute inset-0 -z-10 transition-opacity"
        style={{
          background: `radial-gradient(600px circle at ${coords.x}% ${coords.y}%, rgba(0,211,1,0.15), transparent 80%)`,
        }}
      />
      
      <div className="mx-auto max-w-6xl px-5 pb-20 pt-16 text-center sm:pt-24">
        <span className="hero-item inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-accent shadow-lg shadow-accent/10" style={{ animationDelay: "0s" }}>
          <Sparkles size={14} /> Le journal du trader financé
        </span>

        <h1 className="hero-item mx-auto mt-8 max-w-4xl text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl" style={{ animationDelay: ".1s" }}>
          Tes trades deviennent <br />
          <span className="bg-gradient-to-r from-white via-white to-accent bg-clip-text text-transparent">
            des décisions.
          </span>
        </h1>

        <p className="hero-item mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg" style={{ animationDelay: ".2s" }}>
          MyTradeBook logue chaque trade, calcule ton R et ton Edge Score, et te garde dans les clous de ta daily loss. Ton livre de comptes, structuré — pour que ta review ne dépende plus de ta mémoire.
        </p>

        <div className="hero-item mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row" style={{ animationDelay: ".3s" }}>
          <a href="/login" className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-8 py-4 text-base font-bold text-ink shadow-xl shadow-accent/20 transition-all hover:scale-[1.03] active:scale-95 sm:w-auto">
            Démarrer l'essai {PRICING.trialDays} jours
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </a>
          <a href="#features" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line2 bg-panel/40 px-8 py-4 text-base font-semibold text-white transition-all hover:border-line hover:bg-panel sm:w-auto">
            Voir les fonctionnalités
          </a>
        </div>

        <p className="hero-item mt-4 text-xs text-muted2" style={{ animationDelay: ".4s" }}>
          Essai {PRICING.trialDays} jours · Sans engagement · Annulable à tout moment
        </p>

        <div className="hero-item mx-auto mt-14 max-w-4xl" style={{ animationDelay: ".5s" }}>
          <DynamicDashboard />
        </div>
      </div>
    </section>
  );
}

function PropFirms() {
  const row = [...PROP_FIRMS, ...PROP_FIRMS, ...PROP_FIRMS];
  return (
    <section className="border-y border-line/60 bg-panel/30 py-10">
      <div className="mx-auto max-w-6xl px-5">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-muted2">
          Pensé pour tes comptes financés & prop firms
        </p>
        <div className="mtb-marquee-wrap mt-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
          <div className="mtb-marquee flex w-max items-center gap-12">
            {row.map((f, i) => (
              <span key={`${f}-${i}`} className="whitespace-nowrap font-mono text-sm font-semibold uppercase tracking-widest text-muted/70 transition-colors hover:text-white">
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-5 py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Ton edge, prouvé</span>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Tout ce qu'un journal devrait faire.
        </h2>
        <p className="mt-4 text-muted">
          Pas de gadget. Chaque brique existe pour une seule raison : te faire progresser trade après trade.
        </p>
      </Reveal>

      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body, accent }, i) => (
          <Reveal key={title} delay={(i % 3) * 90}>
            <div className="group h-full rounded-2xl border border-line bg-panel p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-accent/50 hover:shadow-xl hover:shadow-accent/5">
              <div className="mb-5 inline-flex rounded-xl border border-line2 bg-ink2/60 p-3 transition-transform group-hover:scale-110">
                <Icon size={22} className={accent} />
              </div>
              <h3 className="text-lg font-bold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function DeepDive() {
  return (
    <section id="demo" className="border-y border-line/60 bg-panel/20 py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
        <Reveal>
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-cyanx">Ta performance, reconstruite</span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Des trades bruts à une vraie lecture.
          </h2>
          <p className="mt-5 leading-relaxed text-muted">
            Chaque trade fermé devient de la donnée structurée : PnL, expectancy, R-multiples et courbe d'equity ancrée sur ton solde réel. Le calendrier montre ensuite exactement quelles journées et quelles semaines portent tes résultats.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              "Import et saisie propres — pas de tableur qui casse.",
              "R affiché avec le signe et une décimale : +2.5R, -1.0R.",
              "Sessions et time-of-day : où ton edge se trouve vraiment.",
              "Bannière de risque toujours visible sur ta daily loss.",
            ].map((line) => (
              <li key={line} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex rounded-md bg-accent/10 p-1 text-accent">
                  <Check size={14} />
                </span>
                <span className="text-sm text-muted">{line}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={120}>
          <div className="rounded-2xl border border-line bg-panel p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line2 pb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-white">Distribution des R</span>
              <span className="rounded-full border border-line2 px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted2">aperçu live</span>
            </div>
            <div className="mt-6 flex h-52 items-end justify-between gap-2">
              {[
                { h: 22, r: "-3R", loss: true },
                { h: 40, r: "-2R", loss: true },
                { h: 68, r: "-1R", loss: true },
                { h: 100, r: "0R", loss: false },
                { h: 82, r: "+1R", loss: false },
                { h: 55, r: "+2R", loss: false },
                { h: 34, r: "+3R", loss: false },
              ].map((b, i) => (
                <div key={b.r} className="group relative flex flex-1 flex-col items-center gap-2">
                  <div
                    className={`mtb-bar w-full rounded-t transition-opacity group-hover:opacity-100 ${
                      b.loss ? "bg-loss/80" : "bg-accent/80"
                    }`}
                    style={{ height: `${b.h}%`, animationDelay: `${0.15 * i}s` }}
                  />
                  <span className="font-mono text-[10px] text-muted2">{b.r}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="tarif" className="mx-auto max-w-6xl px-5 py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Tarif</span>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Un seul plan. Tout inclus.
        </h2>
        <p className="mt-4 text-muted">
          Commence par {PRICING.trialDays} jours gratuits. Tu ne paies que si l'app te sert vraiment.
        </p>
      </Reveal>

      <Reveal className="mx-auto mt-14 max-w-md" delay={80}>
        <div className="relative overflow-hidden rounded-3xl border border-accent/40 bg-panel p-8 shadow-2xl transition-all hover:border-accent">
          <div
            aria-hidden
            className="mtb-glow pointer-events-none absolute inset-x-0 top-0 h-40"
            style={{ background: "radial-gradient(80% 100% at 50% 0%, rgba(0,211,1,0.18), transparent 70%)" }}
          />
          <div className="relative">
            <div className="flex items-center justify-between">
              <Logo />
              <span className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
                Pass Annuel
              </span>
            </div>

            <div className="mt-8 flex items-end gap-2">
              <span className="font-mono text-5xl font-black text-white">{price(PRICING.annual)}</span>
              <span className="mb-1.5 text-sm text-muted">/ an</span>
            </div>
            <p className="mt-1 font-mono text-sm text-goldx">soit ≈ {price(monthlyEq)} / mois</p>

            <a href="/login" className="group mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-4 text-base font-bold text-ink shadow-lg shadow-accent/20 transition-all hover:scale-[1.02] active:scale-95">
              Démarrer l'essai {PRICING.trialDays} jours
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </a>
            <p className="mt-3 text-center text-xs text-muted2">
              {PRICING.trialDays} jours gratuits · Annulable à tout moment
            </p>

            <ul className="mt-8 space-y-3.5 border-t border-line pt-6">
              {[
                "Journal illimité avec WHY par trade",
                "Edge Score, R-multiples et expectancy",
                "Calendrier, sessions et courbe d'equity",
                "Bannière de risque & suivi daily loss",
                "Menu personnalisable",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <Check size={16} className="mt-0.5 shrink-0 text-accent" />
                  <span className="text-muted">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted2">
          <Lock size={12} />
          Paiement sécurisé · Tes données restent les tiennes
        </p>
      </Reveal>
    </section>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-line">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left font-medium text-white transition-colors hover:text-accent"
      >
        <span>{q}</span>
        <ChevronDown size={18} className={`shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180 text-accent" : ""}`} />
      </button>
      {open && (
        <p className="pb-5 text-sm leading-relaxed text-muted">{a}</p>
      )}
    </div>
  );
}

function Faq() {
  return (
    <section id="faq" className="border-t border-line/60 bg-panel/20 py-24">
      <div className="mx-auto max-w-3xl px-5">
        <Reveal>
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Questions fréquentes
          </h2>
        </Reveal>
        <Reveal className="mt-12" delay={80}>
          {FAQ.map((item) => (
            <FaqItem key={item.q} {...item} />
          ))}
        </Reveal>
      </div>
    </section>
  );
}

function CtaFooter() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-line bg-panel px-6 py-16 text-center shadow-2xl">
          <div
            aria-hidden
            className="mtb-glow pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(60% 80% at 50% 0%, rgba(0,211,1,0.15), transparent 70%)" }}
          />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Tiens le journal qui te fait progresser.
            </h2>
            <a href="/login" className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-4 text-base font-bold text-ink shadow-xl shadow-accent/20 transition-all hover:scale-[1.03] active:scale-95">
              Démarrer l'essai {PRICING.trialDays} jours
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line/60 bg-ink">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <Logo />
          <nav className="flex items-center gap-6 text-sm text-muted">
            <a href="#features" className="hover:text-white">Fonctionnalités</a>
            <a href="#tarif" className="hover:text-white">Tarif</a>
            <a href="/login" className="hover:text-white">Se connecter</a>
          </nav>
        </div>
        <p className="mt-10 text-center text-xs leading-relaxed text-muted2">
          Le trading comporte un risque de perte en capital. Les expériences individuelles ne préjugent pas des résultats futurs. MyTradeBook est un outil de suivi et d'analyse, il ne fournit pas de conseil en investissement.
        </p>
        <p className="mt-6 text-center text-xs text-muted2">© {new Date().getFullYear()} MyTradeBook</p>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const rootRef = useRef(null);
  useEffect(() => {
    if (rootRef.current) rootRef.current.classList.add("mtb-motion");
  }, []);

  return (
    <div ref={rootRef} className="min-h-screen bg-ink text-white selection:bg-accent/30 selection:text-accent">
      <style>{STYLES}</style>
      <Nav />
      <main>
        <Hero />
        <PropFirms />
        <Features />
        <DeepDive />
        <Pricing />
        <Faq />
        <CtaFooter />
      </main>
      <Footer />
    </div>
  );
}
