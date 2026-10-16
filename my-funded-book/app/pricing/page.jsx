"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, LockKeyhole, MousePointer2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import BrandMark from "@/components/BrandMark";

const FEATURES = [
  "Journal illimité : log rapide, templates par setup, duplication",
  "Import des fills Tradovate / Rithmic / NinjaTrader",
  "PRISM, le coach IA qui lit tes trades",
  "Rapport hebdo automatique : meilleur setup, erreurs, règle",
  "Comptes prop firm : drawdown, objectifs, payouts",
  "Galaxie 3D, calendrier P&L, playbook et checklists",
  "Mobile + app installable, synchronisé partout",
  "Export CSV et connecteur IA (MCP)",
];

const FAQ = [
  ["Je paie quand ?", "Rien pendant 14 jours. Stripe te prélève à la fin de l'essai seulement si tu ne l'as pas annulé."],
  ["Je peux annuler ?", "Oui, en un clic depuis Réglages → Abonnement, à tout moment. Pas d'engagement."],
  ["Mes données sont privées ?", "Oui. Chaque compte ne voit que ses propres trades (sécurité au niveau de la base)."],
];

const ACTIVE = ["active", "trialing"];

export default function PricingPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState(undefined);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState(null); // "success" | "cancel" | null

  useEffect(() => {
    const checkout = new URLSearchParams(window.location.search).get("checkout");
    if (checkout === "success" || checkout === "cancel") setStatus(checkout);
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null));
  }, [supabase]);

  // Retour de Stripe : le webhook peut mettre quelques secondes à activer
  // l'abonnement. On attend qu'il soit actif avant d'ouvrir l'app, sinon le
  // paywall renverrait ici.
  useEffect(() => {
    if (status !== "success" || !user) return undefined;
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      const { data } = await supabase.from("subscriptions").select("status").eq("user_id", user.id).maybeSingle();
      if (data && ACTIVE.includes(data.status)) {
        clearInterval(timer);
        router.replace("/dashboard?welcome=1");
        router.refresh();
      } else if (tries > 20) {
        clearInterval(timer);
        setError("Le paiement est bien reçu mais l'activation prend plus de temps que prévu. Recharge la page dans une minute.");
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [status, user, supabase, router]);

  async function checkout(plan) {
    if (!user) {
      router.push("/login?tab=signup");
      return;
    }
    setBusy(plan);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
      if (res.status === 401) { router.push("/login?tab=signup"); return; }
      const data = await res.json().catch(() => ({}));
      if (data.url) { window.location.assign(data.url); return; }
      setError(data.error || "Une erreur est survenue lors de la redirection vers le paiement.");
    } catch {
      setError("Erreur réseau. Vérifie ta connexion et réessaie.");
    }
    setBusy("");
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <main className="relative min-h-[100dvh] overflow-x-clip bg-prism-bg px-4 pb-16 pt-[calc(1.25rem+env(safe-area-inset-top))] text-prism-text sm:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(198,244,50,.12),transparent_65%)]" />
      <nav className="relative mx-auto flex max-w-[980px] items-center justify-between">
        <Link href="/welcome"><BrandMark /></Link>
        {user ? <button type="button" onClick={signOut} className="text-xs text-prism-muted hover:text-prism-text">Se déconnecter</button> : <Link href="/login" className="text-xs font-bold text-prism-muted hover:text-prism-text">Se connecter</Link>}
      </nav>

      <section className="relative mx-auto mt-10 max-w-[980px] text-center sm:mt-14">
        <p className="term-eyebrow">TARIFS · 14 JOURS OFFERTS</p>
        <h1 className="term-title mt-3 text-4xl sm:text-6xl">Un prix. <span className="text-prism-accent">Tout inclus.</span></h1>
        <p className="mx-auto mt-4 max-w-lg text-sm text-prism-muted">Essaie tout pendant 14 jours. Tu ne paies que si le journal t&apos;aide vraiment.</p>
      </section>

      {status === "success" && !error && (
        <p className="relative mx-auto mt-8 flex max-w-[720px] items-center justify-center gap-2 rounded-md border border-prism-accent/50 bg-prism-accentDim px-4 py-3 text-sm text-prism-accent">
          <Loader2 className="h-4 w-4 animate-spin" /> Paiement validé — activation de ton espace…
        </p>
      )}
      {status === "cancel" && <p className="relative mx-auto mt-8 max-w-[720px] rounded-md border border-prism-line bg-prism-panel px-4 py-3 text-center text-sm text-prism-muted">Paiement annulé, rien n&apos;a été prélevé. Tu peux réessayer quand tu veux.</p>}
      {error && <p className="relative mx-auto mt-8 max-w-[720px] rounded-md border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.10)] px-4 py-3 text-center text-sm text-prism-loss">{error}</p>}

      <div className="relative mx-auto mt-8 grid max-w-[720px] gap-4 sm:grid-cols-2">
        <Plan title="Mensuel" price="$19" per="/ mois" plan="monthly" busy={busy} onPick={checkout} loggedIn={!!user} />
        <Plan title="Annuel" price="$149" per="/ an" sub="soit $12,40 / mois" badge="2 MOIS OFFERTS" plan="yearly" busy={busy} onPick={checkout} loggedIn={!!user} highlight />
      </div>

      <p className="relative mx-auto mt-4 flex max-w-[720px] items-center justify-center gap-2 text-center text-[11px] text-prism-muted">
        <LockKeyhole className="h-3 w-3" /> Paiement sécurisé par Stripe · annulable en 1 clic
      </p>
      <div className="relative mt-3 text-center">
        <Link href="/demo" className="inline-flex items-center gap-2 text-xs font-bold text-prism-accent hover:underline"><MousePointer2 className="h-3.5 w-3.5" />Voir la démo avant de t&apos;inscrire</Link>
      </div>

      <section className="term-panel relative mx-auto mt-10 max-w-[720px] p-5 sm:p-6">
        <p className="term-title text-lg">Tout est inclus</p>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <p key={feature} className="flex items-start gap-2.5 text-[13px] text-prism-text/85"><Check className="mt-0.5 h-4 w-4 shrink-0 text-prism-accent" />{feature}</p>
          ))}
        </div>
      </section>

      <section className="relative mx-auto mt-6 max-w-[720px] space-y-2">
        {FAQ.map(([q, a]) => (
          <details key={q} className="term-panel group px-5 py-4">
            <summary className="cursor-pointer list-none text-sm font-semibold marker:hidden">{q}<span className="float-right text-prism-accent transition group-open:rotate-45">+</span></summary>
            <p className="mt-2 text-[13px] text-prism-muted">{a}</p>
          </details>
        ))}
      </section>
    </main>
  );
}

