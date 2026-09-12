"use client";
import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Clock,
  AlertTriangle,
  Award,
  MessageSquare,
  TrendingUp,
  Sparkles,
  Shield,
  Star,
  Zap,
  Lock,
  Gift,
} from "lucide-react";
import { useBook } from "@/components/BookProvider";
import { Card, Button } from "@/components/prism";

/* ------------------------------------------------------------------ */
/*  I18N — chaînes locales à la landing, sélectionnées via lang.       */
/*  Objet plat par langue pour éviter toute dépendance sur t() global. */
/* ------------------------------------------------------------------ */

const COPY = {
  fr: {
    nav: { signin: "Se connecter" },
    hero: {
      badge: "Découvrez PRISM",
      title: "Journal de Trading Propulsé par l'IA",
      desc: "Suis tes trades, analyse ta performance, et laisse PRISM t'aider à développer un edge gagnant grâce à des insights psychologiques avancés.",
      cta: "Commencer",
      caption: "Accès complet immédiat · Annulable à tout moment",
      status: "Nous sommes en ligne — MyTradeBook est ouvert",
    },
    stats: [
      { value: "50+", label: "Points de données par trade" },
      { value: "45+", label: "Patterns psychologiques" },
      { value: "Instant", label: "Feedback IA" },
      { value: "24/7", label: "Support PRISM" },
    ],
    meet: {
      title: "PRISM : Ton Coach Trading IA",
      desc: "PRISM fournit une analyse psychologique en temps réel, une reconnaissance de patterns et des insights personnalisés pour t'aider à maîtriser ta psychologie de trading et maximiser ta performance.",
      cards: [
        {
          icon: Brain,
          title: "Pattern émotionnel détecté",
          badge: "Pattern critique",
          badgeTone: "loss",
          desc: "Tu as tendance à overtrader après trois trades gagnants consécutifs, ce qui réduit ton win rate de 35% dans ces scénarios.",
          stats: [
            { label: "Confiance pattern", value: "92%" },
            { label: "Impact", value: "-35% WR" },
            { label: "Fréquence", value: "24 fois" },
          ],
          reco: "Prends 15 min de pause après 3 wins consécutifs pour réinitialiser ton état émotionnel.",
        },
        {
          icon: Clock,
          title: "Fenêtre de performance optimale",
          badge: "Sweet Spot",
          badgeTone: "accent",
          desc: "Ton win rate augmente de 45% quand tu trades pendant les 2 premières heures de l'ouverture avec des positions plus petites.",
          stats: [
            { label: "Win Rate", value: "78%" },
            { label: "Retour moyen", value: "2.1R" },
            { label: "Fenêtre", value: "9:30-11:30" },
          ],
          reco: "Concentre 70% de tes trades quotidiens pendant cette fenêtre à forte probabilité.",
        },
        {
          icon: AlertTriangle,
          title: "Insight de gestion du risque",
          badge: "Action requise",
          badgeTone: "loss",
          desc: "Pattern détecté d'augmentation de la taille de position après trades gagnants, menant à des drawdowns plus importants.",
          stats: [
            { label: "Hausse risque", value: "+85%" },
            { label: "Drawdown", value: "+28%" },
            { label: "Fréquence", value: "Hebdo" },
          ],
          reco: "Maintiens un risque constant de 1-2% par trade indépendamment de la performance récente.",
        },
        {
          icon: Award,
          title: "Score de Discipline",
          badge: "En hausse",
          badgeTone: "accent",
          desc: "Ton respect des règles de trading s'est amélioré de 68% sur les 30 derniers jours, corrélant avec une meilleure performance globale.",
          stats: [
            { label: "Compliance", value: "85%" },
            { label: "Amélioration", value: "+68%" },
            { label: "Règles cassées", value: "3/mois" },
          ],
          reco: "Continue à utiliser les checklists pré-trade pour maintenir ce momentum positif.",
        },
      ],
    },
    chat: {
      title: "Discute avec PRISM",
      desc: "Pose tes questions sur ta psychologie de trading et obtiens des insights instantanés",
      questions: [
        {
          q: "Pourquoi je bouge mes stops ?",
          a: "L'analyse montre que 78% des stops déplacés mènent à des pertes plus grandes",
        },
        {
          q: "Quand suis-je le plus rentable ?",
          a: "Ton win rate est 45% plus élevé lors des sessions du matin",
        },
        {
          q: "Comment améliorer ma discipline ?",
          a: "Essaie les checklists pré-trade — elles ont amélioré ta compliance de 68%",
        },
      ],
    },
    features: {
      title: "Tout ce qu'il te faut pour réussir",
      items: [
        {
          icon: TrendingUp,
          title: "Analytics avancés",
          desc: "Métriques et insights de performance en temps réel",
        },
        {
          icon: Sparkles,
          title: "Assistant PRISM IA",
          desc: "Insights et recommandations propulsés par l'IA",
        },
        {
          icon: Shield,
          title: "Gestion du risque",
          desc: "Protège ton capital avec des outils de risque avancés",
        },
      ],
    },
    testimonials: {
      title: "Ce que disent les traders",
      items: [
        {
          initial: "A.",
          name: "Trader Day",
          role: "Day Trader",
          date: "Sep 2026",
          quote: "Enfin quelque chose qui suit vraiment mes trades correctement. Je l'utilise depuis 3 mois et mon win rate a monté de 12%.",
        },
        {
          initial: "S.",
          name: "Trader Swing",
          role: "Swing Trader",
          date: "Août 2026",
          quote: "J'ai essayé 5 journaux différents avant celui-ci. Les analytics ici ont juste du sens et je peux vraiment voir où je me plante.",
        },
        {
          initial: "M.",
          name: "Trader Prop",
          role: "Prop Trader",
          date: "Juil 2026",
          quote: "PRISM m'a mis face à mon revenge trading et franchement j'avais besoin de l'entendre. Ça vaut le coup rien que pour ça.",
        },
      ],
    },
    footer: {
      tagline: "MyTradeBook — Journal de trading pour traders prop firm",
      links: { terms: "Conditions", privacy: "Confidentialité" },
    },
  },
  en: {
    nav: { signin: "Sign In" },
    hero: {
      badge: "Introducing PRISM",
      title: "AI-Powered Trading Journal",
      desc: "Track your trades, analyze your performance, and let PRISM help you develop a winning edge through advanced psychology insights.",
      cta: "Get Started",
      caption: "Full access straight away · Cancel anytime",
      status: "We're live — MyTradeBook is open",
    },
    stats: [
      { value: "50+", label: "Data Points per Trade" },
      { value: "45+", label: "Psychology Patterns" },
      { value: "Instant", label: "AI Feedback" },
      { value: "24/7", label: "PRISM Support" },
    ],
    meet: {
      title: "Meet PRISM: Your AI Trading Coach",
      desc: "PRISM provides real-time psychology analysis, pattern recognition, and personalized insights to help you master your trading psychology and maximize performance.",
      cards: [
        {
          icon: Brain,
          title: "Emotional Pattern Detected",
          badge: "Critical Pattern",
          badgeTone: "loss",
          desc: "You tend to overtrade after three consecutive winning trades, reducing your win rate by 35% in these scenarios.",
          stats: [
            { label: "Pattern Confidence", value: "92%" },
            { label: "Impact", value: "-35% WR" },
            { label: "Occurrence", value: "24 times" },
          ],
          reco: "Take a 15-minute break after 3 consecutive wins to reset emotional state.",
        },
        {
          icon: Clock,
          title: "Peak Performance Window",
          badge: "Sweet Spot",
          badgeTone: "accent",
          desc: "Your win rate increases by 45% when trading during the first 2 hours of market open with smaller position sizes.",
          stats: [
            { label: "Win Rate", value: "78%" },
            { label: "Avg Return", value: "2.1R" },
            { label: "Time Window", value: "9:30-11:30" },
          ],
          reco: "Focus 70% of your daily trades during this high-probability window.",
        },
        {
          icon: AlertTriangle,
          title: "Risk Management Insight",
          badge: "Action Required",
          badgeTone: "loss",
          desc: "Detected a pattern of increasing position sizes after winning trades, leading to larger drawdowns.",
          stats: [
            { label: "Risk Increase", value: "+85%" },
            { label: "Drawdown", value: "+28%" },
            { label: "Frequency", value: "Weekly" },
          ],
          reco: "Maintain consistent 1-2% risk per trade regardless of recent performance.",
        },
        {
          icon: Award,
          title: "Trading Discipline Score",
          badge: "Trending Up",
          badgeTone: "accent",
          desc: "Your adherence to trading rules has improved by 68% over the past 30 days, correlating with better overall performance.",
          stats: [
            { label: "Compliance", value: "85%" },
            { label: "Improvement", value: "+68%" },
            { label: "Rule Breaks", value: "3/month" },
          ],
          reco: "Continue using pre-trade checklists to maintain this positive momentum.",
        },
      ],
    },
    chat: {
      title: "Chat with PRISM",
      desc: "Ask questions about your trading psychology and get instant insights",
      questions: [
        {
          q: "Why do I keep moving my stop loss?",
          a: "Analysis shows 78% of moved stops lead to bigger losses",
        },
        {
          q: "When am I most profitable?",
          a: "Your win rate is 45% higher during morning sessions",
        },
        {
          q: "How can I improve my discipline?",
          a: "Try pre-trade checklists — they improved compliance by 68%",
        },
      ],
    },
    features: {
      title: "Everything You Need to Succeed",
      items: [
        {
          icon: TrendingUp,
          title: "Advanced Analytics",
          desc: "Real-time performance metrics and insights",
        },
        {
          icon: Sparkles,
          title: "PRISM AI Assistant",
          desc: "AI-powered trading insights and recommendations",
        },
        {
          icon: Shield,
          title: "Risk Management",
          desc: "Protect your capital with advanced risk tools",
        },
      ],
    },
    testimonials: {
      title: "What Traders Say",
      items: [
        {
          initial: "A.",
          name: "Day Trader",
          role: "Day Trader",
          date: "Sep 2026",
          quote: "Finally something that actually tracks my trades properly. Been using it for 3 months and my win rate is up 12%.",
        },
        {
          initial: "S.",
          name: "Swing Trader",
          role: "Swing Trader",
          date: "Aug 2026",
          quote: "Tried 5 different journals before this. The analytics here just make sense and I can actually see where I mess up.",
        },
        {
          initial: "M.",
          name: "Prop Trader",
          role: "Prop Trader",
          date: "Jul 2026",
          quote: "PRISM called me out on revenge trading and honestly I needed to hear it. Worth it just for that.",
        },
      ],
    },
    footer: {
      tagline: "MyTradeBook — Trading journal for prop firm traders",
      links: { terms: "Terms", privacy: "Privacy" },
    },
  },
};

