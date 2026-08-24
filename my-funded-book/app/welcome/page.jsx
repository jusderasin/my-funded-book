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
  Zap,
  CheckCircle2,
} from "lucide-react";

/* =========================================================================
   TARIFS — Mis à jour avec option Mensuelle / Annuelle
   ========================================================================= */
const PRICING = {
  currency: "€",
  monthly: 19,
  annual: 149, // ≈ 12.41 € / mois
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
    body: "Chaque trade est logué avec la raison précise qui l'a déclenché. Tu élimines les erreurs impulsives en les rendant visibles séance après séance.",
    accent: "text-accent",
  },
  {
    icon: ShieldAlert,
    title: "Bannière de risque",
    body: "Suivi temps réel de ta Daily Loss Limit. Un bouclier visuel pour protéger tes comptes financés du tilt et du sur-trading.",
    accent: "text-loss",
  },
  {
    icon: Target,
    title: "Edge Score",
    body: "Analyse algorithmique de tes setups. Découvre exactement quelles configurations et sessions génèrent 80% de tes gains.",
    accent: "text-goldx",
  },
  {
    icon: CalendarDays,
    title: "Calendrier & Sessions",
    body: "Vue temporelle et analytique. Identifie les jours et créneaux horaires où ton équité progresse réellement.",
    accent: "text-cyanx",
  },
  {
    icon: BarChart3,
    title: "R-multiples & PnL",
    body: "Conversion automatique de tes trades en métriques institutionnelles : R-ratio, Expectancy et Profit Factor sans tableur lourd.",
    accent: "text-pinkx",
  },
  {
    icon: Gauge,
    title: "Courbe d'equity",
    body: "Visualisation nette ancrée sur ton solde réel avec distribution statistique de tes performances hebdomadaires.",
    accent: "text-accent",
  },
];

const FAQ = [
  {
    q: "C'est pour quel type de trader ?",
    a: "MyTradeBook est spécialement conçu pour les traders sur comptes financés (Prop Firms comme TopStep, Apex, MyFundedFutures) et traders indépendants exigeants qui veulent automatiser leur discipline.",
  },
  {
    q: "Comment fonctionne l'essai gratuit de 14 jours ?",
    a: `Tu profites de 100% des fonctionnalités pendant ${PRICING.trialDays} jours sans déboursment. Tu peux annuler en un clic à tout moment depuis ton espace.`,
  },
  {
    q: "Comment sont importés mes trades ?",
    a: "Tu peux saisir tes trades rapidement via notre formulaire express ou importer directement tes fichiers d'exécution (CSV / Rapports de plateforme).",
  },
  {
    q: "Mes données bancaires et de trading sont-elles sécurisées ?",
    a: "Absolument. Tes données restent strictement confidentielles et ne sont jamais partagées. Le paiement est entièrement sécurisé via Stripe.",
  },
];

