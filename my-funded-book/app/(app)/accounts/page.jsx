"use client";

// Account Manager — liste des comptes prop firm.
// Toute la logique de risque vient de lib/accountHealth.js (inchangée) ;
// cette page ne fait que l'afficher.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Info, MoreHorizontal, Plus, RefreshCw, Rocket, Search } from "lucide-react";
import { useBook } from "@/components/BookProvider";
import { AccountModal } from "@/components/modals";
import { ConfirmModal } from "@/components/prism/TerminalPrimitives";
import AccountWizard from "@/components/accounts/AccountWizard";
import { accountHealth } from "@/lib/accountHealth";
import {
  AMBER, Badge, Bar, CYAN, GREEN, INPUT, OUTLINE_CYAN, PHASE_TONE, RED,
  accountName, firmLabel, money, phaseOf,
} from "@/components/accounts/shared";

const TXT = {
  fr: {
    title: "Gestionnaire de comptes", subtitle: "Suivi et gestion de tes comptes prop firm", add: "Ajouter un compte", search: "Rechercher un compte…",
    active: "Actifs", all: "Tous", emptyTitle: "Aucun compte prop pour l'instant",
    emptyText: "Ajoute tes comptes prop firm pour suivre les règles, les objectifs, les cycles de payout et voir des analyses dédiées sur ton Dashboard.",
    emptyCta: "Créer ton premier compte", noMatch: "Aucun compte ne correspond à ta recherche.",
    balance: "Solde", target: "Profit target", dd: "Drawdown utilisé", trades: "trades", days: "jours",
    rename: "Renommer", edit: "Modifier les règles", promote: "Passer en Funded", del: "Supprimer",
    phase: { eval: "Évaluation", funded: "Funded", failed: "Cramé", paid: "Payé" },
    confirmDel: "Supprimer ce compte ?", confirmDelMsg: (n) => `« ${n} » sera supprimé. Ses trades restent dans ton journal mais perdent le lien avec ce compte.`,
    confirmPromote: "Passer en Funded ?", confirmPromoteMsg: (n) => `« ${n} » passe en compte Funded. Tes trades et ton P&L restent liés.`,
    disclaimer: "Estimations basées sur tes trades loggés (P&L réalisé), pas l'unrealized intraday. Indicateur, pas la valeur officielle de la prop firm.",
    blown: "CRAMÉ",
  },
  en: {
    title: "Account Manager", subtitle: "Track and manage your prop firm accounts", add: "Add Account", search: "Search accounts…",
    active: "Active", all: "All", emptyTitle: "No prop accounts yet",
    emptyText: "Add your prop firm accounts to track rules, targets, payout cycles, and view scoped analytics on your Dashboard.",
    emptyCta: "Create Your First Account", noMatch: "No account matches your search.",
    balance: "Balance", target: "Profit target", dd: "Drawdown used", trades: "trades", days: "days",
    rename: "Rename", edit: "Edit rules", promote: "Move to Funded", del: "Delete",
    phase: { eval: "Evaluation", funded: "Funded", failed: "Blown", paid: "Paid" },
    confirmDel: "Delete this account?", confirmDelMsg: (n) => `“${n}” will be deleted. Its trades stay in your journal but lose the link to this account.`,
    confirmPromote: "Move to Funded?", confirmPromoteMsg: (n) => `“${n}” becomes a Funded account. Your trades and P&L stay linked.`,
    disclaimer: "Estimates from your logged trades (realized P&L), not intraday unrealized. Indicator, not the firm's official value.",
    blown: "BLOWN",
  },
};

