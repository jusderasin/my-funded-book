"use client";

import { useMemo, useState } from "react";
import { Modal, Field, inputCls, Chip, PrimaryBtn, GhostBtn, Pill } from "./ui";
import { useBook } from "./BookProvider";
import { parseCSV, parseNumber, parseDateFlexible, parseDirection, guessMapping } from "@/lib/csv";
import { fmtMoney } from "@/lib/format";

// Champs du journal proposés au mapping. "date" et "pnl" sont obligatoires,
// tout le reste retombe sur une valeur par défaut si la colonne n'est pas mappée.
const TARGET_FIELDS = [
  { key: "date", required: true },
  { key: "symbol" },
  { key: "dir" },
  { key: "session" },
  { key: "grade" },
  { key: "r" },
  { key: "pnl", required: true },
  { key: "setup" },
  { key: "tags" },
  { key: "why" },
];

const FIELD_LABEL = {
  fr: {
    date: "Date", symbol: "Instrument", dir: "Direction (long/short)", session: "Session",
    grade: "Grade", r: "R", pnl: "PnL net", setup: "Setup", tags: "Tags", why: "Notes / WHY",
  },
  en: {
    date: "Date", symbol: "Instrument", dir: "Direction (long/short)", session: "Session",
    grade: "Grade", r: "R", pnl: "Net PnL", setup: "Setup", tags: "Tags", why: "Notes / WHY",
  },
};

const DATE_FORMATS = [
  { v: "auto", fr: "Auto", en: "Auto" },
  { v: "DMY", fr: "JJ/MM/AAAA", en: "DD/MM/YYYY" },
  { v: "MDY", fr: "MM/JJ/AAAA", en: "MM/DD/YYYY" },
];

function splitTags(raw) {
  if (!raw) return [];
  return raw.split(/[|,;/]/).map((x) => x.trim()).filter(Boolean);
}

function buildRow(rawRow, mapping, dateFormat, accountId, planDefault) {
  const get = (field) => {
    const idx = mapping[field];
    if (idx == null || idx === -1) return "";
    return (rawRow[idx] ?? "").trim();
  };

  const dateRaw = get("date");
  const date = parseDateFlexible(dateRaw, dateFormat);
  const pnlRaw = get("pnl");
  const pnl = parseNumber(pnlRaw);

  const errors = [];
  if (!date) errors.push("date");
  if (pnl == null) errors.push("pnl");

  const dirRaw = get("dir");
  const dirParsed = parseDirection(dirRaw);
  const warnings = [];
  if (dirRaw && !dirParsed) warnings.push("dir");

  const row = {
    date: date || null,
    symbol: (get("symbol") || "MNQ").toUpperCase(),
    dir: dirParsed || "long",
    session: get("session") || "NY AM",
    grade: get("grade") || "A+",
    r: parseNumber(get("r")) ?? 0,
    pnl: pnl ?? 0,
    setup: get("setup") || null,
    tags: splitTags(get("tags")),
    why: get("why") || null,
    plan: !!planDefault,
    account_id: accountId || null,
  };

  return { row, errors, warnings };
}

