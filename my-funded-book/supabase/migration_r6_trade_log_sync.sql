-- Formulaire de trade complet + synchronisation de données entre appareils.
-- À exécuter une fois dans Supabase > SQL Editor.

alter table public.trades
  add column if not exists strategy_checks text[] not null default '{}',
  add column if not exists account_id uuid references public.accounts(id) on delete set null,
  add column if not exists emotion text,
  add column if not exists outcome text,
  add column if not exists screenshot_url_2 text,
  add column if not exists psychology jsonb not null default '{}'::jsonb;

create index if not exists trades_account_id_idx on public.trades(account_id);
