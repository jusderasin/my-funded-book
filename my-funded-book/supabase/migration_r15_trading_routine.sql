-- Routine hebdomadaire : type de compte autorisé par jour + exceptions datées.
-- { "days": { "1": { "kind": "challenge", "note": "" } }, "exceptions": { "2026-11-06": { "kind": "off", "note": "NFP" } } }
-- À exécuter une fois dans Supabase > SQL Editor.

alter table public.profiles
  add column if not exists trading_routine jsonb not null default '{}'::jsonb;
