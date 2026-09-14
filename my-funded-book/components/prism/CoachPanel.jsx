"use client";

import { useState } from "react";
import { Brain, Send } from "lucide-react";

const SUGGESTIONS = [
  "Quel est mon principal point à travailler ?",
  "Analyse ma discipline sur mes derniers trades.",
  "Quelle règle simple dois-je suivre demain ?",
];

export default function CoachPanel() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(event, suggestedMessage) {
    event?.preventDefault();
    const content = String(suggestedMessage || draft).trim();
    if (!content || loading) return;
    const nextMessages = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setDraft("");
    setLoading(true);
    try {
      const response = await fetch("/api/coach-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, history: messages }),
      });
      const data = await response.json().catch(() => ({}));
      const reply = response.ok
        ? data.reply
        : data.error === "missing_groq_key"
          ? "PRISM n'est pas encore configuré côté serveur."
          : "Je ne peux pas répondre pour le moment.";
      setMessages((current) => [...current, { role: "assistant", content: reply }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: "Connexion locale indisponible pour le moment." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2"><Brain size={17} className="text-accent" /><div><h3 className="text-[13px] font-bold text-white">PRISM Coach</h3><p className="text-[10px] text-muted2">IA locale gratuite · tes données restent sur ton PC</p></div></div>
        <span className="rounded-full border border-line px-2 py-1 font-mono text-[9px] tracking-wider text-muted2">LOCAL</span>
      </div>
      <div className="min-h-52 space-y-3 p-4">
        {messages.length === 0 ? <>
          <p className="max-w-xl text-[13px] leading-relaxed text-muted2">Pose une question sur ton journal, tes habitudes ou tes statistiques. PRISM répond comme un coach, jamais comme un fournisseur de signaux.</p>
          <div className="flex flex-wrap gap-2">{SUGGESTIONS.map((suggestion) => <button key={suggestion} type="button" onClick={(event) => send(event, suggestion)} className="rounded-lg border border-line2 bg-panel2 px-3 py-2 text-left text-[11px] text-muted2 transition hover:border-zinc-500 hover:text-white">{suggestion}</button>)}</div>
        </> : messages.map((message, index) => <div key={`${message.role}-${index}`} className={`max-w-[88%] rounded-xl px-3 py-2 text-[12px] leading-relaxed ${message.role === "user" ? "ml-auto bg-white text-black" : "border border-line bg-panel2 text-muted2"}`}>{message.content}</div>)}
        {loading ? <div className="w-fit animate-pulse rounded-xl border border-line bg-panel2 px-3 py-2 text-[11px] text-muted2">PRISM réfléchit…</div> : null}
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
        <label className="sr-only" htmlFor="prism-message">Message à PRISM</label>
        <input id="prism-message" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Écris à ton coach…" className="min-w-0 flex-1 rounded-lg border border-line bg-black px-3 py-2 text-[12px] text-white outline-none placeholder:text-zinc-600 focus:border-zinc-500" />
        <button type="submit" disabled={!draft.trim() || loading} className="inline-flex items-center justify-center rounded-lg bg-white px-3 text-black disabled:opacity-40" aria-label="Envoyer le message"><Send size={15} /></button>
      </form>
    </section>
  );
}
