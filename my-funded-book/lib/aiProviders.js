// Connecteurs « apporte ton IA » pour PRISM. Les appels partent directement du
// navigateur vers le fournisseur choisi : la clé reste sur l'appareil de
// l'utilisateur (localStorage) et ne transite jamais par nos serveurs.

export const PROVIDERS = {
  prism: { label: "PRISM (Groq) — inclus", needsKey: false },
  anthropic: { label: "Claude (Anthropic)", needsKey: true, defaultModel: "claude-sonnet-5-5", keyHint: "sk-ant-…", keyUrl: "https://console.anthropic.com/settings/keys" },
  openai: { label: "OpenAI", needsKey: true, defaultModel: "gpt-4o-mini", keyHint: "sk-…", keyUrl: "https://platform.openai.com/api-keys" },
  ollama: { label: "Ollama (local)", needsKey: false, local: true, defaultModel: "llama3.1", defaultUrl: "http://localhost:11434" },
  compatible: { label: "LM Studio / compatible OpenAI", needsKey: false, optionalKey: true, local: true, defaultModel: "local-model", defaultUrl: "http://localhost:1234/v1" },
};

const STORAGE_KEY = "mtb.prism.ai";

export function loadAiConfig() {
  try { return { provider: "prism", ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; } catch { return { provider: "prism" }; }
}

export function saveAiConfig(config) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch {}
}

async function readError(response) {
  const text = await response.text().catch(() => "");
  try { const json = JSON.parse(text); return json.error?.message || json.error || text; } catch { return text || `HTTP ${response.status}`; }
}

export async function callProvider(config, system, messages) {
  const meta = PROVIDERS[config.provider];
  const model = config.model || meta.defaultModel;
  const base = String(config.url || meta.defaultUrl || "").replace(/\/+$/, "");

  if (config.provider === "anthropic") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": config.key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model, max_tokens: 1200, system, messages }),
    });
    if (!response.ok) throw new Error(await readError(response));
    const json = await response.json();
    return json.content?.filter((block) => block.type === "text").map((block) => block.text).join("\n").trim();
  }

  if (config.provider === "ollama") {
    const response = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, stream: false, messages: [{ role: "system", content: system }, ...messages] }),
    });
    if (!response.ok) throw new Error(await readError(response));
    return (await response.json()).message?.content?.trim();
  }

  // OpenAI et tout serveur compatible (LM Studio, vLLM, OpenRouter…).
  const url = config.provider === "openai" ? "https://api.openai.com/v1/chat/completions" : `${base}/chat/completions`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...(config.key ? { Authorization: `Bearer ${config.key}` } : {}) },
    body: JSON.stringify({ model, temperature: 0.3, messages: [{ role: "system", content: system }, ...messages] }),
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()).choices?.[0]?.message?.content?.trim();
}
