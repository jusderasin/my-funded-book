// Import des exécutions broker (Tradovate, Rithmic R|Trader, NinjaTrader…).
//
// Deux formats sont reconnus :
//  1. « Performance » Tradovate : une ligne = un aller-retour déjà apparié
//     (buyPrice, sellPrice, boughtTimestamp, soldTimestamp, pnl).
//  2. Liste de fills (Tradovate Fills/Orders, Rithmic Completed Orders,
//     NinjaTrader Executions) : on reconstruit les trades en suivant la
//     position par symbole — un trade s'ouvre quand on quitte le flat et se
//     ferme quand on y revient.
// Les frais/commissions ne sont pas déduits.

import { parseCSV, parseNumber } from "@/lib/csv";

const POINT_VALUES = { MNQ: 2, NQ: 20, MES: 5, ES: 50, MYM: 0.5, YM: 5, M2K: 5, RTY: 50, MGC: 10, GC: 100, MCL: 100, CL: 1000 };
export function pointValue(symbol) {
  const s = String(symbol || "").toUpperCase().trim();
  const key = Object.keys(POINT_VALUES).sort((a, b) => b.length - a.length).find((k) => s.startsWith(k));
  return key ? POINT_VALUES[key] : null;
}

// Contrat → racine lisible : "NQZ5" / "MNQ 12-25" / "F.US.MNQZ25" → "NQ" / "MNQ".
export function rootSymbol(symbol) {
  const s = String(symbol || "").toUpperCase().replace(/^F\.US\./, "").trim();
  const key = Object.keys(POINT_VALUES).sort((a, b) => b.length - a.length).find((k) => s.startsWith(k));
  return key || s.split(/[\s.]/)[0];
}

const pad = (n) => String(n).padStart(2, "0");

