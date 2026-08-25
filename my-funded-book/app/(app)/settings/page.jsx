"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useBook } from "@/components/BookProvider";
import { createClient } from "@/lib/supabase/client";
import { Field, inputCls, Chip, PrimaryBtn, GhostBtn } from "@/components/ui";
import { User, CreditCard, Lock, Eye, SlidersHorizontal } from "lucide-react";

export default function SettingsPage() {
  const { profile, saveProfile, trades, lang, setLang, t, notify, subscription, reload } = useBook();
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState("profile");
  const [f, setF] = useState({ name: profile.name, pin: profile.pin, starting_balance: profile.starting_balance ?? 0 });
  const [saving, setSaving] = useState(false);
  const [pinSaving, setPinSaving] = useState(false);
  const [optSaving, setOptSaving] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const optedIn = !!profile?.leaderboard_opt_in;

  // Resync du formulaire quand le vrai profil arrive de Supabase
  useEffect(() => {
    setF({
      name: profile.name ?? "trader",
      pin: profile.pin ?? "1234",
      starting_balance: profile.starting_balance ?? 0,
    });
  }, [profile.id]);

  // Abonnement (inchangé)
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Compte
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [delText, setDelText] = useState("");
  const [delLoading, setDelLoading] = useState(false);

  const locale = lang === "fr" ? "fr-FR" : "en-US";
  const isActive = subscription && subscription.status === "active";
  const isCanceling = subscription?.cancel_at_period_end === true;
  const periodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;
  const daysLeft = periodEnd ? Math.max(0, Math.ceil((periodEnd.getTime() - Date.now()) / 86400000)) : null;
  const memberSince = profile?.created_at ? new Date(profile.created_at) : null;
  const fmtDate = (d) => (d ? d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }) : "—");

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (alive && data?.user?.email) {
        setEmail(data.user.email);
        setNewEmail(data.user.email);
      }
    })();
    return () => { alive = false; };
  }, [supabase]);

  async function save() {
    setSaving(true);
    await saveProfile({ name: f.name || "trader", starting_balance: Number(f.starting_balance) || 0 });
    setSaving(false);
    notify(lang === "en" ? "Profile saved." : "Profil enregistré.");
  }

  async function savePin() {
    setPinSaving(true);
    await saveProfile({ pin: f.pin || "1234" });
    setPinSaving(false);
    notify(lang === "en" ? "PIN updated." : "Code PIN mis à jour.");
  }

  async function toggleOptIn() {
    setOptSaving(true);
    await saveProfile({ leaderboard_opt_in: !optedIn });
    setOptSaving(false);
  }

  function replayTutorial() {
    if (typeof window !== "undefined") window.dispatchEvent(new Event("mtb-replay-tutorial"));
  }

  function openNavCustomizer() {
    if (typeof window !== "undefined") window.dispatchEvent(new Event("mtb-open-nav-customizer"));
  }

  function exportCSV() {
    const rows = [["date", "symbol", "dir", "session", "grade", "r", "pnl", "setup", "tags", "plan", "why"]];
    trades.forEach((tr) =>
      rows.push([tr.date, tr.symbol, tr.dir, tr.session, tr.grade, tr.r, tr.pnl, tr.setup, (tr.tags || []).join("|"), tr.plan ? 1 : 0, (tr.why || "").replace(/"/g, '""')])
    );
    const csv = rows.map((r) => r.map((c) => (/[",\n]/.test(String(c)) ? '"' + c + '"' : c)).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "myfundedbook_trades.csv";
    a.click();
  }

  async function openPortal() {
    try {
      setPortalLoading(true);
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else { setPortalLoading(false); notify(data.error || "Erreur", true); }
    } catch (e) { setPortalLoading(false); notify(e.message, true); }
  }

  async function cancelSub() {
    try {
      setCancelLoading(true);
      const res = await fetch("/api/stripe/cancel", { method: "POST" });
      const data = await res.json();
      if (data.ok) { notify(t("sub_cancel_done")); setCancelConfirm(false); await reload(); }
      else notify(data.error || "Erreur", true);
    } catch (e) { notify(e.message, true); }
    finally { setCancelLoading(false); }
  }

  async function changeEmail() {
    if (!newEmail || newEmail === email) return;
    setEmailLoading(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setEmailLoading(false);
    if (error) notify(error.message, true);
    else notify(lang === "en" ? "Confirmation email sent to your new address." : "Email de confirmation envoyé à ta nouvelle adresse.");
  }

  async function changePassword() {
    if (!newPwd || newPwd.length < 6) {
      notify(lang === "en" ? "Password must be at least 6 characters." : "Le mot de passe doit faire au moins 6 caractères.", true);
      return;
    }
    setPwdLoading(true);
    const { error: reauthErr } = await supabase.auth.signInWithPassword({ email, password: curPwd });
    if (reauthErr) {
      setPwdLoading(false);
      notify(lang === "en" ? "Current password is incorrect." : "Mot de passe actuel incorrect.", true);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setPwdLoading(false);
    if (error) notify(error.message, true);
    else { setCurPwd(""); setNewPwd(""); notify(lang === "en" ? "Password updated." : "Mot de passe mis à jour."); }
  }

  async function deleteAccount() {
    setDelLoading(true);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        setDelLoading(false);
        notify(lang === "en" ? "Deletion failed. Try again or contact support." : "Échec de la suppression. Réessaie ou contacte le support.", true);
        return;
      }
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (e) {
      setDelLoading(false);
      notify(e.message, true);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const tabs = [
    { id: "profile", label: lang === "en" ? "Profile" : "Profil", icon: User },
    { id: "subscription", label: lang === "en" ? "Subscription" : "Abonnement", icon: CreditCard },
    { id: "account", label: lang === "en" ? "Account" : "Compte", icon: Lock },
  ];

  const cardCls = "rounded-2xl border border-line bg-panel p-[18px]";
  const sectionLabel = "mb-3 text-[11px] font-bold uppercase tracking-widest text-muted2";

  return (
    <div className="mx-auto max-w-[720px]">
      <h2 className="mb-4 text-[18px] font-extrabold">{t("settings_title")}</h2>

      <div className="mb-4 flex gap-1 border-b border-line">
        {tabs.map((tb) => {
          const Icon = tb.icon;
          const on = tab === tb.id;
          return (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-3.5 py-2 text-[13px] font-semibold transition-colors ${on ? "border-accent text-accent" : "border-transparent text-muted2 hover:text-white"}`}>
              <Icon size={15} /> {tb.label}
            </button>
          );
        })}
      </div>

      {tab === "profile" && (
        <div className="space-y-3.5">
          <div className={cardCls}>
            <div className={sectionLabel}>{lang === "en" ? "Profile" : "Profil"}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("settings_name")}><input className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
              <Field label={lang === "en" ? "Starting balance ($)" : "Balance de départ ($)"}>
                <input className={inputCls} type="number" inputMode="decimal" value={f.starting_balance} onChange={(e) => set("starting_balance", e.target.value)} />
              </Field>
            </div>
            <div className="mt-1.5 text-[11px] text-muted2">
              {lang === "en"
                ? "Your account's starting balance. Your dashboard balance = this + your net P&L."
                : "Balance de départ de ton compte. La balance du dashboard = cette valeur + ton P&L net."}
            </div>
            <Field label={t("settings_lang")}>
              <div className="flex gap-1.5">
                <Chip active={lang === "fr"} onClick={() => setLang("fr")}>Français</Chip>
                <Chip active={lang === "en"} onClick={() => setLang("en")}>English</Chip>
              </div>
            </Field>
            <div className="mt-3 flex justify-end">
              <PrimaryBtn onClick={save} disabled={saving}>{saving ? t("m_sending") : t("settings_save")}</PrimaryBtn>
            </div>
          </div>

          <div className={cardCls}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[13px] font-bold">{lang === "en" ? "Show in leaderboard" : "Participer au classement"}</div>
                <div className="mt-0.5 text-[11.5px] text-muted2">{lang === "en" ? "Make your profile visible in the ranking." : "Rends ton profil visible dans le classement."}</div>
              </div>
              <button onClick={toggleOptIn} disabled={optSaving} role="switch" aria-checked={optedIn}
                className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
                style={{ background: optedIn ? "#00d301" : "#2a2f3d" }}>
                <span className="absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-all" style={{ left: optedIn ? "23px" : "3px" }} />
              </button>
            </div>
            <div className="mt-3">
              <Link href={`/u/${profile.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[12px] font-bold text-black hover:brightness-110">
                <Eye size={14} /> {lang === "en" ? "View public profile" : "Voir mon profil public"}
              </Link>
            </div>
          </div>

          <div className={cardCls}>
            <div className={sectionLabel}>{lang === "en" ? "Menu" : "Menu"}</div>
            <GhostBtn className="flex w-full items-center justify-center gap-1.5" onClick={openNavCustomizer}>
              <SlidersHorizontal size={14} /> {lang === "en" ? "Customize menu" : "Personnaliser le menu"}
            </GhostBtn>
            <div className="mt-1.5 text-[11px] text-muted2">{lang === "en" ? "Reorder the sidebar tabs and choose which ones to show." : "Réordonne les onglets du menu latéral et choisis lesquels afficher."}</div>
          </div>

          <div className={cardCls}>
            <div className={sectionLabel}>{lang === "en" ? "Help" : "Aide"}</div>
            <GhostBtn className="w-full" onClick={replayTutorial}>{lang === "en" ? "↻ Replay demo" : "↻ Revoir la démo"}</GhostBtn>
            <div className="mt-1.5 text-[11px] text-muted2">{lang === "en" ? "Take the guided tour of the app again." : "Refaire le tour guidé de l'application."}</div>
          </div>
        </div>
      )}

      {tab === "subscription" && (
        <div className={cardCls}>
          <div className={sectionLabel}>{t("sub_section")}</div>
          {isActive ? (
            <div className="rounded-xl border border-line2 bg-panel2 p-4">
              <div className="flex items-center justify-between">
                <span className="rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide" style={{ background: "rgba(0,211,1,.12)", color: "#00d301" }}>{t("sub_active")}</span>
                {isCanceling
                  ? <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "#f59e0b" }}>{t("sub_canceled_title")}</span>
                  : <span className="text-[11px] uppercase tracking-wide text-muted2">{t("sub_next_payment")}</span>}
              </div>
              <div className="mt-2 text-center">
                <div className="font-mono text-4xl font-extrabold leading-none" style={{ color: isCanceling ? "#f59e0b" : "#00d301" }}>{daysLeft}</div>
                <div className="mt-1 text-xs text-muted2">{daysLeft === 0 ? t("sub_today") : daysLeft === 1 ? t("sub_day") : t("sub_days")}</div>
              </div>
              <div className="mt-3 space-y-1.5 border-t border-line2 pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted2">{isCanceling ? t("sub_canceled_until") : t("sub_renews_on")}</span>
                  <span className="font-mono text-white">{fmtDate(periodEnd)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted2">{t("sub_member_since")}</span>
                  <span className="font-mono text-white">{fmtDate(memberSince)}</span>
                </div>
              </div>
              <GhostBtn className="mt-3 w-full" onClick={() => { if (!portalLoading) openPortal(); }}>{portalLoading ? t("sub_loading") : t("sub_manage")}</GhostBtn>
              {!isCanceling && (
                cancelConfirm ? (
                  <div className="mt-3 rounded-lg border border-line2 bg-panel p-3">
                    <div className="text-sm font-semibold text-white">{t("sub_cancel_confirm")}</div>
                    <div className="mt-1 text-xs text-muted2">{t("sub_cancel_hint")}</div>
                    <div className="mt-2.5 flex gap-2">
                      <button onClick={() => { if (!cancelLoading) setCancelConfirm(false); }} className="flex-1 rounded-lg border border-line2 bg-panel2 py-2 text-xs font-semibold text-white">{t("sub_cancel_back")}</button>
                      <button onClick={() => { if (!cancelLoading) cancelSub(); }} disabled={cancelLoading} className="flex-1 rounded-lg py-2 text-xs font-bold text-white disabled:opacity-60" style={{ background: "#ff3b5c" }}>{cancelLoading ? t("sub_cancel_loading") : t("sub_cancel_yes")}</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setCancelConfirm(true)} className="mt-2 w-full py-1 text-center text-xs font-semibold" style={{ color: "#ff3b5c" }}>{t("sub_cancel")}</button>
                )
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-line2 bg-panel2 p-5 text-center">
              <div className="text-3xl">💳</div>
              <div className="mt-2 text-sm text-muted2">{t("sub_none")}</div>
            </div>
          )}
        </div>
      )}

      {tab === "account" && (
        <div className="space-y-3.5">
          <div className={cardCls}>
            <div className={sectionLabel}>{lang === "en" ? "Email" : "Adresse email"}</div>
            <Field label={lang === "en" ? "Email address" : "Adresse email"}>
              <input className={inputCls} type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} autoComplete="email" />
            </Field>
            <div className="mt-1.5 text-[11px] text-muted2">{lang === "en" ? "Changing your email sends a confirmation link to the new address." : "Changer d'email envoie un lien de confirmation à la nouvelle adresse."}</div>
            <div className="mt-3 flex justify-end">
              <PrimaryBtn onClick={changeEmail} disabled={emailLoading || !newEmail || newEmail === email}>{emailLoading ? "…" : (lang === "en" ? "Update email" : "Changer l'email")}</PrimaryBtn>
            </div>
          </div>

          <div className={cardCls}>
            <div className={sectionLabel}>{lang === "en" ? "Password" : "Mot de passe"}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={lang === "en" ? "Current password" : "Mot de passe actuel"}><input className={inputCls} type="password" value={curPwd} onChange={(e) => setCurPwd(e.target.value)} autoComplete="current-password" /></Field>
              <Field label={lang === "en" ? "New password" : "Nouveau mot de passe"}><input className={inputCls} type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} autoComplete="new-password" /></Field>
            </div>
            <div className="mt-3 flex justify-end">
              <PrimaryBtn onClick={changePassword} disabled={pwdLoading || !curPwd || !newPwd}>{pwdLoading ? "…" : (lang === "en" ? "Update password" : "Changer le mot de passe")}</PrimaryBtn>
            </div>
          </div>

          <div className={cardCls}>
            <div className={sectionLabel}>{lang === "en" ? "App PIN" : "Code PIN"}</div>
            <Field label={t("settings_pin")}>
              <input className={inputCls} value={f.pin} maxLength={6} inputMode="numeric" onChange={(e) => set("pin", e.target.value)} />
            </Field>
            <div className="mt-1.5 text-[11px] text-muted2">{lang === "en" ? "Quick code to unlock the app. Stored as-is — don't reuse a sensitive password." : "Code rapide pour déverrouiller l'app. Stocké tel quel — n'y mets pas un mot de passe sensible."}</div>
            <div className="mt-3 flex justify-end">
              <PrimaryBtn onClick={savePin} disabled={pinSaving}>{pinSaving ? t("m_sending") : t("settings_save")}</PrimaryBtn>
            </div>
          </div>

          <div className={cardCls}>
            <div className={sectionLabel}>{lang === "en" ? "Data" : "Données"}</div>
            <GhostBtn className="w-full" onClick={exportCSV}>{t("settings_export")}</GhostBtn>
          </div>

          <div className={cardCls}>
            <button onClick={signOut} className="w-full rounded-lg border border-line2 bg-panel2 py-2.5 text-[12px] font-bold text-muted2 hover:text-white">
              {lang === "en" ? "Sign out" : "Se déconnecter"}
            </button>
          </div>

          <div className="rounded-2xl border p-[18px]" style={{ borderColor: "rgba(255,59,92,.35)", background: "rgba(255,59,92,.05)" }}>
            <div className="mb-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: "#ff3b5c" }}>
              {lang === "en" ? "Danger zone" : "Zone de danger"}
            </div>
            {!delOpen ? (
              <>
                <div className="mb-3 text-[12.5px] text-muted2">
                  {lang === "en"
                    ? "Permanently delete your account and all your data (trades, accounts, badges…). This cannot be undone."
                    : "Supprime définitivement ton compte et toutes tes données (trades, comptes, badges…). Action irréversible."}
                </div>
                <button onClick={() => { setDelOpen(true); setDelText(""); }}
                  className="rounded-lg px-4 py-2 text-[12px] font-bold text-white" style={{ background: "#ff3b5c" }}>
                  {lang === "en" ? "Delete my account" : "Supprimer mon compte"}
                </button>
              </>
            ) : (
              <>
                <div className="mb-2 text-[12.5px] text-white">
                  {lang === "en" ? "Type DELETE to confirm permanent deletion." : "Tape SUPPRIMER pour confirmer la suppression définitive."}
                </div>
                <input className={inputCls} value={delText} onChange={(e) => setDelText(e.target.value)}
                  placeholder={lang === "en" ? "DELETE" : "SUPPRIMER"} />
                <div className="mt-3 flex gap-2">
                  <button onClick={() => { if (!delLoading) setDelOpen(false); }}
                    className="flex-1 rounded-lg border border-line2 bg-panel2 py-2 text-xs font-semibold text-white">
                    {lang === "en" ? "Cancel" : "Annuler"}
                  </button>
                  <button onClick={() => { if (!delLoading) deleteAccount(); }}
                    disabled={delLoading || delText.trim().toUpperCase() !== (lang === "en" ? "DELETE" : "SUPPRIMER")}
                    className="flex-1 rounded-lg py-2 text-xs font-bold text-white disabled:opacity-40" style={{ background: "#ff3b5c" }}>
                    {delLoading ? "…" : (lang === "en" ? "Delete forever" : "Supprimer définitivement")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
