"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, Calendar, ClipboardList, DollarSign, History, LayoutDashboard, List, ScrollText, Settings, Sparkles, Trophy, X } from "lucide-react";
import BrandMark from "@/components/BrandMark";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: List, label: "Trade Logs", href: "/trade-logs" },
  { icon: BarChart3, label: "Analytics", href: "/breakdown" },
  { icon: Calendar, label: "Calendar", href: "/calendar" },
  { icon: Sparkles, label: "PRISM AI", href: "/report" },
  { icon: ClipboardList, label: "Strat\u00e9gies", href: "/playbook" },
  { icon: Building2, label: "Comptes", href: "/accounts" },
  { icon: History, label: "Backtest", href: "/backtest" },
  { icon: Trophy, label: "Classement", href: "/leaderboard" },
  { icon: ScrollText, label: "Certificats", href: "/certificates" },
  { icon: DollarSign, label: "D\u00e9penses", href: "/expenses" },
  { icon: Settings, label: "R\u00e9glages", href: "/settings" },
];

export default function Sidebar({ open = false, onClose }) {
  const pathname = usePathname();
  const isActive = (href) => pathname === href || pathname?.startsWith(`${href}/`);

  return <>
    {open && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onClose} aria-hidden="true" />}
    <aside className={`fixed top-0 left-0 z-50 h-screen w-64 border-r border-prism-line bg-black transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
      <div className="flex h-16 items-center justify-between border-b border-prism-line px-5" style={{ height: "calc(4rem + env(safe-area-inset-top))", paddingTop: "env(safe-area-inset-top)" }}>
        <Link href="/dashboard" onClick={onClose}><BrandMark /></Link>
        <button onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-prism-muted hover:text-white lg:hidden" aria-label="Fermer le menu"><X className="h-5 w-5" /></button>
      </div>
      <nav className="space-y-0.5 overflow-y-auto p-3 no-scrollbar" style={{ maxHeight: "calc(100dvh - 4rem - env(safe-area-inset-top))" }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return <Link key={item.href} href={item.href} onClick={onClose} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-prism-accentDim text-prism-accent" : "text-prism-muted hover:bg-white/5 hover:text-white"}`}><Icon className="h-4 w-4 shrink-0" /><span className="truncate">{item.label}</span></Link>;
        })}
      </nav>
    </aside>
  </>;
}
