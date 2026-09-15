-- Active Signal Lime comme thème persistant autorisé par la base.
-- À exécuter une fois dans Supabase > SQL Editor.

alter table public.profiles drop constraint if exists profiles_theme_check;

alter table public.profiles
  add constraint profiles_theme_check
  check (theme is null or theme in ('signal', 'blue', 'dark', 'oled', 'darker', 'cyberpunk', 'prism', 'nova'));

-- Le nouveau défaut produit est Signal. Les profils qui avaient l'ancien
-- thème par défaut basculent immédiatement, sans écraser un choix bleu explicite.
update public.profiles
set theme = 'signal'
where theme is null or theme in ('nova', 'dark', 'oled', 'darker', 'cyberpunk', 'prism');
