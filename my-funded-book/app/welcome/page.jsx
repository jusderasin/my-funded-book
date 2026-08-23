"use client";

/* ────────────────────────────────────────────────────────────────────────────
   Landing publique MyTradeBook.
   Cible : app/page.jsx (racine publique) si ta racine est libre,
   sinon app/(marketing)/page.jsx. Les pages authentifiées restent /dashboard, etc.
   Utilise tes tokens Tailwind (bg-ink, panel, line, accent…) → hérite de ton thème.
   ⚠️ À REMPLIR : prix réels (section Tarifs), URL réelles, vraies captures.
   ──────────────────────────────────────────────────────────────────────────── */

import { useState } from "react";
import Link from "next/link";
import {
  LayoutGrid, ListChecks, Table2, FlaskConical, Medal, Trophy, CalendarDays,
  PenLine, BookOpen, Grid3x3, Sparkles, Award, Receipt,
  ArrowRight, Check, Menu, X, ShieldCheck, Camera,
} from "lucide-react";

const FEATURES = [
  { icon: ListChecks, accent: "accent",
    title: "Journal",
    body: "Le cœur de l'app. Logge chaque trade — sens, grade, R, PnL, sortie TP/SL/BE, tags — et surtout le WHY, avec une capture. C'est là que ton edge se construit." },
  { icon: LayoutGrid, accent: "accent",
    title: "Tableau de bord",
    body: "P&L net, win rate, profit factor, Edge Score et tes courbes. En haut, ta bannière de risque : combien il te reste avant ta daily loss et ton drawdown." },
  { icon: Table2, accent: "cyanx",
    title: "Comptes prop firm",
    body: "Évals et financés : statut, taille, coûts et règles de risque (daily loss, drawdown, trailing). C'est ce qui alimente l'alerte live du dashboard." },
  { icon: FlaskConical, accent: "accent",
    title: "Backtest",
    body: "Un espace séparé pour tester tes stratégies sur l'historique, organisé en sessions. Ça ne touche jamais tes stats live." },
  { icon: Grid3x3, accent: "accent",
    title: "Analyse",
    body: "Décompose ta performance par setup, session, instrument, grade ou tag. Pour repérer tes forces et tes fuites." },
  { icon: Sparkles, accent: "accent",
    title: "Rapport IA",
    body: "Un bilan d'analyse par IA sur une période : points forts, fuites, discipline et recommandations concrètes, basé sur tes trades loggés." },
];

const MORE = [
  { icon: Medal, label: "Badges" },
  { icon: Trophy, label: "Classement" },
  { icon: CalendarDays, label: "Calendrier" },
  { icon: PenLine, label: "Review hebdo" },
  { icon: BookOpen, label: "Playbook" },
  { icon: Award, label: "Certificats" },
  { icon: Receipt, label: "Dépenses" },
];

// accent → classes Tailwind (tes tokens)
const AC = {
  accent: { text: "text-accent", ring: "border-accent", dim: "bg-accentDim" },
  cyanx:  { text: "text-cyanx",  ring: "border-cyanx",  dim: "bg-cyanx/15" },
  pinkx:  { text: "text-pinkx",  ring: "border-pinkx",  dim: "bg-pinkx/15" },
  goldx:  { text: "text-goldx",  ring: "border-goldx",  dim: "bg-goldx/15" },
};

function Brand({ className = "" }) {
  return (
    <span className={`font-mono font-extrabold tracking-[2px] ${className}`}>
      My<span className="text-accent">Trade</span>Book
    </span>
  );
}

