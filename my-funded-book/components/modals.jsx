export function SettingsModal({ onClose }) {
  const { profile, saveProfile, trades, lang, setLang, t, notify } = useBook();
  const [f, setF] = useState({ name: profile.name, pin: profile.pin });
  const [portalLoading, setPortalLoading] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

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
      <Field label={t("sub_section")}>
        <GhostBtn className="w-full" onClick={openPortal} disabled={portalLoading}>
          {portalLoading ? t("sub_loading") : t("sub_manage")}
        </GhostBtn>
        <div className="mt-1.5 text-[11px] text-muted2">{t("sub_manage_hint")}</div>
      </Field>
    </Modal>
  );
}
