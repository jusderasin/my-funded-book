"use client";

import { useState } from "react";
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

/* Logos partenaires : ce sont les prop firms déjà affichées sur ta page.
   Garde uniquement celles que l'app supporte vraiment. */
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
    body:
      "Chaque trade est logué avec la raison qui l'a déclenché. Tu arrêtes de refaire les mêmes erreurs parce qu'elles deviennent visibles, séance après séance.",
    accent: "text-accent",
  },
  {
    icon: ShieldAlert,
    title: "Bannière de risque",
    body:
      "Tu sais en permanence où tu en es sur ta daily loss. Plus de compte cramé sur une éval pour un trade de trop pris à la fin de la session.",
    accent: "text-loss",
  },
  {
    icon: Target,
    title: "Edge Score",
    body:
      "Noir sur blanc : quels setups et quelles sessions te rapportent réellement. Tu concentres ton capital là où ton edge existe.",
    accent: "text-goldx",
  },
  {
    icon: CalendarDays,
    title: "Calendrier & sessions",
    body:
      "Jour par jour, semaine par semaine. Tu vois quelles journées et quelles sessions portent tes résultats, au lieu de deviner.",
    accent: "text-cyanx",
  },
  {
    icon: BarChart3,
    title: "R-multiples & PnL",
    body:
      "Chaque trade converti en données propres : R, expectancy, PnL. Des stats structurées plutôt qu'un tableur qui déraille.",
    accent: "text-pinkx",
  },
  {
    icon: Gauge,
    title: "Courbe d'equity",
    body:
      "Une courbe ancrée sur ton solde réel, une distribution de R et une performance hebdo. Ta progression, lisible d'un coup d'œil.",
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

/* ------------------------------------------------------------------ */

function Logo() {
  return (
    <span className="font-bold tracking-[0.25em] text-ink2 select-none">
      My<span className="text-accent">Trade</span>Book
    </span>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-ink/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
          <a href="#features" className="transition-colors hover:text-ink2">
            Fonctionnalités
          </a>
          <a href="#tarif" className="transition-colors hover:text-ink2">
            Tarif
          </a>
          <a href="#faq" className="transition-colors hover:text-ink2">
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <a
            href="/login"
            className="hidden text-sm text-muted transition-colors hover:text-ink2 sm:block"
          >
            Se connecter
          </a>
          <a
            href="/login"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-ink transition-transform hover:scale-[1.02]"
          >
            Commencer
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(0,211,1,0.10), transparent 70%)",
        }}
      />
      <div className="mx-auto max-w-6xl px-5 pb-20 pt-20 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Le journal du trader financé
        </span>

        <h1 className="mx-auto mt-8 max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-tight text-ink2 sm:text-6xl">
          Tes trades deviennent
          <br />
          des décisions.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          MyTradeBook logue chaque trade, calcule ton R et ton Edge Score, et
          te garde dans les clous de ta daily loss. Ton livre de comptes,
          structuré — pour que ta review ne dépende plus de ta mémoire.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-7 py-3.5 text-base font-semibold text-ink transition-transform hover:scale-[1.02]"
          >
            Démarrer l'essai {PRICING.trialDays} jours
            <ArrowRight size={18} />
          </a>
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-xl border border-line2 px-7 py-3.5 text-base font-semibold text-ink2 transition-colors hover:bg-panel"
          >
            Voir les fonctionnalités
          </a>
        </div>

        <p className="mt-4 text-xs text-muted2">
          Essai {PRICING.trialDays} jours · Sans engagement · Annulable à tout
          moment
        </p>

        {/* Cadre capture dashboard — remplace par ta vraie capture */}
        <div className="mx-auto mt-14 max-w-4xl">
          <div className="rounded-2xl border border-line bg-panel p-2 shadow-2xl">
            <div className="flex aspect-[16/9] items-center justify-center rounded-xl border border-line2 bg-ink2/40">
              <span className="text-sm text-muted2">
                Capture du dashboard MyTradeBook
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PropFirms() {
  return (
    <section className="border-y border-line/60 bg-panel/30 py-10">
      <div className="mx-auto max-w-6xl px-5">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-muted2">
          Pensé pour tes comptes financés
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {PROP_FIRMS.map((f) => (
            <span
              key={f}
              className="font-mono text-sm uppercase tracking-widest text-muted/70"
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-5 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
          Ton edge, prouvé
        </span>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-ink2 sm:text-4xl">
          Tout ce qu'un journal devrait faire.
        </h2>
        <p className="mt-4 text-muted">
          Pas de gadget. Chaque brique existe pour une seule raison : te faire
          progresser trade après trade.
        </p>
      </div>

      <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body, accent }) => (
          <div
            key={title}
            className="group rounded-2xl border border-line bg-panel p-6 transition-colors hover:border-line2"
          >
            <div className="mb-4 inline-flex rounded-xl border border-line2 bg-ink2/40 p-2.5">
              <Icon size={20} className={accent} />
            </div>
            <h3 className="text-lg font-semibold text-ink2">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DeepDive() {
  return (
    <section className="border-y border-line/60 bg-panel/20 py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-cyanx">
            Ta performance, reconstruite
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-ink2 sm:text-4xl">
            Des trades bruts à une vraie lecture.
          </h2>
          <p className="mt-5 leading-relaxed text-muted">
            Chaque trade fermé devient de la donnée structurée : PnL,
            expectancy, R-multiples et courbe d'equity ancrée sur ton solde
            réel. Le calendrier montre ensuite exactement quelles journées et
            quelles semaines portent tes résultats.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              "Import et saisie propres — pas de tableur qui casse.",
              "R affiché avec le signe et une décimale : +2.5R, -1.0R.",
              "Sessions et time-of-day : où ton edge se trouve vraiment.",
              "Bannière de risque toujours visible sur ta daily loss.",
            ].map((line) => (
              <li key={line} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex rounded-md bg-accent/10 p-1">
                  <Check size={14} className="text-accent" />
                </span>
                <span className="text-sm text-muted">{line}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Cadre capture — remplace par une vraie capture (calendrier / equity) */}
        <div className="rounded-2xl border border-line bg-panel p-2 shadow-xl">
          <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-line2 bg-ink2/40">
            <span className="text-sm text-muted2">
              Capture — calendrier / courbe d'equity
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="tarif" className="mx-auto max-w-6xl px-5 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
          Tarif
        </span>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-ink2 sm:text-4xl">
          Un seul plan. Tout inclus.
        </h2>
        <p className="mt-4 text-muted">
          Commence par {PRICING.trialDays} jours gratuits. Tu ne paies que si
          l'app te sert vraiment.
        </p>
      </div>

      <div className="mx-auto mt-14 max-w-md">
        <div className="relative overflow-hidden rounded-3xl border border-accent/40 bg-panel p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-60"
            style={{
              background:
                "radial-gradient(80% 100% at 50% 0%, rgba(0,211,1,0.12), transparent 70%)",
            }}
          />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="font-bold tracking-[0.2em] text-ink2">
                My<span className="text-accent">Trade</span>Book
              </span>
              <span className="rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
                Annuel
              </span>
            </div>

            <div className="mt-8 flex items-end gap-2">
              <span className="font-mono text-5xl font-extrabold text-ink2">
                {price(PRICING.annual)}
              </span>
              <span className="mb-1.5 text-sm text-muted">/ an</span>
            </div>
            <p className="mt-1 font-mono text-sm text-muted2">
              soit ≈ {price(monthlyEq)} / mois
            </p>

            <a
              href="/login"
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-base font-semibold text-ink transition-transform hover:scale-[1.02]"
            >
              Démarrer l'essai {PRICING.trialDays} jours
              <ArrowRight size={18} />
            </a>
            <p className="mt-3 text-center text-xs text-muted2">
              {PRICING.trialDays} jours gratuits · Annulable à tout moment
            </p>

            <ul className="mt-8 space-y-3 border-t border-line pt-6">
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
      </div>
    </section>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="font-medium text-ink2">{q}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
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
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-ink2 sm:text-4xl">
          Questions fréquentes
        </h2>
        <div className="mt-12">
          {FAQ.map((item) => (
            <FaqItem key={item.q} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaFooter() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24">
      <div className="relative overflow-hidden rounded-3xl border border-line bg-panel px-6 py-16 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60% 80% at 50% 0%, rgba(0,211,1,0.10), transparent 70%)",
          }}
        />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-ink2 sm:text-4xl">
            Tiens le journal qui te fait progresser.
          </h2>
          <a
            href="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-4 text-base font-semibold text-ink transition-transform hover:scale-[1.02]"
          >
            Démarrer l'essai {PRICING.trialDays} jours
            <ArrowRight size={18} />
          </a>
        </div>
      </div>
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
            <a href="#features" className="hover:text-ink2">
              Fonctionnalités
            </a>
            <a href="#tarif" className="hover:text-ink2">
              Tarif
            </a>
            <a href="/login" className="hover:text-ink2">
              Se connecter
            </a>
          </nav>
        </div>
        <p className="mt-10 text-center text-xs leading-relaxed text-muted2">
          Le trading comporte un risque de perte en capital. Les expériences
          individuelles ne préjugent pas des résultats futurs. MyTradeBook est
          un outil de suivi et d'analyse, il ne fournit pas de conseil en
          investissement.
        </p>
        <p className="mt-6 text-center text-xs text-muted2">
          © {new Date().getFullYear()} MyTradeBook
        </p>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-ink text-ink2">
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
