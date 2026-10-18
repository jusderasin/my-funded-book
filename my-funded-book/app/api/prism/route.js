import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { buildSystemPrompt } from "@/lib/prismPrompt";
import { AGENT_IDS } from "@/lib/prismAgents";

// PRISM — coach IA. Lit les trades de l'utilisateur (RLS : uniquement les siens),
// en fait un résumé chiffré, et demande au modèle Groq une réponse en clair.
// Groq retire régulièrement des modèles : on essaie une liste ordonnée et on
// passe au suivant si le modèle n'existe plus.
const MODELS = [process.env.GROQ_MODEL, "openai/gpt-oss-120b", "llama-3.3-70b-versatile", "openai/gpt-oss-20b", "llama-3.1-8b-instant"].filter(Boolean);
const MAX_TURNS = 12;

export async function POST(request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "PRISM n'est pas encore configuré (GROQ_API_KEY manquante)." }, { status: 503 });
  }
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Même règle que le paywall de l'app : seuls les abonnés actifs consomment le quota IA.
  const { data: sub } = await supabase.from("subscriptions").select("status, current_period_end").eq("user_id", user.id).maybeSingle();
  const active = sub && ["active", "trialing"].includes(sub.status) && (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
  if (!active) return NextResponse.json({ error: "subscription_required" }, { status: 402 });

  const body = await request.json().catch(() => ({}));
  const lang = body.lang === "en" ? "en" : "fr";
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((message) => ["user", "assistant"].includes(message?.role) && typeof message.content === "string")
    .slice(-MAX_TURNS)
    .map((message) => ({ role: message.role, content: message.content.slice(0, 2000) }));
  if (!messages.length || messages.at(-1).role !== "user") return NextResponse.json({ error: "empty" }, { status: 400 });

  const { data: trades, error } = await supabase.from("trades").select("*").order("date", { ascending: false }).limit(1500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Les agents Risk et Prop lisent aussi les comptes prop et les payouts (RLS).
  const agent = AGENT_IDS.includes(body.agent) ? body.agent : "coach";
  let accounts = [];
  let certificates = [];
  if (agent === "risk" || agent === "prop") {
    const [accountRes, certificateRes] = await Promise.all([
      supabase.from("accounts").select("*"),
      supabase.from("certificates").select("*"),
    ]);
    accounts = accountRes.data || [];
    certificates = certificateRes.data || [];
  }
  const system = buildSystemPrompt(trades, lang, { agent, accounts, certificates });

  let response;
  for (const model of MODELS) {
    response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, temperature: 0.3, max_tokens: 1100, messages: [{ role: "system", content: system }, ...messages] }),
    });
    if (response.ok) break;
    const detail = await response.text().catch(() => "");
    console.error("PRISM groq error", model, response.status, detail.slice(0, 300));
    if (!/model_not_found|decommissioned|does not exist/i.test(detail)) break;
  }
  if (!response.ok) {
    return NextResponse.json({ error: response.status === 429 ? "PRISM est très sollicité, réessaie dans une minute." : "PRISM est indisponible pour le moment." }, { status: 502 });
  }
  const json = await response.json();
  return NextResponse.json({ reply: json.choices?.[0]?.message?.content?.trim() || "…" });
}
