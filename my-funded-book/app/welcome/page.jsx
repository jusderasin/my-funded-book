"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Check,
  CircleDollarSign,
  Gauge,
  LockKeyhole,
  MousePointer2,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import BrandMark from "@/components/BrandMark";

function TiltCard({ children, className = "" }) {
  const cardRef = useRef(null);

  function move(event) {
    const element = cardRef.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = element.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    element.style.setProperty("--rx", `${(0.5 - y) * 7}deg`);
    element.style.setProperty("--ry", `${(x - 0.5) * 7}deg`);
    element.style.setProperty("--sx", `${x * 100}%`);
    element.style.setProperty("--sy", `${y * 100}%`);
  }

  function leave() {
    const element = cardRef.current;
    if (!element) return;
    element.style.setProperty("--rx", "0deg");
    element.style.setProperty("--ry", "0deg");
  }

  return (
    <article ref={cardRef} onPointerMove={move} onPointerLeave={leave} className={`landing-tilt ${className}`}>
      {children}
    </article>
  );
}

function Metric({ label, value, tone = "" }) {
  return (
    <div className="landing-metric">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  );
}

export default function WelcomePage() {
  const shellRef = useRef(null);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return undefined;
    function pointer(event) {
      shell.style.setProperty("--mx", `${event.clientX}px`);
      shell.style.setProperty("--my", `${event.clientY}px`);
    }
    window.addEventListener("pointermove", pointer, { passive: true });
    return () => window.removeEventListener("pointermove", pointer);
  }, []);

  return (
    <main ref={shellRef} className="landing-shell">
      <div className="landing-cursor-glow" />
      <div className="landing-grain" />

      <nav className="landing-nav">
        <Link href="/welcome" aria-label="MyTradeBook, accueil"><BrandMark /></Link>
        <div className="landing-nav-links">
          <a href="#method">Méthode</a>
          <a href="#prism">PRISM</a>
          <a href="#prop">Prop cockpit</a>
        </div>
        <Link href="/login" className="landing-login">Se connecter <ArrowRight size={15} /></Link>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-orbit landing-orbit-one" />
        <div className="landing-hero-orbit landing-orbit-two" />
        <div className="landing-kicker"><span /> JOURNAL DE PERFORMANCE</div>
        <h1>Ton edge ne se devine pas.<br /><em>Il se construit.</em></h1>
        <p>Un système de trading personnel pour mesurer ton exécution, protéger ton capital et transformer tes habitudes en décisions claires.</p>
        <div className="landing-hero-actions">
          <Link href="/login" className="landing-primary">Construire mon journal <ArrowRight size={18} /></Link>
          <a href="#method" className="landing-secondary"><MousePointer2 size={16} /> Explorer le système</a>
        </div>
        <div className="landing-trust"><LockKeyhole size={13} /> Tes données restent privées. Ton journal t&apos;appartient.</div>
      </section>

      <section className="landing-stage" aria-label="Aperçu de MyTradeBook">
        <div className="landing-stage-top"><span>VUE DU JOURNAL</span><span className="landing-live"><i /> SYSTÈME ACTIF</span></div>
        <div className="landing-dashboard">
          <aside>
            <div className="landing-mini-brand"><img src="/icons/mytradebook-mark.svg" alt="" /> <b>MyTradeBook</b></div>
            <span className="active"><Gauge size={15} /> Vue d&apos;ensemble</span>
            <span><BarChart3 size={15} /> Trades</span>
            <span><BrainCircuit size={15} /> PRISM</span>
            <span><ShieldCheck size={15} /> Risque</span>
          </aside>
          <div className="landing-dashboard-main">
            <div className="landing-dashboard-title"><div><small>SESSION EN COURS</small><h2>Ce qui compte, maintenant.</h2></div><span className="landing-score">86 <small>DISCIPLINE</small></span></div>
            <div className="landing-metric-row"><Metric label="P&L NET" value="+$1 284" tone="gain" /><Metric label="RESPECT DU PLAN" value="86%" /><Metric label="RISQUE MOYEN" value="0.7R" /></div>
            <div className="landing-chart"><div className="landing-chart-head"><span>COURBE DE RÉGULARITÉ</span><strong>+18.4%</strong></div><svg viewBox="0 0 620 190" role="img" aria-label="Courbe de progression positive"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#8CFF4F" stopOpacity=".28"/><stop offset="1" stopColor="#8CFF4F" stopOpacity="0"/></linearGradient></defs><path d="M0 151 C42 137 60 145 96 126 S145 142 182 105 S229 114 263 83 S309 104 350 74 S395 95 430 57 S480 76 515 43 S570 58 620 17 L620 190 L0 190Z" fill="url(#fill)"/><path d="M0 151 C42 137 60 145 96 126 S145 142 182 105 S229 114 263 83 S309 104 350 74 S395 95 430 57 S480 76 515 43 S570 58 620 17" fill="none" stroke="#8CFF4F" strokeWidth="3"/></svg></div>
          </div>
        </div>
      </section>

      <section id="method" className="landing-section">
        <div className="landing-section-heading"><span>01 / LA MÉTHODE</span><h2>La performance commence<br />par un process visible.</h2><p>Pas plus de bruit. Juste les repères qui rendent chaque décision plus intentionnelle.</p></div>
        <div className="landing-feature-grid">
          <TiltCard className="landing-feature landing-feature-large"><div className="landing-feature-icon"><Target /></div><small>AVANT L&apos;ENTRÉE</small><h3>Le plan avant le P&amp;L.</h3><p>Stratégie, checklist, risque et état mental : chaque trade est posé dans son contexte.</p><div className="landing-checks"><span><Check /> Setup validé</span><span><Check /> Risque défini</span><span><Check /> Intention claire</span></div></TiltCard>
          <TiltCard className="landing-feature"><div className="landing-feature-icon"><TrendingUp /></div><small>APRÈS L&apos;EXÉCUTION</small><h3>Vois tes décisions,<br />pas seulement tes résultats.</h3><p>Relie tes erreurs et tes bonnes habitudes à tes données réelles.</p></TiltCard>
          <TiltCard className="landing-feature landing-feature-dark"><div className="landing-feature-icon"><CircleDollarSign /></div><small>COMPTES PROP</small><h3>Ton capital sous contrôle.</h3><p>Drawdown, perte quotidienne, objectifs et payouts réunis au même endroit.</p><div className="landing-risk-line"><span /> 68% de marge restante</div></TiltCard>
        </div>
      </section>

      <section id="prism" className="landing-prism-section">
        <div className="landing-prism-glow" />
        <div className="landing-prism-copy"><div className="landing-kicker"><Sparkles size={14} /> PRISM</div><h2>Un coach qui lit<br /><em>le contexte.</em></h2><p>PRISM t&apos;aide à prendre du recul sur ton journal : régularité, gestion du risque, discipline et patterns de comportement.</p><ul><li><Check /> Des réponses ancrées dans tes propres trades</li><li><Check /> Un bilan clair pour progresser sans te raconter d&apos;histoires</li><li><Check /> Une mémoire de tes habitudes, avec tes limites</li></ul></div>
        <TiltCard className="landing-prism-console"><div className="landing-console-head"><span><i /> PRISM / ANALYSE</span><b>PRIVÉ</b></div><p className="landing-question">« Où mon exécution est-elle la plus solide ? »</p><div className="landing-answer"><small>LECTURE DU JOURNAL</small><strong>Ta régularité est meilleure lorsque ton risque reste sous 1R.</strong><p>Tu respectes ton plan dans 8 trades sur 10 avec la stratégie NY Open. Garde cette taille de position demain.</p><div><span>CONFIANCE <b>91%</b></span><span>ÉCHANTILLON <b>24 trades</b></span></div></div><div className="landing-console-input">Écrire à PRISM… <ArrowRight size={16} /></div></TiltCard>
      </section>

      <section id="prop" className="landing-prop">
        <div><span>02 / PROP FIRM COCKPIT</span><h2>Ne découvre plus tes limites trop tard.</h2></div>
        <div className="landing-prop-stats"><Metric label="DRAWDOWN RESTANT" value="$2 460" tone="gain" /><Metric label="JOURS REQUIS" value="7 / 10" /><Metric label="PAYOUTS" value="04" /></div>
        <Link href="/login" className="landing-arrow-link" aria-label="Découvrir le cockpit prop"><ArrowRight /></Link>
      </section>

      <section className="landing-final"><div className="landing-kicker"><Zap size={14} /> PRÊT QUAND TU L&apos;ES</div><h2>Le marché ne donne rien.<br /><em>Ton process, si.</em></h2><p>Crée un journal qui travaille autant que toi.</p><Link href="/login" className="landing-primary">Commencer maintenant <ArrowRight size={18} /></Link></section>

      <footer className="landing-footer"><BrandMark compact /><span>MYTRADEBOOK © {new Date().getFullYear()}</span><span>Construit pour les traders qui veulent durer.</span></footer>
    </main>
  );
}
