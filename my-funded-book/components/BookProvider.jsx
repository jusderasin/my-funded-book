"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { computeStats } from "@/lib/stats";
import { translate } from "@/lib/i18n";

const BookCtx = createContext(null);
export const useBook = () => useContext(BookCtx);

export function BookProvider({ user, children }) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [lang, setLangState] = useState("fr");
  const [profile, setProfile] = useState({ name: "trader", pin: "1234", starting_balance: 600000 });
  const [trades, setTrades] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [playbooks, setPlaybooks] = useState([]);
  const [reviews, setReviews] = useState([]);
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

  const setLang = useCallback((l) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  }, []);

  const t = useCallback((key) => translate(lang, key), [lang]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [p, t, a, c, e, pb, rv, s] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("trades").select("*").order("date", { ascending: false }),
      supabase.from("accounts").select("*").order("date", { ascending: false }),
      supabase.from("certificates").select("*").order("date", { ascending: false }),
      supabase.from("expenses").select("*").order("date", { ascending: false }),
      supabase.from("playbooks").select("*").order("created_at", { ascending: true }),
      supabase.from("reviews").select("*").order("week_of", { ascending: false }),
      supabase.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    if (p.data) setProfile(p.data);
    setTrades(t.data || []);
    setAccounts(a.data || []);
    setCertificates(c.data || []);
    setExpenses(e.data || []);
    setPlaybooks(pb.data || []);
    setReviews(rv.data || []);
    setSubscription(s.data || null);
    setLoading(false);
  }, [supabase, user.id]);

  useEffect(() => {
    loadAll();
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
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) return notify(error.message, true);
      setter(list.filter((x) => x.id !== id));
      notify("Supprimé");
    },
    [supabase, notify]
  );

  // --- API par domaine ---
  const api = {
    // trades
    addTrade: (row) => insert("trades", row, setTrades, trades),
    updateTrade: (id, patch) => update("trades", id, patch, setTrades, trades),
    deleteTrade: (id) => remove("trades", id, setTrades, trades),
    // accounts
    addAccount: (row) => insert("accounts", row, setAccounts, accounts),
    deleteAccount: (id) => remove("accounts", id, setAccounts, accounts),
    // certificates
    addCert: (row) => insert("certificates", row, setCertificates, certificates),
    deleteCert: (id) => remove("certificates", id, setCertificates, certificates),
    // expenses
    addExpense: (row) => insert("expenses", row, setExpenses, expenses),
    deleteExpense: (id) => remove("expenses", id, setExpenses, expenses),
    // playbooks
    addSetup: (row) => insert("playbooks", row, setPlaybooks, playbooks),
    deleteSetup: (id) => remove("playbooks", id, setPlaybooks, playbooks),
    // profile
    saveProfile: async (patch) => {
      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", user.id)
        .select()
        .single();
      if (error) return notify(error.message, true);
      setProfile(data);
      notify("Réglages sauvegardés ✓");
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
    notify,
    reload: loadAll,
  };

  const stats = useMemo(
    () => computeStats(trades, Number(profile.starting_balance) || 0),
    [trades, profile.starting_balance]
  );

  const value = {
    loading,
    lang,
    setLang,
    t,
    user,
    profile,
    trades,
    accounts,
    certificates,
    expenses,
    playbooks,
    reviews,
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
