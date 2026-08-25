"use client";

import { useState, useEffect, useRef, forwardRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  BookOpen, Gauge, LineChart, ShieldAlert, History,
  ClipboardList, Trophy, Sparkles, Landmark, Languages,
} from "lucide-react";

/* ── Spotlight card réutilisable (limité aux surfaces card) ── */
const SpotCard = forwardRef(function SpotCard({ className = "", children, style, ...rest }, ref) {
  const innerRef = useRef(null);
  const setRefs = (node) => {
    innerRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };
  const onMove = (e) => {
    const el = innerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <div ref={setRefs} onMouseMove={onMove} className={`spot ${className}`} style={style} {...rest}>
      {children}
    </div>
  );
});

/* ── Contenu vitrine (features réelles de l'app, zéro data inventée) ── */
const FEATURES = [
  { icon: BookOpen,      title: "Journal de trades",     desc: "Chaque trade loggé : entrée, sortie, R-multiple, notes et captures.", badge: "Essentiel",  tone: "accent" },
  { icon: Gauge,         title: "Edge Score",            desc: "Ta note de discipline, calculée en continu sur tes trades.",          badge: "Essentiel",  tone: "accent" },
  { icon: LineChart,     title: "Equity curve & P&L",    desc: "Ta courbe de capital, ton drawdown et ton profit factor en clair." },
  { icon: ShieldAlert,   title: "Risque & daily loss",   desc: "Risque par trade et limite de perte journalière, calés prop firm.",   badge: "Garde-fou",  tone: "gold" },
  { icon: History,       title: "Backtest",              desc: "Rejoue tes setups sur l'historique avant de les mettre en live.",     badge: "Nouveau",    tone: "cyan" },
  { icon: ClipboardList, title: "Playbook",              desc: "Tes setups documentés, chacun avec ses propres statistiques." },
  { icon: Trophy,        title: "Leaderboard",           desc: "Compare ton Edge Score au reste de la communauté.",                   badge: "Communauté", tone: "pink" },
  { icon: Sparkles,      title: "Rapports IA",           desc: "Analyse automatique de tes forces et de tes fuites de perf.",         badge: "Nouveau",    tone: "cyan" },
];

const FIRMS = ["MyFundedFutures", "TopStep", "Apex", "FundingPips", "Take Profit Trader"];

