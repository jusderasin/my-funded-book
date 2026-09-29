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

-- 003 - Suppression de trade verifiable et compatible avec le classement.
-- Sans politique DELETE explicite, RLS peut renvoyer une suppression vide.
-- Le front ne masque plus la ligne sans confirmation de la base.
alter table public.trades
  add column if not exists screenshot_url_2 text;

alter table public.trades enable row level security;

drop policy if exists "trades_delete_own" on public.trades;
create policy "trades_delete_own"
  on public.trades
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Diagnostic apres execution (lecture seule) : liste exacte des trades qui
-- alimentent le classement mensuel, sans cache navigateur.
-- select id, user_id, date, pnl, r, outcome, screenshot_url is not null as has_capture_1,
--        screenshot_url_2 is not null as has_capture_2
-- from public.trades
-- where date >= date_trunc('month', current_date)::date
-- order by user_id, date desc;

-- 004 — Journal V3 : détails d'exécution d'un trade.
-- Une seule colonne JSONB (heures, prix, taille, profit prévu, swing, note,
-- émotions maîtrisées). Ajout seulement, aucune donnée existante modifiée.
-- Tant qu'elle n'existe pas, la page Journal masque ces champs.
alter table public.trades
  add column if not exists execution jsonb not null default '{}'::jsonb;

-- 005 — Comptes prop : progression existante + règle de consistance.
-- JSONB : existing_profit, winning_days, best_day, consistency, consistency_phase.
-- Ajout seulement. Sans cette colonne, le wizard masque l'option
-- "J'ai déjà de la progression" et la consistance vient des préréglages.
alter table public.accounts
  add column if not exists progress jsonb not null default '{}'::jsonb;

-- 007 - Valeurs rapides TP / SL / BE personnalisables par profil.
-- Le Journal utilise localStorage tant que cette colonne n'est pas disponible.
alter table public.profiles
  add column if not exists quick_r jsonb not null default '{"TP": 2, "SL": -1, "BE": 0}'::jsonb;
