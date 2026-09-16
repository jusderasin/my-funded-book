"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { Menu, Bell, BellRing, Brain, CheckCheck, ClipboardCheck, UserCircle, LogOut, Plus, X } from "lucide-react";
import { useBook } from "@/components/BookProvider";
import { accountHealth } from "@/lib/accountHealth";

/**
 * PRISM AppHeader — barre du haut style TradeXNova.
 *
 * Contient : hamburger mobile + "Bienvenue, [prénom]" à gauche,
 * bell (notifications) + avatar (menu profil) à droite.
 *
 * Le prénom est déduit du prop `user.email` (partie avant @) car le layout
 * MyTradeBook ne passe actuellement que id + email au BookProvider. À
 * remplacer par first_name quand tu brancheras la page complete-profile.
 *
 * Props:
 *   user        : { email: String } — user courant
 *   onMenuClick : Function — ouvre la sidebar sur mobile
 */
export default function AppHeader({ user, onMenuClick, onLogTrade }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alertsSeen, setAlertsSeen] = useState(false);
  const menuRef = useRef(null);
  const alertsRef = useRef(null);
  const { trades, lang, accounts, certificates } = useBook();

  const notifications = useMemo(() => {
    const L = lang === "en" ? "en" : "fr";
    const latest = trades?.[0];
    const accountNotifications = (accounts || []).flatMap((account) => {
      const health = accountHealth(account, trades, certificates, L);
      const accountLabel = `${account.firm || "Compte"} · $${Number(account.size || 0).toLocaleString("fr-FR")}`;
      const href = `/accounts/${account.id}`;
      const isFunded = account.type === "funded" || account.status === "funded" || account.status === "passed";
      const items = [];
      if (!isFunded && health.targetReached && !health.breached) {
        items.push({ id: `validated-${account.id}`, icon: CheckCheck, tone: "accent", href, title: L === "en" ? "Evaluation target reached" : "Objectif d'évaluation atteint", text: L === "en" ? `${accountLabel} is ready to move to funded.` : `${accountLabel} est prêt à passer en funded.` });
      }
      if (isFunded && health.payoutEligible) {
        items.push({ id: `payout-${account.id}`, icon: BellRing, tone: "accent", href, title: L === "en" ? "Payout available" : "Payout disponible", text: L === "en" ? `${accountLabel} meets the recorded withdrawal rules.` : `${accountLabel} respecte les règles de retrait enregistrées.` });
      }
      health.alerts.forEach((alert, index) => items.push({ id: `risk-${account.id}-${index}`, icon: BellRing, tone: alert.level === "danger" ? "danger" : "amber", href, title: accountLabel, text: alert.msg }));
      return items;
    });
    if (!latest) {
      return [...accountNotifications, { id: "first-trade", icon: ClipboardCheck, tone: "accent", action: "log", title: L === "en" ? "Your journal is ready" : "Ton journal est prêt", text: L === "en" ? "Log your first trade to activate your performance insights." : "Log ton premier trade pour activer tes analyses de performance." }].slice(0, 5);
    }
    const psychology = latest.psychology;
    const hasMindset = [psychology?.emotional, psychology?.focus, psychology?.confidence].some(Boolean) || latest.emotion;
    if (!hasMindset) {
      return [...accountNotifications, { id: `psych-${latest.id}`, icon: Brain, tone: "amber", href: "/trade-logs", title: L === "en" ? "Mindset check-in missing" : "Check-in Psycho à compléter", text: L === "en" ? "Add emotional state, focus and confidence to your latest trade." : "Ajoute ton état émotionnel, ton focus et ta confiance à ton dernier trade." }].slice(0, 5);
    }
    return [...accountNotifications, { id: `ready-${latest.id}`, icon: CheckCheck, tone: "accent", href: "/calendar", title: L === "en" ? "Journal up to date" : "Journal à jour", text: L === "en" ? "Your latest trade and mindset check-in are recorded." : "Ton dernier trade et ton check-in Psycho sont bien enregistrés." }].slice(0, 5);
  }, [trades, accounts, certificates, lang]);

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (alertsRef.current && !alertsRef.current.contains(e.target)) setAlertsOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const email = user?.email || "";
  const displayName = (email.split("@")[0] || "Trader").replace(/[._]/g, " ");
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header
      className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-prism-line bg-prism-bg/80 px-4 backdrop-blur-md sm:px-6"
      style={{ height: "calc(4rem + env(safe-area-inset-top))", paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* Left : hamburger (mobile) + welcome */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg text-prism-muted hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-sm text-prism-muted hidden sm:inline">
            Bonjour,
          </span>
          <span className="text-sm font-semibold text-white capitalize truncate">
            {displayName}
          </span>
        </div>
      </div>

      {/* Right : accès rapide, notifications + avatar */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onLogTrade}
          className="signal-interactive inline-flex h-9 items-center gap-1.5 rounded-lg bg-prism-accent px-3 text-xs font-bold text-black transition hover:brightness-110 active:scale-[0.98]"
          aria-label="Logger rapidement un trade"
          type="button"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Log trade</span>
        </button>
        <div className="relative" ref={alertsRef}>
        <button
          onClick={() => { setAlertsOpen((open) => !open); setAlertsSeen(true); }}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-prism-muted hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Notifications"
          aria-expanded={alertsOpen}
          type="button"
        >
          {alertsOpen ? <BellRing className="h-5 w-5 text-prism-accent" /> : <Bell className="h-5 w-5" />}
          {!alertsSeen && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-prism-accent shadow-[0_0_8px_var(--prism-accent)]" />}
        </button>
        {alertsOpen && <div className="absolute right-0 mt-2 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-prism-line bg-prism-panel shadow-2xl z-40">
          <div className="flex items-center justify-between border-b border-prism-line px-4 py-3"><div><p className="text-sm font-bold text-white">{lang === "en" ? "Notifications" : "Notifications"}</p><p className="mt-0.5 text-[10px] text-prism-muted2">{lang === "en" ? "Your trading journal, at a glance" : "Ton journal de trading, en un regard"}</p></div><button onClick={() => setAlertsOpen(false)} className="rounded-lg p-1 text-prism-muted hover:bg-white/5 hover:text-white" aria-label="Fermer les notifications"><X className="h-4 w-4" /></button></div>
          <div className="p-2">{notifications.map((notification) => { const Icon = notification.icon; const toneClass = notification.tone === "danger" ? "bg-red-400/10 text-red-300" : notification.tone === "amber" ? "bg-amber-400/10 text-amber-300" : "bg-prism-accentDim text-prism-accent"; const content = <div className="flex gap-3 rounded-xl p-3 transition-colors hover:bg-white/[0.04]"><span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${toneClass}`}><Icon className="h-4 w-4" /></span><span><span className="block text-[12px] font-bold text-white">{notification.title}</span><span className="mt-1 block text-[11px] leading-4 text-prism-muted">{notification.text}</span></span></div>; return notification.action === "log" ? <button key={notification.id} onClick={() => { setAlertsOpen(false); onLogTrade(); }} className="w-full text-left">{content}</button> : <Link key={notification.id} href={notification.href} onClick={() => setAlertsOpen(false)}>{content}</Link>; })}</div>
          <div className="border-t border-prism-line px-4 py-2.5 text-[10px] text-prism-muted2">{lang === "en" ? "Alerts update automatically with your journal." : "Les alertes se mettent à jour automatiquement avec ton journal."}</div>
        </div>}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-prism-accentDim text-prism-accent text-sm font-semibold transition-all hover:ring-2 hover:ring-prism-accent/40"
            aria-label="Menu profil"
            type="button"
          >
            {initial}
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-prism-line bg-prism-panel shadow-prism-card py-2 z-40">
              <div className="px-4 py-2 border-b border-prism-line">
                <div className="text-[10px] font-medium text-prism-muted2 uppercase tracking-widest">
                  Connecté en tant que
                </div>
                <div className="text-sm text-white truncate mt-0.5">{email}</div>
              </div>
              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-prism-muted hover:bg-white/5 hover:text-white transition-colors"
              >
                <UserCircle className="h-4 w-4" />
                Profil & Réglages
              </Link>
              {/*
                Route de déconnexion : adapte selon ton setup Supabase.
                Options courantes :
                  - lien vers /logout (route qui appelle supabase.auth.signOut)
                  - lien vers /api/auth/signout
                  - handler onClick appelant createClient().auth.signOut() + router.push("/")
                Pour l'instant on pointe vers /logout ; crée cette route ou ajuste.
              */}
              <Link
                href="/logout"
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-prism-muted hover:bg-red-500/10 hover:text-red-400 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
