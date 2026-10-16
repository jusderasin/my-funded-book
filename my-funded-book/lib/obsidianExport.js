// Export « coffre Obsidian » : une note par jour tradé, une note par setup et
// un tableau de bord, reliés par des [[liens]] pour que la vue graphe
// d'Obsidian dessine la carte de ton trading. Zip écrit à la main (sans
// compression) pour ne pas ajouter de dépendance.

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function header(fields) {
  const size = fields.reduce((max, [at, , bytes]) => Math.max(max, at + bytes), 0);
  const view = new DataView(new ArrayBuffer(size));
  fields.forEach(([at, value, bytes]) => (bytes === 4 ? view.setUint32(at, value, true) : view.setUint16(at, value, true)));
  return new Uint8Array(view.buffer);
}

export function buildZip(files) {
  const encoder = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;
  files.forEach(({ path, content }) => {
    const name = encoder.encode(path);
    const data = encoder.encode(content);
    const crc = crc32(data);
    // 0x0800 = noms de fichiers en UTF-8 ; 0x21 = date DOS minimale valide.
    chunks.push(header([[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, 0, 2], [12, 0x21, 2], [14, crc, 4], [18, data.length, 4], [22, data.length, 4], [26, name.length, 2], [28, 0, 2]]), name, data);
    central.push(header([[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, 0, 2], [14, 0x21, 2], [16, crc, 4], [20, data.length, 4], [24, data.length, 4], [28, name.length, 2], [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, offset, 4]]), name);
    offset += 30 + name.length + data.length;
  });
  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = header([[0, 0x06054b50, 4], [4, 0, 2], [6, 0, 2], [8, files.length, 2], [10, files.length, 2], [12, centralSize, 4], [16, offset, 4], [20, 0, 2]]);
  return new Blob([...chunks, ...central, end], { type: "application/zip" });
}

const safe = (value) => String(value || "Sans setup").replace(/[\\/:*?"<>|#^[\]]/g, "-").trim() || "Sans setup";
const money = (value) => `${value < 0 ? "-" : ""}$${Math.abs(Math.round(value * 100) / 100)}`;
const tagList = (trade) => (Array.isArray(trade.tags) ? trade.tags : String(trade.tags || "").split(",")).map((tag) => tag.trim()).filter(Boolean);
const sum = (list) => list.reduce((total, trade) => total + (Number(trade.pnl) || 0), 0);

export function buildObsidianVault(trades, lang = "fr") {
  const en = lang === "en";
  const root = "MyTradeBook";
  const byDay = {};
  const bySetup = {};
  trades.forEach((trade) => {
    (byDay[trade.date] ||= []).push(trade);
    (bySetup[safe(trade.setup)] ||= []).push(trade);
  });
  const files = [];
  Object.entries(byDay).forEach(([date, list]) => {
    const body = list.map((trade, index) => [
      `## ${index + 1}. ${trade.symbol || "—"} · ${String(trade.dir || "").toUpperCase()} · ${money(Number(trade.pnl) || 0)}`,
      `- Setup : [[${safe(trade.setup)}]]`,
      trade.session && `- Session : ${trade.session}`,
      trade.r != null && `- R : ${trade.r}`,
      `- ${en ? "Plan followed" : "Plan respecté"} : ${trade.plan ? "✅" : "❌"}`,
      trade.emotion && `- ${en ? "Emotion" : "Émotion"} : ${trade.emotion}`,
      tagList(trade).length && `- Tags : ${tagList(trade).map((tag) => `#${tag.replace(/\s+/g, "_")}`).join(" ")}`,
      (trade.notes || trade.note) && `\n${trade.notes || trade.note}`,
    ].filter(Boolean).join("\n")).join("\n\n");
    const pnl = sum(list);
    files.push({ path: `${root}/Journal/${date}.md`, content: `---\ndate: ${date}\npnl: ${Math.round(pnl * 100) / 100}\ntrades: ${list.length}\n---\n# ${date} · ${money(pnl)}\n\n${en ? "Back to" : "Retour au"} [[Dashboard]]\n\n${body}\n` });
  });
  Object.entries(bySetup).forEach(([setup, list]) => {
    const pnl = sum(list);
    const winRate = Math.round(list.filter((trade) => Number(trade.pnl) > 0).length / list.length * 100);
    const days = [...new Set(list.map((trade) => trade.date))].sort().reverse();
    files.push({ path: `${root}/Setups/${setup}.md`, content: `---\ntype: setup\ntrades: ${list.length}\npnl: ${Math.round(pnl * 100) / 100}\nwinrate: ${winRate}\n---\n# ${setup}\n\n- Trades : ${list.length}\n- P&L : ${money(pnl)}\n- Win rate : ${winRate}%\n\n## ${en ? "Days" : "Jours"}\n${days.map((day) => `- [[${day}]]`).join("\n")}\n` });
  });
  files.push({ path: `${root}/Dashboard.md`, content: `# MyTradeBook · Dashboard\n\n${en ? "Exported on" : "Exporté le"} ${new Date().toISOString().slice(0, 10)}\n\n- Trades : ${trades.length}\n- P&L : ${money(sum(trades))}\n\n## Setups\n${Object.keys(bySetup).map((setup) => `- [[${setup}]] (${bySetup[setup].length})`).join("\n")}\n\n## Journal\n${Object.keys(byDay).sort().reverse().map((day) => `- [[${day}]]`).join("\n")}\n` });
  return buildZip(files);
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
