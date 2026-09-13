-- Lier une session de backtest a une strategie existante.
alter table public.bt_sessions
  add column if not exists setup text;
