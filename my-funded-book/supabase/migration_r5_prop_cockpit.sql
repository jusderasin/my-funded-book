-- Prop Firm Cockpit : règles de payout par compte et historique rattaché.
-- À exécuter une seule fois dans le SQL Editor Supabase.

alter table public.accounts
  add column if not exists payout_min numeric,
  add column if not exists payout_cycle_days integer,
  add column if not exists min_trading_days integer;

alter table public.certificates
  add column if not exists account_id uuid references public.accounts(id) on delete set null;

create index if not exists certificates_account_id_idx
  on public.certificates(account_id);
