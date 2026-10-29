-- Autorise les nouveaux thèmes du site (Noir & rouge, Blanc & rouge, etc.).
-- À exécuter une fois dans Supabase > SQL Editor.

alter table public.profiles drop constraint if exists profiles_theme_check;

alter table public.profiles
  add constraint profiles_theme_check
  check (theme is null or theme in (
    'signal', 'blue', 'dark', 'oled', 'darker', 'cyberpunk', 'prism', 'nova',
    'noir-rouge', 'blanc-rouge', 'sang', 'or', 'ocean', 'emeraude', 'neon',
    'matrix', 'sunset', 'arctique', 'violet', 'cuivre', 'acier'
  ));
