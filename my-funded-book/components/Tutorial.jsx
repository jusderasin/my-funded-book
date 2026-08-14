"use client";

import { useState } from "react";
import {
  Sparkles, LayoutGrid, Table2, ListChecks, FlaskConical, Medal, PenLine,
  BookOpen, Grid3x3, Award, Receipt, Rocket, X, ChevronLeft, ChevronRight,
} from "lucide-react";

const SLIDES = [
  { icon: Sparkles, accent: "#00d301",
    title: { fr: "Bienvenue sur MyTradeBook", en: "Welcome to MyTradeBook" },
    body: { fr: "Ton journal de trading pour progresser comme un pro. Ce tour rapide te présente chaque onglet. Tu peux le passer à tout moment et le revoir plus tard dans Réglages.", en: "Your trading journal to grow like a pro. This quick tour walks you through each tab. You can skip anytime and replay it later in Settings." } },
  { icon: LayoutGrid, accent: "#00d301",
    title: { fr: "Tableau de bord", en: "Dashboard" },
    body: { fr: "Ta vue d'ensemble : P&L net, win rate, profit factor, Edge Score et tes courbes. Toute ta performance en un coup d'œil.", en: "Your overview: net P&L, win rate, profit factor, Edge Score and your curves. All your performance at a glance." } },
  { icon: Table2, accent: "#7fd0ff",
    title: { fr: "Comptes", en: "Accounts" },
    body: { fr: "Gère tes comptes prop firm (évals et financés) : statut, taille, coûts. Pour toujours savoir où tu en es avec chaque firme.", en: "Manage your prop firm accounts (evals and funded): status, size, costs. Always know where you stand with each firm." } },
  { icon: ListChecks, accent: "#00d301",
    title: { fr: "Journal", en: "Journal" },
    body: { fr: "Le cœur de l'app. Logge chaque trade (sens, grade, R, PnL, tags) et surtout le WHY, avec une capture. C'est ici que ton edge se construit.", en: "The heart of the app. Log every trade (direction, grade, R, PnL, tags) and above all the WHY, with a screenshot. This is where your edge is built." } },
  { icon: FlaskConical, accent: "#00d301",
    title: { fr: "Backtest", en: "Backtest" },
    body: { fr: "Un espace séparé pour tester tes stratégies sur l'historique, organisé en sessions. Ça ne touche jamais tes stats live.", en: "A separate space to test your strategies on history, organized in sessions. It never touches your live stats." } },
  { icon: Medal, accent: "#f5b301",
    title: { fr: "Badges", en: "Badges" },
    body: { fr: "Débloque des badges en tradant avec discipline. Ils évoluent du débutant à la légende. Clique un badge pour voir précisément comment progresser.", en: "Unlock badges by trading with discipline. They evolve from novice to legend. Click a badge to see exactly how to progress." } },
  { icon: PenLine, accent: "#ff66e4",
    title: { fr: "Review", en: "Review" },
    body: { fr: "Écris ta review hebdo : ce qui a marché, ce qu'il faut couper, ton focus de la semaine. L'introspection qui fait la différence.", en: "Write your weekly review: what worked, what to cut, your focus. The introspection that makes the difference." } },
  { icon: BookOpen, accent: "#7fd0ff",
    title: { fr: "Playbook", en: "Playbook" },
    body: { fr: "Définis tes setups et leurs règles. Chaque trade est ensuite rattaché à un setup pour mesurer lequel te rapporte vraiment.", en: "Define your setups and their rules. Each trade is then tied to a setup to measure which one actually pays." } },
  { icon: Grid3x3, accent: "#00d301",
    title: { fr: "Analyse", en: "Breakdown" },
    body: { fr: "Décompose ta performance par setup, session, instrument, grade ou tag. Pour repérer tes forces et tes fuites.", en: "Break down your performance by setup, session, symbol, grade or tag. To spot your strengths and your leaks." } },
  { icon: Award, accent: "#f5b301",
    title: { fr: "Certificats", en: "Certificates" },
    body: { fr: "Ton mur de trophées : comptes financés, payouts encaissés. Garde une trace de tes wins.", en: "Your trophy wall: funded accounts, payouts received. Keep a record of your wins." } },
  { icon: Receipt, accent: "#7fd0ff",
    title: { fr: "Dépenses", en: "Expenses" },
    body: { fr: "Suis tes frais d'éval, resets, data feeds. Pour savoir exactement ce que le prop trading te coûte (net).", en: "Track your eval fees, resets, data feeds. To know exactly what prop trading costs you (net)." } },
  { icon: Rocket, accent: "#00d301",
    title: { fr: "C'est parti !", en: "You're all set!" },
    body: { fr: "Tu connais maintenant chaque onglet. Commence par logger ton premier trade. Tu peux revoir ce tour à tout moment dans Réglages → Revoir la démo.", en: "You now know every tab. Start by logging your first trade. You can replay this tour anytime in Settings → Replay demo." } },
];

export function Tutorial({ open, onClose, onFinish, lang }) {
  const [step, setStep] = useState(0);
  const L = lang === "en" ? "en" : "fr";
  if (!open) return null;

  const s = SLIDES[step];
  const Icon = s.icon;
  const last = step === SLIDES.length - 1;

  function finish() { onFinish?.(); onClose?.(); }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4">
      <div className="w-[min(480px,94vw)] overflow-hidden rounded-2xl border border-line2 bg-panel">
        <div className="flex items-center justify-between px-4 pt-4">
          <div className="font-mono text-[11px] font-extrabold tracking-[3px] text-muted2">MY<span className="text-accent">TRADE</span>BOOK</div>
          <button onClick={finish} className="rounded-md p-1 text-muted2 hover:bg-panel2 hover:text-white" title={L === "en" ? "Skip" : "Passer"}><X size={16} /></button>
        </div>

        <div className="flex flex-col items-center px-6 pb-2 pt-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${s.accent}` }}>
            <Icon size={30} style={{ color: s.accent }} />
          </div>
          <h2 className="mt-4 text-[19px] font-extrabold">{s.title[L]}</h2>
          <p className="mt-2 min-h-[72px] text-[13.5px] leading-relaxed text-muted">{s.body[L]}</p>
        </div>

        <div className="flex items-center justify-center gap-1.5 pb-3">
          {SLIDES.map((_, i) => (
            <span key={i} className="h-1.5 rounded-full transition-all" style={{ width: i === step ? 18 : 6, background: i === step ? s.accent : "#3a3f4a" }} />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-3">
          <button onClick={finish} className="rounded-lg px-3 py-2 text-[12px] font-semibold text-muted2 hover:text-white">
            {L === "en" ? "Skip" : "Passer"}
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button onClick={() => setStep((n) => n - 1)} className="inline-flex items-center gap-1 rounded-lg border border-line2 bg-panel2 px-3 py-2 text-[12px] font-semibold text-white">
                <ChevronLeft size={14} /> {L === "en" ? "Back" : "Précédent"}
              </button>
            )}
            {last ? (
              <button onClick={finish} className="inline-flex items-center gap-1 rounded-lg bg-accent px-4 py-2 text-[12px] font-bold text-black hover:brightness-110">
                {L === "en" ? "Get started" : "Commencer"} <Rocket size={14} />
              </button>
            ) : (
              <button onClick={() => setStep((n) => n + 1)} className="inline-flex items-center gap-1 rounded-lg bg-accent px-4 py-2 text-[12px] font-bold text-black hover:brightness-110">
                {L === "en" ? "Next" : "Suivant"} <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
