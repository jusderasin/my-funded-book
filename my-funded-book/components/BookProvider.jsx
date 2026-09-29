"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { computeStats } from "@/lib/stats";
import { translate } from "@/lib/i18n";

const BookCtx = createContext(null);
export const useBook = () => useContext(BookCtx);

const PRISM_THEME = { accent: "#06b6d4", loss: "#ef4444" };

function hexToRgba(hex, alpha) {
  const value = String(hex || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return `rgba(59, 130, 246, ${alpha})`;
  const integer = Number.parseInt(value, 16);
  return `rgba(${(integer >> 16) & 255}, ${(integer >> 8) & 255}, ${integer & 255}, ${alpha})`;
}

// Applique les couleurs perso du profil sur :root (CSS vars) + le thème global.
// Si la colonne est vide, on garde le fallback défini dans tailwind.config.js / globals.css.
function applyProfileVars(p) {
  if (typeof document === "undefined" || !p) return;
  // Les profils existants utilisaient "signal" (violet). La V2 adopte PRISM
  // noir/cyan comme identité par défaut sans exiger une migration de profil.
  const selectedTheme = "prism";
  const fallback = PRISM_THEME;
  // Le thème Terminal Violet est une direction visuelle complète : il ne doit
  // pas être recoloré par les anciens accents verts enregistrés dans le profil.
  const accent = fallback.accent;
  const prismAccent = fallback.accent;
  const loss = fallback.loss;
  const root = document.documentElement;

  root.style.setProperty("--accent", accent);
  root.style.setProperty("--loss", loss);
  root.style.setProperty("--prism-accent", prismAccent);
  root.style.setProperty("--prism-accent-soft", prismAccent);
  root.style.setProperty("--prism-accent-dim", hexToRgba(prismAccent, 0.13));
  root.style.setProperty("--prism-win", "#22c55e");
  root.style.setProperty("--prism-loss", loss);
  root.setAttribute("data-theme", selectedTheme);
}

export function BookProvider({ user, children }) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [lang, setLangState] = useState("fr");
  const [profile, setProfile] = useState({ name: "trader", pin: "1234", starting_balance: 0 });
  const [trades, setTrades] = useState([]);
  const [accounts, setAccounts] = useState([]);
  // Un seul contexte de trading à la fois : les métriques et le journal ne
  // peuvent donc jamais agréger par erreur deux comptes prop firm différents.
  // Account selection is now local to the account detail route. Keeping these
  // keys at null preserves the public context API for older consumers.
  const activeAccountId = null;
  const activeAccount = null;
  const [certificates, setCertificates] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [playbooks, setPlaybooks] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [dailyReviews, setDailyReviews] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [toast, setToast] = useState(null);

  const notify = useCallback((msg, err = false) => {
    setToast({ msg, err, id: Date.now() });
    setTimeout(() => setToast(null), 2200);
  }, []);
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("lang") : null;
    if (saved) setLangState(saved);
  }, []);

  useEffect(() => {
    try { localStorage.removeItem("mfb.activeAccountId"); } catch {}
  }, []);

  const setActiveAccountId = useCallback(() => {}, []);

  const setLang = useCallback((l) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  }, []);

  const t = useCallback((key) => translate(lang, key), [lang]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [p, t, a, c, e, pb, rv, dr, s] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("trades").select("*").order("date", { ascending: false }),
      supabase.from("accounts").select("*").order("date", { ascending: false }),
      supabase.from("certificates").select("*").order("date", { ascending: false }),
      supabase.from("expenses").select("*").order("date", { ascending: false }),
      supabase.from("playbooks").select("*").order("created_at", { ascending: true }),
      supabase.from("reviews").select("*").order("week_of", { ascending: false }),
      supabase.from("daily_reviews").select("*").order("date", { ascending: false }),
      supabase.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    if (p.data) {
      setProfile(p.data);
      applyProfileVars(p.data);
    }
    setTrades(t.data || []);
    setAccounts(a.data || []);
    setCertificates(c.data || []);
    setExpenses(e.data || []);
    setPlaybooks(pb.data || []);
    setReviews(rv.data || []);
    setDailyReviews(dr.data || []);
    setSubscription(s.data || null);
    setLoading(false);
  }, [supabase, user.id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Les données vivent dans Supabase, jamais dans le téléphone ou le PC.
  // On les rafraîchit au retour dans l'app et pendant qu'elle reste ouverte
  // afin que deux appareils connectés au même compte restent cohérents.
  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") loadAll();
    };
    const timer = window.setInterval(refreshWhenVisible, 30000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadAll]);

  // --- CRUD génériques ---
  const insert = useCallback(
    async (table, row, setter, list) => {
      const { data, error } = await supabase.from(table).insert(row).select().single();
      if (error) return notify(error.message, true);
      setter([data, ...list]);
      notify("Ajouté ✓");
      return data;
    },
    [supabase, notify]
  );

  const update = useCallback(
    async (table, id, patch, setter, list) => {
      const { data, error } = await supabase.from(table).update(patch).eq("id", id).select().single();
      if (error) return notify(error.message, true);
      setter(list.map((x) => (x.id === id ? data : x)));
      notify("Mis à jour ✓");
      return data;
    },
    [supabase, notify]
  );

  const remove = useCallback(
    async (table, id, setter, list) => {
      // A DELETE blocked by RLS can return zero rows without an error. Confirm
      // the deleted id before changing local state, otherwise old trades remain
      // in Supabase and continue to feed the leaderboard.
      const { data, error } = await supabase.from(table).delete().eq("id", id).select("id");
      if (error) return notify(error.message, true);
      if (!data?.some((row) => row.id === id)) {
        notify("Suppression non confirmee par la base de donnees.", true);
        return false;
      }
      setter((previous) => previous.filter((x) => x.id !== id));
      if (table === "trades" && typeof window !== "undefined") {
        window.dispatchEvent(new Event("mfb:trades-changed"));
      }
      notify("Supprimé");
      return true;
    },
    [supabase, notify]
  );

  // Insert en masse (import CSV) : contrairement à `insert`, prend un tableau de lignes
  // et ajoute le résultat via une mise à jour fonctionnelle du state (pas de closure stale
  // même quand l'appelant enchaîne plusieurs chunks d'affilée dans la même tick).
  const importTrades = useCallback(
    async (rows) => {
      if (!rows || rows.length === 0) return true;
      const { data, error } = await supabase.from("trades").insert(rows).select();
      if (error) {
        notify(error.message, true);
        return false;
      }
      setTrades((prev) => [...(data || []), ...prev]);
      return true;
    },
    [supabase, notify]
  );

  // --- API par domaine ---
  const api = {
    // trades
    addTrade: (row) => insert("trades", row, setTrades, trades),
    updateTrade: (id, patch) => update("trades", id, patch, setTrades, trades),
    deleteTrade: (id) => remove("trades", id, setTrades, trades),
    importTrades,
    // accounts
    addAccount: (row) => insert("accounts", row, setAccounts, accounts),
    updateAccount: (id, patch) => update("accounts", id, patch, setAccounts, accounts),
    deleteAccount: (id) => remove("accounts", id, setAccounts, accounts),
    // certificates
    addCert: (row) => insert("certificates", row, setCertificates, certificates),
    deleteCert: (id) => remove("certificates", id, setCertificates, certificates),
    // expenses
    addExpense: (row) => insert("expenses", row, setExpenses, expenses),
    deleteExpense: (id) => remove("expenses", id, setExpenses, expenses),
    // playbooks
    addSetup: (row) => insert("playbooks", row, setPlaybooks, playbooks),
    updateSetup: (id, patch) => update("playbooks", id, patch, setPlaybooks, playbooks),
    deleteSetup: (id) => remove("playbooks", id, setPlaybooks, playbooks),
    // profile
    saveProfile: async (patch) => {
      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", user.id)
        .select()
        .single();
      if (error) {
        notify(error.message, true);
        return false;
      }
      setProfile(data);
      applyProfileVars(data);
      notify("Réglages sauvegardés ✓");
      return data;
    },
    // review (upsert par semaine)
    saveReview: async (weekOf, fields) => {
      const { data, error } = await supabase
        .from("reviews")
        .upsert({ week_of: weekOf, ...fields }, { onConflict: "user_id,week_of" })
        .select()
        .single();
      if (error) return notify(error.message, true);
      setReviews((prev) => {
        const rest = prev.filter((r) => r.week_of !== weekOf);
        return [data, ...rest];
      });
      notify("Review sauvegardée ✓");
    },
    saveDailyReview: async (date, fields) => {
      const { data, error } = await supabase.from("daily_reviews").upsert({ date, ...fields, updated_at: new Date().toISOString() }, { onConflict: "user_id,date" }).select().single();
      if (error) return notify(error.message, true);
      setDailyReviews((prev) => [data, ...prev.filter((item) => item.date !== date)]);
      notify("Revue du jour sauvegardée");
      return data;
    },
    notify,
    reload: loadAll,
  };

  const stats = useMemo(
    () => computeStats(trades, Number(profile.starting_balance) || 0),
    [trades, profile.starting_balance]
  );

  const scopedTrades = useMemo(
    () => trades
      .slice()
      .sort((a, b) => {
        const dateOrder = String(b.date || "").localeCompare(String(a.date || ""));
        return dateOrder || String(b.created_at || "").localeCompare(String(a.created_at || ""));
      }),
    [trades]
  );
  const scopedStats = useMemo(
    () => computeStats(scopedTrades, Number(profile.starting_balance) || 0),
    [scopedTrades, profile.starting_balance]
  );

  // Trades toujours triés par DATE du trade (récent en haut), puis par date d'ajout.
  const sortedTrades = useMemo(
    () =>
      [...trades].sort((a, b) => {
        const d = String(b.date || "").localeCompare(String(a.date || ""));
        if (d !== 0) return d;
        return String(b.created_at || "").localeCompare(String(a.created_at || ""));
      }),
    [trades]
  );

  const value = {
    loading,
    lang,
    setLang,
    t,
    user,
    profile,
    trades: sortedTrades,
    accounts,
    activeAccount,
    activeAccountId,
    setActiveAccountId,
    scopedTrades,
    scopedStats,
    certificates,
    expenses,
    playbooks,
    reviews,
    dailyReviews,
    subscription,
    stats,
    toast,
    ...api,
  };

  return (
    <BookCtx.Provider value={value}>
      {children}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-2xl ${
            toast.err ? "border-loss text-loss bg-panel" : "border-line2 text-white bg-panel2"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </BookCtx.Provider>
  );
}
