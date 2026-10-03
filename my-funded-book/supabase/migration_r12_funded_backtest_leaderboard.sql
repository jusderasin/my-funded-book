-- Funded lifecycle, Backtest and reliable public leaderboard.
-- Run once in Supabase SQL Editor for existing projects.
alter table public.accounts add column if not exists funded_at date;
alter table public.profiles add column if not exists leaderboard_opt_in boolean not null default false;
alter table public.trades add column if not exists screenshot_url_2 text;

create table if not exists public.bt_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null, setup text, created_at timestamptz not null default now()
);
create table if not exists public.bt_trades (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id uuid not null references public.bt_sessions(id) on delete cascade, date date not null default current_date,
  symbol text not null default 'NQ', direction text not null default 'long', result text not null default 'win',
  r numeric not null default 0, pnl numeric, created_at timestamptz not null default now()
);
alter table public.bt_sessions enable row level security;
alter table public.bt_trades enable row level security;
drop policy if exists "bt_sessions_own" on public.bt_sessions;
drop policy if exists "bt_trades_own" on public.bt_trades;
create policy "bt_sessions_own" on public.bt_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "bt_trades_own" on public.bt_trades for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists bt_sessions_user_created_idx on public.bt_sessions(user_id, created_at desc);
create index if not exists bt_trades_session_date_idx on public.bt_trades(session_id, date desc);

create or replace function public.get_leaderboard(p_period text default 'month')
returns table(user_id uuid, name text, n_trades bigint, win_rate numeric, total_r numeric, total_pnl numeric)
language sql security definer set search_path = public as $$
  with scoped as (
    select t.* from public.trades t where t.date >= case p_period
      when 'week' then current_date - 6 when 'year' then date_trunc('year', current_date)::date else date_trunc('month', current_date)::date end
  ), eligible as (
    select p.id, p.name from public.profiles p join scoped t on t.user_id = p.id where p.leaderboard_opt_in = true
    group by p.id, p.name having count(*) >= 3 and count(*) filter (where t.screenshot_url is not null or t.screenshot_url_2 is not null)::numeric / count(*) >= .8
  )
  select e.id, e.name, count(s.id), round(100.0 * count(*) filter (where coalesce(s.pnl, 0) > 0) / count(*), 1), round(coalesce(sum(s.r), 0), 2), round(coalesce(sum(s.pnl), 0), 2)
  from eligible e join scoped s on s.user_id = e.id group by e.id, e.name order by sum(s.r) desc, sum(s.pnl) desc, e.name asc;
$$;
grant execute on function public.get_leaderboard(text) to authenticated;
