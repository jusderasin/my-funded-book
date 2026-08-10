-- =====================================================================
--  MIGRATION — colonnes URL d'images R2 (à exécuter si la base existe déjà)
-- =====================================================================
alter table public.trades       add column if not exists screenshot_url text;
alter table public.certificates add column if not exists file_url text;
