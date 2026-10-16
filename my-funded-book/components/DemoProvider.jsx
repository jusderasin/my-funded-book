"use client";

// Fournit le même contexte que BookProvider, mais avec des données fictives en
// mémoire : les pages réelles (dashboard, journal…) tournent sans compte.
// Les écritures restent locales à la session de démo, rien n'est envoyé.

import { useCallback, useMemo, useState } from "react";
import { BookCtx } from "@/components/BookProvider";
import { computeStats } from "@/lib/stats";
import { translate } from "@/lib/i18n";
import { demoTrades, DEMO_PLAYBOOKS } from "@/lib/demoData";

export function DemoProvider({ children }) {
  const [lang, setLang] = useState("fr");
  const [trades, setTrades] = useState(() => demoTrades());
  const [dailyReviews, setDailyReviews] = useState([]);
  const [toast, setToast] = useState(null);
  const notify = useCallback((msg, err = false) => {
    setToast({ msg, err, id: Date.now() });
    setTimeout(() => setToast(null), 2600);
  }, []);
  const t = useCallback((key) => translate(lang, key), [lang]);
  const hint = lang === "en" ? "Demo mode — create an account to keep your trades." : "Mode démo — crée un compte pour garder tes trades.";

  const value = useMemo(() => {
    const sorted = [...trades].sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.created_at || "").localeCompare(String(a.created_at || "")));
    const profile = { name: "Demo trader", starting_balance: 50000, be_threshold: 0 };
    const local = (row) => ({ id: `demo-new-${Date.now()}`, created_at: new Date().toISOString(), ...row });
    return {
      demo: true,
      loading: false, lang, setLang, t,
      user: { id: "demo", email: "demo@mytradebook.app" },
      profile,
      trades: sorted, scopedTrades: sorted,
      stats: computeStats(sorted, 50000), scopedStats: computeStats(sorted, 50000),
      accounts: [], activeAccount: null, activeAccountId: null, setActiveAccountId: () => {},
      certificates: [], expenses: [], playbooks: DEMO_PLAYBOOKS, reviews: [], dailyReviews, subscription: null, toast,
      addTrade: async (row) => { const created = local(row); setTrades((cur) => [created, ...cur]); notify(hint); return created; },
      updateTrade: async (id, patch) => { setTrades((cur) => cur.map((trade) => (trade.id === id ? { ...trade, ...patch } : trade))); notify(hint); return true; },
      deleteTrade: async (id) => { setTrades((cur) => cur.filter((trade) => trade.id !== id)); return true; },
      importTrades: async (rows) => { setTrades((cur) => [...rows.map(local), ...cur]); notify(hint); return true; },
      saveDailyReview: async (date, fields) => { const row = { date, ...fields }; setDailyReviews((cur) => [row, ...cur.filter((item) => item.date !== date)]); notify(hint); return row; },
      saveReview: async () => notify(hint),
      saveProfile: async () => { notify(hint); return false; },
      addAccount: async () => notify(hint), updateAccount: async () => notify(hint), deleteAccount: async () => notify(hint),
      addCert: async () => notify(hint), deleteCert: async () => notify(hint),
      addExpense: async () => notify(hint), deleteExpense: async () => notify(hint),
      addSetup: async () => notify(hint), updateSetup: async () => notify(hint), deleteSetup: async () => notify(hint),
      notify, reload: () => {},
    };
  }, [trades, dailyReviews, lang, t, toast, notify, hint]);

  return (
    <BookCtx.Provider value={value}>
      {children}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 z-[130] w-[min(92vw,420px)] -translate-x-1/2 rounded-xl border px-4 py-2.5 text-center text-sm font-semibold shadow-2xl ${toast.err ? "border-loss bg-panel text-loss" : "border-prism-accent/50 bg-black text-prism-text"}`}>
          {toast.msg}
        </div>
      )}
    </BookCtx.Provider>
  );
}
