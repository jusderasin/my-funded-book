"use client";

import { useState } from "react";
import { Modal, Field, inputCls, Chip, PrimaryBtn, GhostBtn } from "./ui";
import { FilePicker } from "./FilePicker";
import { useBook } from "./BookProvider";
import { uploadFile } from "@/lib/upload";
import { FIRMS, SESSIONS, GRADES, TAG_LIB } from "@/lib/constants";
import { todayISO } from "@/lib/format";

const firmOptions = Object.keys(FIRMS);

export function LogTradeModal({ editing, onClose }) {
  const { addTrade, updateTrade, playbooks, notify, t } = useBook();
  const [f, setF] = useState(
    editing || {
      symbol: "MNQ", date: todayISO(), dir: "long", session: "NY AM", grade: "A+",
      r: "", pnl: "", setup: "", tags: [], why: "", plan: true,
    }
  );
  const [file, setFile] = useState(null);
  const [shotUrl, setShotUrl] = useState(editing ? editing.screenshot_url || null : null);
  const [uploading, setUploading] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const toggleTag = (tag) => set("tags", f.tags.includes(tag) ? f.tags.filter((x) => x !== tag) : [...f.tags, tag]);

  async function submit() {
    let screenshot_url = shotUrl;
    if (file) {
      try {
        setUploading(true);
        screenshot_url = await uploadFile(file, "trades");
      } catch (e) {
        setUploading(false);
        return notify(e.message, true);
      }
      setUploading(false);
    }
    const row = {
      symbol: (f.symbol || "MNQ").toUpperCase(), date: f.date, dir: f.dir, session: f.session,
      grade: f.grade, r: Number(f.r) || 0, pnl: Number(f.pnl) || 0, setup: f.setup || null,
      tags: f.tags, why: f.why || null, plan: !!f.plan, screenshot_url: screenshot_url || null,
    };
    if (editing) await updateTrade(editing.id, row);
    else await addTrade(row);
    onClose();
  }

  return (
    <Modal
      title={editing ? t("m_edit_trade") : t("m_log_trade")}
      onClose={onClose}
      footer={
        <>
          <GhostBtn className="flex-1" onClick={onClose}>{t("m_cancel")}</GhostBtn>
          <PrimaryBtn className="flex-1" onClick={submit} disabled={uploading}>
            {uploading ? t("m_sending") : editing ? t("m_save") : t("m_log_trade")}
          </PrimaryBtn>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("m_instrument")}><input className={inputCls} value={f.symbol} onChange={(e) => set("symbol", e.target.value)} placeholder="MNQ, NQ, MGC…" /></Field>
        <Field label={t("m_date")}><input type="date" className={inputCls} value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
      </div>
      <Field label={t("m_direction")}>
        <div className="flex gap-1.5">
          {["long", "short"].map((d) => <Chip key={d} active={f.dir === d} onClick={() => set("dir", d)}>{d === "long" ? "LONG" : "SHORT"}</Chip>)}
        </div>
      </Field>
      <Field label={t("m_session")}>
        <div className="flex flex-wrap gap-1.5">{SESSIONS.map((s) => <Chip key={s} active={f.session === s} onClick={() => set("session", s)}>{s}</Chip>)}</div>
      </Field>
      <Field label={t("m_grade")}>
        <div className="flex flex-wrap gap-1.5">{GRADES.map((g) => <Chip key={g} active={f.grade === g} onClick={() => set("grade", g)}>{g}</Chip>)}</div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="R"><input type="number" step="0.1" className={inputCls} value={f.r} onChange={(e) => set("r", e.target.value)} placeholder="1" /></Field>
        <Field label={t("m_pnl_net")}><input type="number" step="0.01" className={inputCls} value={f.pnl} onChange={(e) => set("pnl", e.target.value)} placeholder="520" /></Field>
      </div>
      <Field label={t("m_setup")}>
        <select className={inputCls} value={f.setup || ""} onChange={(e) => set("setup", e.target.value)}>
          <option value="">{t("m_none")}</option>
          {playbooks.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
      </Field>
      <Field label={t("m_tags")}>
        <div className="flex flex-wrap gap-1.5">{TAG_LIB.map((tag) => <Chip key={tag} active={f.tags.includes(tag)} danger onClick={() => toggleTag(tag)}>{tag}</Chip>)}</div>
      </Field>
      <Field label={t("m_chart")}>
        <FilePicker
          accept="image/*"
          value={file}
          existingUrl={shotUrl}
          onChange={setFile}
          onRemove={() => { setFile(null); setShotUrl(null); }}
          hint={t("m_chart_hint")}
        />
      </Field>
      <Field label={t("m_why")}>
        <textarea className={inputCls + " min-h-[70px] resize-y leading-relaxed"} value={f.why} onChange={(e) => set("why", e.target.value)} placeholder={t("m_why_ph")} />
      </Field>
      <Field label={t("m_plan_ok")}>
        <div className="flex gap-1.5">
          <Chip active={f.plan} onClick={() => set("plan", true)}>{t("m_yes")}</Chip>
          <Chip active={!f.plan} danger onClick={() => set("plan", false)}>{t("m_no")}</Chip>
        </div>
      </Field>
    </Modal>
  );
}

export function AccountModal({ onClose }) {
  const { addAccount, t, lang } = useBook();
  const [f, setF] = useState({
    firm: "MFF", size: 50000, cost: 0, type: "eval", status: "active", date: todayISO(), note: "",
    daily_loss_limit: "", max_drawdown: "", profit_target: "", trailing_drawdown: true,
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const numOrNull = (v) => (v === "" || v == null ? null : Number(v));
  const L = lang === "en" ? "en" : "fr";
  return (
    <Modal title={t("m_new_account")} onClose={onClose}
      footer={<><GhostBtn className="flex-1" onClick={onClose}>{t("m_cancel")}</GhostBtn><PrimaryBtn className="flex-1" onClick={async () => {
        await addAccount({
          ...f,
          size: Number(f.size) || 0,
          cost: Number(f.cost) || 0,
          daily_loss_limit: numOrNull(f.daily_loss_limit),
          max_drawdown: numOrNull(f.max_drawdown),
          profit_target: numOrNull(f.profit_target),
          trailing_drawdown: !!f.trailing_drawdown,
        });
        onClose();
      }}>{t("m_save")}</PrimaryBtn></>}>
      <Field label={t("m_firm")}><select className={inputCls} value={f.firm} onChange={(e) => set("firm", e.target.value)}>{firmOptions.map((x) => <option key={x}>{x}</option>)}</select></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("m_size")}><input type="number" className={inputCls} value={f.size} onChange={(e) => set("size", e.target.value)} /></Field>
        <Field label={t("m_eval_cost")}><input type="number" className={inputCls} value={f.cost} onChange={(e) => set("cost", e.target.value)} placeholder={t("m_free_if")} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("m_type")}><select className={inputCls} value={f.type} onChange={(e) => set("type", e.target.value)}><option value="eval">{t("m_eval")}</option><option value="funded">{t("m_funded")}</option></select></Field>
        <Field label={t("m_status")}><select className={inputCls} value={f.status} onChange={(e) => set("status", e.target.value)}><option value="active">{t("m_st_active")}</option><option value="passed">{t("m_st_passed")}</option><option value="funded">{t("m_funded")}</option><option value="failed">{t("m_st_failed")}</option><option value="paid">{t("m_st_paid")}</option></select></Field>
      </div>

      <div className="mb-1 mt-1 border-t border-line pt-2.5 text-[11px] font-bold uppercase tracking-widest text-muted2">
        {L === "en" ? "Risk rules (optional)" : "Règles de risque (optionnel)"}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={L === "en" ? "Daily loss limit ($)" : "Perte max / jour ($)"}><input type="number" className={inputCls} value={f.daily_loss_limit} onChange={(e) => set("daily_loss_limit", e.target.value)} placeholder="500" /></Field>
        <Field label={L === "en" ? "Max drawdown ($)" : "Drawdown max ($)"}><input type="number" className={inputCls} value={f.max_drawdown} onChange={(e) => set("max_drawdown", e.target.value)} placeholder="1500" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={L === "en" ? "Profit target ($)" : "Objectif de profit ($)"}><input type="number" className={inputCls} value={f.profit_target} onChange={(e) => set("profit_target", e.target.value)} placeholder="1500" /></Field>
        <Field label={L === "en" ? "Trailing drawdown" : "Drawdown trailing"}>
          <div className="flex gap-1.5">
            <Chip active={f.trailing_drawdown} onClick={() => set("trailing_drawdown", true)}>{t("m_yes")}</Chip>
            <Chip active={!f.trailing_drawdown} onClick={() => set("trailing_drawdown", false)}>{t("m_no")}</Chip>
          </div>
        </Field>
      </div>

      <Field label={t("m_date")}><input type="date" className={inputCls} value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
      <Field label={t("m_note")}><input className={inputCls} value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="Rapid 50K, static drawdown…" /></Field>
    </Modal>
  );
}

export function CertModal({ onClose }) {
  const { addCert, notify, t } = useBook();
  const [f, setF] = useState({ firm: "MFF", amount: "", type: "eval_passed", date: todayISO(), note: "" });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function submit() {
    if (!Number(f.amount)) return;
    let file_url = null;
    if (file) {
      try {
        setUploading(true);
        file_url = await uploadFile(file, "certificates");
      } catch (e) {
        setUploading(false);
        return notify(e.message, true);
      }
      setUploading(false);
    }
    await addCert({ ...f, amount: Number(f.amount), file_url });
    onClose();
  }

  return (
    <Modal title={t("m_new_cert")} onClose={onClose}
      footer={<><GhostBtn className="flex-1" onClick={onClose}>{t("m_cancel")}</GhostBtn><PrimaryBtn className="flex-1" onClick={submit} disabled={uploading}>{uploading ? t("m_sending") : t("m_save")}</PrimaryBtn></>}>
      <Field label={t("m_firm")}><select className={inputCls} value={f.firm} onChange={(e) => set("firm", e.target.value)}>{firmOptions.map((x) => <option key={x}>{x}</option>)}</select></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("m_amount")}><input type="number" className={inputCls} value={f.amount} onChange={(e) => set("amount", e.target.value)} placeholder="50000 ou 1017" /></Field>
        <Field label={t("m_type")}><select className={inputCls} value={f.type} onChange={(e) => set("type", e.target.value)}><option value="eval_passed">{t("m_eval_passed")}</option><option value="payout">{t("m_payout")}</option></select></Field>
      </div>
      <Field label={t("m_date")}><input type="date" className={inputCls} value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
      <Field label={t("m_cert_file")}>
        <FilePicker
          accept="image/*,application/pdf"
          value={file}
          onChange={setFile}
          onRemove={() => setFile(null)}
          hint={t("m_cert_hint")}
        />
      </Field>
      <Field label={t("m_note")}><input className={inputCls} value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="Express funded, certified funded trader…" /></Field>
    </Modal>
  );
}

