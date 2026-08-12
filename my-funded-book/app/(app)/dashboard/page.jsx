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

  nav_label:    { fr: "Navigation",   en: "Navigation" },
  log_trade:    { fr: "Log trade",    en: "Log trade" },
  welcome:      { fr: "Bienvenue",    en: "Welcome" },
  unlock_title: { fr: "Content de te revoir", en: "Welcome back" },
  unlock_hint:  { fr: "Entre ton code PIN pour déverrouiller.", en: "Enter your PIN to unlock." },
  unlock_btn:   { fr: "Déverrouiller", en: "Unlock" },

  kpi_net:        { fr: "P&L net",        en: "Net P&L" },
  kpi_trade_wr:   { fr: "% trades gagnants", en: "Trade win %" },
  kpi_pf:         { fr: "Profit factor",  en: "Profit factor" },
  kpi_day_wr:     { fr: "% jours gagnants", en: "Day win %" },
  kpi_avg_wl:     { fr: "Gain/perte moy.", en: "Avg win/loss" },

  streak_plan:    { fr: "série plan respecté", en: "plan-followed streak" },
  streak_days:    { fr: "jour(s) de trading",  en: "trading day(s)" },
  streak_adher:   { fr: "respect du plan",      en: "plan adherence" },
  streak_green:   { fr: "jours verts",          en: "green days" },

  edge_score:     { fr: "Edge score",           en: "Edge score" },
  your_edge:      { fr: "Ton Edge Score",       en: "Your Edge Score" },
  daily_cum:      { fr: "P&L net cumulé quotidien", en: "Daily net cumulative P&L" },
  net_daily:      { fr: "P&L net quotidien",    en: "Net daily P&L" },

  recent_trades:  { fr: "Trades récents",       en: "Recent trades" },
  no_trades:      { fr: "Aucun trade encore.",  en: "No trades yet." },
  th_close_date:  { fr: "Date de clôture",      en: "Close date" },
  th_symbol:      { fr: "Instrument",           en: "Symbol" },
  th_net_pnl:     { fr: "P&L net",              en: "Net P&L" },
  balance:        { fr: "Balance",              en: "Balance" },

  account_balance:{ fr: "Balance du compte",    en: "Account balance" },
  starting_balance:{ fr: "Balance de départ",   en: "Starting balance" },
  drawdown:       { fr: "Drawdown",             en: "Drawdown" },
};

export function translate(lang, key) {
  const entry = DICT[key];
  if (!entry) return key;
  return entry[lang] || entry.fr || key;
}
