"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, Building2, ChevronDown, ClipboardList, LayoutDashboard, Moon, Pencil, Plus, Settings, Sun, Target, Trash2, Trophy, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import BrandMark from "@/components/BrandMark";
import { useBook } from "@/components/BookProvider";
import AccountWizard from "@/components/accounts/AccountWizard";
import { ConfirmModal } from "@/components/prism/TerminalPrimitives";
import { useNotifications } from "@/lib/useNotifications";

export const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: ClipboardList, label: "Trades", href: "/journal" },
  { icon: Building2, label: "Comptes", href: "/accounts" },
  { icon: BarChart3, label: "Rapports", href: "/reports" },
  { icon: Target, label: "Stratégies", href: "/playbook" },
  { icon: Trophy, label: "Classement", href: "/leaderboard" },
  { icon: Settings, label: "Réglages", href: "/settings" },
];

const MAIN_ROUTES = ["/dashboard", "/journal", "/accounts"];
const SETTINGS_ROUTES = ["/leaderboard", "/settings"];
const accountLabel = (account) => account?.note || account?.firm || "Compte";

function groupAccounts(accounts) {
  return accounts.reduce((groups, account) => {
    // Accounts created before migration 008 fall back to their firm. New
    // accounts join the "Principal" group by default in the creation wizard.
    const group = account.group_name?.trim() || account.firm?.trim() || "Principal";
    (groups[group] ||= []).push(account);
    return groups;
  }, {});
}

