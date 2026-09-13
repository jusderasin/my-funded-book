"use client";

import { useState } from "react";
import { FilePicker } from "./FilePicker";
import { useBook } from "./BookProvider";
import { uploadFile } from "@/lib/upload";
import { FIRMS, SESSIONS, GRADES, TAG_LIB, EMOTIONS } from "@/lib/constants";
import { todayISO, fmtMoney } from "@/lib/format";
import {
  X,
  CreditCard,
  Download,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Check,
  Info,
} from "lucide-react";

const firmOptions = Object.keys(FIRMS);

// Valeurs de R suggérées à la sélection d'une sortie — modifiables ensuite à la main.
const OUTCOME_DEFAULT_R = { TP: 2, SL: -1, BE: 0 };

// Presets par prop firm : type de trailing DD et offset du lock ($).
const FIRM_TRAILING_DEFAULTS = {
  MFF:      { type: "eod",      lock: 0 },
  Lucid:    { type: "eod",      lock: 100 },
  Phidias:  { type: "intraday", lock: 0 },
  Topstep:  { type: "eod",      lock: 0 },
  Apex:     { type: "intraday", lock: 0 },
  Alpha:    { type: "intraday", lock: 0 },
  Tradeify: { type: "eod",      lock: 0 },
  Autre:    { type: "intraday", lock: 0 },
};

/* ================================================================== */
/*  PRIMITIVES PRISM — partagées par les 5 modals                      */
/* ================================================================== */

const PRISM_INPUT =
  "w-full rounded-xl border border-prism-line bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-prism-muted2 focus:border-prism-accent focus:outline-none transition-colors disabled:opacity-50";

const PRISM_SELECT =
  "w-full rounded-xl border border-prism-line bg-black/40 px-3 py-2.5 text-sm text-white focus:border-prism-accent focus:outline-none transition-colors appearance-none cursor-pointer";

