"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", pass: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

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

  const inputCls = "w-full rounded-xl border border-line2 bg-panel2 px-3.5 py-3 text-[14px] text-white outline-none focus:border-accent";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-ink p-5">
      <div className="font-mono text-[13px] font-extrabold tracking-[6px] text-muted2">
        MY <span className="text-accent">FUNDED</span> BOOK
      </div>
      <div className="w-[min(380px,92vw)] rounded-2xl border border-line2 bg-panel p-6">
        <div className="mb-4 flex gap-1.5 rounded-xl bg-panel2 p-1">
          <button onClick={() => { setTab("login"); setErr(""); }} className={`flex-1 rounded-lg py-2.5 text-[13px] font-semibold ${tab === "login" ? "bg-ink text-white" : "text-muted2"}`}>Se connecter</button>
          <button onClick={() => { setTab("signup"); setErr(""); }} className={`flex-1 rounded-lg py-2.5 text-[13px] font-semibold ${tab === "signup" ? "bg-ink text-white" : "text-muted2"}`}>Créer un compte</button>
        </div>
        <p className="mb-4 text-[12px] text-muted2">{tab === "signup" ? "Crée ton livre de comptes." : "Le livre de comptes du trader financé."}</p>

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
    </div>
  );
}
