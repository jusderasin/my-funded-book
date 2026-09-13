"use client";

import { useState } from "react";
import { Modal, Field, inputCls, Chip, PrimaryBtn, GhostBtn } from "./ui";
import { FilePicker } from "./FilePicker";
import { useBook } from "./BookProvider";
import { uploadFile } from "@/lib/upload";
import { FIRMS, SESSIONS, GRADES, TAG_LIB, EMOTIONS } from "@/lib/constants";
import { todayISO, fmtMoney } from "@/lib/format";
import { X } from "lucide-react";

const firmOptions = Object.keys(FIRMS);

// Valeurs de R suggérées à la sélection d'une sortie — modifiables ensuite à la main.
const OUTCOME_DEFAULT_R = { TP: 2, SL: -1, BE: 0 };

/* ------------------------------------------------------------------ */
/*  PRIMITIVES PRISM locales — utilisées uniquement par LogTradeModal. */
/*  Nommées LTM_* pour ne pas conflicter avec les imports ./ui         */
/*  (Modal, Field, Chip, etc.) que les autres modals continuent à      */
/*  utiliser pour rester inchangés.                                    */
/* ------------------------------------------------------------------ */

const LTM_INPUT_CLS =
  "w-full rounded-xl border border-prism-line bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-prism-muted2 focus:border-prism-accent focus:outline-none transition-colors disabled:opacity-50";

