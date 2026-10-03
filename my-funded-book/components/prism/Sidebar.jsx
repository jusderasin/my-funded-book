"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, BarChart3, Bell, Building2, ClipboardList, FlaskConical, LayoutDashboard, Moon, Settings, Sun, Target, Trophy, X } from "lucide-react";
import { useEffect, useState } from "react";
import BrandMark from "@/components/BrandMark";
import { useBook } from "@/components/BookProvider";
import { useNotifications } from "@/lib/useNotifications";

export const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: ClipboardList, label: "Trades", href: "/journal" },
  { icon: Building2, label: "Comptes", href: "/accounts" },
  { icon: Award, label: "Funded", href: "/funded" },
  { icon: BarChart3, label: "Rapports", href: "/reports" },
  { icon: Target, label: "Stratégies", href: "/playbook" },
  { icon: FlaskConical, label: "Backtest", href: "/backtest" },
  { icon: Trophy, label: "Classement", href: "/leaderboard" },
  { icon: Settings, label: "Réglages", href: "/settings" },
];

const MAIN_ROUTES = ["/dashboard", "/journal", "/accounts", "/funded"];
const SETTINGS_ROUTES = ["/leaderboard", "/settings"];

export default function Sidebar({ open = false, onClose, items = NAV_ITEMS }) {
  const pathname = usePathname();
  const { trades, accounts, certificates, lang, setLang } = useBook();
  const [clock, setClock] = useState("");
  const [mode, setMode] = useState("dark");
  const [alertsOpen, setAlertsOpen] = useState(false);
  const notifications = useNotifications({ trades, accounts, certificates, lang });
  const alertCount = notifications.filter((notification) => notification.actionable !== false).length;

  useEffect(() => {
    const renderClock = () => setClock(new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date()));
    renderClock();
    const interval = window.setInterval(renderClock, 1000);
    const savedMode = localStorage.getItem("mtb.mode") || "dark";
    setMode(savedMode);
    document.documentElement.dataset.mode = savedMode;
    return () => window.clearInterval(interval);
  }, []);

  const toggleMode = () => {
    const nextMode = mode === "dark" ? "light" : "dark";
    setMode(nextMode);
    localStorage.setItem("mtb.mode", nextMode);
    document.documentElement.dataset.mode = nextMode;
  };
  const isActive = (href) => pathname === href || pathname?.startsWith(`${href}/`);

  return <>
    {open && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onClose} aria-hidden="true" />}
    <aside className={`app-sidebar fixed left-0 top-0 z-50 flex h-screen w-[232px] flex-col border-r border-prism-line bg-prism-bg transition-transform duration-300 ease-out lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
      <div className="app-sidebar-brand flex h-16 items-center justify-between border-b border-prism-line px-5" style={{ height: "calc(4rem + env(safe-area-inset-top))", paddingTop: "env(safe-area-inset-top)" }}>
        <Link href="/dashboard" onClick={onClose}><BrandMark /></Link>
        <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-prism-muted hover:text-white lg:hidden" aria-label="Fermer le menu"><X className="h-5 w-5" /></button>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 no-scrollbar">
        {[["MAIN", items.filter((item) => MAIN_ROUTES.includes(item.href))], ["ANALYTICS", items.filter((item) => !MAIN_ROUTES.includes(item.href) && !SETTINGS_ROUTES.includes(item.href))], ["SETTINGS", items.filter((item) => SETTINGS_ROUTES.includes(item.href))]].map(([group, groupItems]) => <div key={group} className="mb-4"><p className="mb-1 px-3 text-[10px] font-semibold tracking-[.2em] text-prism-muted2">{group}</p>{groupItems.filter((item) => !item.hidden).map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} onClick={onClose} className={`relative flex items-center gap-3 rounded-md px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[.12em] transition-colors ${isActive(item.href) ? "bg-prism-panel2 text-prism-accent before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:bg-prism-accent" : "text-prism-muted hover:bg-prism-panel2 hover:text-prism-text"}`}><Icon className="h-4 w-4 shrink-0" /><span className="truncate">{item.label}</span></Link>; })}</div>)}
      </nav>
      <footer className="app-sidebar-footer relative flex h-12 items-center justify-between border-t border-prism-line px-4 font-mono text-[10px] text-prism-muted">
        <button type="button" onClick={() => setLang(lang === "fr" ? "en" : "fr")}><b className={lang === "fr" ? "text-white" : ""}>FR</b><span> | </span><b className={lang === "en" ? "text-white" : ""}>EN</b></button>
        <button type="button" onClick={toggleMode} className="grid h-5 w-10 place-items-center rounded-full border border-prism-line bg-prism-panel2">{mode === "dark" ? <Moon size={11} /> : <Sun size={11} />}</button>
        <button type="button" onClick={() => setAlertsOpen((value) => !value)} className="relative text-prism-muted hover:text-prism-accent" aria-label="Notifications"><Bell className="h-4 w-4" />{alertCount > 0 && <i className="absolute -right-1 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-prism-accent px-0.5 text-[8px] font-bold text-black">{alertCount}</i>}</button>
        <span>{clock}</span>
        {alertsOpen && <div className="absolute bottom-12 right-2 z-[70] w-72 overflow-hidden rounded-lg border border-prism-line bg-prism-panel shadow-2xl"><div className="border-b border-prism-line p-3 text-xs font-bold text-prism-text">Notifications</div><div className="p-2">{notifications.map((notification) => { const Icon = notification.icon; const color = notification.tone === "danger" ? "text-prism-loss" : notification.tone === "amber" ? "text-amber-300" : "text-prism-accent"; return <Link key={notification.id} href={notification.href || "/journal"} onClick={() => setAlertsOpen(false)} className="flex gap-2 rounded-md p-2 hover:bg-prism-panel2"><Icon className={`mt-0.5 h-4 w-4 ${color}`} /><span><b className="block text-[11px] text-prism-text">{notification.title}</b><span className="block text-[10px] leading-4 text-prism-muted">{notification.text}</span></span></Link>; })}</div></div>}
      </footer>
    </aside>
  </>;
}
