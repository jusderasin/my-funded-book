"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  List,
  BarChart3,
  Calendar,
  Sparkles,
  ClipboardList,
  Settings,
  X,
  ChevronDown,
  ChevronRight,
  Building2,
  History,
  Trophy,
  ScrollText,
  DollarSign,
} from "lucide-react";

/**
 * PRISM Sidebar — nav latérale style TradeXNova.
 *
 * Sur desktop (lg+) : toujours visible, largeur 256px, fixed left.
 * Sur mobile : cachée par défaut, s'ouvre en drawer avec backdrop cliquable.
 *
 * Props:
 *   open    : Boolean — ouvert sur mobile (ignoré sur desktop où toujours visible)
 *   onClose : Function — callback pour fermer (clic backdrop, X, item)
 */

const MAIN_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard",  href: "/dashboard" },
  { icon: BookOpen,        label: "Journal",    href: "/journal" },
  { icon: List,            label: "Trade Logs", href: "/trade-logs" },
  { icon: BarChart3,       label: "Analytics",  href: "/breakdown" },
  { icon: Calendar,        label: "Calendar",   href: "/calendar" },
  { icon: Sparkles,        label: "PRISM AI",   href: "/report" },
  { icon: ClipboardList,   label: "Playbook",   href: "/playbook" },
  { icon: Settings,        label: "Réglages",   href: "/settings" },
];

const MORE_ITEMS = [
  { icon: Building2,       label: "Comptes",     href: "/accounts" },
  { icon: History,         label: "Backtest",    href: "/backtest" },
  { icon: Trophy,          label: "Classement",  href: "/leaderboard" },
  { icon: ScrollText,      label: "Certificats", href: "/certificates" },
  { icon: DollarSign,      label: "Dépenses",    href: "/expenses" },
];

export default function Sidebar({ open = false, onClose }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href) =>
    pathname === href || (pathname && pathname.startsWith(href + "/"));

  const NavItem = ({ item, onClick }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
          active
            ? "bg-prism-accentDim text-prism-accent"
            : "text-prism-muted hover:bg-white/5 hover:text-white"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Backdrop mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-black border-r border-prism-line transform transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header sidebar : logo + close mobile */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-prism-line">
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex items-center gap-2 text-lg font-semibold text-white tracking-tight"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-prism-accent text-xs font-black text-white shadow-prism-glow">M</span>
            <span>MyTrade<span className="text-prism-accent">Book</span></span>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden inline-flex h-8 w-8 items-center justify-center rounded-lg text-prism-muted hover:text-white"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav
          className="p-3 space-y-0.5 overflow-y-auto no-scrollbar"
          style={{ maxHeight: "calc(100vh - 64px)" }}
        >
          {MAIN_ITEMS.map((item) => (
            <NavItem key={item.href} item={item} onClick={onClose} />
          ))}

          <div className="pt-3 pb-1 px-3">
            <div className="border-t border-prism-line" />
          </div>

          <button
            onClick={() => setMoreOpen((v) => !v)}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-prism-muted hover:bg-white/5 hover:text-white transition-colors"
          >
            {moreOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span>Plus</span>
          </button>

          {moreOpen && (
            <div className="space-y-0.5 pl-1">
              {MORE_ITEMS.map((item) => (
                <NavItem key={item.href} item={item} onClick={onClose} />
              ))}
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
