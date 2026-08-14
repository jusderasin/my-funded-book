"use client";

import { useState } from "react";
import { useBook } from "@/components/BookProvider";
import { Field, inputCls, Chip, PrimaryBtn, GhostBtn } from "@/components/ui";

export default function SettingsPage() {
  const { profile, saveProfile, trades, lang, setLang, t, notify, subscription, reload } = useBook();
  const [f, setF] = useState({ name: profile.name, pin: profile.pin });
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const locale = lang === "fr" ? "fr-FR" : "en-US";
  const isActive = subscription && subscription.status === "active";
  const isCanceling = subscription?.cancel_at_period_end === true;
  const periodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;
  const daysLeft = periodEnd ? Math.max(0, Math.ceil((periodEnd.getTime() - Date.now()) / 86400000)) : null;
  const memberSince = profile?.created_at ? new Date(profile.created_at) : null;
  const fmtDate = (d) => (d ? d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }) : "—");

  async function save() {
    setSaving(true);
    await saveProfile({ name: f.name || "trader", pin: f.pin || "1234", starting_balance: profile.starting_balance ?? 0 });
    setSaving(false);
  }

  function replayTutorial() {
    if (typeof window !== "undefined") window.dispatchEvent(new Event("mtb-replay-tutorial"));
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

  return (
    <div className="mx-auto max-w-[720px]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[18px] font-extrabold">{t("settings_title")}</h2>
        <div className="flex gap-2">
          <GhostBtn onClick={exportCSV}>{t("settings_export")}</GhostBtn>
          <PrimaryBtn onClick={save} disabled={saving}>{saving ? t("m_sending") : t("settings_save")}</PrimaryBtn>
        </div>
      </div>

      {/* Profil */}
      <div className="mb-3.5 rounded-2xl border border-line bg-panel p-[18px]">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted2">{lang === "en" ? "Profile" : "Profil"}</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("settings_name")}><input className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label={t("settings_pin")}><input className={inputCls} value={f.pin} maxLength={6} inputMode="numeric" onChange={(e) => set("pin", e.target.value)} /></Field>
        </div>
        <Field label={t("settings_lang")}>
          <div className="flex gap-1.5">
            <Chip active={lang === "fr"} onClick={() => setLang("fr")}>Français</Chip>
            <Chip active={lang === "en"} onClick={() => setLang("en")}>English</Chip>
          </div>
        </Field>
      </div>

      {/* Aide */}
      <div className="mb-3.5 rounded-2xl border border-line bg-panel p-[18px]">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted2">{lang === "en" ? "Help" : "Aide"}</div>
        <GhostBtn className="w-full" onClick={replayTutorial}>{lang === "en" ? "↻ Replay demo" : "↻ Revoir la démo"}</GhostBtn>
        <div className="mt-1.5 text-[11px] text-muted2">{lang === "en" ? "Take the guided tour of the app again." : "Refaire le tour guidé de l'application."}</div>
      </div>

      {/* Abonnement */}
      <div className="rounded-2xl border border-line bg-panel p-[18px]">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted2">{t("sub_section")}</div>
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
    </div>
  );
}
