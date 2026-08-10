-- =====================================================================
--  MY FUNDED BOOK — Schéma PostgreSQL (Supabase)
--  À coller dans Supabase > SQL Editor > New query > Run.
--  Chaque table est protégée par RLS : un utilisateur ne voit que SES lignes.
-- =====================================================================

-- ---------- PROFILES (table "users" applicative : réglages du trader) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'trader',
  pin text not null default '1234',
  starting_balance numeric not null default 600000,
  created_at timestamptz not null default now()
);

-- ---------- SUBSCRIPTIONS (statut Stripe, écrit uniquement par le webhook) ----------
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  price_id text,
  status text not null default 'inactive',        -- active | trialing | past_due | canceled | inactive
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

-- ---------- ACCOUNTS (comptes prop firm) ----------
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  firm text not null,
  size numeric not null default 0,
  cost numeric not null default 0,
  type text not null default 'eval',              -- eval | funded
  status text not null default 'active',          -- active | passed | funded | failed | paid
  date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

-- ---------- TRADES (journal) ----------
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null default current_date,
  symbol text not null default 'MNQ',
  dir text not null default 'long',               -- long | short
  session text default 'NY AM',
  grade text default 'A+',                         -- A+ | A | B | C | F
  r numeric default 0,
  pnl numeric default 0,
  setup text,
  tags text[] default '{}',
  why text,
  plan boolean not null default true,
  screenshot_url text,
  created_at timestamptz not null default now()
);

-- ---------- REVIEWS (revue hebdo) ----------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  week_of date not null default current_date,
  worked text,
  cut text,
  focus text,
  updated_at timestamptz not null default now(),
  unique (user_id, week_of)
);

-- ---------- PLAYBOOKS (setups) ----------
create table if not exists public.playbooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  description text,
  rules text[] default '{}',
  created_at timestamptz not null default now()
);

-- ---------- CERTIFICATES (mur de certificats) ----------
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  firm text not null,
  amount numeric not null default 0,
  date date not null default current_date,
  type text not null default 'eval_passed',       -- eval_passed | payout
  note text,
  file_url text,
  created_at timestamptz not null default now()
);

-- ---------- EXPENSES (tracker de dépenses éval) ----------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  firm text not null,
  amount numeric not null default 0,
  date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

-- =====================================================================
--  ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles      enable row level security;
alter table public.subscriptions enable row level security;
alter table public.accounts      enable row level security;
alter table public.trades        enable row level security;
alter table public.reviews       enable row level security;
alter table public.playbooks     enable row level security;
alter table public.certificates  enable row level security;
alter table public.expenses      enable row level security;

-- ---- PROFILES : chaque user lit / modifie SA ligne (clé = id) ----
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---- SUBSCRIPTIONS : lecture seule pour le user ; l'écriture passe par le service_role (webhook), qui bypass la RLS ----
create policy "subs_select_own" on public.subscriptions for select using (auth.uid() = user_id);

-- ---- Tables de données : CRUD complet mais uniquement sur ses propres lignes ----
create policy "accounts_all_own" on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "trades_all_own" on public.trades
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reviews_all_own" on public.reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "playbooks_all_own" on public.playbooks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "certificates_all_own" on public.certificates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "expenses_all_own" on public.expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================================================================
--  TRIGGER : à chaque inscription, créer le profil + la ligne d'abonnement
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  insert into public.subscriptions (user_id, status)
  values (new.id, 'inactive')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---- Index utiles ----
create index if not exists idx_trades_user_date on public.trades(user_id, date);
create index if not exists idx_accounts_user on public.accounts(user_id);
create index if not exists idx_certs_user on public.certificates(user_id);
create index if not exists idx_expenses_user on public.expenses(user_id);
