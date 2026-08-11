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
  const { addTrade, updateTrade, playbooks, notify } = useBook();
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
  const toggleTag = (t) => set("tags", f.tags.includes(t) ? f.tags.filter((x) => x !== t) : [...f.tags, t]);

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
      title={editing ? "Éditer le trade" : "Log trade"}
      onClose={onClose}
      footer={
        <>
          <GhostBtn className="flex-1" onClick={onClose}>Annuler</GhostBtn>
          <PrimaryBtn className="flex-1" onClick={submit} disabled={uploading}>
            {uploading ? "Envoi…" : editing ? "Enregistrer" : "Log trade"}
          </PrimaryBtn>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Instrument"><input className={inputCls} value={f.symbol} onChange={(e) => set("symbol", e.target.value)} placeholder="MNQ, NQ, MGC…" /></Field>
        <Field label="Date"><input type="date" className={inputCls} value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
      </div>
      <Field label="Sens">
        <div className="flex gap-1.5">
          {["long", "short"].map((d) => <Chip key={d} active={f.dir === d} onClick={() => set("dir", d)}>{d === "long" ? "LONG" : "SHORT"}</Chip>)}
        </div>
      </Field>
      <Field label="Session">
        <div className="flex flex-wrap gap-1.5">{SESSIONS.map((s) => <Chip key={s} active={f.session === s} onClick={() => set("session", s)}>{s}</Chip>)}</div>
      </Field>
      <Field label="Grade d'exécution">
        <div className="flex flex-wrap gap-1.5">{GRADES.map((g) => <Chip key={g} active={f.grade === g} onClick={() => set("grade", g)}>{g}</Chip>)}</div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="R"><input type="number" step="0.1" className={inputCls} value={f.r} onChange={(e) => set("r", e.target.value)} placeholder="1" /></Field>
        <Field label="PnL net ($)"><input type="number" step="0.01" className={inputCls} value={f.pnl} onChange={(e) => set("pnl", e.target.value)} placeholder="520" /></Field>
      </div>
      <Field label="Setup (playbook)">
        <select className={inputCls} value={f.setup || ""} onChange={(e) => set("setup", e.target.value)}>
          <option value="">— aucun —</option>
          {playbooks.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Tags">
        <div className="flex flex-wrap gap-1.5">{TAG_LIB.map((t) => <Chip key={t} active={f.tags.includes(t)} danger onClick={() => toggleTag(t)}>{t}</Chip>)}</div>
      </Field>
      <Field label="Capture du graphique">
        <FilePicker
          accept="image/*"
          value={file}
          existingUrl={shotUrl}
          onChange={setFile}
          onRemove={() => { setFile(null); setShotUrl(null); }}
          hint="PNG / JPG / WebP — compressé automatiquement"
        />
      </Field>
      <Field label="WHY — pourquoi ce trade">
        <textarea className={inputCls + " min-h-[70px] resize-y leading-relaxed"} value={f.why} onChange={(e) => set("why", e.target.value)} placeholder="Le contexte, la thèse, l'exécution, ce que tu retiens…" />
      </Field>
      <Field label="Plan respecté ?">
        <div className="flex gap-1.5">
          <Chip active={f.plan} onClick={() => set("plan", true)}>Oui</Chip>
          <Chip active={!f.plan} danger onClick={() => set("plan", false)}>Non</Chip>
        </div>
      </Field>
    </Modal>
  );
}

export function AccountModal({ onClose }) {
  const { addAccount } = useBook();
  const [f, setF] = useState({ firm: "MFF", size: 50000, cost: 0, type: "eval", status: "active", date: todayISO(), note: "" });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  return (
    <Modal title="Nouveau compte" onClose={onClose}
      footer={<><GhostBtn className="flex-1" onClick={onClose}>Annuler</GhostBtn><PrimaryBtn className="flex-1" onClick={async () => { await addAccount({ ...f, size: Number(f.size) || 0, cost: Number(f.cost) || 0 }); onClose(); }}>Enregistrer</PrimaryBtn></>}>
      <Field label="Firme"><select className={inputCls} value={f.firm} onChange={(e) => set("firm", e.target.value)}>{firmOptions.map((x) => <option key={x}>{x}</option>)}</select></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Taille ($)"><input type="number" className={inputCls} value={f.size} onChange={(e) => set("size", e.target.value)} /></Field>
        <Field label="Coût éval ($)"><input type="number" className={inputCls} value={f.cost} onChange={(e) => set("cost", e.target.value)} placeholder="0 si gratuit" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type"><select className={inputCls} value={f.type} onChange={(e) => set("type", e.target.value)}><option value="eval">Évaluation</option><option value="funded">Funded</option></select></Field>
        <Field label="Statut"><select className={inputCls} value={f.status} onChange={(e) => set("status", e.target.value)}><option value="active">En cours</option><option value="passed">Validé</option><option value="funded">Funded</option><option value="failed">Cramé</option><option value="paid">Payé</option></select></Field>
      </div>
      <Field label="Date"><input type="date" className={inputCls} value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
      <Field label="Note"><input className={inputCls} value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="Rapid 50K, static drawdown…" /></Field>
    </Modal>
  );
}

