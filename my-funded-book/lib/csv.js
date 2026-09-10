// Parsing CSV générique (délimiteur auto, guillemets RFC4180) + helpers nombre/date
// pour l'import de trades depuis TradingView, Tradovate, NinjaTrader ou tout export tabulaire.
// Aucune dépendance externe : tout est fait à la main pour rester sans npm install.

// ---------- Détection du délimiteur ----------
function detectDelimiter(firstLine) {
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = -1;
  for (const d of candidates) {
    const count = firstLine.split(d).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

// ---------- Parse RFC4180 (gère guillemets, champs contenant le délimiteur/retours ligne, "" échappé) ----------
export function parseCSV(text) {
  const clean = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const firstLineEnd = clean.indexOf("\n");
  const firstLine = firstLineEnd === -1 ? clean : clean.slice(0, firstLineEnd);
  const delim = detectDelimiter(firstLine);

  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const n = clean.length;

  function pushField() {
    row.push(field);
    field = "";
  }
  function pushRow() {
    pushField();
    // Ignore les lignes complètement vides (fin de fichier, ligne blanche isolée)
    if (!(row.length === 1 && row[0] === "")) rows.push(row);
    row = [];
  }

  while (i < n) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === delim) {
      pushField();
      i++;
      continue;
    }
    if (c === "\n") {
      pushRow();
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field !== "" || row.length > 0) pushRow();

  if (rows.length === 0) return { headers: [], rows: [], delimiter: delim };
  const headers = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1);
  return { headers, rows: dataRows, delimiter: delim };
}

// ---------- Nombre : $ / € / espaces / séparateurs milliers / parenthèses négatives ----------
export function parseNumber(raw) {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (s === "") return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  if (/^-/.test(s)) neg = true;
  // Retire tout sauf chiffres, point, virgule, signe moins
  s = s.replace(/[^0-9.,-]/g, "");
  s = s.replace(/-/g, "");

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // Le dernier séparateur rencontré est la décimale, l'autre est un séparateur de milliers
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma && !hasDot) {
    // "1234,56" (décimale EU) vs "1,234" (milliers) : on suppose décimale si exactement 2 chiffres après la dernière virgule
    const parts = s.split(",");
    if (parts[parts.length - 1].length === 2 && parts.length === 2) {
      s = s.replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  }
  const v = parseFloat(s);
  if (Number.isNaN(v)) return null;
  return neg ? -v : v;
}

// ---------- Date : renvoie "YYYY-MM-DD" ou null ----------
// format: "auto" | "DMY" | "MDY" | "YMD"
export function parseDateFlexible(raw, format = "auto") {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === "") return null;

  // Déjà ISO (avec ou sans heure) : "2024-01-15" ou "2024-01-15T09:31:00" ou "2024-01-15 09:31:00"
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  // Format "15 Jan 2024" / "Jan 15, 2024" type Excel — fallback sur Date() natif en dernier recours plus bas.

  const m = s.match(/^(\d{1,4})[\/\-.](\d{1,2})[\/\-.](\d{1,4})/);
  if (m) {
    let [, p1, p2, p3] = m;
    let y, mo, d;
    if (p1.length === 4) {
      // YYYY-MM-DD ou YYYY/MM/DD
      y = p1; mo = p2; d = p3;
    } else if (p3.length === 4) {
      // Les deux premiers sont jour/mois dans un ordre à déterminer
      y = p3;
      if (format === "MDY") { mo = p1; d = p2; }
      else if (format === "DMY") { d = p1; mo = p2; }
      else {
        // auto : si le premier nombre > 12, c'est forcément un jour → DMY
        const n1 = Number(p1);
        if (n1 > 12) { d = p1; mo = p2; }
        else { mo = p1; d = p2; } // ambigu → on retient l'hypothèse la plus courante (MDY, exports US)
      }
    } else {
      return null;
    }
    const yyyy = y.length === 2 ? "20" + y : y;
    const mm = String(mo).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    if (Number(mm) < 1 || Number(mm) > 12 || Number(dd) < 1 || Number(dd) > 31) return null;
    return `${yyyy}-${mm}-${dd}`;
  }

  // Dernier recours : laisser le moteur JS tenter ("15 Jan 2024", "Jan 15 2024", etc.)
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return null;
}

// ---------- Direction : normalise vers "long" / "short" ----------
export function parseDirection(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase();
  if (!s) return null;
  if (["long", "buy", "b", "achat", "l", "1"].includes(s)) return "long";
  if (["short", "sell", "s", "vente", "sh", "-1"].includes(s)) return "short";
  if (s.includes("long") || s.includes("buy") || s.includes("achat")) return "long";
  if (s.includes("short") || s.includes("sell") || s.includes("vente")) return "short";
  return null;
}

// ---------- Auto-détection du mapping colonne CSV → champ trade ----------
const FIELD_KEYWORDS = {
  date: ["date/time", "date heure", "close time", "closing time", "entry date", "exit date", "opened", "date", "time"],
  symbol: ["symbol", "ticker", "instrument", "contract", "contrat", "instrument name"],
  dir: ["side", "direction", "b/s", "type", "action", "sens"],
  pnl: ["net profit", "net p&l", "net pnl", "realized p&l", "profit/loss", "p/l", "pnl", "p&l", "profit"],
  r: ["r multiple", "r-multiple", "rr", "r"],
  session: ["session"],
  grade: ["grade"],
  setup: ["setup", "strategy", "signal", "stratégie"],
  tags: ["tags", "tag"],
  why: ["notes", "note", "comment", "comments", "description", "why"],
};

export function guessMapping(headers) {
  const mapping = {};
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const field of Object.keys(FIELD_KEYWORDS)) {
    let found = -1;
    for (const kw of FIELD_KEYWORDS[field]) {
      const idx = lower.findIndex((h) => h === kw);
      if (idx !== -1) { found = idx; break; }
    }
    if (found === -1) {
      for (const kw of FIELD_KEYWORDS[field]) {
        const idx = lower.findIndex((h) => h.includes(kw));
        if (idx !== -1) { found = idx; break; }
      }
    }
    mapping[field] = found;
  }
  return mapping;
}