export default function Sidebar({ open = false, onClose, items = NAV_ITEMS }) {
  const pathname = usePathname();
  const { accounts, activeAccount, activeAccountId, setActiveAccountId, updateAccount, deleteAccount, trades, certificates, lang, setLang } = useBook();
  const [clock, setClock] = useState("");
  const [mode, setMode] = useState("dark");
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [accountWizard, setAccountWizard] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const notifications = useNotifications({ trades, accounts, certificates, lang });
  const accountGroups = useMemo(() => groupAccounts(accounts), [accounts]);
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
  const selectScope = (id) => { setActiveAccountId(id); setAccountsOpen(false); };
  const isActive = (href) => pathname === href || pathname?.startsWith(`${href}/`);

  return <>
    {open && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onClose} aria-hidden="true" />}
    <aside className={`fixed left-0 top-0 z-50 flex h-screen w-[232px] flex-col border-r border-prism-line bg-prism-bg transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
      <div className="flex h-16 items-center justify-between border-b border-prism-line px-5" style={{ height: "calc(4rem + env(safe-area-inset-top))", paddingTop: "env(safe-area-inset-top)" }}>
        <Link href="/dashboard" onClick={onClose}><BrandMark /></Link>
        <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-prism-muted hover:text-white lg:hidden" aria-label="Fermer le menu"><X className="h-5 w-5" /></button>
      </div>
      <div className="relative border-b border-prism-line">
        <button type="button" onClick={() => setAccountsOpen((value) => !value)} className="flex h-14 w-full items-center gap-2 px-3 text-left">
          <span className="grid h-8 w-8 place-items-center rounded-full border border-prism-line bg-prism-panel2 text-[11px] font-bold text-white">{activeAccount ? accountLabel(activeAccount).slice(0, 1).toUpperCase() : "∞"}</span>
          <span className="min-w-0 flex-1 truncate text-[11px] font-bold uppercase tracking-[.12em] text-prism-text">{activeAccount ? accountLabel(activeAccount) : "Tous les comptes"}</span>
          <ChevronDown className={`h-4 w-4 text-prism-muted transition ${accountsOpen ? "rotate-180" : ""}`} />
        </button>
        {accountsOpen && <div className="absolute inset-x-2 top-[52px] z-[70] overflow-hidden rounded-lg border border-prism-line bg-prism-panel shadow-2xl">
          <div className="max-h-[55dvh] overflow-y-auto p-1.5">
            <button type="button" onClick={() => selectScope("all")} className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm ${activeAccountId === "all" || !activeAccountId ? "bg-prism-accentDim text-prism-accent" : "text-prism-text hover:bg-prism-panel2"}`}><span className="grid h-5 w-5 place-items-center rounded-full border border-current text-[11px]">∞</span><span className="font-semibold">Tous les comptes</span><span className="ml-auto font-mono text-[10px] opacity-70">{accounts.length}</span></button>
            {Object.entries(accountGroups).map(([group, groupItems]) => <div key={group} className="mt-2 border-t border-prism-line pt-2 first:mt-1 first:border-0 first:pt-0"><p className="px-2 pb-1 text-[9px] font-bold uppercase tracking-[.16em] text-prism-muted2">{group}</p>{groupItems.map((account) => <div key={account.id} className={`group flex items-center gap-2 rounded-md px-2 py-2 ${activeAccount?.id === account.id ? "bg-prism-panel2" : "hover:bg-prism-panel2"}`}><button type="button" onClick={() => selectScope(account.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm text-prism-text">{activeAccount?.id === account.id && <i className="h-1.5 w-1.5 rounded-full bg-prism-accent" />}<span className="truncate">{accountLabel(account)}</span></button>{renaming === account.id ? <input autoFocus defaultValue={accountLabel(account)} onKeyDown={(event) => { if (event.key === "Enter") { updateAccount(account.id, { note: event.currentTarget.value.trim() || account.note }); setRenaming(null); } }} className="h-7 w-20 rounded border border-prism-accent bg-prism-bg px-1 text-xs outline-none" /> : <span className="hidden items-center gap-1 group-hover:flex"><button type="button" onClick={() => setRenaming(account.id)} aria-label="Renommer"><Pencil className="h-3.5 w-3.5 text-prism-muted" /></button><button type="button" onClick={() => setDeleteTarget(account)} aria-label="Supprimer"><Trash2 className="h-3.5 w-3.5 text-prism-muted hover:text-prism-loss" /></button></span>}</div>)}</div>)}
          </div>
          <div className="border-t border-prism-line p-2"><button type="button" onClick={() => { setAccountsOpen(false); setAccountWizard(true); }} className="flex w-full items-center justify-center gap-1 py-1 text-xs font-semibold text-prism-accent"><Plus className="h-3.5 w-3.5" /> Créer un compte prop</button></div>
        </div>}
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 no-scrollbar">
        {[["MAIN", items.filter((item) => MAIN_ROUTES.includes(item.href))], ["ANALYTICS", items.filter((item) => !MAIN_ROUTES.includes(item.href) && !SETTINGS_ROUTES.includes(item.href))], ["SETTINGS", items.filter((item) => SETTINGS_ROUTES.includes(item.href))]].map(([group, groupItems]) => <div key={group} className="mb-4"><p className="mb-1 px-3 text-[10px] font-semibold tracking-[.2em] text-prism-muted2">{group}</p>{groupItems.filter((item) => !item.hidden).map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} onClick={onClose} className={`relative flex items-center gap-3 rounded-md px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[.12em] transition-colors ${isActive(item.href) ? "bg-prism-panel2 text-prism-accent before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:bg-prism-accent" : "text-prism-muted hover:bg-prism-panel2 hover:text-prism-text"}`}><Icon className="h-4 w-4 shrink-0" /><span className="truncate">{item.label}</span></Link>; })}</div>)}
      </nav>
      <footer className="relative flex h-12 items-center justify-between border-t border-prism-line px-4 font-mono text-[10px] text-prism-muted">
        <button type="button" onClick={() => setLang(lang === "fr" ? "en" : "fr")}><b className={lang === "fr" ? "text-white" : ""}>FR</b><span> | </span><b className={lang === "en" ? "text-white" : ""}>EN</b></button><button type="button" onClick={toggleMode} className="grid h-5 w-10 place-items-center rounded-full border border-prism-line bg-prism-panel2">{mode === "dark" ? <Moon size={11} /> : <Sun size={11} />}</button><button type="button" onClick={() => setAlertsOpen((value) => !value)} className="relative text-prism-muted hover:text-prism-accent" aria-label="Notifications"><Bell className="h-4 w-4" />{alertCount > 0 && <i className="absolute -right-1 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-prism-accent px-0.5 text-[8px] font-bold text-black">{alertCount}</i>}</button><span>{clock}</span>
        {alertsOpen && <div className="absolute bottom-12 right-2 z-[70] w-72 overflow-hidden rounded-lg border border-prism-line bg-prism-panel shadow-2xl"><div className="border-b border-prism-line p-3 text-xs font-bold text-prism-text">Notifications</div><div className="p-2">{notifications.map((notification) => { const Icon = notification.icon; const color = notification.tone === "danger" ? "text-prism-loss" : notification.tone === "amber" ? "text-amber-300" : "text-prism-accent"; return <Link key={notification.id} href={notification.href || "/journal"} onClick={() => setAlertsOpen(false)} className="flex gap-2 rounded-md p-2 hover:bg-prism-panel2"><Icon className={`mt-0.5 h-4 w-4 ${color}`} /><span><b className="block text-[11px] text-prism-text">{notification.title}</b><span className="block text-[10px] leading-4 text-prism-muted">{notification.text}</span></span></Link>; })}</div></div>}
      </footer>
      {accountWizard && <AccountWizard onClose={() => setAccountWizard(false)} onCreated={(created) => { setAccountWizard(false); setActiveAccountId(created.id); }} />}
      {deleteTarget && <ConfirmModal title="Supprimer ce compte ?" message={`Le compte ${accountLabel(deleteTarget)} sera supprimé.`} confirmLabel="Supprimer" onClose={() => setDeleteTarget(null)} onConfirm={async () => { await deleteAccount(deleteTarget.id); setDeleteTarget(null); }} />}
    </aside>
  </>;
}
