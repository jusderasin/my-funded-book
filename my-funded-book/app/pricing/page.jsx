"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const FEATURES = [
  "Trades, comptes & journaling illimités",
  "Balances par compte et dashboards",
  "Playbook de setups avec stats live",
  "Rituel de review hebdomadaire",
  "Mur de certificats & suivi des payouts",
  "Tracker de dépenses d'éval",
  "Export CSV",
  "Synchronisé sur tous tes appareils",
];

export default function PricingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState("");

  async function checkout(plan) {
    setBusy(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      
      const data = await res.json();

      if (data.url) {
        // Redirection forcée vers Stripe ou le Customer Portal
        window.location.assign(data.url);
      } else {
        alert(data.error || "Une erreur est survenue lors de la redirection.");
        setBusy("");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau ou serveur.");
      setBusy("");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink p-5">
      <div className="font-mono text-[13px] font-extrabold tracking-[6px] text-muted2">
        My<span className="text-accent">Trade</span>Book
      </div>

      <div className="grid w-full max-w-[720px] gap-4 sm:grid-cols-2">
        <Plan title="Mensuel" price="$19" per="/ mois" plan="monthly" busy={busy} onPick={checkout} />
        <Plan title="Annuel" price="$149" per="/ an" badge="2 mois offerts" plan="yearly" busy={busy} onPick={checkout} highlight />
      </div>

      <div className="w-full max-w-[720px] rounded-2xl border border-line bg-panel p-6">
        <div className="mb-3 text-[13px] font-semibold text-white/90">Tout est inclus :</div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f} className="flex items-center gap-2.5 text-[13.5px] text-white/85">
              <Check size={16} className="text-accent" /> {f}
            </div>
          ))}
        </div>
      </div>

      <button onClick={signOut} className="text-[12px] text-muted2 underline hover:text-white">
        Se déconnecter
      </button>
    </div>
  );
}

function Plan({ title, price, per, badge, plan, busy, onPick, highlight }) {
  return (
    <div className={`rounded-2xl border bg-panel p-6 ${highlight ? "border-accent" : "border-line"}`}>
      <div className="flex items-center justify-between">
        <div className="text-[14px] font-semibold text-muted">{title}</div>
        {badge && <span className="rounded-md bg-accentDim px-2 py-0.5 text-[11px] font-bold text-accent">{badge}</span>}
      </div>
      <div className="mt-2 flex items-end gap-1">
        <span className="font-mono text-[34px] font-extrabold leading-none">{price}</span>
        <span className="mb-1 text-[13px] text-muted2">{per}</span>
      </div>
      <div className="mt-1 text-[12px] text-accent font-medium">14 jours d'essai gratuit • Sans engagement</div>
      <button
        disabled={!!busy}
        onClick={() => onPick(plan)}
        className="mt-4 w-full rounded-xl bg-accent py-3 text-[14px] font-bold text-black transition hover:brightness-110 disabled:opacity-60"
      >
        {busy === plan ? "Redirection…" : "Essayer gratuitement (14 jours)"}
      </button>
    </div>
  );
}
