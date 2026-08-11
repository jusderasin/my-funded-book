export function SettingsModal({ onClose }) {
  const { profile, saveProfile, trades } = useBook();
  const [f, setF] = useState({ name: profile.name, pin: profile.pin });
  const [lang, setLang] = useState(
    typeof window !== "undefined" ? localStorage.getItem("lang") || "fr" : "fr"
  );
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
    <Modal title="Réglages" onClose={onClose}
      footer={<><GhostBtn className="flex-1"
