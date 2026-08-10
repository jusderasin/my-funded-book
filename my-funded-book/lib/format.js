export function fmtMoney(n, dec = false) {
  const neg = n < 0 ? "-" : "";
  const v = Math.abs(Number(n) || 0);
  return (
    neg +
    "$" +
    (dec
      ? v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : Math.round(v).toLocaleString("fr-FR"))
  );
}

export function fmtK(n) {
  const neg = n < 0 ? "-" : "";
  const v = Math.abs(Number(n) || 0);
  if (v >= 1000) return neg + "$" + (v / 1000).toFixed(v >= 10000 ? 0 : 2) + "K";
  return neg + "$" + Math.round(v);
}

export function fmtR(r) {
  return (r >= 0 ? "+" : "") + Number(r).toFixed(1) + "R";
}

export function frDate(d) {
  if (!d) return "—";
  const [y, m, dd] = String(d).split("-");
  return `${dd}/${m}/${y}`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