export function CertModal({ onClose }) {
  const { addCert, notify } = useBook();
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
    <Modal title="Nouveau certificat" onClose={onClose}
      footer={<><GhostBtn className="flex-1" onClick={onClose}>Annuler</GhostBtn><PrimaryBtn className="flex-1" onClick={submit} disabled={uploading}>{uploading ? "Envoi…" : "Enregistrer"}</PrimaryBtn></>}>
      <Field label="Firme"><select className={inputCls} value={f.firm} onChange={(e) => set("firm", e.target.value)}>{firmOptions.map((x) => <option key={x}>{x}</option>)}</select></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Montant ($)"><input type="number" className={inputCls} value={f.amount} onChange={(e) => set("amount", e.target.value)} placeholder="50000 ou 1017" /></Field>
        <Field label="Type"><select className={inputCls} value={f.type} onChange={(e) => set("type", e.target.value)}><option value="eval_passed">Eval passed</option><option value="payout">Payout</option></select></Field>
      </div>
      <Field label="Date"><input type="date" className={inputCls} value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
      <Field label="Certificat (image ou PDF)">
        <FilePicker
          accept="image/*,application/pdf"
          value={file}
          onChange={setFile}
          onRemove={() => setFile(null)}
          hint="PNG / JPG / PDF — max 15 Mo"
        />
      </Field>
      <Field label="Note"><input className={inputCls} value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="Express funded, certified funded trader…" /></Field>
    </Modal>
  );
}

export function ExpenseModal({ onClose }) {
  const { addExpense } = useBook();
  const [f, setF] = useState({ firm: "MFF", amount: "", date: todayISO(), note: "" });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  return (
    <Modal title="Nouvelle dépense" onClose={onClose}
      footer={<><GhostBtn className="flex-1" onClick={onClose}>Annuler</GhostBtn><PrimaryBtn className="flex-1" onClick={async () => { if (!Number(f.amount)) return; await addExpense({ ...f, amount: Number(f.amount) }); onClose(); }}>Enregistrer</PrimaryBtn></>}>
      <Field label="Firme / poste"><select className={inputCls} value={f.firm} onChange={(e) => set("firm", e.target.value)}>{firmOptions.map((x) => <option key={x}>{x}</option>)}</select></Field>
      <Field label="Montant ($)"><input type="number" className={inputCls} value={f.amount} onChange={(e) => set("amount", e.target.value)} placeholder="165" /></Field>
      <Field label="Date"><input type="date" className={inputCls} value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
      <Field label="Note"><input className={inputCls} value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="Éval 100K, reset, data feed…" /></Field>
    </Modal>
  );
}

export function SettingsModal({ onClose }) {
  const { profile, saveProfile, trades, lang, setLang, t } = useBook();
  const [f, setF] = useState({ name: profile.name, pin: profile.pin });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  function exportCSV() {
    const rows = [["date", "symbol", "dir", "session", "grade", "r", "pnl", "setup", "tags", "plan", "why"]];
    trades.forEach((t) =>
      rows.push([t.date, t.symbol, t.dir, t.session, t.grade, t.r, t.pnl, t.setup, (t.tags || []).join("|"), t.plan ? 1 : 0, (t.why || "").replace(/"/g, '""')])
    );
    const csv = rows.map((r) => r.map((c) => (/[",\n]/.test(String(c)) ? '"' + c + '"' : c)).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "myfundedbook_trades.csv";
    a.click();
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
    </Modal>
  );
}
