"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Check, Palette, X, ClipboardCopy, Cpu, Download, KeyRound, Network, Plug, Settings2, Trash2 } from "lucide-react";
import { useBook } from "@/components/BookProvider";
import Link from "next/link";
import TradeGalaxy from "@/components/TradeGalaxy";
import AgentAvatar, { HAIR_STYLES } from "@/components/AgentAvatar";
import { AGENTS, AGENT_IDS, agentBriefing } from "@/lib/prismAgents";
import { buildSystemPrompt, summarize } from "@/lib/prismPrompt";
import { PROVIDERS, callProvider, loadAiConfig, saveAiConfig } from "@/lib/aiProviders";
import { buildObsidianVault, downloadBlob } from "@/lib/obsidianExport";

const TEAM_KEY = "mtb.prism.team";

function loadTeam() {
  try { return JSON.parse(localStorage.getItem(TEAM_KEY) || "{}"); } catch { return {}; }
}

// Rendu minimal du markdown renvoyé par le modèle : gras, titres, puces — sans HTML injecté.
function RichText({ text }) {
  return text.split("\n").map((line, index) => {
    if (!line.trim()) return <div key={index} className="h-2" />;
    const heading = /^#{1,4}\s+/.test(line);
    const bullet = /^\s*([-*•]|\d+\.)\s+/.test(line);
    const clean = line.replace(/^#{1,4}\s+/, "").replace(/^\s*[-*•]\s+/, "");
    const parts = clean.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) => part.startsWith("**") && part.endsWith("**") ? <b key={partIndex} className="text-prism-text">{part.slice(2, -2)}</b> : part);
    if (heading) return <p key={index} className="term-title pt-1 text-base text-prism-text">{parts}</p>;
    return bullet ? <p key={index} className="flex gap-2"><span className="text-prism-accent">▸</span><span>{parts}</span></p> : <p key={index}>{parts}</p>;
  });
}