/* ---------- STYLES & ANIMATIONS ---------- */
const STYLES = `
@keyframes mtbFadeUp { from { opacity:0; transform:translateY(24px);} to { opacity:1; transform:none; } }
@keyframes mtbGlow { 0%,100% { opacity:.45; } 50% { opacity:.85; } }
@keyframes mtbMarquee { from { transform:translateX(0);} to { transform:translateX(-50%);} }
@keyframes mtbDraw { to { stroke-dashoffset:0; } }
@keyframes mtbBar { from { transform:scaleY(0);} to { transform:scaleY(1);} }
@keyframes mtbPulse { 0%,100% { opacity:.35; transform:scale(1);} 50% { opacity:.9; transform:scale(1.35);} }

.hero-item { opacity:0; animation: mtbFadeUp .7s cubic-bezier(.2,.7,.2,1) forwards; }
.mtb-motion .reveal { opacity:0; transform:translateY(24px); transition: opacity .7s ease, transform .7s cubic-bezier(.2,.7,.2,1); }
.mtb-motion .reveal.in-view { opacity:1; transform:none; }
.mtb-glow { animation: mtbGlow 6s ease-in-out infinite; }
.mtb-marquee { animation: mtbMarquee 32s linear infinite; }
.mtb-marquee-wrap:hover .mtb-marquee { animation-play-state:paused; }
.mtb-draw { stroke-dasharray:1200; stroke-dashoffset:1200; animation: mtbDraw 2.6s ease-out .3s forwards; }
.mtb-bar { transform-origin:bottom; transform:scaleY(0); animation: mtbBar .9s cubic-bezier(.2,.7,.2,1) forwards; }
.mtb-pulse { animation: mtbPulse 2.4s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .hero-item, .mtb-glow, .mtb-marquee, .mtb-draw, .mtb-bar, .mtb-pulse { animation:none !important; }
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
    <span className="font-bold tracking-[0.2em] text-white select-none text-lg">
      My<span className="text-accent">Trade</span>Book
    </span>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/60 bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm font-medium text-muted md:flex">
          <a href="#features" className="transition-colors hover:text-white">Fonctionnalités</a>
          <a href="#tarif" className="transition-colors hover:text-white">Tarif</a>
          <a href="#faq" className="transition-colors hover:text-white">FAQ</a>
        </nav>
        <div className="flex items-center gap-4">
          <a href="/login" className="hidden text-sm font-medium text-muted transition-colors hover:text-white sm:block">
            Se connecter
          </a>
          <a href="/login" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-ink transition-all hover:opacity-90 hover:shadow-[0_0_20px_rgba(0,211,1,0.3)]">
            Essai gratuit
          </a>
        </div>
      </div>
    </header>
  );
}

/* Dashboard preview retravaillé avec métriques clés */
function DashboardPreview() {
  return (
    <div className="rounded-2xl border border-line/80 bg-panel/90 p-3 shadow-2xl backdrop-blur">
      <div className="rounded-xl border border-line2 bg-ink2/50 p-4">
        {/* Header Dashboard fictif */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line2/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-loss/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-goldx/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-accent/80" />
            <span className="ml-2 text-xs font-semibold text-white">Performances — Session US</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-mono text-accent border border-accent/20">
              Live Edge: 78%
            </span>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Win Rate", val: "64.2%", color: "text-accent" },
            { label: "Profit Factor", val: "2.15", color: "text-white" },
            { label: "Expectancy", val: "+1.8R", color: "text-accent" },
            { label: "Net PnL", val: "+$4,250", color: "text-accent" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-lg border border-line2/80 bg-panel/40 p-2.5 text-left">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted2">{kpi.label}</p>
              <p className={`mt-0.5 text-base font-bold font-mono ${kpi.color}`}>{kpi.val}</p>
            </div>
          ))}
        </div>

        {/* Graphique d'Equity */}
        <div className="relative mt-4">
          <svg viewBox="0 0 400 150" className="w-full" role="img" aria-label="Courbe d'equity">
            <defs>
              <linearGradient id="mtbArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00d301" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#00d301" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[30, 70, 110].map((y) => (
              <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="currentColor" className="text-line2" strokeWidth="1" opacity="0.3" strokeDasharray="4 4" />
            ))}
            <path d="M0,130 L0,135 L40,135 L40,125 80,130 120,95 160,105 200,75 240,85 280,50 320,60 360,30 400,18 L400,140 L0,140 Z" fill="url(#mtbArea)" />
            <path className="mtb-draw" d="M0,125 L40,125 80,130 120,95 160,105 200,75 240,85 280,50 320,60 360,30 400,18" fill="none" stroke="#00d301" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="400" cy="18" r="5" fill="#00d301" className="mtb-pulse" />
            <circle cx="400" cy="18" r="2.5" fill="#ffffff" />
          </svg>
        </div>

        {/* Breakdown barres */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { l: "Distribution R", cls: "bg-accent/70" },
            { l: "Sessions US/EU", cls: "bg-cyanx/70" },
            { l: "Risk Guard", cls: "bg-loss/70" },
          ].map((c, idx) => (
            <div key={c.l} className="rounded-lg border border-line2/60 bg-panel/40 p-2">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted2">{c.l}</p>
              <div className="mt-2 flex h-6 items-end gap-1">
                {[0.4, 0.7, 1, 0.6, 0.85].map((h, i) => (
                  <span
                    key={i}
                    className={`mtb-bar flex-1 rounded-xs ${i % 2 === 0 ? c.cls : "bg-line2"}`}
                    style={{ height: `${h * 100}%`, animationDelay: `${0.5 + idx * 0.1 + i * 0.05}s` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden pt-12 pb-20">
      <div
        aria-hidden
        className="mtb-glow pointer-events-none absolute inset-0 -z-10"
        style={{ background: "radial-gradient(65% 55% at 50% 10%, rgba(0,211,1,0.14), transparent 75%)" }}
      />
      <div className="mx-auto max-w-6xl px-5 text-center">
        <span className="hero-item inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-accent" style={{ animationDelay: "0s" }}>
          <Zap size={14} /> Le journal haute précision du trader financé
        </span>

        <h1 className="hero-item mx-auto mt-7 max-w-4xl text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-6xl" style={{ animationDelay: ".1s" }}>
          Transforme tes exécutions brutes en <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-accent">avantage statistique</span>.
        </h1>

        <p className="hero-item mx-auto mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-muted" style={{ animationDelay: ".2s" }}>
          MyTradeBook calcule ton R-multiple, isole ton Edge Score et protège ta Daily Loss. Ne laisse plus ta discipline dépendre de simples souvenirs ou d'un tableur bancal.
        </p>

        <div className="hero-item mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row" style={{ animationDelay: ".3s" }}>
          <a href="/login" className="group inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-accent px-8 py-4 text-base font-semibold text-ink transition-all hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(0,211,1,0.4)]">
            Démarrer l'essai gratuit ({PRICING.trialDays} jours)
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </a>
          <a href="#features" className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-line2/80 px-7 py-4 text-base font-medium text-white transition-colors hover:bg-panel">
            Découvrir les fonctionnalités
          </a>
        </div>

        <div className="hero-item mt-5 flex flex-wrap items-center justify-center gap-6 text-xs text-muted2" style={{ animationDelay: ".4s" }}>
          <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-accent" /> 14 jours offerts</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-accent" /> Sans carte bancaire requise</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-accent" /> Configuration en 2 min</span>
        </div>

        <div className="hero-item mx-auto mt-12 max-w-3xl" style={{ animationDelay: ".5s" }}>
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}

function PropFirms() {
  const row = [...PROP_FIRMS, ...PROP_FIRMS];
  return (
    <section className="border-y border-line/60 bg-panel/30 py-8">
      <div className="mx-auto max-w-6xl px-5">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted2">
          Optimisé pour les évaluations & comptes financés
        </p>
        <div className="mtb-marquee-wrap mt-5 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
          <div className="mtb-marquee flex w-max items-center gap-14">
            {row.map((f, i) => (
              <span key={`${f}-${i}`} className="whitespace-nowrap font-mono text-sm font-semibold uppercase tracking-widest text-muted/60">
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
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Analyse Institutionnelle</span>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Conçu pour faire grandir ton capital.
        </h2>
        <p className="mt-3 text-muted">
          Chaque fonctionnalité répond à un besoin précis de gestion du risque et de performance.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body, accent }, i) => (
          <Reveal key={title} delay={(i % 3) * 80}>
            <div className="group h-full rounded-2xl border border-line bg-panel/70 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-xl">
              <div className="mb-4 inline-flex rounded-xl border border-line2 bg-ink2/60 p-3 transition-transform group-hover:scale-110">
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

function Pricing() {
  const [billingCycle, setBillingCycle] = useState("annual"); // "annual" | "monthly"

  return (
    <section id="tarif" className="mx-auto max-w-6xl px-5 py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Tarification simple</span>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Un investissement rentabilisé dès le 1er trade évité.
        </h2>
        <p className="mt-3 text-muted">
          Teste MyTradeBook pendant {PRICING.trialDays} jours gratuitement.
        </p>

        {/* Toggle Mensuel / Annuel */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <span className={`text-sm ${billingCycle === "monthly" ? "text-white font-semibold" : "text-muted"}`}>Mensuel</span>
          <button
            onClick={() => setBillingCycle(billingCycle === "annual" ? "monthly" : "annual")}
            className="relative h-7 w-14 rounded-full bg-line2 p-1 transition-colors"
            aria-label="Basculer le mode de facturation"
          >
            <div
              className={`h-5 w-5 rounded-full bg-accent transition-transform ${
                billingCycle === "annual" ? "translate-x-7" : "translate-x-0"
              }`}
            />
          </button>
          <span className={`text-sm flex items-center gap-1.5 ${billingCycle === "annual" ? "text-white font-semibold" : "text-muted"}`}>
            Annuel <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold uppercase text-accent">-35%</span>
          </span>
        </div>
      </Reveal>

      <Reveal className="mx-auto mt-12 max-w-md" delay={80}>
        <div className="relative overflow-hidden rounded-3xl border border-accent/40 bg-panel/90 p-8 shadow-2xl">
          <div
            aria-hidden
            className="mtb-glow pointer-events-none absolute inset-x-0 top-0 h-40"
            style={{ background: "radial-gradient(80% 100% at 50% 0%, rgba(0,211,1,0.18), transparent 70%)" }}
          />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="font-bold tracking-[0.15em] text-white">PRO PASS</span>
              <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
                {billingCycle === "annual" ? "Offre Annuelle" : "Mensuel"}
              </span>
            </div>

            <div className="mt-6 flex items-end gap-2">
              <span className="font-mono text-5xl font-extrabold text-white">
                {billingCycle === "annual" ? price(PRICING.annual) : price(PRICING.monthly)}
              </span>
              <span className="mb-1.5 text-sm text-muted">/{billingCycle === "annual" ? "an" : "mois"}</span>
            </div>
            {billingCycle === "annual" && (
              <p className="mt-1 font-mono text-xs text-accent">soit environ {price(monthlyEq)} / mois</p>
            )}

            <a href="/login" className="group mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-4 text-base font-semibold text-ink transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(0,211,1,0.3)]">
              Démarrer l'essai gratuit
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </a>

            <ul className="mt-8 space-y-3 border-t border-line/80 pt-6">
              {[
                "Journal illimité avec WHY par trade",
                "Calculateur d'Edge Score & Expectancy",
                "Bannière de risque & Alerte Daily Loss",
                "Statistiques par session & plage horaire",
                "Export / Import rapide des exécutions",
                "Support prioritaire",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <Check size={16} className="mt-0.5 shrink-0 text-accent" />
                  <span className="text-muted">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-5 flex items-center justify-center gap-2 text-xs text-muted2">
          <Lock size={13} />
          Paiement sécurisé SSL · Annulation en 1 clic
        </p>
      </Reveal>
    </section>
  );
}

function FaqItem({ q, a }) {
  return (
    <details className="group border-b border-line/70">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left font-medium text-white transition-colors hover:text-accent [&::-webkit-details-marker]:hidden">
        <span>{q}</span>
        <ChevronDown size={18} className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <p className="pb-5 text-sm leading-relaxed text-muted">{a}</p>
    </details>
  );
}

function Faq() {
  return (
    <section id="faq" className="border-t border-line/60 bg-panel/20 py-24">
      <div className="mx-auto max-w-3xl px-5">
        <Reveal>
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Foire aux questions
          </h2>
        </Reveal>
        <Reveal className="mt-10" delay={80}>
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
    <section className="mx-auto max-w-6xl px-5 py-20">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-line bg-panel/80 px-6 py-16 text-center">
          <div
            aria-hidden
            className="mtb-glow pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(60% 80% at 50% 0%, rgba(0,211,1,0.14), transparent 70%)" }}
          />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Prêt à rationaliser votre trading ?
            </h2>
            <p className="mt-3 text-muted">Rejoins les traders disciplinés dès aujourd'hui.</p>
            <a href="/login" className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-4 text-base font-semibold text-ink transition-all hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(0,211,1,0.4)]">
              Démarrer l'essai 14 jours gratuits
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
            <a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a>
            <a href="#tarif" className="hover:text-white transition-colors">Tarif</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <a href="/login" className="hover:text-white transition-colors">Se connecter</a>
          </nav>
        </div>
        <p className="mt-8 text-center text-xs leading-relaxed text-muted2 max-w-3xl mx-auto">
          Avertissement : Le trading sur instruments financiers comporte un risque élevé de perte en capital. MyTradeBook est une application logicielle de suivi analytique et ne délivre aucun conseil en investissement.
        </p>
        <p className="mt-6 text-center text-xs text-muted2">© {new Date().getFullYear()} MyTradeBook. Tous droits réservés.</p>
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
    <div ref={rootRef} className="min-h-screen bg-ink text-white selection:bg-accent selection:text-ink">
      <style>{STYLES}</style>
      <Nav />
      <main>
        <Hero />
        <PropFirms />
        <Features />
        <Pricing />
        <Faq />
        <CtaFooter />
      </main>
      <Footer />
    </div>
  );
}
