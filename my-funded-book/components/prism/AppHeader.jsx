"use client";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Menu, Bell, UserCircle, LogOut, Plus } from "lucide-react";

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
  const menuRef = useRef(null);

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
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
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-prism-muted hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Notifications"
          type="button"
        >
          <Bell className="h-5 w-5" />
        </button>

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