export default function AccountsPage() {
  const { accounts, trades, certificates, lang, updateAccount, deleteAccount, reload } = useBook();
  const router = useRouter();
  const L = lang === "en" ? "en" : "fr";
  const T = TXT[L];

  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("active");
  const [wizard, setWizard] = useState(false);
  const [editing, setEditing] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [confirm, setConfirm] = useState(null); // { kind: "delete" | "promote", account }
  const [refreshing, setRefreshing] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts
      .map((a) => ({ a, h: accountHealth(a, trades, certificates, L) }))
      .filter(({ a, h }) => scope === "all" || !["failed", "paid"].includes(phaseOf(a, h)))
      .filter(({ a }) => !q || `${accountName(a)} ${firmLabel(a.firm)}`.toLowerCase().includes(q));
  }, [accounts, trades, certificates, L, scope, query]);

  async function refresh() {
    setRefreshing(true);
    await reload?.();
    setRefreshing(false);
  }

  async function runConfirm() {
    const { kind, account } = confirm;
    setConfirm(null);
    if (kind === "delete") await deleteAccount(account.id);
    if (kind === "promote") await updateAccount(account.id, { type: "funded", status: "funded" });
  }

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-8 text-prism-text sm:px-10">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">{T.title}</h1>
          <p className="mt-1 text-sm text-prism-muted">{T.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={refresh} aria-label="refresh" className="grid h-10 w-10 place-items-center rounded-lg border border-prism-line text-prism-muted hover:text-prism-text">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button type="button" onClick={() => setWizard(true)} className={OUTLINE_CYAN}><Plus className="h-4 w-4" />{T.add}</button>
        </div>
      </header>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-prism-muted" />
          <input className={`${INPUT} pl-9 font-sans text-sm`} placeholder={T.search} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="inline-flex rounded-lg border border-prism-line bg-prism-surface p-1">
          {["active", "all"].map((s) => (
            <button key={s} type="button" onClick={() => setScope(s)} className={`rounded-md px-3 py-1.5 text-xs font-medium ${scope === s ? "bg-prism-panel2 text-prism-text" : "text-prism-muted"}`}>{T[s]}</button>
          ))}
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl border border-prism-line bg-prism-panel2"><Building2 className="h-7 w-7 text-prism-muted" /></span>
          <h2 className="mt-6 text-lg font-bold">{T.emptyTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-prism-muted">{T.emptyText}</p>
          <button type="button" onClick={() => setWizard(true)} className={`${OUTLINE_CYAN} mt-7`}><Plus className="h-4 w-4" />{T.emptyCta}</button>
        </div>
      ) : rows.length === 0 ? (
        <p className="py-16 text-center text-sm text-prism-muted">{T.noMatch}</p>
      ) : (
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
          {rows.map(({ a, h }) => (
            <AccountCard
              key={a.id}
              a={a}
              h={h}
              T={T}
              renaming={renaming === a.id}
              onOpen={() => router.push(`/accounts/${a.id}`)}
              onRename={() => setRenaming(a.id)}
              onRenamed={async (note) => { setRenaming(null); if (note && note !== a.note) await updateAccount(a.id, { note }); }}
              onEdit={() => setEditing(a)}
              onPromote={() => setConfirm({ kind: "promote", account: a })}
              onDelete={() => setConfirm({ kind: "delete", account: a })}
            />
          ))}
        </div>
      )}

      {accounts.length > 0 && (
        <p className="mt-8 flex items-start gap-2 text-[11px] text-prism-muted"><Info className="mt-px h-3.5 w-3.5 shrink-0" />{T.disclaimer}</p>
      )}

      {wizard && <AccountWizard onClose={() => setWizard(false)} onCreated={(acc) => { setWizard(false); router.push(`/accounts/${acc.id}`); }} />}
      {editing && <AccountModal editing={editing} onClose={() => setEditing(null)} />}
      {confirm && (
        <ConfirmModal
          title={confirm.kind === "delete" ? T.confirmDel : T.confirmPromote}
          message={confirm.kind === "delete" ? T.confirmDelMsg(accountName(confirm.account)) : T.confirmPromoteMsg(accountName(confirm.account))}
          confirmLabel={confirm.kind === "delete" ? T.del : T.promote}
          onClose={() => setConfirm(null)}
          onConfirm={runConfirm}
        />
      )}
    </div>
  );
}

