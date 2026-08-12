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
  starting_balance_lbl:{ fr: "Balance de départ", en: "Starting balance" },
  drawdown:       { fr: "Drawdown",             en: "Drawdown" },
  m_edit_trade:   { fr: "Éditer le trade",  en: "Edit trade" },
  m_log_trade:    { fr: "Log trade",        en: "Log trade" },
  m_cancel:       { fr: "Annuler",          en: "Cancel" },
  m_save:         { fr: "Enregistrer",      en: "Save" },
  m_sending:      { fr: "Envoi…",           en: "Sending…" },
  m_instrument:   { fr: "Instrument",       en: "Instrument" },
  m_date:         { fr: "Date",             en: "Date" },
  m_direction:    { fr: "Sens",             en: "Direction" },
  m_session:      { fr: "Session",          en: "Session" },
  m_grade:        { fr: "Grade d'exécution", en: "Execution grade" },
  m_pnl_net:      { fr: "PnL net ($)",      en: "Net PnL ($)" },
  m_setup:        { fr: "Setup (playbook)", en: "Setup (playbook)" },
  m_none:         { fr: "— aucun —",        en: "— none —" },
  m_tags:         { fr: "Tags",             en: "Tags" },
  m_chart:        { fr: "Capture du graphique", en: "Chart screenshot" },
  m_chart_hint:   { fr: "PNG / JPG / WebP — compressé automatiquement", en: "PNG / JPG / WebP — auto-compressed" },
  m_why:          { fr: "WHY — pourquoi ce trade", en: "WHY — why this trade" },
  m_why_ph:       { fr: "Le contexte, la thèse, l'exécution, ce que tu retiens…", en: "The context, the thesis, the execution, your takeaways…" },
  m_plan_ok:      { fr: "Plan respecté ?",  en: "Plan followed?" },
  m_yes:          { fr: "Oui",              en: "Yes" },
  m_no:           { fr: "Non",              en: "No" },

  m_new_account:  { fr: "Nouveau compte",   en: "New account" },
  m_firm:         { fr: "Firme",            en: "Firm" },
  m_size:         { fr: "Taille ($)",       en: "Size ($)" },
  m_eval_cost:    { fr: "Coût éval ($)",    en: "Eval cost ($)" },
  m_free_if:      { fr: "0 si gratuit",     en: "0 if free" },
  m_type:         { fr: "Type",             en: "Type" },
  m_eval:         { fr: "Évaluation",       en: "Evaluation" },
  m_funded:       { fr: "Funded",           en: "Funded" },
  m_status:       { fr: "Statut",           en: "Status" },
  m_st_active:    { fr: "En cours",         en: "Active" },
  m_st_passed:    { fr: "Validé",           en: "Passed" },
  m_st_failed:    { fr: "Cramé",            en: "Failed" },
  m_st_paid:      { fr: "Payé",             en: "Paid" },
  m_note:         { fr: "Note",             en: "Note" },

  m_new_cert:     { fr: "Nouveau certificat", en: "New certificate" },
  m_amount:       { fr: "Montant ($)",      en: "Amount ($)" },
  m_eval_passed:  { fr: "Eval passed",      en: "Eval passed" },
  m_payout:       { fr: "Payout",           en: "Payout" },
  m_cert_file:    { fr: "Certificat (image ou PDF)", en: "Certificate (image or PDF)" },
  m_cert_hint:    { fr: "PNG / JPG / PDF — max 15 Mo", en: "PNG / JPG / PDF — max 15 MB" },

  m_new_expense:  { fr: "Nouvelle dépense", en: "New expense" },
  m_firm_post:    { fr: "Firme / poste",    en: "Firm / item" },
};

export function translate(lang, key) {
  const entry = DICT[key];
  if (!entry) return key;
  return entry[lang] || entry.fr || key;
}
