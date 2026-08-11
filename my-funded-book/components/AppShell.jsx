"use client";

import { useState, createContext, useContext } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutGrid, Table2, ListChecks, PenLine, BookOpen, Grid3x3, Award, Receipt,
  Settings, Lock, LogOut, Plus, Menu,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBook } from "./BookProvider";
import { LogTradeModal, SettingsModal } from "./modals";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/accounts", label: "Accounts", icon: Table2 },
  { href: "/journal", label: "Journal", icon: ListChecks },
  { href: "/review", label: "Review", icon: PenLine },
  { href: "/playbook", label: "Playbook", icon: BookOpen },
  { href: "/breakdown", label: "Breakdown", icon: Grid3x3 },
  { href: "/certificates", label: "Certificates", icon: Award },
  { href: "/expenses", label: "Expenses", icon: Receipt },
];

const ModalCtx = createContext(null);
export const useModals = () => useContext(ModalCtx);

export function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useBook();
  const [open, setOpen] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState("");

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <ModalCtx.Provider value={{ openLog: () => setShowLog(true) }}>
      <div className="min-h-screen bg-ink text-white">
        {/* top bar */}
        <div className="sticky top-0 z-40 flex h-[52px] items-center gap-3 border-b border-line bg-ink/90 px-4 backdrop-blur">
          <button className="rounded-lg p-1.5 text-white/80 hover:bg-panel2 lg:hidden" onClick={() => setOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="font-mono text-[12px] font-extrabold tracking-[3px]">
            My<span className="text-accent">Trade</span>Book
          </div>
          <div className="text-[12px] text-muted2">/ <b className="font-semibold text-muted">{NAV.find((n) => pathname.startsWith(n.href))?.label || "Dashboard"}</b></div>
          <div className="flex-1" />
          <button onClick={() => setShowLog(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[12px] font-bold text-black hover:brightness-110">
            <Plus size={15} /> Log trade
          </button>
        </div>

        <div className="flex">
          {/* scrim mobile */}
          {open && <div className="fixed inset-0 z-[45] bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}

          {/* sidebar */}
          <aside className={`fixed top-0 z-[50] flex h-screen w-[224px] flex-shrink-0 flex-col gap-0.5 border-r border-line bg-ink2 p-3 transition-transform lg:sticky lg:top-[52px] lg:h-[calc(100vh-52px)] lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
            <div className="px-2.5 pb-1.5 pt-2.5 text-[10px] font-bold uppercase tracking-widest text-muted2">Navigation</div>
            {NAV.map((n) => {
              const active = pathname.startsWith(n.href);
              const Icon = n.icon;
              return (
                <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium ${active ? "bg-accentDim text-accent" : "text-muted hover:bg-panel2 hover:text-white"}`}>
                  <Icon size={16} /> {n.label}
                </Link>
              );
            })}
            <div className="mt-auto flex flex-col gap-0.5 border-t border-line pt-3">
              <button onClick={() => { setShowSettings(true); setOpen(false); }} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] text-muted2 hover:bg-panel2 hover:text-white"><Settings size={15} /> Réglages</button>
              <button onClick={() => { setLocked(true); setOpen(false); }} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] text-muted2 hover:bg-panel2 hover:text-white"><Lock size={15} /> Lock</button>
              <button onClick={signOut} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] text-muted2 hover:bg-panel2 hover:text-white"><LogOut size={15} /> Sign out</button>
            </div>
          </aside>

          {/* main */}
          <main className="mx-auto w-full max-w-[1180px] flex-1 p-4 sm:p-6">
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <h1 className="text-[22px] font-extrabold tracking-tight">Welcome, {profile.name}</h1>
                <div className="mt-0.5 text-[12.5px] text-muted2">{today}</div>
              </div>
            </div>
            {children}
          </main>
        </div>

        {showLog && <LogTradeModal onClose={() => setShowLog(false)} />}
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

        {/* lock screen */}
        {locked && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-ink">
            <div className="font-mono text-[13px] font-extrabold tracking-[6px] text-muted2">MYTRADEBOOK</div>
            <div className="w-[min(340px,88vw)] rounded-2xl border border-line2 bg-panel p-6">
              <h2 className="text-[17px] font-extrabold">Welcome back, {profile.name}</h2>
              <p className="mb-4 mt-1 text-[12px] text-muted2">Entre ton code PIN pour déverrouiller.</p>
              <input autoFocus type="password" inputMode="numeric" value={pin} maxLength={6}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { if (pin === (profile.pin || "1234")) { setLocked(false); setPin(""); } else setPin(""); } }}
                className="mb-3 w-full rounded-xl border border-line2 bg-panel2 px-4 py-3 text-center font-mono text-lg tracking-[8px] text-white outline-none focus:border-accent" placeholder="••••" />
              <button onClick={() => { if (pin === (profile.pin || "1234")) { setLocked(false); setPin(""); } else setPin(""); }}
                className="w-full rounded-xl bg-accent py-3 font-bold text-black">Déverrouiller</button>
            </div>
          </div>
        )}
      </div>
    </ModalCtx.Provider>
  );
}
