"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { useBook } from "@/components/BookProvider";

const SUGGESTIONS = {
  fr: ["Où est-ce que je perds de l'argent ?", "Quel est mon meilleur setup ?", "Quelle session devrais-je arrêter de trader ?", "Est-ce que je respecte mon plan ?", "Donne-moi 2 règles pour ma prochaine session"],
  en: ["Where am I losing money?", "What is my best setup?", "Which session should I stop trading?", "Do I follow my plan?", "Give me 2 rules for my next session"],
};

// Rendu minimal du markdown renvoyé par le modèle : gras + puces, sans HTML injecté.
function RichText({ text }) {
  return text.split("\n").map((line, index) => {
    const bullet = /^\s*[-*•]\s+/.test(line);
    const parts = line.replace(/^\s*[-*•]\s+/, "").split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) => part.startsWith("**") && part.endsWith("**") ? <b key={partIndex} className="text-prism-text">{part.slice(2, -2)}</b> : part);
    if (!line.trim()) return <div key={index} className="h-2" />;
    return bullet ? <p key={index} className="flex gap-2"><span className="text-prism-accent">▸</span><span>{parts}</span></p> : <p key={index}>{parts}</p>;
  });
}

export default function PrismPage() {
  const { lang, scopedTrades } = useBook();
  const en = lang === "en";
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, busy]);

  const ask = async (question) => {
    const content = question.trim();
    if (!content || busy) return;
    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const response = await fetch("/api/prism", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next, lang }) });
      const json = await response.json().catch(() => ({}));
      const reply = json.reply || (json.error === "subscription_required" ? (en ? "PRISM is available with an active subscription." : "PRISM est disponible avec un abonnement actif.") : json.error) || (en ? "PRISM is unavailable." : "PRISM est indisponible.");
      setMessages([...next, { role: "assistant", content: reply, error: !json.reply }]);
    } catch {
      setMessages([...next, { role: "assistant", content: en ? "Network error, try again." : "Erreur réseau, réessaie.", error: true }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-full flex-col px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-[860px] flex-1 flex-col">
        <p className="term-eyebrow">06 / PRISM · AI COACH</p>
        <h1 className="term-title mt-2 text-4xl sm:text-5xl">{en ? "Ask your journal" : "Interroge ton journal"}</h1>
        <p className="mt-3 max-w-lg text-xs leading-5 text-prism-muted">
          {en ? `PRISM reads your ${scopedTrades.length} logged trades and answers with your own numbers. It analyses past behaviour — never signals.` : `PRISM lit tes ${scopedTrades.length} trades loggés et te répond avec tes propres chiffres. Il analyse ton comportement passé — jamais de signaux.`}
        </p>

        <div className="term-panel mt-6 flex flex-1 flex-col p-4 sm:p-5">
          <div className="min-h-[320px] flex-1 space-y-4 overflow-y-auto">
            {!messages.length && (
              <div className="grid place-items-center py-10 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-md bg-prism-accent text-black shadow-[0_0_40px_-6px_rgba(198,244,50,.7)]"><Sparkles className="h-7 w-7" /></span>
                <p className="term-title mt-4 text-xl">PRISM</p>
                <div className="mt-6 flex max-w-xl flex-wrap justify-center gap-2">
                  {SUGGESTIONS[en ? "en" : "fr"].map((suggestion) => <button key={suggestion} type="button" onClick={() => ask(suggestion)} className="rounded-md border border-prism-line px-3 py-2 text-xs text-prism-muted transition hover:border-prism-accent hover:text-prism-text">{suggestion}</button>)}
                </div>
              </div>
            )}
            {messages.map((message, index) => message.role === "user" ? (
              <div key={index} className="flex justify-end"><p className="max-w-[85%] rounded-md bg-prism-accent px-3.5 py-2.5 text-sm font-medium text-black">{message.content}</p></div>
            ) : (
              <div key={index} className="flex gap-3">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border border-prism-accent/50 text-prism-accent"><Sparkles className="h-3.5 w-3.5" /></span>
                <div className={`max-w-[88%] space-y-1 text-sm leading-6 ${message.error ? "text-prism-loss" : "text-prism-muted"}`}><RichText text={message.content} /></div>
              </div>
            ))}
            {busy && <div className="flex items-center gap-3 text-xs text-prism-muted"><span className="grid h-7 w-7 place-items-center rounded-md border border-prism-accent/50 text-prism-accent"><Sparkles className="h-3.5 w-3.5 animate-pulse" /></span>{en ? "Reading your trades…" : "Lecture de tes trades…"}</div>}
            <div ref={endRef} />
          </div>
          <form onSubmit={(event) => { event.preventDefault(); ask(input); }} className="mt-4 flex gap-2 border-t border-prism-line pt-4">
            <input value={input} onChange={(event) => setInput(event.target.value)} maxLength={2000} placeholder={en ? "Ask PRISM about your trading…" : "Pose ta question à PRISM…"} className="h-11 flex-1 rounded-md border border-prism-line bg-prism-surface px-3 text-sm text-prism-text outline-none focus:border-prism-accent" />
            <button type="submit" disabled={busy || !input.trim()} className="grid h-11 w-11 place-items-center rounded-md bg-prism-accent text-black transition disabled:opacity-40" aria-label="send"><ArrowUp className="h-5 w-5" /></button>
          </form>
        </div>
      </div>
    </main>
  );
}