const TONES = {
  accent: { color: "#00d301", bg: "rgba(0,211,1,0.12)" },
  gold:   { color: "#f5b301", bg: "rgba(245,179,1,0.12)" },
  cyan:   { color: "#7fd0ff", bg: "rgba(127,208,255,0.12)" },
  pink:   { color: "#ff66e4", bg: "rgba(255,102,228,0.12)" },
};

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", pass: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  /* ── Auth Supabase — logique inchangée ── */
  async function login() {
    setErr(""); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.pass });
    setBusy(false);
    if (error) return setErr(error.message);
    router.push("/dashboard");
    router.refresh();
  }

  async function signup() {
    setErr("");
    if (!form.name.trim()) return setErr("Entre un nom.");
    if (form.pass.length < 6) return setErr("Mot de passe trop court (min. 6).");
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.pass,
      options: { data: { name: form.name.trim() }, emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) return setErr(error.message);
    if (data.session) {
      router.push("/pricing");
      router.refresh();
    } else {
      setErr("Compte créé. Vérifie ta boîte mail pour confirmer, puis connecte-toi.");
      setTab("login");
    }
  }

  /* ── Reveal au scroll, coupé si prefers-reduced-motion ── */
  useEffect(() => {
    const els = document.querySelectorAll("[data-reveal]");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { els.forEach((el) => el.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const inputCls = "w-full rounded-xl border border-line2 bg-panel2 px-3.5 py-3 text-[14px] text-white outline-none focus:border-accent";

  return (
    <div className="min-h-screen bg-ink text-white">
      <style>{`
        .spot { position: relative; }
        .spot::before {
          content: ""; position: absolute; inset: 0; border-radius: inherit;
          background: radial-gradient(220px circle at var(--mx,-200px) var(--my,-200px), rgba(0,211,1,0.10), transparent 62%);
          opacity: 0; transition: opacity .25s ease; pointer-events: none;
        }
        .spot:hover::before { opacity: 1; }
        .reveal { opacity: 0; transform: translateY(14px); transition: opacity .55s ease, transform .55s ease; }
        .reveal.in { opacity: 1; transform: none; }
        .marquee {
          overflow: hidden;
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
          mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
        }
        .marquee-track { display: flex; gap: 1.25rem; width: max-content; animation: mtb-marquee 26s linear infinite; }
        @keyframes mtb-marquee { to { transform: translateX(-50%); } }
        @media (prefers-reduced-motion: reduce) {
          .reveal { opacity: 1 !important; transform: none !important; transition: none !important; }
          .spot::before { display: none; }
          .marquee-track { animation: none !important; }
        }
      `}</style>

      <div className="flex min-h-screen flex-col lg:flex-row">
        {/* ══ SHOWCASE (gauche) ══ */}
        <aside className="order-2 border-t border-line px-6 py-10 sm:px-10 lg:order-1 lg:w-[56%] lg:border-r lg:border-t-0 lg:py-14">
          <div className="mx-auto max-w-[560px]">
            <div className="mb-8" data-reveal>
              <div className="font-mono text-[12px] font-extrabold tracking-[6px] text-muted2">
                My<span className="text-accent">Trade</span>Book
              </div>
              <h1 className="mt-4 text-[26px] font-extrabold leading-tight text-white sm:text-[31px]">
                Ton livre de comptes<br />de trader financé.
              </h1>
              <p className="mt-3 max-w-md text-[13px] leading-relaxed text-muted2">
                Journalise chaque trade, suis ton Edge Score, garde tes limites prop firm
                sous contrôle — et compare-toi à la communauté.
              </p>
            </div>

            <div className="mb-8 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-muted2" data-reveal>
              <span className="flex items-center gap-1.5"><Landmark size={14} className="text-accent" /> Multi-comptes prop firm</span>
              <span className="flex items-center gap-1.5"><Gauge size={14} className="text-accent" /> Edge Score & analytics</span>
              <span className="flex items-center gap-1.5"><Languages size={14} className="text-accent" /> FR / EN</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                const tone = f.tone ? TONES[f.tone] : null;
                return (
                  <SpotCard
                    key={f.title}
                    data-reveal
                    className="reveal rounded-2xl border border-line2 bg-panel2 p-4"
                    style={{ transitionDelay: `${Math.min(i * 55, 330)}ms` }}
                  >
                    <div className="relative flex items-start gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line2 bg-ink text-accent">
                        <Icon size={17} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[13.5px] font-semibold text-white">{f.title}</h3>
                          {f.badge && (
                            <span
                              className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                              style={{ color: tone.color, background: tone.bg }}
                            >
                              {f.badge}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[12px] leading-relaxed text-muted2">{f.desc}</p>
                      </div>
                    </div>
                  </SpotCard>
                );
              })}
            </div>

            <div className="mt-9" data-reveal>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted2">
                Pensé pour tes prop firms
              </p>
              <div className="marquee">
                <div className="marquee-track">
                  {[...FIRMS, ...FIRMS].map((n, i) => (
                    <span
                      key={i}
                      className="whitespace-nowrap rounded-lg border border-line2 bg-panel2 px-3 py-1.5 text-[12px] font-medium text-muted"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ══ AUTH (droite, sticky pleine hauteur) ══ */}
        <main className="order-1 flex items-center justify-center bg-panel px-6 py-12 lg:order-2 lg:sticky lg:top-0 lg:h-screen lg:w-[44%]">
          <div className="w-[min(400px,92vw)]">
            <div className="mb-6 text-center">
              <div className="font-mono text-[13px] font-extrabold tracking-[6px] text-muted2">
                My<span className="text-accent">Trade</span>Book
              </div>
              <h2 className="mt-4 text-[22px] font-extrabold text-white">
                {tab === "signup" ? "Bienvenue" : "Bon retour"}
              </h2>
              <p className="mt-1 text-[12px] text-muted2">
                {tab === "signup" ? "Crée ton livre de comptes." : "Le livre de comptes du trader financé."}
              </p>
            </div>

            <div className="mb-4 flex gap-1.5 rounded-xl bg-panel2 p-1">
              <button onClick={() => { setTab("login"); setErr(""); }} className={`flex-1 rounded-lg py-2.5 text-[13px] font-semibold ${tab === "login" ? "bg-ink text-white" : "text-muted2"}`}>Se connecter</button>
              <button onClick={() => { setTab("signup"); setErr(""); }} className={`flex-1 rounded-lg py-2.5 text-[13px] font-semibold ${tab === "signup" ? "bg-ink text-white" : "text-muted2"}`}>Créer un compte</button>
            </div>

            {tab === "signup" && (
              <div className="mb-3">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted2">Nom affiché</label>
                <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="prénom ou pseudo" />
              </div>
            )}
            <div className="mb-3">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted2">Email</label>
              <input type="email" className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="toi@email.com"
                onKeyDown={(e) => e.key === "Enter" && (tab === "login" ? login() : signup())} />
            </div>
            <div className="mb-3">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted2">Mot de passe</label>
              <input type="password" className={inputCls} value={form.pass} onChange={(e) => set("pass", e.target.value)} placeholder={tab === "signup" ? "min. 6 caractères" : "••••••••"}
                onKeyDown={(e) => e.key === "Enter" && (tab === "login" ? login() : signup())} />
            </div>

            <button disabled={busy} onClick={tab === "login" ? login : signup}
              className="mt-1 w-full rounded-xl bg-accent py-3 text-[14px] font-bold text-black transition hover:brightness-110 disabled:opacity-60">
              {busy ? "…" : tab === "login" ? "Se connecter" : "Créer mon compte"}
            </button>
            {err && <div className="mt-3 min-h-[15px] text-center text-[12px] text-loss">{err}</div>}
          </div>
        </main>
      </div>
    </div>
  );
}
