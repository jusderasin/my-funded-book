"use client";

export const LANGS = ["fr", "en"];

export const DICT = {
  nav_dashboard:    { fr: "Tableau de bord", en: "Dashboard" },
  nav_accounts:     { fr: "Comptes",         en: "Accounts" },
  nav_journal:      { fr: "Journal",         en: "Journal" },
  nav_review:       { fr: "Review",          en: "Review" },
  nav_playbook:     { fr: "Playbook",        en: "Playbook" },
  nav_breakdown:    { fr: "Analyse",         en: "Breakdown" },
  nav_certificates: { fr: "Certificats",     en: "Certificates" },
  nav_expenses:     { fr: "Dépenses",        en: "Expenses" },

  settings_title:   { fr: "Réglages",              en: "Settings" },
  settings_name:    { fr: "Nom affiché",           en: "Display name" },
  settings_pin:     { fr: "Code PIN (verrou rapide)", en: "PIN code (quick lock)" },
  settings_lang:    { fr: "Langue / Language",     en: "Langue / Language" },
  settings_save:    { fr: "Enregistrer",           en: "Save" },
  settings_export:  { fr: "Export CSV",            en: "Export CSV" },

  lock:      { fr: "Verrouiller", en: "Lock" },
  signout:   { fr: "Déconnexion", en: "Sign out" },
  settings:  { fr: "Réglages",    en: "Settings" },
};

export function translate(lang, key) {
  const entry = DICT[key];
  if (!entry) return key;
  return entry[lang] || entry.fr || key;
}
