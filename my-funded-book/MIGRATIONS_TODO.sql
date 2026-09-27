-- 001 — Classement toujours calculé sur les trades réellement présents.
-- À exécuter dans Supabase SQL Editor. Cette migration ne supprime aucune
-- donnée : elle remplace uniquement la fonction de lecture du classement.
-- Les DELETE sur public.trades disparaissent donc instantanément du classement
-- de tous les utilisateurs, sans cache applicatif.

alter table public.profiles
  add column if not exists leaderboard_opt_in boolean not null default false;

-- PostgreSQL ne permet pas de modifier les colonnes RETURNS TABLE d'une
-- fonction existante. La fonction est uniquement une vue de lecture utilisée
-- par l'écran Classement : on peut donc la remplacer sans toucher aux trades.
drop function if exists public.get_leaderboard(text);

create or replace function public.get_leaderboard(p_period text default 'month')
returns table (
  user_id uuid,
  name text,
  n_trades bigint,
  win_rate numeric,
  total_r numeric,
  total_pnl numeric
)
language sql
security definer
set search_path = public
as $$
  with bounds as (
    select case p_period
      when 'week' then date_trunc('week', current_date)::date
      when 'year' then date_trunc('year', current_date)::date
      else date_trunc('month', current_date)::date
    end as from_date
  ), eligible as (
    select
      t.user_id,
      count(*) as n_trades,
      count(*) filter (where coalesce(t.pnl, 0) > 0)::numeric * 100 / nullif(count(*), 0) as win_rate,
      coalesce(sum(case when t.outcome = 'BE' then 0 else coalesce(t.r, 0) end), 0) as total_r,
      coalesce(sum(case when t.outcome = 'BE' then 0 else coalesce(t.pnl, 0) end), 0) as total_pnl
    from public.trades t
    cross join bounds b
    where t.date >= b.from_date
      and (t.screenshot_url is not null or t.screenshot_url_2 is not null)
    group by t.user_id
    having count(*) >= 3
  )
  select e.user_id, p.name, e.n_trades, e.win_rate, e.total_r, e.total_pnl
  from eligible e
  join public.profiles p on p.id = e.user_id
  where p.leaderboard_opt_in is true
  order by e.total_r desc, e.total_pnl desc, e.n_trades desc;
$$;

revoke all on function public.get_leaderboard(text) from public;
grant execute on function public.get_leaderboard(text) to authenticated;

-- 002 — Seuil BE prévu pour le réglage Trading de la V2.
-- Valeur 0 = seul un résultat "BE" explicite est classé break-even.
alter table public.profiles
  add column if not exists be_threshold numeric not null default 0;
