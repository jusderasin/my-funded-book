"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { User, ArrowRight } from "lucide-react";
import { Card, Button } from "@/components/prism";

/**
 * Complete Profile — page post-signup style TradeXNova.
 * L'user remplit prénom (requis) + nom (optionnel) puis on redirige vers /dashboard.
 *
 * IMPORTANT : la page suppose l'existence d'un endpoint PATCH `/api/profile`
 * qui accepte { first_name, last_name } et écrit dans la table `profiles`
 * (colonnes existantes selon overview memory : le profile system est déjà
 * shipped avec 7 colonnes). Si ton endpoint s'appelle autrement, adapte
 * la ligne `fetch("/api/profile", ...)` ci-dessous.
 *
 * La page est placée à /complete-profile (route publique, pas sous /(app)/)
 * pour éviter le subscription guard qui l'empêcherait de s'afficher pour
 * les users pas encore abonnés.
 */
export default function CompleteProfilePage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    const first = firstName.trim();
    if (!first) {
      setError("Le prénom est requis.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: first,
          last_name: lastName.trim() || null,
        }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Échec de la mise à jour du profil.");
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err?.message || "Erreur inconnue.");
      setSaving(false);
    }
  }

  const canSubmit = firstName.trim().length > 0 && !saving;

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-prism-accentDim text-prism-accent mb-4">
            <User className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            Complète ton profil
          </h1>
          <p className="text-sm text-prism-muted">
            Aide-nous à personnaliser ton expérience
          </p>
        </div>

        <Card padding="p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-prism-muted mb-2 uppercase tracking-wider">
                Prénom <span className="text-prism-accent normal-case">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Prénom"
                autoFocus
                autoComplete="given-name"
                disabled={saving}
                className="w-full rounded-xl border border-prism-line bg-black/40 px-4 py-3 text-sm text-white placeholder:text-prism-muted2 focus:border-prism-accent focus:outline-none transition-colors disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-prism-muted mb-2 uppercase tracking-wider">
                Nom
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Optionnel"
                autoComplete="family-name"
                disabled={saving}
                className="w-full rounded-xl border border-prism-line bg-black/40 px-4 py-3 text-sm text-white placeholder:text-prism-muted2 focus:border-prism-accent focus:outline-none transition-colors disabled:opacity-50"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={!canSubmit}
              iconRight={<ArrowRight className="h-5 w-5" />}
              className="w-full mt-2"
            >
              {saving ? "Enregistrement…" : "Continuer"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
