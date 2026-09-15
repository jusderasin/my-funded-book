"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, BrainCircuit, Check, CircleDollarSign, LockKeyhole, Sparkles, Target } from "lucide-react";
import BrandMark from "@/components/BrandMark";

function Metric({ icon: Icon, label, value }) {
  return <div className="auth-metric"><Icon size={15} /><span>{label}</span><b>{value}</b></div>;
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const panelRef = useRef(null);
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", pass: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const isLogin = tab === "login";
  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

  function spotlight(event) {
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    panel.style.setProperty("--sx", `${event.clientX - rect.left}px`);
    panel.style.setProperty("--sy", `${event.clientY - rect.top}px`);
  }

  async function submit() {
    setErr("");
    if (!isLogin && !form.name.trim()) return setErr("Entre un nom ou un pseudo.");
    if (!isLogin && form.pass.length < 6) return setErr("Le mot de passe doit contenir au moins 6 caractères.");
    setBusy(true);
    const result = isLogin
      ? await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.pass })
      : await supabase.auth.signUp({ email: form.email.trim(), password: form.pass, options: { data: { name: form.name.trim() }, emailRedirectTo: `${location.origin}/auth/callback` } });
    setBusy(false);
    if (result.error) return setErr(result.error.message);
    if (!isLogin && !result.data.session) {
      setErr("Compte créé. Vérifie ton e-mail puis connecte-toi.");
      setTab("login");
      return;
    }
    router.push(isLogin ? "/dashboard" : "/pricing");
    router.refresh();
  }

  return (
    <main className="auth-shell">
      <div className="auth-grid" />
      <div className="auth-glow auth-glow-left" />
      <div className="auth-glow auth-glow-right" />
      <nav className="auth-nav"><BrandMark /><span><LockKeyhole size={13} /> ACCÈS SÉCURISÉ</span></nav>

      <section className="auth-layout">
        <div className="auth-story">
          <div className="landing-kicker"><span /> MYTRADEBOOK / SIGNAL</div>
          <h1>Chaque trade laisse<br />une trace. <em>Lis-la.</em></h1>
          <p>Un environnement privé pour structurer ton exécution, surveiller ton risque et construire un edge durable.</p>
          <div className="auth-visual">
            <div className="auth-visual-head"><span>TON PROCESS / EN DIRECT</span><b><i /> ACTIF</b></div>
            <div className="auth-visual-main"><div><small>SCORE DE DISCIPLINE</small><strong>86</strong><span>/ 100</span></div><div className="auth-ring"><i /></div></div>
            <div className="auth-trace"><span /><span /><span /><span /><span /><span /><span /><span /></div>
            <div className="auth-metrics"><Metric icon={Target} label="PLAN" value="8/10" /><Metric icon={CircleDollarSign} label="RISQUE" value="0.7R" /><Metric icon={BrainCircuit} label="FOCUS" value="STABLE" /></div>
          </div>
          <div className="auth-points"><span><Check /> Ton journal reste privé</span><span><Check /> Pensé pour les prop firms</span><span><Check /> PRISM te répond quand il compte</span></div>
        </div>

        <section ref={panelRef} onPointerMove={spotlight} className="auth-panel">
          <div className="auth-panel-head"><div className="auth-symbol"><Sparkles size={18} /></div><div><span>ESPACE PERSONNEL</span><h2>{isLogin ? "Bon retour." : "Construis ton edge."}</h2></div></div>
          <p className="auth-intro">{isLogin ? "Reprends là où ton process s’est arrêté." : "Commence avec un journal propre, dès le premier trade."}</p>
          <div className="auth-tabs"><button onClick={() => { setTab("login"); setErr(""); }} className={isLogin ? "active" : ""}>Se connecter</button><button onClick={() => { setTab("signup"); setErr(""); }} className={!isLogin ? "active" : ""}>Créer un compte</button></div>
          <div className="auth-fields">
            {!isLogin && <label>Nom ou pseudo<input value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="Ex. Trader Kai" autoComplete="name" /></label>}
            <label>E-mail<input type="email" value={form.email} onChange={(event) => set("email", event.target.value)} placeholder="toi@email.com" autoComplete="email" onKeyDown={(event) => event.key === "Enter" && submit()} /></label>
            <label>Mot de passe<input type="password" value={form.pass} onChange={(event) => set("pass", event.target.value)} placeholder="••••••••" autoComplete={isLogin ? "current-password" : "new-password"} onKeyDown={(event) => event.key === "Enter" && submit()} /></label>
          </div>
          {err && <p className="auth-error">{err}</p>}
          <button disabled={busy} onClick={submit} className="auth-submit">{busy ? "Connexion…" : isLogin ? "Entrer dans mon journal" : "Créer mon espace"}<ArrowRight size={18} /></button>
          <p className="auth-disclaimer"><LockKeyhole size={12} /> Connexion chiffrée · données privées</p>
        </section>
      </section>
      <footer className="auth-footer"><span>MYTRADEBOOK © {new Date().getFullYear()}</span><span>DISCIPLINE AVANT TOUT</span></footer>
    </main>
  );
}