export default function LandingPage() {
  const [menu, setMenu] = useState(false);

  return (
    <div className="min-h-screen bg-ink text-white">
      {/* ---------- NAV ---------- */}
      <header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex h-[56px] max-w-[1180px] items-center gap-4 px-4">
          <Brand className="text-[14px]" />
          <nav className="ml-6 hidden items-center gap-6 md:flex">
            <a href="#features" className="text-[13px] font-medium text-muted hover:text-white">Fonctionnalités</a>
            <a href="#how" className="text-[13px] font-medium text-muted hover:text-white">Comment ça marche</a>
            <a href="#pricing" className="text-[13px] font-medium text-muted hover:text-white">Tarifs</a>
          </nav>
          <div className="flex-1" />
          <Link href="/login" className="hidden text-[13px] font-semibold text-muted hover:text-white sm:block">Connexion</Link>
          <Link href="/login" className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[13px] font-bold text-black hover:brightness-110">
            Démarrer <ArrowRight size={14} />
          </Link>
          <button className="rounded-lg p-1.5 text-white/80 hover:bg-panel2 md:hidden" onClick={() => setMenu((m) => !m)} aria-label="Menu">
            {menu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {menu && (
          <div className="border-t border-line bg-ink px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1">
              <a href="#features" onClick={() => setMenu(false)} className="rounded-lg px-3 py-2 text-[13px] text-muted hover:bg-panel2 hover:text-white">Fonctionnalités</a>
              <a href="#how" onClick={() => setMenu(false)} className="rounded-lg px-3 py-2 text-[13px] text-muted hover:bg-panel2 hover:text-white">Comment ça marche</a>
              <a href="#pricing" onClick={() => setMenu(false)} className="rounded-lg px-3 py-2 text-[13px] text-muted hover:bg-panel2 hover:text-white">Tarifs</a>
              <Link href="/login" className="rounded-lg px-3 py-2 text-[13px] text-muted hover:bg-panel2 hover:text-white">Connexion</Link>
            </div>
          </div>
        )}
      </header>

      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ background: "radial-gradient(620px 300px at 50% -10%, var(--tw-gradient-from,rgba(0,211,1,.10)), transparent 70%)" }}
        />
        <div className="relative mx-auto max-w-[1180px] px-4 py-20 text-center sm:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-line2 bg-panel2 px-3.5 py-1.5 text-[11.5px] font-semibold text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Journal de trading pour prop firm — NQ / MNQ
          </span>
          <h1 className="mx-auto mt-6 max-w-[16ch] text-[clamp(34px,6vw,60px)] font-extrabold leading-[1.05] tracking-tight">
            Ton journal de trading pour progresser <span className="text-accent">comme un pro</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-[58ch] text-[15px] leading-relaxed text-muted sm:text-[17px]">
            Logge chaque trade avec son WHY, mesure ton edge, respecte tes règles de risque prop firm, et laisse tes stats révéler ce qui marche vraiment.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login" className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-[14px] font-bold text-black hover:brightness-110">
              Commencer gratuitement <ArrowRight size={16} />
            </Link>
            <a href="#features" className="inline-flex items-center gap-2 rounded-lg border border-line2 bg-panel2 px-5 py-3 text-[14px] font-semibold text-white hover:bg-panel">
              Voir les fonctionnalités
            </a>
          </div>

          {/* Bandeau de stats */}
          <div className="mx-auto mt-10 flex max-w-[560px] flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {[["13", "onglets"], ["NQ·MNQ", "focus instrument"], ["Edge Score", "ta note globale"]].map(([n, l]) => (
              <div key={l}>
                <div className="font-mono text-[22px] font-extrabold text-white">{n}</div>
                <div className="text-[11px] uppercase tracking-wide text-muted2">{l}</div>
              </div>
            ))}
          </div>

          {/* ⚠️ REMPLIR : capture réelle du dashboard */}
          <div className="mx-auto mt-14 max-w-[940px] overflow-hidden rounded-2xl border border-line2 bg-panel">
            <div className="flex items-center gap-2 border-b border-line bg-ink2 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-loss/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-goldx/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-accent/70" />
              <span className="ml-2 font-mono text-[11px] text-muted2">app.mytradebook.fr/dashboard</span>
            </div>
            <div className="flex aspect-[16/9] items-center justify-center px-6 text-center font-mono text-[12px] text-muted2"
                 style={{ background: "repeating-linear-gradient(45deg, var(--panel,#0c0f19), var(--panel,#0c0f19) 14px, var(--ink2,#070b14) 14px, var(--ink2,#070b14) 28px)" }}>
              [ CAPTURE DU DASHBOARD ]<br />remplace ce bloc par &lt;img src="/captures/dashboard.png" /&gt;
            </div>
          </div>
        </div>
      </section>

      {/* ---------- FEATURES ---------- */}
      <section id="features" className="mx-auto max-w-[1180px] px-4 py-20">
        <div className="mx-auto max-w-[620px] text-center">
          <div className="text-[11px] font-bold uppercase tracking-widest text-muted2">L'app</div>
          <h2 className="mt-2 text-[clamp(24px,4vw,36px)] font-extrabold tracking-tight">Tout ton edge, au même endroit</h2>
          <p className="mt-3 text-[15px] text-muted">Chaque onglet a un rôle précis. Ensemble, ils font ta routine.</p>
        </div>

        <div className="mt-12 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            const c = AC[f.accent] || AC.accent;
            return (
              <div key={f.title} className="rounded-2xl border border-line bg-panel p-5 transition-colors hover:border-line2">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${c.ring} ${c.dim}`}>
                  <Icon size={20} className={c.text} />
                </div>
                <h3 className="mt-4 text-[15px] font-extrabold">{f.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{f.body}</p>
              </div>
            );
          })}
        </div>

        {/* Et plus */}
        <div className="mt-4 rounded-2xl border border-line bg-panel p-5">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted2">Et aussi</div>
          <div className="flex flex-wrap gap-2">
            {MORE.map((m) => {
              const Icon = m.icon;
              return (
                <span key={m.label} className="inline-flex items-center gap-2 rounded-lg border border-line2 bg-panel2 px-3 py-1.5 text-[12.5px] font-medium text-muted">
                  <Icon size={14} className="text-muted2" /> {m.label}
                </span>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- HOW ---------- */}
      <section id="how" className="border-y border-line bg-ink2">
        <div className="mx-auto max-w-[1180px] px-4 py-20">
          <div className="mx-auto max-w-[620px] text-center">
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted2">La routine</div>
            <h2 className="mt-2 text-[clamp(24px,4vw,36px)] font-extrabold tracking-tight">Trois temps, une progression</h2>
          </div>
          <div className="mt-12 grid gap-3.5 md:grid-cols-3">
            {[
              ["01", "Logge", "Après chaque séance, enregistre tes trades avec le WHY et une capture. Deux minutes qui changent tout."],
              ["02", "Analyse", "Le dashboard et l'Analyse font le reste : win rate, profit factor, Edge Score, forces et fuites par setup."],
              ["03", "Progresse", "Review hebdo, badges, classement. Tu ancres la discipline et tu vois ta courbe monter."],
            ].map(([n, tt, bd]) => (
              <div key={n} className="relative rounded-2xl border border-line bg-panel p-6">
                <div className="font-mono text-[30px] font-extrabold text-line2">{n}</div>
                <h3 className="mt-1 text-[16px] font-extrabold">{tt}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{bd}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- PRICING ---------- */}
      <section id="pricing" className="mx-auto max-w-[1180px] px-4 py-20">
        <div className="mx-auto max-w-[620px] text-center">
          <div className="text-[11px] font-bold uppercase tracking-widest text-muted2">Tarifs</div>
          <h2 className="mt-2 text-[clamp(24px,4vw,36px)] font-extrabold tracking-tight">Simple, sans engagement</h2>
          <p className="mt-3 text-[15px] text-muted">{/* ⚠️ REMPLIR : prix réels ci-dessous */}Résiliable à tout moment.</p>
        </div>

        <div className="mt-12 grid items-stretch gap-3.5 md:grid-cols-3">
          {/* Free */}
          <div className="flex flex-col rounded-2xl border border-line bg-panel p-6">
            <div className="text-[14px] font-extrabold">Découverte</div>
            <div className="mt-1 min-h-[36px] text-[12.5px] text-muted2">Pour tenir son journal et tester l'app.</div>
            <div className="mt-4 font-mono text-[36px] font-extrabold">0<span className="text-[14px] font-normal text-muted2"> €/mois</span></div>
            <ul className="mt-5 flex flex-1 flex-col gap-2.5 text-[13px]">
              {["Journal complet + captures", "Tableau de bord & Edge Score", "1 compte prop firm", "Calendrier & Review"].map((x) => (
                <li key={x} className="flex items-start gap-2 text-white/90"><Check size={15} className="mt-0.5 shrink-0 text-accent" /> {x}</li>
              ))}
            </ul>
            <Link href="/login" className="mt-6 inline-flex items-center justify-center rounded-lg border border-line2 bg-panel2 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-panel">Créer un compte</Link>
          </div>

          {/* Pro (featured) */}
          <div className="relative flex flex-col rounded-2xl border border-accent bg-panel p-6">
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-md bg-accent px-2.5 py-1 font-mono text-[10px] font-extrabold text-black">POPULAIRE</span>
            <div className="text-[14px] font-extrabold">Trader</div>
            <div className="mt-1 min-h-[36px] text-[12.5px] text-muted2">L'app complète, pour trader au quotidien.</div>
            <div className="mt-4 font-mono text-[36px] font-extrabold">29<span className="text-[14px] font-normal text-muted2"> €/mois</span></div>
            <ul className="mt-5 flex flex-1 flex-col gap-2.5 text-[13px]">
              {["Tout Découverte, sans limite", "Comptes prop firm illimités", "Backtest, Playbook & Analyse", "Rapport IA & Classement", "Menu personnalisable"].map((x) => (
                <li key={x} className="flex items-start gap-2 text-white/90"><Check size={15} className="mt-0.5 shrink-0 text-accent" /> {x}</li>
              ))}
            </ul>
            <Link href="/login" className="mt-6 inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-[13px] font-bold text-black hover:brightness-110">Démarrer l'essai</Link>
          </div>

          {/* Team */}
          <div className="flex flex-col rounded-2xl border border-line bg-panel p-6">
            <div className="text-[14px] font-extrabold">Équipe</div>
            <div className="mt-1 min-h-[36px] text-[12.5px] text-muted2">Pour les groupes et comptes financés.</div>
            <div className="mt-4 font-mono text-[36px] font-extrabold">Sur devis</div>
            <ul className="mt-5 flex flex-1 flex-col gap-2.5 text-[13px]">
              {["Tout Trader, multi-comptes", "Partage de playbooks", "Suivi des règles d'équipe", "Support prioritaire"].map((x) => (
                <li key={x} className="flex items-start gap-2 text-white/90"><Check size={15} className="mt-0.5 shrink-0 text-accent" /> {x}</li>
              ))}
            </ul>
            <Link href="/login" className="mt-6 inline-flex items-center justify-center rounded-lg border border-line2 bg-panel2 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-panel">Nous contacter</Link>
          </div>
        </div>

        <div className="mx-auto mt-6 flex max-w-[560px] items-center justify-center gap-2 text-[11.5px] text-muted2">
          <ShieldCheck size={14} className="shrink-0 text-accent" />
          Tes données t'appartiennent — protégées par la sécurité au niveau des lignes (RLS) de Supabase.
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="mx-auto max-w-[1180px] px-4 pb-20">
        <div className="relative overflow-hidden rounded-2xl border border-line2 bg-panel px-6 py-14 text-center">
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(460px 220px at 50% 0%, rgba(0,211,1,.10), transparent 70%)" }} />
          <div className="relative">
            <Camera size={22} className="mx-auto mb-3 text-accent" />
            <h2 className="text-[clamp(22px,3.4vw,32px)] font-extrabold tracking-tight">Ton prochain trade mérite d'être loggé.</h2>
            <p className="mx-auto mt-3 max-w-[46ch] text-[15px] text-muted">Commence ton journal aujourd'hui — gratuit, sans carte bancaire.</p>
            <Link href="/login" className="mt-7 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-[14px] font-bold text-black hover:brightness-110">
              Créer mon compte <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1180px] flex-col items-center gap-4 px-4 py-10 sm:flex-row sm:justify-between">
          <Brand className="text-[13px]" />
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <a href="#features" className="text-[12.5px] text-muted2 hover:text-white">Fonctionnalités</a>
            <a href="#pricing" className="text-[12.5px] text-muted2 hover:text-white">Tarifs</a>
            <Link href="/login" className="text-[12.5px] text-muted2 hover:text-white">Connexion</Link>
          </nav>
        </div>
        <div className="border-t border-line px-4 py-4 text-center font-mono text-[11px] text-muted2">
          © {new Date().getFullYear()} MyTradeBook · Le trading comporte un risque de perte en capital.
        </div>
      </footer>
    </div>
  );
}
