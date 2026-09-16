"use client";

import { useEffect, useState } from "react";
import { BellRing, Check, Loader2, Send, ShieldAlert, Smartphone } from "lucide-react";
import { PrimaryBtn } from "@/components/ui";

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

const DEFAULT_SETTINGS = { risk: true, payout: true, mindset: true, daily: false };

export function PushNotifications({ profile, saveProfile, lang, notify }) {
  const L = lang === "en" ? "en" : "fr";
  const [permission, setPermission] = useState("default");
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS, ...(profile?.notification_settings || {}) });

  useEffect(() => {
    setSettings({ ...DEFAULT_SETTINGS, ...(profile?.notification_settings || {}) });
  }, [profile?.notification_settings]);

  useEffect(() => {
    const ready = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(ready);
    if (!ready) return;
    setPermission(Notification.permission);
    navigator.serviceWorker.ready.then((registration) => registration.pushManager.getSubscription()).then((subscription) => setSubscribed(Boolean(subscription))).catch(() => {});
  }, []);

  async function enable() {
    if (!supported) return;
    setBusy(true);
    try {
      const keyResponse = await fetch("/api/push/public-key");
      const { publicKey, error } = await keyResponse.json();
      if (!keyResponse.ok || !publicKey) throw new Error(error || "Notifications non configurées.");
      const registration = await navigator.serviceWorker.ready;
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") throw new Error(L === "en" ? "Permission was not granted." : "Autorisation non accordée.");
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      const response = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Impossible d'enregistrer ce téléphone.");
      setSubscribed(true);
      notify(L === "en" ? "Phone notifications enabled." : "Notifications téléphone activées.");
    } catch (error) {
      notify(error.message || "Erreur de notification.", true);
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    try {
      const response = await fetch("/api/push/test", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Test impossible.");
      notify(L === "en" ? "Test notification sent." : "Notification de test envoyée.");
    } catch (error) {
      notify(error.message || "Erreur de notification.", true);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(key) {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    const saved = await saveProfile({ notification_settings: next });
    if (!saved) setSettings(settings);
  }

  const options = [
    ["risk", L === "en" ? "Risk protection" : "Protection du risque", L === "en" ? "Drawdown, daily loss and low margin." : "Drawdown, daily loss et marge faible."],
    ["payout", L === "en" ? "Account & payout" : "Compte & payout", L === "en" ? "Evaluation passed and withdrawal eligibility." : "Compte validé et éligibilité payout."],
    ["mindset", L === "en" ? "Psycho reminder" : "Rappel Psycho", L === "en" ? "A reminder after a trade without a check-in." : "Un rappel après un trade sans check-in."],
    ["daily", L === "en" ? "Daily digest" : "Résumé quotidien", L === "en" ? "One concise recap of your journal." : "Un bilan concis de ton journal."],
  ];

  return <section className="rounded-2xl border border-line bg-panel p-[18px]">
    <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted2"><BellRing size={13} /> {L === "en" ? "Phone notifications" : "Notifications téléphone"}</div><p className="mt-2 text-[12px] leading-5 text-muted2">{L === "en" ? "Receive real alerts even when MyTradeBook is closed." : "Reçois de vraies alertes même lorsque MyTradeBook est fermé."}</p></div><span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${subscribed ? "border-prism-accent/30 bg-prism-accentDim text-prism-accent" : "border-line text-muted2"}`}>{subscribed ? <Check size={11} /> : <Smartphone size={11} />}{subscribed ? (L === "en" ? "Active" : "Activées") : (L === "en" ? "Off" : "Désactivées")}</span></div>
    {!supported ? <div className="mt-4 flex gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-[11px] leading-4 text-amber-200"><ShieldAlert className="h-4 w-4 shrink-0" />{L === "en" ? "Install MyTradeBook from Safari to your Home Screen, then open the installed app to enable notifications." : "Installe MyTradeBook depuis Safari sur l'écran d'accueil, puis ouvre l'app installée pour activer les notifications."}</div> : permission === "denied" ? <div className="mt-4 flex gap-2 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-[11px] leading-4 text-red-200"><ShieldAlert className="h-4 w-4 shrink-0" />{L === "en" ? "Notifications are blocked in iPhone Settings for MyTradeBook." : "Les notifications sont bloquées dans les Réglages iPhone pour MyTradeBook."}</div> : <div className="mt-4 flex flex-wrap gap-2"><PrimaryBtn className="px-3 py-2 text-[12px]" onClick={enable} disabled={busy || subscribed}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}{subscribed ? (L === "en" ? "Phone enabled" : "Téléphone activé") : (L === "en" ? "Enable on this phone" : "Activer sur ce téléphone")}</PrimaryBtn>{subscribed && <button onClick={sendTest} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-line2 px-3 py-2 text-[12px] font-bold text-white hover:bg-panel2 disabled:opacity-60"><Send className="h-3.5 w-3.5" />{L === "en" ? "Send a test" : "Envoyer un test"}</button>}</div>}
    <div className="mt-4 space-y-2 border-t border-line pt-4">{options.map(([key, title, description]) => <button key={key} onClick={() => toggle(key)} className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-panel2"><span><span className="block text-[12px] font-semibold text-white">{title}</span><span className="block text-[10.5px] text-muted2">{description}</span></span><span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${settings[key] ? "bg-prism-accent" : "bg-white/10"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${settings[key] ? "left-[18px]" : "left-0.5"}`} /></span></button>)}</div>
  </section>;
}