/* ------------------------------------------------------------------ */
/*  Composants internes à la landing.                                  */
/* ------------------------------------------------------------------ */

function Pill({ children, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border border-prism-line bg-white/[0.02] px-4 py-1.5 text-xs font-medium text-white/70 ${className}`}>
      {children}
    </span>
  );
}

function Badge({ children, tone = "accent" }) {
  const tones = {
    accent: "bg-prism-accentDim text-prism-accent",
    loss: "bg-red-500/10 text-red-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${tones[tone] || tones.accent}`}>
      {children}
    </span>
  );
}

function PatternCard({ card }) {
  const Icon = card.icon;
  return (
    <Card padding="p-6" className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-prism-accentDim text-prism-accent">
          <Icon className="h-5 w-5" />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-prism-accent leading-tight">
            {card.title}
          </h3>
          <div className="mt-1.5">
            <Badge tone={card.badgeTone}>{card.badge}</Badge>
          </div>
        </div>
      </div>

      <p className="text-sm text-white/70 leading-relaxed">
        {card.desc}
      </p>

      <div className="grid grid-cols-3 gap-2">
        {card.stats.map((s, i) => (
          <div key={i} className="rounded-xl border border-prism-line bg-black/40 p-3">
            <div className="text-[10px] font-medium text-prism-muted2 uppercase tracking-wider">
              {s.label}
            </div>
            <div className="mt-1 text-base font-bold text-white tabular-nums">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-prism-accent/20 bg-prism-accentDim p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-prism-accent">
          <Sparkles className="h-3.5 w-3.5" />
          PRISM Recommendation
        </div>
        <p className="mt-1.5 text-xs text-white/80 leading-relaxed">
          {card.reco}
        </p>
      </div>
    </Card>
  );
}

function ChatQuestion({ item }) {
  return (
    <Card padding="p-5" className="flex flex-col gap-3 bg-prism-accentDim border-prism-accent/20">
      <div className="flex items-start gap-2.5">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-prism-accent text-white">
          <MessageSquare className="h-4 w-4" />
        </span>
        <h4 className="text-sm font-semibold text-prism-accent pt-1">
          {item.q}
        </h4>
      </div>
      <div className="rounded-xl bg-black/40 border border-prism-line p-3">
        <p className="text-xs text-white/80 leading-relaxed">{item.a}</p>
      </div>
    </Card>
  );
}

function FeatureBlock({ item }) {
  const Icon = item.icon;
  return (
    <div className="flex flex-col items-center text-center gap-3">
      <span className="inline-flex h-12 w-12 items-center justify-center text-prism-accent">
        <Icon className="h-8 w-8" />
      </span>
      <h4 className="text-lg font-semibold text-white">{item.title}</h4>
      <p className="text-sm text-white/60 max-w-xs">{item.desc}</p>
    </div>
  );
}

function Testimonial({ item }) {
  return (
    <Card padding="p-6" className="flex flex-col gap-4 h-full">
      <p className="text-sm italic text-white/80 leading-relaxed flex-1">
        &ldquo;{item.quote}&rdquo;
      </p>
      <div className="flex items-center justify-between pt-2 border-t border-prism-line">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-prism-accentDim text-prism-accent text-sm font-semibold">
            {item.initial}
          </span>
          <div>
            <div className="text-sm font-semibold text-white">{item.name}</div>
            <div className="text-xs text-prism-muted2">{item.role}</div>
          </div>
        </div>
        <div className="text-xs text-prism-muted2">{item.date}</div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Page principale.                                                   */
/* ------------------------------------------------------------------ */

export default function WelcomePage() {
  // Récupère lang depuis BookProvider ; fallback "fr" si le provider n'est pas
  // encore hydraté ou pas dispo pour une raison quelconque.
  const book = useBook?.() || {};
  const lang = book?.lang === "en" ? "en" : "fr";
  const t = COPY[lang];

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased">
      {/* Top nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 sm:px-10 py-6">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          MyTradeBook
        </Link>
        <Link
          href="/auth"
          className="text-sm font-medium text-white/70 hover:text-white transition-colors"
        >
          {t.nav.signin}
        </Link>
      </nav>

      {/* Hero */}
      <section className="prism-hero-bg relative overflow-hidden">
        <div className="mx-auto max-w-5xl px-6 sm:px-10 py-16 sm:py-24 flex flex-col items-center text-center gap-8">
          <Pill>{t.hero.badge}</Pill>

          <h1 className="text-prism-hero font-extrabold text-white/70 max-w-4xl">
            {t.hero.title}
          </h1>

          <p className="text-lg text-white/60 max-w-2xl leading-relaxed">
            {t.hero.desc}
          </p>

          <Link href="/auth">
            <Button variant="primary" size="lg" pill iconRight={<ArrowRight className="h-5 w-5" />}>
              {t.hero.cta}
            </Button>
          </Link>

          <p className="text-xs text-white/50">{t.hero.caption}</p>

          <div className="inline-flex items-center gap-2 text-xs font-medium text-prism-accent">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-prism-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-prism-accent" />
            </span>
            {t.hero.status}
          </div>
        </div>
      </section>

      {/* Stats grid */}
      <section className="mx-auto max-w-6xl px-6 sm:px-10 py-8 sm:py-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {t.stats.map((s, i) => (
            <div
              key={i}
              className="rounded-2xl border border-prism-line bg-prism-panel p-6 sm:p-8 text-center"
            >
              <div className="text-3xl sm:text-4xl font-bold text-white tabular-nums">
                {s.value}
              </div>
              <div className="mt-2 text-xs sm:text-sm text-prism-muted">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Meet PRISM */}
      <section className="mx-auto max-w-6xl px-6 sm:px-10 py-16 sm:py-24">
        <div className="flex flex-col items-center text-center gap-4 mb-12">
          <h2 className="text-prism-h1 font-bold text-white max-w-3xl">
            {t.meet.title}
          </h2>
          <p className="text-base text-white/60 max-w-2xl leading-relaxed">
            {t.meet.desc}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {t.meet.cards.map((c, i) => (
            <PatternCard key={i} card={c} />
          ))}
        </div>
      </section>

      {/* Chat with PRISM */}
      <section className="mx-auto max-w-6xl px-6 sm:px-10 py-8 sm:py-12">
        <Card padding="p-6 sm:p-8" className="border-prism-accent/20">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-prism-accent text-white">
              <Sparkles className="h-5 w-5" />
            </span>
            <h3 className="text-xl font-bold text-prism-accent">
              {t.chat.title}
            </h3>
          </div>
          <p className="text-sm text-white/60 mb-6">{t.chat.desc}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {t.chat.questions.map((q, i) => (
              <ChatQuestion key={i} item={q} />
            ))}
          </div>
        </Card>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 sm:px-10 py-16 sm:py-24">
        <h3 className="text-center text-prism-h2 font-bold text-white mb-12">
          {t.features.title}
        </h3>
        <Card padding="p-8 sm:p-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {t.features.items.map((it, i) => (
              <FeatureBlock key={i} item={it} />
            ))}
          </div>
        </Card>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-6 sm:px-10 py-8 sm:py-16">
        <Card padding="p-6 sm:p-8">
          <h3 className="text-center text-2xl sm:text-3xl font-bold text-white mb-8 flex items-center justify-center gap-3">
            <Star className="h-6 w-6 text-prism-accent fill-prism-accent" />
            {t.testimonials.title}
            <Star className="h-6 w-6 text-prism-accent fill-prism-accent" />
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {t.testimonials.items.map((it, i) => (
              <Testimonial key={i} item={it} />
            ))}
          </div>
        </Card>
      </section>

      {/* Secondary CTA */}
      <section className="mx-auto max-w-4xl px-6 sm:px-10 py-16 sm:py-24 text-center">
        <Pill className="mb-6">
          <Gift className="h-3.5 w-3.5 text-prism-accent" />
          {lang === "fr" ? "Accès complet dès l'inscription" : "Full access from the moment you join"}
        </Pill>
        <Link href="/auth">
          <Button
            variant="primary"
            size="lg"
            pill
            icon={<Zap className="h-5 w-5" />}
          >
            {t.hero.cta}
          </Button>
        </Link>
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-white/50">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3 w-3" />
            {lang === "fr" ? "Sécurisé par Stripe" : "Secured by Stripe"}
          </span>
          <span className="text-white/20">|</span>
          <span className="inline-flex items-center gap-1.5">
            <Shield className="h-3 w-3" />
            {lang === "fr" ? "Annulable à tout moment" : "Cancel anytime"}
          </span>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-prism-line mt-8">
        <div className="mx-auto max-w-6xl px-6 sm:px-10 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-prism-muted2">
            {t.footer.tagline}
          </div>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="text-xs text-prism-muted hover:text-white transition-colors">
              {t.footer.links.terms}
            </Link>
            <Link href="/privacy" className="text-xs text-prism-muted hover:text-white transition-colors">
              {t.footer.links.privacy}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
