"use client";

import { useState, useEffect, useRef, createContext, useContext } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutGrid, Table2, ListChecks, PenLine, BookOpen, Grid3x3, Award, Receipt,
  Settings, Lock, LogOut, Plus, Menu, FlaskConical, Medal,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBook } from "./BookProvider";
import { LogTradeModal, SettingsModal } from "./modals";
import { Tutorial } from "./Tutorial";

const NAV = [
  { href: "/dashboard", key: "nav_dashboard", icon: LayoutGrid },
  { href: "/accounts", key: "nav_accounts", icon: Table2 },
  { href: "/journal", key: "nav_journal", icon: ListChecks },
  { href: "/backtest", label: "Backtest", icon: FlaskConical },
  { href: "/badges", label: "Badges", icon: Medal },
  { href: "/review", key: "nav_review", icon: PenLine },
  { href: "/playbook", key: "nav_playbook", icon: BookOpen },
  { href: "/breakdown", key: "nav_breakdown", icon: Grid3x3 },
  { href: "/certificates", key: "nav_certificates", icon: Award },
  { href: "/expenses", key: "nav_expenses", icon: Receipt },
];

const ModalCtx = createContext(null);
export const useModals = () => useContext(ModalCtx);

export function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, saveProfile, t, lang, loading } = useBook();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState("");
  const tutChecked = useRef(false);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem("sidebarCollapsed") === "1"); } catch {}
  }, []);

  // Ouvre le tuto au 1er login (une seule fois, après chargement du profil)
  useEffect(() => {
    if (!loading && profile && !tutChecked.current) {
      tutChecked.current = true;
      if (!profile.tutorial_seen) setShowTutorial(true);
    }
  }, [loading, profile]);

  function finishTutorial() {
    if (!profile?.tutorial_seen) {
      const supabase = createClient();
      supabase.from("profiles").update({ tutorial_seen: true }).eq("id", profile.id);
    }
  }

  function toggleSidebar() {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      setCollapsed((c) => {
        const nv = !c;
        try { localStorage.setItem("sidebarCollapsed", nv ? "1" : "0"); } catch {}
        return nv;
      });
    } else {
      setOpen((o) => !o);
    }
  }

  const [splash, setSplash] = useState(true);
  const [splashOut, setSplashOut] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setSplashOut(true), 1300);
    const t2 = setTimeout(() => setSplash(false), 1750);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const today = new Date().toLocaleDateString(lang === "en" ? "en-US" : "fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const current = NAV.find((n) => pathname.startsWith(n.href));

  return (
    <ModalCtx.Provider value={{ openLog: () => setShowLog(true) }}>
      <div className="min-h-screen bg-ink text-white">
        <div className="sticky top-0 z-40 flex h-[52px] items-center gap-3 border-b border-line bg-ink/90 px-4 backdrop-blur">
          <button className="rounded-lg p-1.5 text-white/80 hover:bg-panel2" onClick={toggleSidebar} aria-label="Menu">
            <Menu size={20} />
          </button>
          <div className="font-mono text-[12px] font-extrabold tracking-[3px]">
            My<span className="text-accent">Trade</span>Book
          </div>
          <div className="text-[12px] text-muted2">/ <b className="font-semibold text-muted">{current?.label || t(current?.key || "nav_dashboard")}</b></div>
          <div className="flex-1" />
          <button onClick={() => setShowLog(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[12px] font-bold text-black hover:brightness-110">
            <Plus size={15} /> {t("log_trade")}
          </button>
        </div>

        <div className="flex">
          {open && <div className="fixed inset-0 z-[45] bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}

          <aside className={`fixed top-0 z-[50] flex h-screen w-[224px] flex-shrink-0 flex-col gap-0.5 border-r border-line bg-ink2 p-3 transition-transform lg:sticky lg:top-[52px] lg:h-[calc(100vh-52px)] lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"} ${collapsed ? "lg:hidden" : ""}`}>
            <div className="px-2.5 pb-1.5 pt-2.5 text-[10px] font-bold uppercase tracking-widest text-muted2">{t("nav_label")}</div>
            {NAV.map((n) => {
              const active = pathname.startsWith(n.href);
              const Icon = n.icon;
              return (
                <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium ${active ? "bg-accentDim text-accent" : "text-muted hover:bg-panel2 hover:text-white"}`}>
                  <Icon size={16} /> {n.label || t(n.key)}
                </Link>
              );
            })}
            <div className="mt-auto flex flex-col gap-0.5 border-t border-line pt-3">
              <button onClick={() => { setShowSettings(true); setOpen(false); }} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] text-muted2 hover:bg-panel2 hover:text-white"><Settings size={15} /> {t("settings")}</button>
              <button onClick={() => { setLocked(true); setOpen(false); }} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] text-muted2 hover:bg-panel2 hover:text-white"><Lock size={15} /> {t("lock")}</button>
              <button onClick={signOut} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] text-muted2 hover:bg-panel2 hover:text-white"><LogOut size={15} /> {t("signout")}</button>
            </div>
          </aside>

          <main className="mx-auto w-full max-w-[1180px] flex-1 p-4 sm:p-6">
            {children}
          </main>
        </div>

        {showLog && <LogTradeModal onClose={() => setShowLog(false)} />}
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} onReplayTutorial={() => { setShowSettings(false); setShowTutorial(true); }} />}
        <Tutorial open={showTutorial} lang={lang} onClose={() => setShowTutorial(false)} onFinish={finishTutorial} />

        {splash && (
          <div className={`fixed inset-0 z-[110] flex flex-col items-center justify-center gap-4 bg-ink transition-opacity duration-500 ${splashOut ? "opacity-0" : "opacity-100"}`}>
            <div className="font-mono text-[13px] font-extrabold tracking-[6px] text-muted2">
              MY<span className="text-accent">TRADE</span>BOOK
            </div>
            <div className="text-center">
              <div className="text-[24px] font-extrabold tracking-tight">{t("welcome")}{profile?.name ? `, ${profile.name}` : ""}</div>
              <div className="mt-1 text-[12.5px] text-muted2">{today}</div>
            </div>
            <div className="mt-2 h-[3px] w-40 overflow-hidden rounded-full bg-panel2">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-accent" />
            </div>
          </div>
        )}

        {locked && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-ink">
            <div className="font-mono text-[13px] font-extrabold tracking-[6px] text-muted2">MYTRADEBOOK</div>
            <div className="w-[min(340px,88vw)] rounded-2xl border border-line2 bg-panel p-6">
              <h2 className="text-[17px] font-extrabold">{t("unlock_title")}, {profile.name}</h2>
              <p className="mb-4 mt-1 text-[12px] text-muted2">{t("unlock_hint")}</p>
              <input autoFocus type="password" inputMode="numeric" value={pin} maxLength={6}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { if (pin === (profile.pin || "1234")) { setLocked(false); setPin(""); } else setPin(""); } }}
                className="mb-3 w-full rounded-xl border border-line2 bg-panel2 px-4 py-3 text-center font-mono text-lg tracking-[8px] text-white outline-none focus:border-accent" placeholder="••••" />
              <button onClick={() => { if (pin === (profile.pin || "1234")) { setLocked(false); setPin(""); } else setPin(""); }}
                className="w-full rounded-xl bg-accent py-3 font-bold text-black">{t("unlock_btn")}</button>
            </div>
          </div>
        )}
      </div>
    </ModalCtx.Provider>
  );
}
