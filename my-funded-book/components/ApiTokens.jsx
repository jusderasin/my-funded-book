"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check, ClipboardCopy, KeyRound, Trash2 } from "lucide-react";

// Jetons personnels pour le connecteur MCP (Claude & co). Le jeton en clair
// n'est affiché qu'une fois, juste après sa création.
export function ApiTokens({ lang }) {
  const en = lang === "en";
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState([]);
  const [name, setName] = useState("Claude");
  const [fresh, setFresh] = useState(null);
  const [copied, setCopied] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endpoint = typeof window === "undefined" ? "/api/mcp" : `${window.location.origin}/api/mcp`;

  async function load() {
    const { data, error: err } = await supabase.from("api_tokens").select("id, name, token_prefix, created_at, last_used_at").order("created_at", { ascending: false });
    if (err) setError(en ? "Tokens table missing — run migration_r13_api_tokens.sql." : "Table des jetons absente — lance migration_r13_api_tokens.sql.");
    else setRows(data || []);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    setBusy(true); setError("");
    const res = await fetch("/api/tokens", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(json.error === "too_many_tokens" ? (en ? "Max 10 tokens." : "10 jetons max.") : (json.error || "error")); return; }
    setFresh(json.token);
    setRows((list) => [json.row, ...list]);
  }

  async function revoke(id) {
    if (!window.confirm(en ? "Revoke this token? Connected AIs will lose access." : "Révoquer ce jeton ? Les IA connectées perdront l'accès.")) return;
    const { error: err } = await supabase.from("api_tokens").delete().eq("id", id);
    if (!err) setRows((list) => list.filter((row) => row.id !== id));
  }

  async function copy(text, key) {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 1500); } catch {}
  }

  const fmt = (value) => (value ? new Date(value).toLocaleString(en ? "en-US" : "fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—");
  const btn = "flex items-center gap-1.5 rounded-md border border-prism-line px-3 py-2 text-xs font-semibold transition hover:border-prism-accent disabled:opacity-40";

  return (
    <div className="term-panel space-y-3 p-4">
      <p className="term-title flex items-center gap-2 text-sm"><KeyRound className="h-4 w-4 text-prism-accent" />{en ? "Connect your own Claude (MCP)" : "Connecter ton propre Claude (MCP)"}</p>
      <p className="text-[11px] leading-5 text-prism-muted">
        {en
          ? "Create a personal token, then add a custom connector in Claude with the URL below. Your Claude can then read your stats, log trades and annotate them."
          : "Crée un jeton personnel, puis ajoute un connecteur personnalisé dans Claude avec l'URL ci-dessous. Ton Claude pourra lire tes stats, enregistrer des trades et les annoter."}
      </p>
      <div className="flex items-center gap-2 rounded-md border border-prism-line px-3 py-2 font-mono text-[11px]">
        <span className="min-w-0 flex-1 truncate">{endpoint}</span>
        <button type="button" onClick={() => copy(endpoint, "url")} className="text-prism-accent">{copied === "url" ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}</button>
      </div>

      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder={en ? "Token name" : "Nom du jeton"} className="min-w-0 flex-1 rounded-md border border-prism-line bg-transparent px-3 py-2 text-xs outline-none focus:border-prism-accent" />
        <button type="button" onClick={create} disabled={busy} className={btn}>{en ? "Create token" : "Créer un jeton"}</button>
      </div>

      {fresh && (
        <div className="rounded-md border border-prism-accent p-3 text-[11px]">
          <p className="mb-2 font-semibold text-prism-accent">{en ? "Copy it now — it will never be shown again." : "Copie-le maintenant — il ne sera plus jamais affiché."}</p>
          <div className="flex items-center gap-2 font-mono">
            <span className="min-w-0 flex-1 break-all">{fresh}</span>
            <button type="button" onClick={() => copy(fresh, "token")} className="text-prism-accent">{copied === "token" ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}</button>
          </div>
          <button type="button" onClick={() => setFresh(null)} className="mt-2 text-prism-muted hover:text-prism-text">{en ? "I saved it" : "Je l'ai sauvegardé"}</button>
        </div>
      )}
      {error && <p className="text-[11px] text-red-400">{error}</p>}

      <div className="divide-y divide-prism-line rounded-md border border-prism-line">
        {rows.length === 0 && <p className="px-3 py-2.5 text-[11px] text-prism-muted">{en ? "No token yet." : "Aucun jeton pour l'instant."}</p>}
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-3 px-3 py-2.5 text-[11px]">
            <div className="min-w-0 flex-1">
              <b className="block text-prism-text">{row.name} <span className="font-mono text-prism-muted">{row.token_prefix}…</span></b>
              <span className="text-prism-muted2">{en ? "Created" : "Créé"} {fmt(row.created_at)} · {en ? "last used" : "dernière utilisation"} {fmt(row.last_used_at)}</span>
            </div>
            <button type="button" onClick={() => revoke(row.id)} className="text-prism-muted hover:text-red-400" title={en ? "Revoke" : "Révoquer"}><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
