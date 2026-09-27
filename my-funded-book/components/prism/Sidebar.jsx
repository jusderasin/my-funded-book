"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgeCheck, BarChart3, Bell, Building2, Calendar, Check, ChevronDown, ClipboardList, DollarSign, FlaskConical, Gauge, Gift, Handshake, History, LayoutDashboard, List, Moon, Pencil, Plus, Settings, Sparkles, Sun, Trash2, Trophy, X } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import { useBook } from "@/components/BookProvider";
import { useEffect, useState } from "react";

export const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: ClipboardList, label: "Journal", href: "/journal" },
  { icon: Building2, label: "Comptes", href: "/accounts" },
  { icon: BarChart3, label: "Reports", href: "/breakdown" },
  { icon: Gauge, label: "Optimize", href: "/optimize" },
  { icon: FlaskConical, label: "Simulation", href: "/simulation" },
  { icon: Handshake, label: "Mentoring", href: "/mentoring" },
  { icon: Sparkles, label: "PRISM AI", href: "/report" },
  { icon: ClipboardList, label: "Stratégies", href: "/playbook" },
  { icon: Calendar, label: "Calendrier", href: "/calendar" },
  { icon: History, label: "Backtest", href: "/backtest" },
  { icon: List, label: "Trade Logs", href: "/trade-logs" },
  { icon: Trophy, label: "Classement", href: "/leaderboard" },
  { icon: BadgeCheck, label: "Certificats", href: "/certificates" },
  { icon: DollarSign, label: "D\u00e9penses", href: "/expenses" },
  { icon: Gift, label: "Referral", href: "/referral" },
  { icon: Settings, label: "Réglages", href: "/settings" },
];