export default function PrismPage() {
  const { lang, scopedTrades, missedTrades = [], accounts = [], certificates = [] } = useBook();
  const en = lang === "en";
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [config, setConfig] = useState({ provider: "prism" });
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const [agent, setAgent] = useState("coach");
  const [custom, setCustom] = useState({});
  const [editing, setEditing] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    setConfig(loadAiConfig());
    setCustom(loadTeam());
    const wanted = new URLSearchParams(window.location.search).get("agent");
    if (AGENT_IDS.includes(wanted)) setAgent(wanted);
    // /prism?q=… (rapport hebdo) : pré-remplit la question.
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setInput(q.slice(0, 2000));
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, busy]);

  const provider = PROVIDERS[config.provider] || PROVIDERS.prism;
  const team = Object.fromEntries(AGENT_IDS.map((id) => [id, { ...AGENTS[id], name: custom[id]?.name || AGENTS[id].name, look: { ...AGENTS[id].look, ...custom[id]?.look } }]));
  const current = team[agent];
  const updateMember = (id, patch) => setCustom((value) => {
    const next = { ...value, [id]: { ...value[id], ...patch, look: { ...value[id]?.look, ...patch.look } } };
    try { localStorage.setItem(TEAM_KEY, JSON.stringify(next)); } catch {}
    return next;
  });
  const updateConfig = (patch) => setConfig((current) => { const next = { ...current, ...patch }; saveAiConfig(next); return next; });

  const ask = async (question) => {
    const content = question.trim();
    if (!content || busy) return;
    const next = [...messages, { role: "user", content, agent }];
    setMessages(next);
    setInput("");
    setBusy(true);
    const history = next.filter((message) => !message.error).map(({ role, content: text }) => ({ role, content: text })).slice(-12);
    try {
      let reply;
      if (config.provider === "prism") {
        const response = await fetch("/api/prism", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history, lang, agent }) });
        const json = await response.json().catch(() => ({}));
        if (!json.reply) throw new Error(json.error === "subscription_required" ? (en ? "PRISM is available with an active subscription." : "PRISM est disponible avec un abonnement actif.") : json.error || (en ? "PRISM is unavailable." : "PRISM est indisponible."));
        reply = json.reply;
      } else {
        if (provider.needsKey && !config.key) throw new Error(en ? "Add your API key in the AI settings." : "Ajoute ta clé API dans les réglages IA.");
        reply = await callProvider(config, buildSystemPrompt([...scopedTrades, ...missedTrades], lang, { agent, accounts, certificates }), history);
      }
      setMessages([...next, { role: "assistant", content: reply || "…", via: provider.label, agent }]);
    } catch (error) {
      const message = String(error?.message || error);
      const hint = provider.local && /fetch|network|cors/i.test(message)
        ? (en ? " — is the local server running and allowing this site (OLLAMA_ORIGINS=*)?" : " — le serveur local tourne-t-il et autorise-t-il ce site (OLLAMA_ORIGINS=*) ?")
        : "";
      setMessages([...next, { role: "assistant", content: `${message}${hint}`, error: true, agent }]);
    } finally {
      setBusy(false);
    }
  };

  const copyForAi = async () => {
    const text = [
      en ? "Here is my trading journal from MyTradeBook. Analyse it like a performance coach (process, not signals)." : "Voici mon journal de trading MyTradeBook. Analyse-le comme un coach de performance (process, pas de signaux).",
      "```json", JSON.stringify(summarize(scopedTrades), null, 1), "```",
    ].join("\n");
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  };

  return (
    <main className="relative min-h-full px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto w-full max-w-[1180px]">
        <div className="grid items-end gap-6 lg:grid-cols-[1fr_420px]">
          <div>
            <p className="term-eyebrow">07 / PRISM · AI TEAM</p>
            <h1 className="term-title mt-2 text-4xl sm:text-6xl">{en ? "Your PRISM team" : "Ton équipe PRISM"}</h1>
            <p className="mt-3 max-w-lg text-xs leading-5 text-prism-muted">
              {en ? `Five specialists read your ${scopedTrades.length} logged trades and your prop accounts, and answer with your own numbers. Plug in your own AI — Claude, OpenAI or a local model — in one click. It analyses past behaviour, never signals.` : `Cinq spécialistes lisent tes ${scopedTrades.length} trades et tes comptes prop, et te répondent avec tes propres chiffres. Branche ta propre IA — Claude, OpenAI ou un modèle local — en un clic. Il analyse ton comportement passé, jamais de signaux.`}
            </p>
          </div>
          <div className="term-panel hidden overflow-hidden lg:block"><TradeGalaxy trades={scopedTrades} lang={lang} className="h-[260px]" /></div>
        </div>

        <div className="-mx-4 mt-6 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0">
          {AGENT_IDS.map((id) => {
            const member = team[id];
            const selected = id === agent;
            return (
              <div key={id} className={`term-panel group relative w-[200px] shrink-0 snap-start p-3 text-left transition sm:w-auto ${selected ? "border-prism-accent/70 bg-prism-accent/[.06]" : ""}`}>
                <button type="button" onClick={() => setAgent(id)} className="flex w-full items-center gap-3 text-left">
                  <AgentAvatar look={member.look} size={52} active={selected} />
                  <span className="min-w-0">
                    <b className="term-title block truncate text-base">{member.name}</b>
                    <span className="block truncate text-[10px] font-bold uppercase tracking-[.1em] text-prism-accent">{member.role[en ? "en" : "fr"]}</span>
                  </span>
                </button>
                <p className="mt-2 line-clamp-2 min-h-[2rem] text-[10px] leading-4 text-prism-muted">{agentBriefing(id, { trades: scopedTrades, accounts, certificates, lang })}</p>
                <button type="button" onClick={() => setEditing(id)} className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded text-prism-muted2 opacity-60 transition hover:text-prism-accent group-hover:opacity-100" aria-label={en ? "Customise" : "Personnaliser"}><Palette className="h-3.5 w-3.5" /></button>
              </div>
            );
          })}
        </div>

        {editing && (
          <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4" onClick={() => setEditing(null)}>
            <div className="w-full max-w-md rounded-md border border-prism-line bg-prism-panel p-5" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between"><p className="term-title text-lg">{en ? "Customise" : "Personnaliser"} · {team[editing].role[en ? "en" : "fr"]}</p><button type="button" onClick={() => setEditing(null)} aria-label="close"><X className="h-4 w-4 text-prism-muted" /></button></div>
              <div className="mt-4 flex gap-4">
                <div className="grid h-28 w-28 shrink-0 place-items-center rounded-md border border-prism-line bg-prism-surface"><AgentAvatar look={team[editing].look} size={96} active /></div>
                <div className="flex-1 space-y-2.5 text-[10px] font-bold uppercase tracking-[.12em] text-prism-muted2">
                  <label className="block">{en ? "Name" : "Nom"}<input value={team[editing].name} maxLength={18} onChange={(event) => updateMember(editing, { name: event.target.value })} className="mt-1 h-9 w-full rounded-md border border-prism-line bg-prism-surface px-2.5 text-sm normal-case tracking-normal text-prism-text outline-none focus:border-prism-accent" /></label>
                  <label className="block">{en ? "Hairstyle" : "Coiffure"}<select value={team[editing].look.style} onChange={(event) => updateMember(editing, { look: { style: event.target.value } })} className="mt-1 h-9 w-full rounded-md border border-prism-line bg-prism-surface px-2 text-sm normal-case tracking-normal text-prism-text">{HAIR_STYLES.map((style) => <option key={style} value={style}>{style}</option>)}</select></label>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-prism-muted2">
                {[["skin", en ? "Skin" : "Peau"], ["hair", en ? "Hair" : "Cheveux"], ["outfit", en ? "Outfit" : "Tenue"]].map(([key, label]) => (
                  <label key={key} className="block">{label}<input type="color" value={team[editing].look[key]} onChange={(event) => updateMember(editing, { look: { [key]: event.target.value } })} className="mt-1 h-9 w-full cursor-pointer rounded-md border border-prism-line bg-prism-surface" /></label>
                ))}
              </div>
              <label className="mt-3 flex items-center gap-2 text-xs text-prism-muted"><input type="checkbox" checked={!!team[editing].look.glasses} onChange={(event) => updateMember(editing, { look: { glasses: event.target.checked } })} className="accent-[#c6f432]" />{en ? "Glasses" : "Lunettes"}</label>
              <p className="mt-3 text-[10px] text-prism-muted2">{en ? "Saved on this device." : "Enregistré sur cet appareil."}</p>
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="term-panel flex min-h-[520px] flex-col p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2 border-b border-prism-line pb-3">
              <span className="inline-flex min-w-0 items-center gap-2 text-[11px] text-prism-muted"><span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-prism-accent shadow-[0_0_10px_rgba(198,244,50,.9)]" /><span className="truncate"><b className="text-prism-text">{current.name}</b> · {current.role[en ? "en" : "fr"]} · {provider.label}{config.provider !== "prism" && ` · ${config.model || provider.defaultModel}`}</span></span>
              <div className="flex gap-1.5">
                {messages.length > 0 && <button type="button" onClick={() => setMessages([])} className="grid h-8 w-8 place-items-center rounded-md border border-prism-line text-prism-muted hover:text-prism-text" aria-label={en ? "Clear" : "Effacer"}><Trash2 className="h-3.5 w-3.5" /></button>}
                <button type="button" onClick={() => setShowSettings((value) => !value)} className="grid h-8 w-8 place-items-center rounded-md border border-prism-line text-prism-muted hover:text-prism-accent lg:hidden" aria-label="AI settings"><Settings2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <div className="max-h-[60vh] min-h-[320px] flex-1 space-y-4 overflow-y-auto pr-1">
              {!messages.length && (
                <div className="grid place-items-center py-8 text-center">
                  <AgentAvatar look={current.look} size={96} active />
                  <p className="term-title mt-3 text-xl">{current.name}</p>
                  <p className="mt-1 max-w-sm text-xs text-prism-muted">{current.blurb[en ? "en" : "fr"]}</p>
                  <div className="mt-6 flex max-w-xl flex-wrap justify-center gap-2">
                    {current.suggestions[en ? "en" : "fr"].map((suggestion) => <button key={suggestion} type="button" onClick={() => ask(suggestion)} className="rounded-md border border-prism-line px-3 py-2 text-xs text-prism-muted transition hover:-translate-y-0.5 hover:border-prism-accent hover:text-prism-text">{suggestion}</button>)}
                  </div>
                </div>
              )}
              {messages.map((message, index) => message.role === "user" ? (
                <div key={index} className="flex justify-end"><p className="max-w-[85%] rounded-md bg-prism-accent px-3.5 py-2.5 text-sm font-medium text-black">{message.content}</p></div>
              ) : (
                <div key={index} className="flex gap-3">
                  <span className="mt-0.5 shrink-0" title={team[message.agent || "coach"].name}><AgentAvatar look={team[message.agent || "coach"].look} size={32} idle={false} /></span>
                  <div className={`min-w-0 max-w-[88%] space-y-1 break-words text-sm leading-6 ${message.error ? "text-prism-loss" : "text-prism-muted"}`}><RichText text={message.content} /></div>
                </div>
              ))}
              {busy && <div className="flex items-center gap-3 text-xs text-prism-muted"><AgentAvatar look={current.look} size={32} />{current.name} {en ? "is reading your data…" : "lit tes données…"}</div>}
              <div ref={endRef} />
            </div>
            <form onSubmit={(event) => { event.preventDefault(); ask(input); }} className="mt-4 flex gap-2 border-t border-prism-line pt-4">
              <input value={input} onChange={(event) => setInput(event.target.value)} maxLength={2000} placeholder={en ? `Ask ${current.name}…` : `Pose ta question à ${current.name}…`} className="h-11 min-w-0 flex-1 rounded-md border border-prism-line bg-prism-surface px-3 text-base text-prism-text outline-none focus:border-prism-accent sm:text-sm" />
              <button type="submit" disabled={busy || !input.trim()} className="fx-shine grid h-11 w-11 shrink-0 place-items-center rounded-md bg-prism-accent text-black transition disabled:opacity-40" aria-label="send"><ArrowUp className="h-5 w-5" /></button>
            </form>
          </div>

          <aside className={`space-y-4 ${showSettings ? "" : "hidden lg:block"}`}>
            <div className="term-panel p-4">
              <p className="term-title flex items-center gap-2 text-sm"><Cpu className="h-4 w-4 text-prism-accent" />{en ? "Your AI" : "Ton IA"}</p>
              <div className="mt-3 grid gap-1.5">
                {Object.entries(PROVIDERS).map(([id, meta]) => (
                  <button key={id} type="button" onClick={() => updateConfig({ provider: id, model: "", url: "" })} className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-xs transition ${config.provider === id ? "border-prism-accent bg-prism-accent/10 text-prism-text" : "border-prism-line text-prism-muted hover:border-prism-line2 hover:text-prism-text"}`}>
                    <span>{meta.label}</span>{config.provider === id && <Check className="h-3.5 w-3.5 text-prism-accent" />}
                  </button>
                ))}
              </div>
              {config.provider !== "prism" && (
                <div className="mt-4 space-y-2.5">
                  {(provider.needsKey || provider.optionalKey) && (
                    <label className="block text-[10px] font-bold uppercase tracking-[.12em] text-prism-muted2">
                      <span className="flex items-center gap-1"><KeyRound className="h-3 w-3" />{en ? "API key" : "Clé API"}{provider.optionalKey && ` (${en ? "optional" : "optionnelle"})`}</span>
                      <input type="password" autoComplete="off" value={config.key || ""} onChange={(event) => updateConfig({ key: event.target.value.trim() })} placeholder={provider.keyHint || ""} className="mt-1 h-9 w-full rounded-md border border-prism-line bg-prism-surface px-2.5 font-mono text-xs text-prism-text outline-none focus:border-prism-accent" />
                    </label>
                  )}
                  {provider.local && (
                    <label className="block text-[10px] font-bold uppercase tracking-[.12em] text-prism-muted2">URL
                      <input value={config.url || ""} onChange={(event) => updateConfig({ url: event.target.value.trim() })} placeholder={provider.defaultUrl} className="mt-1 h-9 w-full rounded-md border border-prism-line bg-prism-surface px-2.5 font-mono text-xs text-prism-text outline-none focus:border-prism-accent" />
                    </label>
                  )}
                  <label className="block text-[10px] font-bold uppercase tracking-[.12em] text-prism-muted2">{en ? "Model" : "Modèle"}
                    <input value={config.model || ""} onChange={(event) => updateConfig({ model: event.target.value.trim() })} placeholder={provider.defaultModel} className="mt-1 h-9 w-full rounded-md border border-prism-line bg-prism-surface px-2.5 font-mono text-xs text-prism-text outline-none focus:border-prism-accent" />
                  </label>
                  <p className="text-[10px] leading-4 text-prism-muted2">
                    {provider.local
                      ? (en ? "Runs on your computer. For Ollama, start it with OLLAMA_ORIGINS=* so this site can reach it." : "Tourne sur ton ordinateur. Pour Ollama, lance-le avec OLLAMA_ORIGINS=* pour que ce site puisse le joindre.")
                      : (en ? "Your key stays in this browser and is sent only to the provider, never to MyTradeBook. Usage is billed on your own account." : "Ta clé reste dans ce navigateur et part uniquement chez le fournisseur, jamais chez MyTradeBook. L'usage est facturé sur ton propre compte.")}
                    {provider.keyUrl && <> <a href={provider.keyUrl} target="_blank" rel="noreferrer" className="text-prism-accent hover:underline">{en ? "Get a key" : "Obtenir une clé"} ↗</a></>}
                  </p>
                </div>
              )}
            </div>

            <div className="term-panel p-4">
              <p className="term-title flex items-center gap-2 text-sm"><Network className="h-4 w-4 text-prism-accent" />{en ? "Connections" : "Connexions"}</p>
              <button type="button" onClick={() => downloadBlob(buildObsidianVault(scopedTrades, lang), `MyTradeBook-Obsidian-${new Date().toISOString().slice(0, 10)}.zip`)} disabled={!scopedTrades.length} className="fx-shine mt-3 flex w-full items-center gap-3 rounded-md border border-prism-line px-3 py-2.5 text-left text-xs transition hover:border-prism-accent disabled:opacity-40">
                <Download className="h-4 w-4 shrink-0 text-prism-accent" />
                <span><b className="block text-prism-text">{en ? "Export to Obsidian" : "Exporter vers Obsidian"}</b><span className="text-[10px] text-prism-muted">{en ? "Linked notes per day and setup — open the graph view." : "Notes liées par jour et par setup — ouvre la vue graphe."}</span></span>
              </button>
              <button type="button" onClick={copyForAi} disabled={!scopedTrades.length} className="fx-shine mt-2 flex w-full items-center gap-3 rounded-md border border-prism-line px-3 py-2.5 text-left text-xs transition hover:border-prism-accent disabled:opacity-40">
                {copied ? <Check className="h-4 w-4 shrink-0 text-prism-accent" /> : <ClipboardCopy className="h-4 w-4 shrink-0 text-prism-accent" />}
                <span><b className="block text-prism-text">{copied ? (en ? "Copied!" : "Copié !") : (en ? "Copy for Claude / ChatGPT" : "Copier pour Claude / ChatGPT")}</b><span className="text-[10px] text-prism-muted">{en ? "Your journal summary, ready to paste into any AI." : "Le résumé de ton journal, prêt à coller dans n'importe quelle IA."}</span></span>
              </button>
              <details className="mt-2 rounded-md border border-prism-line px-3 py-2.5 text-xs">
                <summary className="flex cursor-pointer list-none items-center gap-3">
                  <Plug className="h-4 w-4 shrink-0 text-prism-accent" />
                  <span><b className="block text-prism-text">{en ? "Connect your own Claude" : "Connecter ton propre Claude"}</b><span className="text-[10px] text-prism-muted">{en ? "Claude reads your journal, logs and annotates trades." : "Claude lit ton journal, enregistre et annote tes trades."}</span></span>
                </summary>
                <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[10px] leading-4 text-prism-muted">
                  <li>{en ? "Create a token in " : "Crée un jeton dans "}<Link href="/settings" className="text-prism-accent hover:underline">{en ? "Settings → Connectors" : "Réglages → Connecteurs"}</Link>{en ? " (shown once)." : " (affiché une seule fois)."}</li>
                  <li>{en ? "In Claude: Settings → Connectors → Add custom connector." : "Dans Claude : Paramètres → Connecteurs → Ajouter un connecteur personnalisé."}</li>
                  <li>{en ? "URL: " : "URL : "}<code className="break-all font-mono text-prism-text">{typeof window === "undefined" ? "/api/mcp" : `${window.location.origin}/api/mcp`}</code>{en ? " — header Authorization: Bearer <your token>." : " — en-tête Authorization: Bearer <ton jeton>."}</li>
                  <li>{en ? "Claude Desktop (config file): use npx mcp-remote <URL> --header \"Authorization: Bearer <token>\"." : "Claude Desktop (fichier de config) : utilise npx mcp-remote <URL> --header \"Authorization: Bearer <jeton>\"."}</li>
                  <li>{en ? "Then ask: “log this trade: MNQ long NY AM, +2R, $180” or “add notes to yesterday's trades”." : "Puis demande : « enregistre ce trade : MNQ long NY AM, +2R, 180 $ » ou « ajoute des notes aux trades d'hier »."}</li>
                </ol>
              </details>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
