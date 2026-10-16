-- R13 — Jetons d'API personnels (connecteur MCP pour Claude & co).
-- Seul le hash SHA-256 du jeton est stocké ; le jeton en clair n'est montré qu'une fois.
create table if not exists public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null default 'Claude',
  token_hash text not null unique,
  token_prefix text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists api_tokens_user_id_idx on public.api_tokens(user_id);

alter table public.api_tokens enable row level security;

-- Le user voit et révoque ses jetons ; la création passe par /api/tokens (hash serveur).
drop policy if exists "api_tokens_select_own" on public.api_tokens;
create policy "api_tokens_select_own" on public.api_tokens for select using (auth.uid() = user_id);
drop policy if exists "api_tokens_insert_own" on public.api_tokens;
create policy "api_tokens_insert_own" on public.api_tokens for insert with check (auth.uid() = user_id);
drop policy if exists "api_tokens_delete_own" on public.api_tokens;
create policy "api_tokens_delete_own" on public.api_tokens for delete using (auth.uid() = user_id);
