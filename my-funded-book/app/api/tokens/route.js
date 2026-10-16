import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { generateToken } from "@/lib/apiTokens";

const MAX_TOKENS = 10;

// Crée un jeton personnel. Le jeton en clair n'est renvoyé qu'ici, une seule fois.
export async function POST(request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { count } = await supabase.from("api_tokens").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if ((count || 0) >= MAX_TOKENS) return NextResponse.json({ error: "too_many_tokens" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "Claude").trim().slice(0, 60) || "Claude";
  const { token, hash, prefix } = generateToken();
  const { data, error } = await supabase.from("api_tokens")
    .insert({ user_id: user.id, name, token_hash: hash, token_prefix: prefix })
    .select("id, name, token_prefix, created_at, last_used_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ token, row: data });
}