function LTM_Modal({ title, onClose, footer, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border border-prism-line bg-prism-panel shadow-2xl">
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

function LTM_Field({ label, children, hint }) {
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

function LTM_Chip({ children, active, danger, onClick, type = "button" }) {
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

function LTM_GhostBtn({ children, onClick, className = "", type = "button", disabled }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-xl border border-prism-line bg-transparent px-4 py-2.5 text-sm font-medium text-white hover:bg-white/[0.03] hover:border-prism-line2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

function LTM_PrimaryBtn({ children, onClick, className = "", type = "button", disabled }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-xl bg-white text-black px-4 py-2.5 text-sm font-semibold hover:bg-white/90 active:bg-white/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  LogTradeModal — reskin PRISM, logique inchangée                    */
/* ------------------------------------------------------------------ */

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

  // Tags libres : on tape et on ajoute (Entrée ou bouton +), au lieu d'une liste figée.
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
    <LTM_Modal
      title={editing ? t("m_edit_trade") : t("m_log_trade")}
      onClose={onClose}
      footer={
        <>
          <LTM_GhostBtn className="flex-1" onClick={onClose}>{t("m_cancel")}</LTM_GhostBtn>
          <LTM_PrimaryBtn className="flex-1" onClick={submit} disabled={uploading}>
            {uploading ? t("m_sending") : editing ? t("m_save") : t("m_log_trade")}
          </LTM_PrimaryBtn>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <LTM_Field label={t("m_instrument")}>
          <input
            className={LTM_INPUT_CLS}
            value={f.symbol}
            onChange={(e) => set("symbol", e.target.value)}
            placeholder="MNQ, NQ, MGC…"
          />
        </LTM_Field>
        <LTM_Field label={t("m_date")}>
          <input
            type="date"
            className={LTM_INPUT_CLS}
            value={f.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </LTM_Field>
      </div>

      {accounts.length > 0 && (
        <LTM_Field label={lang === "en" ? "Account" : "Compte"}>
          <select
            className={LTM_INPUT_CLS}
            value={f.account_id || ""}
            onChange={(e) => set("account_id", e.target.value)}
          >
            <option value="">{lang === "en" ? "None" : "Aucun"}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.firm} · {fmtMoney(a.size)}
                {a.note ? " · " + a.note : ""}
              </option>
            ))}
          </select>
        </LTM_Field>
      )}

      <LTM_Field label={t("m_direction")}>
        <div className="flex gap-1.5">
          {["long", "short"].map((d) => (
            <LTM_Chip key={d} active={f.dir === d} onClick={() => set("dir", d)}>
              {d === "long" ? "LONG" : "SHORT"}
            </LTM_Chip>
          ))}
        </div>
      </LTM_Field>

      <LTM_Field label={t("m_session")}>
        <div className="flex flex-wrap gap-1.5">
          {SESSIONS.map((s) => (
            <LTM_Chip key={s} active={f.session === s} onClick={() => set("session", s)}>
              {s}
            </LTM_Chip>
          ))}
        </div>
      </LTM_Field>

      <LTM_Field label={t("m_grade")}>
        <div className="flex flex-wrap gap-1.5">
          {GRADES.map((g) => (
            <LTM_Chip key={g} active={f.grade === g} onClick={() => set("grade", g)}>
              {g}
            </LTM_Chip>
          ))}
        </div>
      </LTM_Field>

      <div className="grid grid-cols-2 gap-3">
        <LTM_Field label="R">
          <input
            type="number"
            step="0.1"
            className={LTM_INPUT_CLS}
            value={f.r}
            onChange={(e) => set("r", e.target.value)}
            placeholder="1"
          />
        </LTM_Field>
        <LTM_Field label={t("m_pnl_net")}>
          <input
            type="number"
            step="0.01"
            className={LTM_INPUT_CLS}
            value={f.pnl}
            onChange={(e) => set("pnl", e.target.value)}
            placeholder="520"
          />
        </LTM_Field>
      </div>

      <LTM_Field
        label={lang === "en" ? "Exit (TP/SL/BE)" : "Sortie (TP/SL/BE)"}
        hint={
          lang === "en"
            ? "Suggests a default R (TP = +2, SL = -1, BE = 0) — you can still edit the R field above."
            : "Propose un R par défaut (TP = +2, SL = -1, BE = 0) — le champ R ci-dessus reste modifiable."
        }
      >
        <div className="flex gap-1.5">
          {["TP", "SL", "BE"].map((o) => (
            <LTM_Chip key={o} active={f.outcome === o} onClick={() => pickOutcome(o)}>
              {o}
            </LTM_Chip>
          ))}
        </div>
      </LTM_Field>

      <LTM_Field label={t("m_setup")}>
        <select
          className={LTM_INPUT_CLS}
          value={f.setup || ""}
          onChange={(e) => set("setup", e.target.value)}
        >
          <option value="">{t("m_none")}</option>
          {playbooks.map((p) => (
            <option key={p.id} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
      </LTM_Field>

      <LTM_Field label={lang === "en" ? "Emotion at entry" : "Émotion à l'entrée"}>
        <div className="flex flex-wrap gap-1.5">
          {EMOTIONS.map((em) => (
            <LTM_Chip
              key={em.k}
              active={f.emotion === em.k}
              danger={em.tone === "red"}
              onClick={() => toggleEmotion(em.k)}
            >
              {em.e} {lang === "en" ? em.en : em.fr}
            </LTM_Chip>
          ))}
        </div>
      </LTM_Field>

      <LTM_Field label={t("m_tags")}>
        {f.tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {f.tags.map((tag) => (
              <LTM_Chip key={tag} active danger onClick={() => removeTag(tag)}>
                {tag} ×
              </LTM_Chip>
            ))}
          </div>
        )}
        <div className="flex gap-1.5">
          <input
            className={LTM_INPUT_CLS}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag(tagInput);
              }
            }}
            placeholder={
              lang === "en"
                ? "Add a tag and press Enter…"
                : "Ajoute un tag et appuie sur Entrée…"
            }
          />
          <LTM_GhostBtn className="px-3" onClick={() => addTag(tagInput)}>
            +
          </LTM_GhostBtn>
        </div>
        {tagSuggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tagSuggestions.map((tag) => (
              <LTM_Chip key={tag} onClick={() => addTag(tag)}>
                {tag}
              </LTM_Chip>
            ))}
          </div>
        )}
      </LTM_Field>

      <LTM_Field label={t("m_chart")}>
        <div className="grid grid-cols-2 gap-2.5">
          <FilePicker
            accept="image/*"
            value={file}
            existingUrl={shotUrl}
            onChange={setFile}
            onRemove={() => {
              setFile(null);
              setShotUrl(null);
            }}
            hint={t("m_chart_hint")}
          />
          <FilePicker
            accept="image/*"
            value={file2}
            existingUrl={shotUrl2}
            onChange={setFile2}
            onRemove={() => {
              setFile2(null);
              setShotUrl2(null);
            }}
            hint={lang === "en" ? "2nd screenshot (optional)" : "2e capture (optionnel)"}
          />
        </div>
      </LTM_Field>

      <LTM_Field label={t("m_why")}>
        <textarea
          className={`${LTM_INPUT_CLS} min-h-[80px] resize-y leading-relaxed`}
          value={f.why}
          onChange={(e) => set("why", e.target.value)}
          placeholder={t("m_why_ph")}
        />
      </LTM_Field>

      <LTM_Field label={t("m_plan_ok")}>
        <div className="flex gap-1.5">
          <LTM_Chip active={f.plan} onClick={() => set("plan", true)}>
            {t("m_yes")}
          </LTM_Chip>
          <LTM_Chip active={!f.plan} danger onClick={() => set("plan", false)}>
            {t("m_no")}
          </LTM_Chip>
        </div>
      </LTM_Field>
    </LTM_Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Autres modals — INCHANGÉS (utilisent les primitives de ./ui)       */
/* ------------------------------------------------------------------ */

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

  return (
    <Modal title={isEdit ? (L === "en" ? "Edit account" : "Éditer le compte") : t("m_new_account")} onClose={onClose}
      footer={<><GhostBtn className="flex-1" onClick={onClose}>{t("m_cancel")}</GhostBtn><PrimaryBtn className="flex-1" onClick={async () => {
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
      }}>{t("m_save")}</PrimaryBtn></>}>
      <Field label={t("m_firm")}><select className={inputCls} value={f.firm} onChange={(e) => onFirmChange(e.target.value)}>{firmOptions.map((x) => <option key={x}>{x}</option>)}</select></Field>
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
        <Field label={L === "en" ? "Trailing type" : "Type de trailing"}>
          <div className="flex gap-1.5">
            <Chip active={f.trailing_type === "intraday"} onClick={() => set("trailing_type", "intraday")}>Intraday</Chip>
            <Chip active={f.trailing_type === "eod"} onClick={() => set("trailing_type", "eod")}>EOD</Chip>
            <Chip active={f.trailing_type === "static"} onClick={() => set("trailing_type", "static")}>Static</Chip>
          </div>
        </Field>
      </div>
      {!isStatic && (
        <Field label={L === "en" ? "Lock offset ($ above initial)" : "Lock offset ($ au-dessus de l'initial)"}>
          <input type="number" className={inputCls} value={f.trailing_lock_offset} onChange={(e) => set("trailing_lock_offset", e.target.value)} placeholder="0" />
          <div className="mt-1 text-[10.5px] text-muted2">
            {L === "en"
              ? "Once the peak crosses (initial + max DD), the threshold locks at (initial + this offset). Apex: 0. Lucid: 100."
              : "Une fois que le peak franchit (initial + max DD), le seuil se fige à (initial + cet offset). Apex : 0. Lucid : 100."}
          </div>
        </Field>
      )}

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
