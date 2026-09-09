"use client";

import { useState } from "react";
import { useBook } from "@/components/BookProvider";
import { GhostBtn } from "@/components/ui";
import { hasSubscriptionAccess } from "@/lib/subscription";

export function SubscriptionCard() {
  const { subscription, subscriptionError, subscriptionLoading, reloadSubscription, profile, lang, t, notify } = useBook();
  const [busy, setBusy] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const en = lang === "en";
  const sub = subscription;
  const active = hasSubscriptionAccess(sub);
  const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end) : null;
  const daysLeft = periodEnd ? Math.max(0, Math.ceil((periodEnd - Date.now()) / 86400000)) : null;
  const fmtDate = (value) => value ? new Date(value).toLocaleDateString(en ? "en-US" : "fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  }) : "—";

  async function portal() {
    setBusy("portal");
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error();
      window.location.href = data.url;
    } catch {
      notify(en ? "Billing is unavailable. Please try again." : "La facturation est indisponible. Réessaie.", true);
      setBusy(null);
    }
  }

  async function cancel() {
    setBusy("cancel");
    try {
      const response = await fetch("/api/stripe/cancel", { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error();
      setConfirm(false);
      notify(t("sub_cancel_done"));
      await reloadSubscription();
    } catch {
      notify(en ? "Cancellation could not be confirmed. Please try again." : "La résiliation n'a pas pu être confirmée. Réessaie.", true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-line2 bg-panel2 p-4">
      {subscriptionError && (
        <div role="alert" className="mb-3 text-sm text-loss">
          {en ? "Unable to refresh your subscription. The last known status is shown." : "Impossible d'actualiser ton abonnement. Le dernier état connu est affiché."}
          <button type="button" disabled={subscriptionLoading} onClick={reloadSubscription} className="ml-2 underline disabled:opacity-50">
            {en ? "Retry" : "Réessayer"}
          </button>
        </div>
      )}
      {!sub ? (
        <p className="text-sm text-muted2">{subscriptionLoading ? t("sub_loading") : subscriptionError ? "—" : t("sub_none")}</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 text-xs font-bold">
            <span className={active ? "text-accent" : "text-muted2"}>
              {sub.complimentary ? (en ? "Complimentary access" : "Accès offert") :
                sub.status === "trialing" ? (en ? "Trial in progress" : "Essai en cours") :
                active ? t("sub_active") :
                sub.status === "canceled" ? t("sub_canceled_title") :
                (en ? "Subscription inactive" : "Abonnement inactif")}
            </span>
            {sub.billing_details_loaded && sub.cancel_at_period_end && <span className="text-goldx">{t("sub_canceled_title")}</span>}
          </div>

          {sub.complimentary ? (
            <p className="mt-3 text-sm text-muted2">
              {periodEnd
                ? (en ? "Access until " : "Accès jusqu'au ") + fmtDate(periodEnd)
                : (en ? "No expiry date or automatic renewal." : "Sans date d'expiration ni renouvellement automatique.")}
            </p>
          ) : !sub.billing_details_loaded ? (
            <p className="mt-3 text-sm text-muted2">{en ? "Checking billing details…" : "Vérification de la facturation…"}</p>
          ) : active && (
            <div className="mt-3 space-y-2">
              {daysLeft != null && (
                <div className="text-center">
                  <div className="font-mono text-4xl font-extrabold text-white">{daysLeft}</div>
                  <div className="text-xs text-muted2">{daysLeft === 0 ? t("sub_today") : daysLeft === 1 ? t("sub_day") : t("sub_days")}</div>
                </div>
              )}
              <div className="flex justify-between gap-3 text-xs">
                <span className="text-muted2">{sub.cancel_at_period_end ? t("sub_canceled_until") : t("sub_renews_on")}</span>
                <span className="font-mono text-white">{fmtDate(periodEnd)}</span>
              </div>
            </div>
          )}

          <div className="mt-3 flex justify-between gap-3 border-t border-line2 pt-3 text-xs">
            <span className="text-muted2">{t("sub_member_since")}</span>
            <span className="font-mono text-white">{fmtDate(profile?.created_at)}</span>
          </div>

          {sub.can_manage && !sub.complimentary && (
            <GhostBtn className="mt-3 w-full" disabled={Boolean(busy)} onClick={portal}>
              {busy === "portal" ? t("sub_loading") : t("sub_manage")}
            </GhostBtn>
          )}

          {sub.can_cancel && !sub.complimentary && !sub.cancel_at_period_end && (
            confirm ? (
              <div className="mt-3 rounded-lg border border-line2 bg-panel p-3">
                <div className="text-sm font-semibold text-white">{t("sub_cancel_confirm")}</div>
                <div className="mt-1 text-xs text-muted2">{t("sub_cancel_hint")}</div>
                <div className="mt-2.5 flex gap-2">
                  <button disabled={Boolean(busy)} onClick={() => setConfirm(false)} className="flex-1 rounded-lg border border-line2 py-2 text-xs text-white disabled:opacity-50">{t("sub_cancel_back")}</button>
                  <button disabled={Boolean(busy)} onClick={cancel} className="flex-1 rounded-lg bg-loss py-2 text-xs font-bold text-white disabled:opacity-50">{busy === "cancel" ? t("sub_cancel_loading") : t("sub_cancel_yes")}</button>
                </div>
              </div>
            ) : <button disabled={Boolean(busy)} onClick={() => setConfirm(true)} className="mt-2 w-full py-1 text-xs font-semibold text-loss disabled:opacity-50">{t("sub_cancel")}</button>
          )}
        </>
      )}
    </div>
  );
}
