"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, Calendar, ClipboardList, DollarSign, History, LayoutDashboard, List, Moon, ScrollText, Settings, Sparkles, Sun, Trophy, X } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import { useBook } from "@/components/BookProvider";
import { useEffect, useState } from "react";

export const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: ClipboardList, label: "Journal", href: "/journal" },
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

export default function Sidebar({ open = false, onClose, items = NAV_ITEMS }) {
  const pathname = usePathname();
  const { accounts, activeAccount, setActiveAccountId, lang, setLang } = useBook();
  const [clock, setClock] = useState("");
  const [mode, setMode] = useState("dark");
  useEffect(() => { const render = () => setClock(new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date())); render(); const id = window.setInterval(render, 1000); const saved = localStorage.getItem("mtb.mode") || "dark"; setMode(saved); document.documentElement.dataset.mode = saved; return () => window.clearInterval(id); }, []);
  const toggleMode = () => { const next = mode === "dark" ? "light" : "dark"; setMode(next); localStorage.setItem("mtb.mode", next); document.documentElement.dataset.mode = next; };
  const isActive = (href) => pathname === href || pathname?.startsWith(`${href}/`);
  const main = ["/dashboard", "/journal", "/trade-logs", "/accounts"];
  const settings = ["/settings"];

  return <>
    {open && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onClose} aria-hidden="true" />}
    <aside className={`fixed top-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-prism-line bg-prism-bg transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
      <div className="flex h-16 items-center justify-between border-b border-prism-line px-5" style={{ height: "calc(4rem + env(safe-area-inset-top))", paddingTop: "env(safe-area-inset-top)" }}>
        <Link href="/dashboard" onClick={onClose}><BrandMark /></Link>
        <button onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-prism-muted hover:text-white lg:hidden" aria-label="Fermer le menu"><X className="h-5 w-5" /></button>
      </div>
      <div className="border-b border-prism-line p-3">
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[.18em] text-prism-muted">Compte journal</label>
        <select value={activeAccount?.id || ""} onChange={(event) => setActiveAccountId(event.target.value || null)} className="h-9 w-full rounded-md border border-prism-line bg-prism-panel2 px-2 font-mono text-xs text-prism-text outline-none focus:border-prism-accent"><option value="">Tous les comptes</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name || account.firm || "Compte"}</option>)}</select>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 no-scrollbar">
        {[["MAIN", items.filter((item) => main.includes(item.href))], ["ANALYTICS", items.filter((item) => !main.includes(item.href) && !settings.includes(item.href))], ["SETTINGS", items.filter((item) => settings.includes(item.href))]].map(([group, groupItems]) => <div key={group} className="mb-4"><p className="mb-1 px-3 text-[10px] font-semibold tracking-[.2em] text-prism-muted2">{group}</p>{groupItems.filter((item) => !item.hidden).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return <Link key={item.href} href={item.href} onClick={onClose} className={`relative flex items-center gap-3 rounded-md px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[.12em] transition-colors ${active ? "bg-prism-panel2 text-prism-accent before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:bg-prism-accent" : "text-prism-muted hover:bg-prism-panel2 hover:text-prism-text"}`}><Icon className="h-4 w-4 shrink-0" /><span className="truncate">{item.label}</span></Link>;
        })}</div>)}
      </nav>
      <footer className="flex items-center justify-between border-t border-prism-line px-4 py-3 font-mono text-[10px] text-prism-muted"><button type="button" onClick={() => setLang(lang === "fr" ? "en" : "fr")} className="hover:text-prism-accent">{lang === "fr" ? "FR" : "EN"} | {lang === "fr" ? "EN" : "FR"}</button><button type="button" onClick={toggleMode} className="grid h-6 w-9 place-items-center rounded-full border border-prism-line bg-prism-panel2">{mode === "dark" ? <Moon size={12} /> : <Sun size={12} />}</button><span>{clock}</span></footer>
    </aside>
  </>;
}