function AccountCard({ a, h, T, renaming, onOpen, onRename, onRenamed, onEdit, onPromote, onDelete }) {
  const [menu, setMenu] = useState(false);
  const phase = phaseOf(a, h);
  const hasDD = h.maxDD != null && h.maxDD > 0;
  const ddUsed = hasDD ? Math.max(0, h.maxDD - h.ddMargin) : 0;
  const ddPct = hasDD ? (ddUsed / h.maxDD) * 100 : 0;
  const ddColor = h.breached || ddPct >= 80 ? RED : ddPct >= 50 ? AMBER : CYAN;
  const winRate = h.trades ? Math.round((h.wins / h.trades) * 100) : 0;
  const alert = h.alerts.find((x) => x.level === "danger") || h.alerts.find((x) => x.level === "ok") || h.alerts.find((x) => x.level === "warn");
  const stop = (fn) => (e) => { e.stopPropagation(); setMenu(false); fn(); };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !renaming && onOpen()}
      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !renaming) { e.preventDefault(); onOpen(); } }}
      className={`group relative cursor-pointer rounded-xl border bg-prism-panel p-5 transition hover:border-prism-line2 focus:outline-none focus-visible:border-prism-accent ${h.breached ? "border-[rgba(239,68,68,0.5)]" : "border-prism-line"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[.12em] text-prism-accent">{firmLabel(a.firm)}</span>
            <Badge tone={PHASE_TONE[phase]}>{T.phase[phase]}</Badge>
          </div>
          {renaming ? (
            <input
              autoFocus
              defaultValue={a.note || ""}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") onRenamed(e.currentTarget.value.trim()); if (e.key === "Escape") onRenamed(null); }}
              onBlur={(e) => onRenamed(e.currentTarget.value.trim())}
              className={`${INPUT} mt-2 h-9 font-sans text-sm`}
            />
          ) : (
            <h3 className="mt-2 truncate text-base font-bold">{accountName(a)}</h3>
          )}
          <p className="mt-0.5 text-xs text-prism-muted">{money(a.size, false)}</p>
        </div>
        <div className="relative">
          <button type="button" onClick={(e) => { e.stopPropagation(); setMenu((v) => !v); }} className="grid h-8 w-8 place-items-center rounded-md text-prism-muted hover:bg-prism-panel2 hover:text-prism-text" aria-label="menu">
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menu && (
            <div className="absolute right-0 top-9 z-20 w-52 overflow-hidden rounded-lg border border-prism-line bg-prism-panel shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <MenuItem onClick={stop(onRename)}>{T.rename}</MenuItem>
              <MenuItem onClick={stop(onEdit)}>{T.edit}</MenuItem>
              {phase === "eval" && <MenuItem onClick={stop(onPromote)}>{T.promote}</MenuItem>}
              <MenuItem danger onClick={stop(onDelete)}>{T.del}</MenuItem>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-prism-muted">{T.balance}</p>
          <p className="mt-1 font-mono text-2xl font-bold">{money(h.balance)}</p>
        </div>
        <p className={`font-mono text-sm font-bold ${h.breached ? "text-prism-loss" : h.cum >= 0 ? "text-prism-win" : "text-prism-loss"}`}>
          {h.breached ? T.blown : `${h.cum >= 0 ? "+" : ""}${money(h.cum)}`}
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {h.target != null && h.target > 0 && (
          <div>
            <div className="mb-1.5 flex justify-between text-[11px]"><span className="text-prism-muted">{T.target}</span><span className="font-mono">{money(h.cum, false)} / {money(h.target, false)}</span></div>
            <Bar pct={h.targetPct || 0} color={h.targetReached ? GREEN : CYAN} />
          </div>
        )}
        {hasDD && (
          <div>
            <div className="mb-1.5 flex justify-between text-[11px]"><span className="text-prism-muted">{T.dd}</span><span className="font-mono">{money(ddUsed, false)} / {money(h.maxDD, false)}</span></div>
            <Bar pct={ddPct} color={ddColor} />
          </div>
        )}
      </div>

      {alert && (
        <p className={`mt-4 rounded-md border px-3 py-2 text-[11px] font-semibold ${alert.level === "danger" ? "border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.08)] text-prism-loss" : alert.level === "ok" ? "border-[rgba(34,197,94,0.35)] bg-[rgba(34,197,94,0.08)] text-prism-win" : "border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.08)] text-amber-400"}`}>
          {alert.msg}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-prism-line pt-3 font-mono text-[11px] text-prism-muted">
        <span>{h.trades} {T.trades} · <span className="text-prism-win">{h.wins}W</span> <span className="text-prism-loss">{h.losses}L</span></span>
        <span>WR {winRate}%</span>
        <span>{h.tradingDays} {T.days}</span>
      </div>

      {phase === "eval" && h.targetReached && !h.breached && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onPromote(); }} className="mt-4 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-prism-win text-xs font-bold text-black">
          <Rocket className="h-3.5 w-3.5" />{T.promote}
        </button>
      )}
    </div>
  );
}

function MenuItem({ children, onClick, danger }) {
  return <button type="button" onClick={onClick} className={`block w-full px-3 py-2.5 text-left text-xs hover:bg-prism-panel2 ${danger ? "text-prism-loss" : "text-prism-text"}`}>{children}</button>;
}
