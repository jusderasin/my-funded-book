-- Préférences de navigation utilisateur : ordre et visibilité de la sidebar.
-- À exécuter une fois dans Supabase > SQL Editor.

alter table public.profiles
  add column if not exists nav_layout jsonb not null default '[]'::jsonb;