export function ImportCsvModal({ onClose }) {
  const { importTrades, accounts, lang, notify } = useBook();
  const L = lang === "en" ? "en" : "fr";
  const labels = FIELD_LABEL[L];

  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState(null); // { headers, rows }
  const [mapping, setMapping] = useState(null); // field -> header index (-1 = ignoré)
  const [dateFormat, setDateFormat] = useState("auto");
  const [accountId, setAccountId] = useState("");
  const [planDefault, setPlanDefault] = useState(true);
  const [importing, setImporting] = useState(false);
  const [parseError, setParseError] = useState("");

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const result = parseCSV(text);
        if (!result.headers.length || !result.rows.length) {
          setParsed(null);
          setParseError(
            L === "en" ? "Couldn't detect any rows in this file." : "Aucune ligne détectée dans ce fichier."
          );
          return;
        }
        setParsed(result);
        setMapping(guessMapping(result.headers));
      } catch (err) {
        setParsed(null);
        setParseError(L === "en" ? "Couldn't read this CSV." : "Impossible de lire ce CSV.");
      }
    };
    reader.onerror = () => setParseError(L === "en" ? "Couldn't read this file." : "Impossible de lire ce fichier.");
    reader.readAsText(file);
  }

  const built = useMemo(() => {
    if (!parsed || !mapping) return [];
    return parsed.rows.map((rawRow) => buildRow(rawRow, mapping, dateFormat, accountId, planDefault));
  }, [parsed, mapping, dateFormat, accountId, planDefault]);

  const validRows = useMemo(() => built.filter((b) => b.errors.length === 0).map((b) => b.row), [built]);
  const invalidCount = built.length - validRows.length;
  const warningCount = built.filter((b) => b.warnings.length > 0).length;

  function setFieldMapping(field, idx) {
    setMapping((m) => ({ ...m, [field]: idx }));
  }

  async function confirmImport() {
    if (validRows.length === 0) return;
    setImporting(true);
    const CHUNK = 300;
    let importedCount = 0;
    for (let i = 0; i < validRows.length; i += CHUNK) {
      const chunk = validRows.slice(i, i + CHUNK);
      const ok = await importTrades(chunk);
      if (ok) importedCount += chunk.length;
    }
    setImporting(false);
    if (importedCount > 0) {
      notify(
        L === "en"
          ? `${importedCount} trade${importedCount > 1 ? "s" : ""} imported ✓`
          : `${importedCount} trade${importedCount > 1 ? "s" : ""} importé${importedCount > 1 ? "s" : ""} ✓`
      );
      onClose();
    }
  }

  return (
    <Modal
      title={L === "en" ? "Import trades from CSV" : "Importer des trades depuis un CSV"}
      onClose={onClose}
      footer={
        <>
          <GhostBtn className="flex-1" onClick={onClose}>{L === "en" ? "Cancel" : "Annuler"}</GhostBtn>
          {parsed && (
            <PrimaryBtn className="flex-1" onClick={confirmImport} disabled={importing || validRows.length === 0}>
              {importing
                ? (L === "en" ? "Importing…" : "Import en cours…")
                : (L === "en" ? `Import ${validRows.length} trade(s)` : `Importer ${validRows.length} trade(s)`)}
            </PrimaryBtn>
          )}
        </>
      }
    >
      {!parsed ? (
        <div>
          <Field label={L === "en" ? "CSV file" : "Fichier CSV"}>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line2 bg-panel2 px-4 py-9 text-center hover:border-accent">
              <span className="text-[13px] font-semibold text-white/90">
                {L === "en" ? "Click to choose a CSV file" : "Clique pour choisir un fichier CSV"}
              </span>
              <span className="text-[11px] text-muted2">
                {L === "en" ? "TradingView, Tradovate, NinjaTrader… any export works." : "TradingView, Tradovate, NinjaTrader… tout export fonctionne."}
              </span>
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
            </label>
          </Field>
          {parseError && <div className="text-[12px] text-loss">{parseError}</div>}
        </div>
      ) : (
        <div>
          <div className="mb-3.5 flex items-center justify-between rounded-lg border border-line2 bg-panel2 px-3 py-2 text-[12px]">
            <span className="text-white/90">{fileName}</span>
            <span className="text-muted2">
              {parsed.rows.length} {L === "en" ? "rows detected" : "lignes détectées"}
            </span>
          </div>

          <div className="mb-3.5 grid grid-cols-2 gap-3">
            <Field label={L === "en" ? "Date format" : "Format de date"}>
              <select className={inputCls} value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
                {DATE_FORMATS.map((f) => <option key={f.v} value={f.v}>{L === "en" ? f.en : f.fr}</option>)}
              </select>
            </Field>
            <Field label={L === "en" ? "Assign to account" : "Assigner au compte"}>
              <select className={inputCls} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                <option value="">{L === "en" ? "— none —" : "— aucun —"}</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.firm} · {fmtMoney(a.size)}{a.note ? " · " + a.note : ""}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label={L === "en" ? "Mark all as plan-followed?" : "Marquer tous comme plan respecté ?"}>
            <div className="flex gap-1.5">
              <Chip active={planDefault} onClick={() => setPlanDefault(true)}>{L === "en" ? "Yes" : "Oui"}</Chip>
              <Chip active={!planDefault} danger onClick={() => setPlanDefault(false)}>{L === "en" ? "No" : "Non"}</Chip>
            </div>
          </Field>

          <div className="mb-1.5 mt-1 border-t border-line pt-2.5 text-[11px] font-bold uppercase tracking-widest text-muted2">
            {L === "en" ? "Column mapping" : "Correspondance des colonnes"}
          </div>
          <div className="mb-3.5 grid grid-cols-2 gap-3">
            {TARGET_FIELDS.map(({ key, required }) => (
              <Field key={key} label={labels[key] + (required ? " *" : "")}>
                <select
                  className={inputCls}
                  value={mapping[key]}
                  onChange={(e) => setFieldMapping(key, Number(e.target.value))}
                >
                  <option value={-1}>{L === "en" ? "— ignore —" : "— ignorer —"}</option>
                  {parsed.headers.map((h, idx) => (
                    <option key={idx} value={idx}>{h || `(col ${idx + 1})`}</option>
                  ))}
                </select>
              </Field>
            ))}
          </div>

          <div className="mb-1.5 border-t border-line pt-2.5 text-[11px] font-bold uppercase tracking-widest text-muted2">
            {L === "en" ? "Preview" : "Aperçu"}
          </div>
          <div className="mb-2.5 overflow-x-auto rounded-lg border border-line2">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-panel2 text-muted2">
                  <th className="px-2 py-1.5 text-left font-semibold">{L === "en" ? "Date" : "Date"}</th>
                  <th className="px-2 py-1.5 text-left font-semibold">{labels.symbol}</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Dir</th>
                  <th className="px-2 py-1.5 text-right font-semibold">PnL</th>
                  <th className="px-2 py-1.5 text-right font-semibold">R</th>
                  <th className="px-2 py-1.5 text-left font-semibold" />
                </tr>
              </thead>
              <tbody>
                {built.slice(0, 8).map((b, i) => (
                  <tr key={i} className={`border-t border-line2 ${b.errors.length > 0 ? "opacity-50" : ""}`}>
                    <td className="px-2 py-1.5 font-mono">{b.row.date || "—"}</td>
                    <td className="px-2 py-1.5 font-mono">{b.row.symbol}</td>
                    <td className="px-2 py-1.5 font-mono">{b.row.dir}</td>
                    <td className={`px-2 py-1.5 text-right font-mono ${b.row.pnl >= 0 ? "text-accent" : "text-loss"}`}>
                      {fmtMoney(b.row.pnl)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">{b.row.r}</td>
                    <td className="px-2 py-1.5">
                      {b.errors.length > 0 && <Pill tone="red">{L === "en" ? "skipped" : "ignorée"}</Pill>}
                      {b.errors.length === 0 && b.warnings.length > 0 && <Pill tone="yellow">{L === "en" ? "check dir" : "vérifier dir"}</Pill>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsed.rows.length > 8 && (
            <div className="mb-2.5 text-[11px] text-muted2">
              {L === "en" ? `+ ${parsed.rows.length - 8} more rows` : `+ ${parsed.rows.length - 8} autres lignes`}
            </div>
          )}

          <div className="rounded-lg border border-line2 bg-panel2 px-3 py-2.5 text-[12px]">
            <span className="font-semibold text-accent">{validRows.length}</span>{" "}
            {L === "en" ? "valid trade(s) ready to import" : "trade(s) valide(s) prêt(s) à importer"}
            {invalidCount > 0 && (
              <span className="text-loss">
                {" · "}{invalidCount} {L === "en" ? "skipped (missing/invalid date or PnL)" : "ignoré(s) (date ou PnL manquant/invalide)"}
              </span>
            )}
            {warningCount > 0 && (
              <span className="text-goldx">
                {" · "}{warningCount} {L === "en" ? "with an unrecognized direction (defaulted to long)" : "avec direction non reconnue (long par défaut)"}
              </span>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