function Plan({ title, price, per, sub, badge, plan, busy, onPick, highlight, loggedIn }) {
  return (
    <div className={`term-panel p-6 text-left ${highlight ? "border-prism-accent shadow-[0_0_50px_-20px_rgba(198,244,50,.6)]" : ""}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold tracking-[.16em] text-prism-muted">{title.toUpperCase()}</p>
        {badge && <span className="rounded bg-prism-accent px-2 py-0.5 text-[10px] font-extrabold tracking-[.1em] text-black">{badge}</span>}
      </div>
      <div className="mt-3 flex items-end gap-1">
        <span className="term-title text-5xl">{price}</span>
        <span className="mb-1 text-sm text-prism-muted">{per}</span>
      </div>
      <p className="mt-1 h-4 font-mono text-[11px] text-prism-muted2">{sub || ""}</p>
      <button
        type="button"
        disabled={!!busy}
        onClick={() => onPick(plan)}
        className={`mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md text-xs font-extrabold tracking-[.14em] transition disabled:opacity-60 ${highlight ? "bg-prism-accent text-black hover:brightness-110" : "border border-prism-line2 text-prism-text hover:border-prism-accent hover:text-prism-accent"}`}
      >
        {busy === plan ? <><Loader2 className="h-4 w-4 animate-spin" />REDIRECTION…</> : <>{loggedIn ? "DÉMARRER L'ESSAI GRATUIT" : "CRÉER MON COMPTE"}<ArrowRight className="h-4 w-4" /></>}
      </button>
      <p className="mt-2 text-center text-[11px] text-prism-muted">14 jours gratuits, sans engagement</p>
    </div>
  );
}