export default function Sidebar({ open = false, onClose, items = NAV_ITEMS }) {
  const pathname = usePathname();
  const { accounts, activeAccount, setActiveAccountId, addAccount, updateAccount, deleteAccount, trades, lang, setLang } = useBook();
  const [clock, setClock] = useState("");
  const [mode, setMode] = useState("dark");
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [createName, setCreateName] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [alertsOpen, setAlertsOpen] = useState(false);
  useEffect(() => { const render = () => setClock(new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date())); render(); const id = window.setInterval(render, 1000); const saved = localStorage.getItem("mtb.mode") || "dark"; setMode(saved); document.documentElement.dataset.mode = saved; return () => window.clearInterval(id); }, []);
  const toggleMode = () => { const next = mode === "dark" ? "light" : "dark"; setMode(next); localStorage.setItem("mtb.mode", next); document.documentElement.dataset.mode = next; };
  const isActive = (href) => pathname === href || pathname?.startsWith(`${href}/`);
  const main = ["/dashboard", "/journal", "/accounts"];
  const settings = ["/referral", "/leaderboard", "/certificates", "/expenses", "/settings"];

  return <>
    {open && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onClose} aria-hidden="true" />}
    <aside className={`fixed top-0 left-0 z-50 flex h-screen w-[232px] flex-col border-r border-prism-line bg-prism-bg transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
      <div className="flex h-16 items-center justify-between border-b border-prism-line px-5" style={{ height: "calc(4rem + env(safe-area-inset-top))", paddingTop: "env(safe-area-inset-top)" }}>
        <Link href="/dashboard" onClick={onClose}><BrandMark /></Link>
        <button onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-prism-muted hover:text-white lg:hidden" aria-label="Fermer le menu"><X className="h-5 w-5" /></button>
      </div>
      <div className="relative border-b border-prism-line">
        <button type="button" onClick={() => setAccountsOpen((value) => !value)} className="flex h-14 w-full items-center gap-2 px-3 text-left"><span className="grid h-8 w-8 place-items-center rounded-full border border-prism-line bg-prism-panel2 text-[11px] font-bold text-white">{(activeAccount?.name || activeAccount?.firm || "T").slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1 truncate text-[11px] font-bold uppercase tracking-[.12em] text-prism-text">{activeAccount?.name || activeAccount?.firm || "Tous les comptes"}</span><ChevronDown className={`h-4 w-4 text-prism-muted transition ${accountsOpen ? "rotate-180" : ""}`} /></button>
        {accountsOpen && <div className="absolute inset-x-2 top-[52px] z-[70] overflow-hidden rounded-lg border border-prism-line bg-prism-panel shadow-2xl"><div className="max-h-56 overflow-y-auto p-1.5">{accounts.map((account) => <div key={account.id} className={`group flex items-center gap-2 rounded-md px-2 py-2 ${activeAccount?.id === account.id ? "bg-prism-panel2" : "hover:bg-prism-panel2"}`}><button type="button" onClick={() => { setActiveAccountId(account.id); setAccountsOpen(false); }} className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm text-prism-text">{activeAccount?.id === account.id && <i className="h-1.5 w-1.5 rounded-full bg-prism-accent" />}<span className="truncate">{account.name || account.firm || "Compte"}</span></button>{renaming === account.id ? <input autoFocus defaultValue={account.name || account.firm || ""} onKeyDown={(event) => { if (event.key === "Enter") { updateAccount(account.id, { name: event.currentTarget.value.trim() || account.name }); setRenaming(null); } }} className="h-7 w-20 rounded border border-prism-accent bg-prism-bg px-1 text-xs outline-none" /> : <span className="hidden items-center gap-1 group-hover:flex"><button onClick={() => setRenaming(account.id)} aria-label="Renommer"><Pencil className="h-3.5 w-3.5 text-prism-muted" /></button><button onClick={() => { if (window.confirm("Supprimer ce compte ?")) deleteAccount(account.id); }} aria-label="Supprimer"><Trash2 className="h-3.5 w-3.5 text-prism-muted hover:text-prism-loss" /></button></span>}</div>)}</div><div className="border-t border-prism-line p-2">{createName !== null ? <div className="flex gap-1"><input autoFocus value={createName} onChange={(event) => setCreateName(event.target.value)} placeholder="Nom du compte" className="h-8 min-w-0 flex-1 rounded border border-prism-accent bg-prism-bg px-2 text-xs outline-none" /><button onClick={async () => { if (createName.trim()) { await addAccount({ name: createName.trim(), firm: createName.trim(), size: 0, type: "evaluation", status: "active" }); setCreateName(""); } }}><Check className="h-4 w-4 text-prism-win" /></button><button onClick={() => setCreateName(null)} className="text-prism-muted">×</button></div> : <button onClick={() => setCreateName("")} className="flex w-full items-center justify-center gap-1 py-1 text-xs font-semibold text-prism-accent"><Plus className="h-3.5 w-3.5" /> Créer un compte</button>}</div></div>}
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 no-scrollbar">
        {[["MAIN", items.filter((item) => main.includes(item.href))], ["ANALYTICS", items.filter((item) => !main.includes(item.href) && !settings.includes(item.href))], ["SETTINGS", items.filter((item) => settings.includes(item.href))]].map(([group, groupItems]) => <div key={group} className="mb-4"><p className="mb-1 px-3 text-[10px] font-semibold tracking-[.2em] text-prism-muted2">{group}</p>{groupItems.filter((item) => !item.hidden).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return <Link key={item.href} href={item.href} onClick={onClose} className={`relative flex items-center gap-3 rounded-md px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[.12em] transition-colors ${active ? "bg-prism-panel2 text-prism-accent before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:bg-prism-accent" : "text-prism-muted hover:bg-prism-panel2 hover:text-prism-text"}`}><Icon className="h-4 w-4 shrink-0" /><span className="truncate">{item.label}</span></Link>;
        })}</div>)}
      </nav>
      <footer className="relative flex h-12 items-center justify-between border-t border-prism-line px-4 font-mono text-[10px] text-prism-muted"><button type="button" onClick={() => setLang(lang === "fr" ? "en" : "fr")}><b className={lang === "fr" ? "text-white" : ""}>FR</b><span> | </span><b className={lang === "en" ? "text-white" : ""}>EN</b></button><button type="button" onClick={toggleMode} className="grid h-5 w-10 place-items-center rounded-full border border-prism-line bg-prism-panel2">{mode === "dark" ? <Moon size={11} /> : <Sun size={11} />}</button><button type="button" onClick={() => setAlertsOpen((value) => !value)} className="relative text-prism-muted hover:text-prism-accent" aria-label="Notifications"><Bell className="h-4 w-4" />{trades?.length === 0 && <i className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-prism-accent" />}</button><span>{clock}</span>{alertsOpen && <div className="absolute bottom-12 right-2 z-[70] w-72 rounded-lg border border-prism-line bg-prism-panel p-3 shadow-2xl"><p className="text-xs font-bold text-prism-text">Notifications</p><div className="mt-3 rounded-md border border-prism-line bg-prism-bg p-3 text-xs text-prism-muted">{trades?.length ? "Ton journal est à jour." : "Ton journal est prêt : logge ton premier trade pour activer tes analyses."}</div></div>}</footer>
    </aside>
  </>;
}