// "10/15/2026 09:31:05", "2026-10-15 09:31:05.123", "2026-10-15T09:31:05Z", "15/10/2026 09:31"
export function parseTimestamp(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(s);
  if (m) {
    if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) {
      const d = new Date(s);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  }
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i.exec(s);
  if (m) {
    let [a, b, y] = [+m[1], +m[2], +m[3]];
    if (y < 100) y += 2000;
    // US par défaut (Tradovate/Rithmic) ; si le premier nombre > 12 c'est du JJ/MM.
    const [month, day] = a > 12 ? [b, a] : [a, b];
    let h = +m[4];
    if (m[7]) h = (h % 12) + (/pm/i.test(m[7]) ? 12 : 0);
    return new Date(y, month - 1, day, h, +m[5], +(m[6] || 0));
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hms = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const norm = (h) => String(h || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const find = (headers, ...names) => {
  const list = headers.map(norm);
  for (const name of names) {
    const index = list.indexOf(name);
    if (index !== -1) return index;
  }
  for (const name of names) {
    const index = list.findIndex((h) => h.includes(name));
    if (index !== -1) return index;
  }
  return -1;
};

function makeTrade({ symbol, dir, qty, entry, exit, start, end, pnl, source }) {
  const pv = pointValue(symbol);
  const computed = pv ? Math.round((exit - entry) * (dir === "long" ? 1 : -1) * pv * qty * 100) / 100 : null;
  return {
    symbol: rootSymbol(symbol),
    contract: String(symbol || "").toUpperCase(),
    dir,
    qty,
    entry_price: Math.round(entry * 100) / 100,
    exit_price: Math.round(exit * 100) / 100,
    date: isoDate(start),
    entry_time: hms(start),
    exit_time: hms(end),
    start,
    pnl: pnl ?? computed ?? 0,
    source,
  };
}

function fromPerformance(headers, rows) {
  const c = {
    symbol: find(headers, "symbol", "contract"),
    qty: find(headers, "qty", "quantity"),
    buy: find(headers, "buyprice"),
    sell: find(headers, "sellprice"),
    bought: find(headers, "boughttimestamp"),
    sold: find(headers, "soldtimestamp"),
    pnl: find(headers, "pnl", "profitloss"),
  };
  return rows.map((r) => {
    const bought = parseTimestamp(r[c.bought]);
    const sold = parseTimestamp(r[c.sold]);
    const buy = parseNumber(r[c.buy]);
    const sell = parseNumber(r[c.sell]);
    if (!bought || !sold || buy === null || sell === null) return null;
    const long = bought <= sold;
    return makeTrade({
      symbol: r[c.symbol], dir: long ? "long" : "short", qty: Math.abs(parseNumber(r[c.qty]) || 1),
      entry: long ? buy : sell, exit: long ? sell : buy, start: long ? bought : sold, end: long ? sold : bought,
      pnl: c.pnl !== -1 ? parseNumber(String(r[c.pnl] || "").replace(/[$€£\s]/g, "")) : null, source: "tradovate",
    });
  }).filter(Boolean);
}

function fromFills(headers, rows) {
  const c = {
    time: find(headers, "filltime", "timestamp", "updatetime", "time", "datetime", "date"),
    side: find(headers, "bs", "buysell", "side", "action", "direction"),
    qty: find(headers, "filledqty", "qtyfilled", "fillqty", "quantity", "qty", "filled"),
    price: find(headers, "avgfillprice", "fillprice", "avgprice", "price"),
    symbol: find(headers, "contract", "symbol", "instrument"),
    status: find(headers, "status"),
  };
  if (c.time === -1 || c.side === -1 || c.qty === -1 || c.price === -1 || c.symbol === -1) {
    throw new Error("columns");
  }
  const fills = rows.map((r) => {
    if (c.status !== -1 && r[c.status] && !/fill/i.test(r[c.status])) return null;
    const side = String(r[c.side] || "").trim().toLowerCase();
    const sign = /^(b|buy|bot|long)/.test(side) ? 1 : /^(s|sell|sld|short)/.test(side) ? -1 : 0;
    const qty = Math.abs(parseNumber(r[c.qty]) || 0);
    const price = parseNumber(r[c.price]);
    const time = parseTimestamp(r[c.time]);
    if (!sign || !qty || price === null || !time) return null;
    return { sign, qty, price, time, symbol: String(r[c.symbol] || "").trim() };
  }).filter(Boolean).sort((a, b) => a.time - b.time);

  const open = {};
  const trades = [];
  fills.forEach((fill) => {
    const key = fill.symbol.toUpperCase();
    let pos = open[key];
    let remaining = fill.qty;
    while (remaining > 0) {
      if (!pos) {
        pos = open[key] = { symbol: fill.symbol, dir: fill.sign > 0 ? "long" : "short", sign: fill.sign, net: 0, maxQty: 0, inQty: 0, inNotional: 0, outQty: 0, outNotional: 0, start: fill.time, end: fill.time };
      }
      if (fill.sign === pos.sign) {
        pos.net += remaining;
        pos.inQty += remaining;
        pos.inNotional += remaining * fill.price;
        pos.maxQty = Math.max(pos.maxQty, pos.net);
        remaining = 0;
      } else {
        const closing = Math.min(remaining, pos.net);
        pos.net -= closing;
        pos.outQty += closing;
        pos.outNotional += closing * fill.price;
        pos.end = fill.time;
        remaining -= closing;
        if (pos.net === 0) {
          trades.push(makeTrade({
            symbol: pos.symbol, dir: pos.dir, qty: pos.maxQty,
            entry: pos.inNotional / pos.inQty, exit: pos.outNotional / pos.outQty,
            start: pos.start, end: pos.end, pnl: null, source: "fills",
          }));
          // P&L exact même avec des scale-in/out : différence des notionnels.
          const pv = pointValue(pos.symbol);
          if (pv) {
            const last = trades[trades.length - 1];
            const matchedIn = (pos.inNotional / pos.inQty) * pos.outQty;
            last.pnl = Math.round((pos.outNotional - matchedIn) * pos.sign * pv * 100) / 100;
          }
          delete open[key];
          pos = null;
        }
      }
    }
  });
  return { trades, openPositions: Object.keys(open).length };
}

// Renvoie { trades, format, openPositions } ou lève Error("columns"/"empty").
export function parseFills(text) {
  const { headers, rows } = parseCSV(text);
  if (!headers.length || !rows.length) throw new Error("empty");
  const list = headers.map(norm);
  if (list.includes("buyprice") && list.includes("sellprice") && list.some((h) => h.includes("boughttimestamp"))) {
    return { trades: fromPerformance(headers, rows), format: "Tradovate Performance", openPositions: 0 };
  }
  const { trades, openPositions } = fromFills(headers, rows);
  return { trades, format: "Fills", openPositions };
}