export function ExpenseModal({ onClose }) {
  const { addExpense, t } = useBook();
  const [f, setF] = useState({ firm: "MFF", amount: "", date: todayISO(), note: "" });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  return (
    <Modal title={t("m_new_expense")} onClose={onClose}
      footer={<><GhostBtn className="flex-1" onClick={onClose}>{t("m_cancel")}</GhostBtn><PrimaryBtn className="flex-1" onClick={async () => { if (!Number(f.amount)) return; await addExpense({ ...f, amount: Number(f.amount) }); onClose(); }}>{t("m_save")}</PrimaryBtn></>}>
      <Field label={t("m_firm_post")}><select className={inputCls} value={f.firm} onChange={(e) => set("firm", e.target.value)}>{firmOptions.map((x) => <option key={x}>{x}</option>)}</select></Field>
      <Field label={t("m_amount")}><input type="number" className={inputCls} value={f.amount} onChange={(e) => set("amount", e.target.value)} placeholder="165" /></Field>
      <Field label={t("m_date")}><input type="date" className={inputCls} value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
      <Field label={t("m_note")}><input className={inputCls} value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="Éval 100K, reset, data feed…" /></Field>
    </Modal>
  );
}

export function SettingsModal({ onClose, onReplayTutorial }) {
  const { profile, saveProfile, trades, lang, setLang, t, notify, subscription, reload } = useBook();
  const [f, setF] = useState({ name: profile.name, pin: profile.pin });
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  // --- Abonnement (affichage) ---
  const locale = lang === "fr" ? "fr-FR" : "en-US";
  const isActive = subscription && subscription.status === "active";
  const isCanceling = subscription?.cancel_at_period_end === true;
  const periodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;
  const daysLeft = periodEnd ? Math.max(0, Math.ceil((periodEnd.getTime() - Date.now()) / 86400000)) : null;
  const memberSince = profile?.created_at ? new Date(profile.created_at) : null;
  const fmtDate = (d) => (d ? d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }) : "—");

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
      if (data.url) {
        window.location.href = data.url;
      } else {
        setPortalLoading(false);
        notify(data.error || "Erreur", true);
      }
    } catch (e) {
      setPortalLoading(false);
      notify(e.message, true);
    }
  }

  async function cancelSub() {
    try {
      setCancelLoading(true);
      const res = await fetch("/api/stripe/cancel", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        notify(t("sub_cancel_done"));
        setCancelConfirm(false);
        await reload();
      } else {
        notify(data.error || "Erreur", true);
      }
    } catch (e) {
      notify(e.message, true);
    } finally {
      setCancelLoading(false);
    }
  }

  return (
    <Modal title={t("settings_title")} onClose={onClose}
      footer={<><GhostBtn className="flex-1" onClick={exportCSV}>{t("settings_export")}</GhostBtn><PrimaryBtn className="flex-1" onClick={async () => {
        await saveProfile({ name: f.name || "trader", pin: f.pin || "1234", starting_balance: profile.starting_balance ?? 0 });
        onClose();
      }}>{t("settings_save")}</PrimaryBtn></>}>
      <Field label={t("settings_name")}><input className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
      <Field label={t("settings_pin")}><input className={inputCls} value={f.pin} maxLength={6} inputMode="numeric" onChange={(e) => set("pin", e.target.value)} /></Field>
      <Field label={t("settings_lang")}>
        <div className="flex gap-1.5">
          <Chip active={lang === "fr"} onClick={() => setLang("fr")}>Français</Chip>
          <Chip active={lang === "en"} onClick={() => setLang("en")}>English</Chip>
        </div>
      </Field>

      <Field label={lang === "en" ? "Help" : "Aide"}>
        <GhostBtn className="w-full" onClick={() => { if (onReplayTutorial) onReplayTutorial(); }}>
          {lang === "en" ? "↻ Replay demo" : "↻ Revoir la démo"}
        </GhostBtn>
        <div className="mt-1.5 text-[11px] text-muted2">{lang === "en" ? "Take the guided tour of the app again." : "Refaire le tour guidé de l'application."}</div>
      </Field>

      <Field label={t("sub_section")}>
        {isActive ? (
          <div className="rounded-xl border border-line2 bg-panel2 p-4">
            <div className="flex items-center justify-between">
              <span
                className="rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
                style={{ background: "rgba(0,211,1,.12)", color: "#00d301" }}
              >
                {t("sub_active")}
              </span>
              {isCanceling ? (
                <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "#f59e0b" }}>
                  {t("sub_canceled_title")}
                </span>
              ) : (
                <span className="text-[11px] uppercase tracking-wide text-muted2">{t("sub_next_payment")}</span>
              )}
            </div>

            <div className="mt-2 text-center">
              <div className="font-mono text-4xl font-extrabold leading-none" style={{ color: isCanceling ? "#f59e0b" : "#00d301" }}>
                {daysLeft}
              </div>
              <div className="mt-1 text-xs text-muted2">
                {daysLeft === 0 ? t("sub_today") : daysLeft === 1 ? t("sub_day") : t("sub_days")}
              </div>
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

            <GhostBtn className="mt-3 w-full" onClick={() => { if (!portalLoading) openPortal(); }}>
              {portalLoading ? t("sub_loading") : t("sub_manage")}
            </GhostBtn>

            {!isCanceling && (
              cancelConfirm ? (
                <div className="mt-3 rounded-lg border border-line2 bg-panel p-3">
                  <div className="text-sm font-semibold text-white">{t("sub_cancel_confirm")}</div>
                  <div className="mt-1 text-xs text-muted2">{t("sub_cancel_hint")}</div>
                  <div className="mt-2.5 flex gap-2">
                    <button
                      onClick={() => { if (!cancelLoading) setCancelConfirm(false); }}
                      className="flex-1 rounded-lg border border-line2 bg-panel2 py-2 text-xs font-semibold text-white"
                    >
                      {t("sub_cancel_back")}
                    </button>
                    <button
                      onClick={() => { if (!cancelLoading) cancelSub(); }}
                      disabled={cancelLoading}
                      className="flex-1 rounded-lg py-2 text-xs font-bold text-white disabled:opacity-60"
                      style={{ background: "#ff3b5c" }}
                    >
                      {cancelLoading ? t("sub_cancel_loading") : t("sub_cancel_yes")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setCancelConfirm(true)}
                  className="mt-2 w-full py-1 text-center text-xs font-semibold"
                  style={{ color: "#ff3b5c" }}
                >
                  {t("sub_cancel")}
                </button>
              )
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-line2 bg-panel2 p-5 text-center">
            <div className="text-3xl">💳</div>
            <div className="mt-2 text-sm text-muted2">{t("sub_none")}</div>
          </div>
        )}
      </Field>
    </Modal>
  );
}
