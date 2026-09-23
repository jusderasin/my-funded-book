-- Comptes isolés : exécuter une seule fois dans Supabase > SQL Editor.
-- Corrige les schémas existants qui n'ont pas encore les colonnes du cockpit.

alter table public.accounts
  add column if not exists daily_loss_limit numeric,
  add column if not exists max_drawdown numeric,
  add column if not exists profit_target numeric,
  add column if not exists trailing_drawdown boolean default true,
  add column if not exists trailing_type text default 'intraday',
  add column if not exists trailing_lock_offset numeric default 0,
  add column if not exists payout_min numeric,
  add column if not exists payout_cycle_days integer,
  add column if not exists min_trading_days integer;

alter table public.trades
  add column if not exists account_id uuid references public.accounts(id) on delete set null;

create index if not exists trades_account_id_idx on public.trades(account_id);
