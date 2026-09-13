-- Checklist valid\u00e9e au moment de la prise du trade.
-- \u00c0 ex\u00e9cuter une fois dans Supabase > SQL Editor pour les bases existantes.
alter table public.trades
  add column if not exists strategy_checks text[] not null default '{}';