function PrismModal({ title, onClose, footer, children, maxWidth = "max-w-2xl" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative z-10 w-full ${maxWidth} max-h-[92vh] flex flex-col rounded-2xl border border-prism-line bg-prism-panel shadow-2xl`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-prism-line shrink-0">
          <h2 className="text-lg font-semibold text-white tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-prism-muted hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex gap-2 px-6 py-4 border-t border-prism-line shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function PrismField({ label, children, hint }) {
  return (
    <div className="mb-4">
      <label className="block text-[10px] font-semibold uppercase tracking-widest text-prism-muted mb-2">
        {label}
      </label>
      {children}
      {hint && <div className="mt-1.5 text-[11px] text-prism-muted2">{hint}</div>}
    </div>
  );
}

function PrismSectionLabel({ children }) {
  return (
    <div className="mb-3 mt-2 border-t border-prism-line pt-4 text-[10px] font-semibold uppercase tracking-widest text-prism-muted2">
      {children}
    </div>
  );
}

function PrismChip({ children, active, danger, onClick, type = "button" }) {
  const base =
    "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer";
  const cls = active
    ? danger
      ? "border-prism-loss/40 bg-prism-loss/10 text-prism-loss"
      : "border-prism-accent bg-prism-accentDim text-prism-accent"
    : "border-prism-line bg-transparent text-prism-muted hover:border-prism-line2 hover:text-white";
  return (
    <button type={type} onClick={onClick} className={`${base} ${cls}`}>
      {children}
    </button>
  );
}

function PrismGhostBtn({ children, onClick, className = "", type = "button", disabled }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-prism-line bg-transparent px-4 py-2.5 text-sm font-medium text-white hover:bg-white/[0.03] hover:border-prism-line2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

function PrismPrimaryBtn({ children, onClick, className = "", type = "button", disabled }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-white text-black px-4 py-2.5 text-sm font-semibold hover:bg-white/90 active:bg-white/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

function PrismDangerBtn({ children, onClick, className = "", type = "button", disabled }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-prism-loss text-white px-4 py-2.5 text-sm font-semibold hover:bg-prism-loss/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

/* ================================================================== */
/*  LogTradeModal — reskin PRISM (déjà refait en Batch 8)              */
/* ================================================================== */

export function LogTradeModal({ editing, onClose }) {
  const { addTrade, updateTrade, playbooks, accounts, trades, notify, t, lang } = useBook();
  const defaultAccountId =
    accounts.find((a) => a.type === "funded" && a.status === "active")?.id ||
    accounts.find((a) => a.status === "active")?.id ||
    accounts[0]?.id ||
    "";
  const [f, setF] = useState(
    editing || {
      symbol: "MNQ", date: todayISO(), dir: "long", session: "NY AM", grade: "A+",
      r: "", pnl: "", setup: "", tags: [], emotion: null, why: "", plan: true, account_id: defaultAccountId, outcome: "",
    }
  );
  const [file, setFile] = useState(null);
  const [file2, setFile2] = useState(null);
  const [shotUrl, setShotUrl] = useState(editing ? editing.screenshot_url || null : null);
  const [shotUrl2, setShotUrl2] = useState(editing ? editing.screenshot_url_2 || null : null);
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const toggleEmotion = (k) => set("emotion", f.emotion === k ? null : k);

  const addTag = (raw) => {
    const v = (raw || "").trim();
    if (!v) return;
    if (f.tags.some((x) => x.toLowerCase() === v.toLowerCase())) { setTagInput(""); return; }
    set("tags", [...f.tags, v]);
    setTagInput("");
  };
  const removeTag = (tag) => set("tags", f.tags.filter((x) => x !== tag));
  const tagFreq = {};
  (trades || []).forEach((tr) => (tr.tags || []).forEach((tg) => { tagFreq[tg] = (tagFreq[tg] || 0) + 1; }));
  const historyTags = Object.keys(tagFreq).sort((a, b) => tagFreq[b] - tagFreq[a]);
  const tagSuggestions = [...new Set([...TAG_LIB, ...historyTags])]
    .filter((tg) => !f.tags.some((x) => x.toLowerCase() === tg.toLowerCase()))
    .slice(0, 16);

  function pickOutcome(o) {
    const next = f.outcome === o ? "" : o;
    set("outcome", next);
    if (next && OUTCOME_DEFAULT_R[next] != null) set("r", OUTCOME_DEFAULT_R[next]);
  }

  async function submit() {
    let screenshot_url = shotUrl;
    let screenshot_url_2 = shotUrl2;
    if (file || file2) {
      try {
        setUploading(true);
        if (file) screenshot_url = await uploadFile(file, "trades");
        if (file2) screenshot_url_2 = await uploadFile(file2, "trades");
      } catch (e) {
        setUploading(false);
        return notify(e.message, true);
      }
      setUploading(false);
    }
    const row = {
      symbol: (f.symbol || "MNQ").toUpperCase(), date: f.date, dir: f.dir, session: f.session,
      grade: f.grade, r: Number(f.r) || 0, pnl: Number(f.pnl) || 0, setup: f.setup || null,
      tags: f.tags, emotion: f.emotion || null, why: f.why || null, plan: !!f.plan,
      screenshot_url: screenshot_url || null,
      screenshot_url_2: screenshot_url_2 || null,
      account_id: f.account_id || null,
      outcome: f.outcome || null,
    };
    if (editing) await updateTrade(editing.id, row);
    else await addTrade(row);
    onClose();
  }

  return (
    <PrismModal
      title={editing ? t("m_edit_trade") : t("m_log_trade")}
      onClose={onClose}
      footer={
        <>
          <PrismGhostBtn className="flex-1" onClick={onClose}>{t("m_cancel")}</PrismGhostBtn>
          <PrismPrimaryBtn className="flex-1" onClick={submit} disabled={uploading}>
            {uploading ? t("m_sending") : editing ? t("m_save") : t("m_log_trade")}
          </PrismPrimaryBtn>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <PrismField label={t("m_instrument")}>
          <input
            className={PRISM_INPUT}
            value={f.symbol}
            onChange={(e) => set("symbol", e.target.value)}
            placeholder="MNQ, NQ, MGC…"
          />
        </PrismField>
        <PrismField label={t("m_date")}>
          <input
            type="date"
            className={PRISM_INPUT}
            value={f.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </PrismField>
      </div>

      {accounts.length > 0 && (
        <PrismField label={lang === "en" ? "Account" : "Compte"}>
          <select
            className={PRISM_SELECT}
            value={f.account_id || ""}
            onChange={(e) => set("account_id", e.target.value)}
          >
            <option value="">{lang === "en" ? "None" : "Aucun"}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.firm} · {fmtMoney(a.size)}{a.note ? " · " + a.note : ""}
              </option>
            ))}
          </select>
        </PrismField>
      )}

      <PrismField label={t("m_direction")}>
        <div className="flex gap-1.5">
          {["long", "short"].map((d) => (
            <PrismChip key={d} active={f.dir === d} onClick={() => set("dir", d)}>
              {d === "long" ? "LONG" : "SHORT"}
            </PrismChip>
          ))}
        </div>
      </PrismField>

      <PrismField label={t("m_session")}>
        <div className="flex flex-wrap gap-1.5">
          {SESSIONS.map((s) => (
            <PrismChip key={s} active={f.session === s} onClick={() => set("session", s)}>
              {s}
            </PrismChip>
          ))}
        </div>
      </PrismField>

      <PrismField label={t("m_grade")}>
        <div className="flex flex-wrap gap-1.5">
          {GRADES.map((g) => (
            <PrismChip key={g} active={f.grade === g} onClick={() => set("grade", g)}>
              {g}
            </PrismChip>
          ))}
        </div>
      </PrismField>

      <div className="grid grid-cols-2 gap-3">
        <PrismField label="R">
          <input
            type="number"
            step="0.1"
            className={PRISM_INPUT}
            value={f.r}
            onChange={(e) => set("r", e.target.value)}
            placeholder="1"
          />
        </PrismField>
        <PrismField label={t("m_pnl_net")}>
          <input
            type="number"
            step="0.01"
            className={PRISM_INPUT}
            value={f.pnl}
            onChange={(e) => set("pnl", e.target.value)}
            placeholder="520"
          />
        </PrismField>
      </div>

      <PrismField
        label={lang === "en" ? "Exit (TP/SL/BE)" : "Sortie (TP/SL/BE)"}
        hint={
          lang === "en"
            ? "Suggests a default R (TP = +2, SL = -1, BE = 0) — you can still edit the R field above."
            : "Propose un R par défaut (TP = +2, SL = -1, BE = 0) — le champ R ci-dessus reste modifiable."
        }
      >
        <div className="flex gap-1.5">
          {["TP", "SL", "BE"].map((o) => (
            <PrismChip key={o} active={f.outcome === o} onClick={() => pickOutcome(o)}>
              {o}
            </PrismChip>
          ))}
        </div>
      </PrismField>

      <PrismField label={t("m_setup")}>
        <select
          className={PRISM_SELECT}
          value={f.setup || ""}
          onChange={(e) => set("setup", e.target.value)}
        >
          <option value="">{t("m_none")}</option>
          {playbooks.map((p) => (
            <option key={p.id} value={p.name}>{p.name}</option>
          ))}
        </select>
      </PrismField>

      <PrismField label={lang === "en" ? "Emotion at entry" : "Émotion à l'entrée"}>
        <div className="flex flex-wrap gap-1.5">
          {EMOTIONS.map((em) => (
            <PrismChip
              key={em.k}
              active={f.emotion === em.k}
              danger={em.tone === "red"}
              onClick={() => toggleEmotion(em.k)}
            >
              {em.e} {lang === "en" ? em.en : em.fr}
            </PrismChip>
          ))}
        </div>
      </PrismField>

      <PrismField label={t("m_tags")}>
        {f.tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {f.tags.map((tag) => (
              <PrismChip key={tag} active danger onClick={() => removeTag(tag)}>
                {tag} ×
              </PrismChip>
            ))}
          </div>
        )}
        <div className="flex gap-1.5">
          <input
            className={PRISM_INPUT}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }}
            placeholder={
              lang === "en" ? "Add a tag and press Enter…" : "Ajoute un tag et appuie sur Entrée…"
            }
          />
          <PrismGhostBtn className="px-3" onClick={() => addTag(tagInput)}>+</PrismGhostBtn>
        </div>
        {tagSuggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tagSuggestions.map((tag) => (
              <PrismChip key={tag} onClick={() => addTag(tag)}>{tag}</PrismChip>
            ))}
          </div>
        )}
      </PrismField>

      <PrismField label={t("m_chart")}>
        <div className="grid grid-cols-2 gap-2.5">
          <FilePicker
            accept="image/*"
            value={file}
            existingUrl={shotUrl}
            onChange={setFile}
            onRemove={() => { setFile(null); setShotUrl(null); }}
            hint={t("m_chart_hint")}
          />
          <FilePicker
            accept="image/*"
            value={file2}
            existingUrl={shotUrl2}
            onChange={setFile2}
            onRemove={() => { setFile2(null); setShotUrl2(null); }}
            hint={lang === "en" ? "2nd screenshot (optional)" : "2e capture (optionnel)"}
          />
        </div>
      </PrismField>

      <PrismField label={t("m_why")}>
        <textarea
          className={`${PRISM_INPUT} min-h-[80px] resize-y leading-relaxed`}
          value={f.why}
          onChange={(e) => set("why", e.target.value)}
          placeholder={t("m_why_ph")}
        />
      </PrismField>

      <PrismField label={t("m_plan_ok")}>
        <div className="flex gap-1.5">
          <PrismChip active={f.plan} onClick={() => set("plan", true)}>{t("m_yes")}</PrismChip>
          <PrismChip active={!f.plan} danger onClick={() => set("plan", false)}>{t("m_no")}</PrismChip>
        </div>
      </PrismField>
    </PrismModal>
  );
}

/* ================================================================== */
/*  AccountModal — reskin PRISM                                        */
/* ================================================================== */

export function AccountModal({ editing, onClose }) {
  const { addAccount, updateAccount, t, lang } = useBook();
  const isEdit = !!editing;
  const [f, setF] = useState(
    editing
      ? {
          firm: editing.firm || "MFF",
          size: editing.size ?? 50000,
          cost: editing.cost ?? 0,
          type: editing.type || "eval",
          status: editing.status || "active",
          date: editing.date || todayISO(),
          note: editing.note || "",
          daily_loss_limit: editing.daily_loss_limit == null ? "" : editing.daily_loss_limit,
          max_drawdown: editing.max_drawdown == null ? "" : editing.max_drawdown,
          profit_target: editing.profit_target == null ? "" : editing.profit_target,
          trailing_type:
            editing.trailing_type ||
            (editing.trailing_drawdown === false ? "static" : "intraday"),
          trailing_lock_offset:
            editing.trailing_lock_offset == null ? "" : editing.trailing_lock_offset,
        }
      : {
          firm: "MFF", size: 50000, cost: 0, type: "eval", status: "active", date: todayISO(), note: "",
          daily_loss_limit: "", max_drawdown: "", profit_target: "",
          trailing_type: FIRM_TRAILING_DEFAULTS.MFF.type,
          trailing_lock_offset: FIRM_TRAILING_DEFAULTS.MFF.lock,
        }
  );
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const onFirmChange = (firm) => {
    if (isEdit) {
      set("firm", firm);
      return;
    }
    const preset = FIRM_TRAILING_DEFAULTS[firm] || FIRM_TRAILING_DEFAULTS.Autre;
    setF((s) => ({
      ...s,
      firm,
      trailing_type: preset.type,
      trailing_lock_offset: preset.lock,
    }));
  };

  const numOrNull = (v) => (v === "" || v == null ? null : Number(v));
  const L = lang === "en" ? "en" : "fr";
  const isStatic = f.trailing_type === "static";

  async function save() {
    const payload = {
      ...f,
      size: Number(f.size) || 0,
      cost: Number(f.cost) || 0,
      daily_loss_limit: numOrNull(f.daily_loss_limit),
      max_drawdown: numOrNull(f.max_drawdown),
      profit_target: numOrNull(f.profit_target),
      trailing_type: f.trailing_type || "intraday",
      trailing_lock_offset: isStatic ? 0 : (numOrNull(f.trailing_lock_offset) ?? 0),
      trailing_drawdown: f.trailing_type !== "static",
    };
    if (isEdit) await updateAccount(editing.id, payload);
    else await addAccount(payload);
    onClose();
  }

  return (
    <PrismModal
      title={isEdit ? (L === "en" ? "Edit account" : "Éditer le compte") : t("m_new_account")}
      onClose={onClose}
      footer={
        <>
          <PrismGhostBtn className="flex-1" onClick={onClose}>{t("m_cancel")}</PrismGhostBtn>
          <PrismPrimaryBtn className="flex-1" onClick={save}>{t("m_save")}</PrismPrimaryBtn>
        </>
      }
    >
      <PrismField label={t("m_firm")}>
        <select className={PRISM_SELECT} value={f.firm} onChange={(e) => onFirmChange(e.target.value)}>
          {firmOptions.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </PrismField>

      <div className="grid grid-cols-2 gap-3">
        <PrismField label={t("m_size")}>
          <input type="number" className={PRISM_INPUT} value={f.size} onChange={(e) => set("size", e.target.value)} />
        </PrismField>
        <PrismField label={t("m_eval_cost")}>
          <input type="number" className={PRISM_INPUT} value={f.cost} onChange={(e) => set("cost", e.target.value)} placeholder={t("m_free_if")} />
        </PrismField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PrismField label={t("m_type")}>
          <select className={PRISM_SELECT} value={f.type} onChange={(e) => set("type", e.target.value)}>
            <option value="eval">{t("m_eval")}</option>
            <option value="funded">{t("m_funded")}</option>
          </select>
        </PrismField>
        <PrismField label={t("m_status")}>
          <select className={PRISM_SELECT} value={f.status} onChange={(e) => set("status", e.target.value)}>
            <option value="active">{t("m_st_active")}</option>
            <option value="passed">{t("m_st_passed")}</option>
            <option value="funded">{t("m_funded")}</option>
            <option value="failed">{t("m_st_failed")}</option>
            <option value="paid">{t("m_st_paid")}</option>
          </select>
        </PrismField>
      </div>

      <PrismSectionLabel>
        {L === "en" ? "Risk rules (optional)" : "Règles de risque (optionnel)"}
      </PrismSectionLabel>

      <div className="grid grid-cols-2 gap-3">
        <PrismField label={L === "en" ? "Daily loss limit ($)" : "Perte max / jour ($)"}>
          <input type="number" className={PRISM_INPUT} value={f.daily_loss_limit} onChange={(e) => set("daily_loss_limit", e.target.value)} placeholder="500" />
        </PrismField>
        <PrismField label={L === "en" ? "Max drawdown ($)" : "Drawdown max ($)"}>
          <input type="number" className={PRISM_INPUT} value={f.max_drawdown} onChange={(e) => set("max_drawdown", e.target.value)} placeholder="1500" />
        </PrismField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PrismField label={L === "en" ? "Profit target ($)" : "Objectif de profit ($)"}>
          <input type="number" className={PRISM_INPUT} value={f.profit_target} onChange={(e) => set("profit_target", e.target.value)} placeholder="1500" />
        </PrismField>
        <PrismField label={L === "en" ? "Trailing type" : "Type de trailing"}>
          <div className="flex gap-1.5">
            <PrismChip active={f.trailing_type === "intraday"} onClick={() => set("trailing_type", "intraday")}>Intraday</PrismChip>
            <PrismChip active={f.trailing_type === "eod"} onClick={() => set("trailing_type", "eod")}>EOD</PrismChip>
            <PrismChip active={f.trailing_type === "static"} onClick={() => set("trailing_type", "static")}>Static</PrismChip>
          </div>
        </PrismField>
      </div>

      {!isStatic && (
        <PrismField
          label={L === "en" ? "Lock offset ($ above initial)" : "Lock offset ($ au-dessus de l'initial)"}
          hint={
            L === "en"
              ? "Once the peak crosses (initial + max DD), the threshold locks at (initial + this offset). Apex: 0. Lucid: 100."
              : "Une fois que le peak franchit (initial + max DD), le seuil se fige à (initial + cet offset). Apex : 0. Lucid : 100."
          }
        >
          <input type="number" className={PRISM_INPUT} value={f.trailing_lock_offset} onChange={(e) => set("trailing_lock_offset", e.target.value)} placeholder="0" />
        </PrismField>
      )}

      <PrismField label={t("m_date")}>
        <input type="date" className={PRISM_INPUT} value={f.date} onChange={(e) => set("date", e.target.value)} />
      </PrismField>

      <PrismField label={t("m_note")}>
        <input className={PRISM_INPUT} value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="Rapid 50K, static drawdown…" />
      </PrismField>
    </PrismModal>
  );
}

/* ================================================================== */
/*  CertModal — reskin PRISM                                           */
/* ================================================================== */

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
    <PrismModal
      title={t("m_new_cert")}
      onClose={onClose}
      footer={
        <>
          <PrismGhostBtn className="flex-1" onClick={onClose}>{t("m_cancel")}</PrismGhostBtn>
          <PrismPrimaryBtn className="flex-1" onClick={submit} disabled={uploading}>
            {uploading ? t("m_sending") : t("m_save")}
          </PrismPrimaryBtn>
        </>
      }
    >
      <PrismField label={t("m_firm")}>
        <select className={PRISM_SELECT} value={f.firm} onChange={(e) => set("firm", e.target.value)}>
          {firmOptions.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </PrismField>

      <div className="grid grid-cols-2 gap-3">
        <PrismField label={t("m_amount")}>
          <input type="number" className={PRISM_INPUT} value={f.amount} onChange={(e) => set("amount", e.target.value)} placeholder="50000 ou 1017" />
        </PrismField>
        <PrismField label={t("m_type")}>
          <select className={PRISM_SELECT} value={f.type} onChange={(e) => set("type", e.target.value)}>
            <option value="eval_passed">{t("m_eval_passed")}</option>
            <option value="payout">{t("m_payout")}</option>
          </select>
        </PrismField>
      </div>

      <PrismField label={t("m_date")}>
        <input type="date" className={PRISM_INPUT} value={f.date} onChange={(e) => set("date", e.target.value)} />
      </PrismField>

      <PrismField label={t("m_cert_file")}>
        <FilePicker
          accept="image/*,application/pdf"
          value={file}
          onChange={setFile}
          onRemove={() => setFile(null)}
          hint={t("m_cert_hint")}
        />
      </PrismField>

      <PrismField label={t("m_note")}>
        <input className={PRISM_INPUT} value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="Express funded, certified funded trader…" />
      </PrismField>
    </PrismModal>
  );
}

/* ================================================================== */
/*  ExpenseModal — reskin PRISM                                        */
/* ================================================================== */

export function ExpenseModal({ onClose }) {
  const { addExpense, t } = useBook();
  const [f, setF] = useState({ firm: "MFF", amount: "", date: todayISO(), note: "" });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    if (!Number(f.amount)) return;
    await addExpense({ ...f, amount: Number(f.amount) });
    onClose();
  }

  return (
    <PrismModal
      title={t("m_new_expense")}
      onClose={onClose}
      footer={
        <>
          <PrismGhostBtn className="flex-1" onClick={onClose}>{t("m_cancel")}</PrismGhostBtn>
          <PrismPrimaryBtn className="flex-1" onClick={save}>{t("m_save")}</PrismPrimaryBtn>
        </>
      }
    >
      <PrismField label={t("m_firm_post")}>
        <select className={PRISM_SELECT} value={f.firm} onChange={(e) => set("firm", e.target.value)}>
          {firmOptions.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </PrismField>

      <PrismField label={t("m_amount")}>
        <input type="number" className={PRISM_INPUT} value={f.amount} onChange={(e) => set("amount", e.target.value)} placeholder="165" />
      </PrismField>

      <PrismField label={t("m_date")}>
        <input type="date" className={PRISM_INPUT} value={f.date} onChange={(e) => set("date", e.target.value)} />
      </PrismField>

      <PrismField label={t("m_note")}>
        <input className={PRISM_INPUT} value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="Éval 100K, reset, data feed…" />
      </PrismField>
    </PrismModal>
  );
}

/* ================================================================== */
/*  SettingsModal — reskin PRISM (logique Stripe intacte)              */
/* ================================================================== */

export function SettingsModal({ onClose, onReplayTutorial }) {
  const { profile, saveProfile, trades, lang, setLang, t, notify, subscription, reload } = useBook();
  const [f, setF] = useState({ name: profile.name, pin: profile.pin });
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

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

  async function saveProfileHandler() {
    await saveProfile({ name: f.name || "trader", pin: f.pin || "1234", starting_balance: profile.starting_balance ?? 0 });
    onClose();
  }

  return (
    <PrismModal
      title={t("settings_title")}
      onClose={onClose}
      footer={
        <>
          <PrismGhostBtn className="flex-1" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5" />
            {t("settings_export")}
          </PrismGhostBtn>
          <PrismPrimaryBtn className="flex-1" onClick={saveProfileHandler}>
            {t("settings_save")}
          </PrismPrimaryBtn>
        </>
      }
    >
      <PrismField label={t("settings_name")}>
        <input className={PRISM_INPUT} value={f.name} onChange={(e) => set("name", e.target.value)} />
      </PrismField>

      <PrismField label={t("settings_pin")}>
        <input className={PRISM_INPUT} value={f.pin} maxLength={6} inputMode="numeric" onChange={(e) => set("pin", e.target.value)} />
      </PrismField>

      <PrismField label={t("settings_lang")}>
        <div className="flex gap-1.5">
          <PrismChip active={lang === "fr"} onClick={() => setLang("fr")}>Français</PrismChip>
          <PrismChip active={lang === "en"} onClick={() => setLang("en")}>English</PrismChip>
        </div>
      </PrismField>

      <PrismField
        label={lang === "en" ? "Help" : "Aide"}
        hint={lang === "en" ? "Take the guided tour of the app again." : "Refaire le tour guidé de l'application."}
      >
        <PrismGhostBtn className="w-full" onClick={() => { if (onReplayTutorial) onReplayTutorial(); }}>
          <RotateCcw className="h-3.5 w-3.5" />
          {lang === "en" ? "Replay demo" : "Revoir la démo"}
        </PrismGhostBtn>
      </PrismField>

      <PrismSectionLabel>{t("sub_section")}</PrismSectionLabel>

      {isActive ? (
        <div className="rounded-2xl border border-prism-line bg-white/[0.02] p-5">
          {/* Header : status badges */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-prism-accentDim px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-prism-accent">
              <Check className="h-3 w-3" />
              {t("sub_active")}
            </span>
            {isCanceling ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-yellow-400">
                <AlertTriangle className="h-3 w-3" />
                {t("sub_canceled_title")}
              </span>
            ) : (
              <span className="text-[10px] font-medium uppercase tracking-widest text-prism-muted2">
                {t("sub_next_payment")}
              </span>
            )}
          </div>

          {/* Chiffre massif jours restants */}
          <div className="mt-4 text-center">
            <div
              className="font-mono text-5xl font-bold leading-none tabular-nums"
              style={{ color: isCanceling ? "#facc15" : "#ffffff" }}
            >
              {daysLeft}
            </div>
            <div className="mt-2 text-xs text-prism-muted2">
              {daysLeft === 0 ? t("sub_today") : daysLeft === 1 ? t("sub_day") : t("sub_days")}
            </div>
          </div>

          {/* Meta lines */}
          <div className="mt-4 space-y-2 border-t border-prism-line pt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-prism-muted2">{isCanceling ? t("sub_canceled_until") : t("sub_renews_on")}</span>
              <span className="font-mono text-white">{fmtDate(periodEnd)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-prism-muted2">{t("sub_member_since")}</span>
              <span className="font-mono text-white">{fmtDate(memberSince)}</span>
            </div>
          </div>

          {/* Manage button */}
          <PrismGhostBtn
            className="mt-4 w-full"
            onClick={() => { if (!portalLoading) openPortal(); }}
            disabled={portalLoading}
          >
            <CreditCard className="h-3.5 w-3.5" />
            {portalLoading ? t("sub_loading") : t("sub_manage")}
          </PrismGhostBtn>

          {/* Cancel flow */}
          {!isCanceling && (
            cancelConfirm ? (
              <div className="mt-3 rounded-xl border border-prism-loss/20 bg-prism-loss/5 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-prism-loss mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white">{t("sub_cancel_confirm")}</div>
                    <div className="mt-1 text-xs text-prism-muted">{t("sub_cancel_hint")}</div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <PrismGhostBtn
                    className="flex-1"
                    onClick={() => { if (!cancelLoading) setCancelConfirm(false); }}
                    disabled={cancelLoading}
                  >
                    {t("sub_cancel_back")}
                  </PrismGhostBtn>
                  <PrismDangerBtn
                    className="flex-1"
                    onClick={() => { if (!cancelLoading) cancelSub(); }}
                    disabled={cancelLoading}
                  >
                    {cancelLoading ? t("sub_cancel_loading") : t("sub_cancel_yes")}
                  </PrismDangerBtn>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCancelConfirm(true)}
                className="mt-2 w-full py-2 text-center text-xs font-semibold text-prism-muted hover:text-prism-loss transition-colors"
              >
                {t("sub_cancel")}
              </button>
            )
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-prism-line bg-white/[0.02] p-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-prism-accentDim text-prism-accent mb-3">
            <CreditCard className="h-6 w-6" />
          </div>
          <div className="text-sm text-prism-muted">{t("sub_none")}</div>
        </div>
      )}
    </PrismModal>
  );
}
