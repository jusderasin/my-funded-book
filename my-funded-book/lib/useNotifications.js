"use client";

import { useMemo } from "react";
import { BellRing, Brain, CheckCheck, ClipboardCheck } from "lucide-react";
import { accountHealth } from "@/lib/accountHealth";

export function useNotifications({ trades, accounts, certificates, lang }) {
  return useMemo(() => {
    const L = lang === "en" ? "en" : "fr";
    const latest = trades?.[0];
    const accountNotifications = (accounts || []).flatMap((account) => {
      const health = accountHealth(account, trades, certificates, L);
      const accountLabel = `${account.firm || "Compte"} · $${Number(account.size || 0).toLocaleString("fr-FR")}`;
      const href = `/accounts/${account.id}`;
      const funded = account.type === "funded" || account.status === "funded" || account.status === "passed";
      const items = [];
      if (!funded && health.targetReached && !health.breached) items.push({ id: `validated-${account.id}`, icon: CheckCheck, tone: "accent", href, title: L === "en" ? "Evaluation target reached" : "Objectif d'évaluation atteint", text: L === "en" ? `${accountLabel} is ready to move to funded.` : `${accountLabel} est prêt à passer en funded.` });
      if (funded && health.payoutEligible) items.push({ id: `payout-${account.id}`, icon: BellRing, tone: "accent", href, title: L === "en" ? "Payout available" : "Payout disponible", text: L === "en" ? `${accountLabel} meets the recorded withdrawal rules.` : `${accountLabel} respecte les règles de retrait enregistrées.` });
      health.alerts.forEach((alert, index) => items.push({ id: `risk-${account.id}-${index}`, icon: BellRing, tone: alert.level === "danger" ? "danger" : "amber", href, title: accountLabel, text: alert.msg }));
      return items;
    });
    if (!latest) return [...accountNotifications, { id: "first-trade", icon: ClipboardCheck, tone: "accent", action: "log", title: L === "en" ? "Your journal is ready" : "Ton journal est prêt", text: L === "en" ? "Log your first trade to activate your performance insights." : "Log ton premier trade pour activer tes analyses de performance." }].slice(0, 5);
    const psychology = latest.psychology;
    const hasMindset = [psychology?.emotional, psychology?.focus, psychology?.confidence].some(Boolean) || latest.emotion;
    if (!hasMindset) return [...accountNotifications, { id: `psych-${latest.id}`, icon: Brain, tone: "amber", href: "/trade-logs", title: L === "en" ? "Mindset check-in missing" : "Check-in Psycho à compléter", text: L === "en" ? "Add emotional state, focus and confidence to your latest trade." : "Ajoute ton état émotionnel, ton focus et ta confiance à ton dernier trade." }].slice(0, 5);
    return [...accountNotifications, { id: `ready-${latest.id}`, icon: CheckCheck, tone: "accent", actionable: false, href: "/calendar", title: L === "en" ? "Journal up to date" : "Journal à jour", text: L === "en" ? "Your latest trade and mindset check-in are recorded." : "Ton dernier trade et ton check-in Psycho sont bien enregistrés." }].slice(0, 5);
  }, [trades, accounts, certificates, lang]);
}
