"use client";

import { useEffect, useMemo, useState } from "react";
import { useBook } from "@/components/BookProvider";
import { createClient } from "@/lib/supabase/client";
import { Kpi, Modal, Field, inputCls, Chip, PrimaryBtn, GhostBtn } from "@/components/ui";
import { Plus, FlaskConical, Trash2 } from "lucide-react";

const STR = {
  fr: {
    title: "Backtesting",
    sub: "Sessions et scénarios d'analyse historique — séparé de ton journal live",
    newSession: "Nouvelle session", createSession: "Créer la session",
    noSessionsT: "Aucune session de backtest",
    noSessionsS: "Crée ta première session pour tester une stratégie sur l'historique. Ça ne touche jamais tes stats live.",
    sName: "Nom de la session", sNamePh: "ex. NY Open Sweep — Août",
    sInstrument: "Instrument", sTf: "Timeframe", sTfPh: "ex. 1m, 5m, 15m",
    sOneR: "Valeur d'1R ($)", sNote: "Note",
    wr: "Win Rate", pf: "Profit Factor", totalR: "Total R", expectancy: "Expectancy / trade",
    addTrade: "Trade", noTradesT: "Aucun trade", noTradesS: "Ajoute tes trades backtest en R (résultat + RR).",
    thDate: "Date", thDir: "Sens", thResult: "Résultat", thR: "R", thSetup: "Setup",
    selectHint: "Sélectionne une session ci-dessus, ou crées-en une nouvelle.",
    tradeTitle: "Trade backtest", editTradeTitle: "Éditer le trade",
    fDate: "Date", fTime: "Heure", fDir: "Sens", fResult: "Résultat",
    fRR: "RR (risque/récompense)", fSetup: "Setup", fNone: "— aucun —",
    fNotes: "Notes", fNotesPh: "Observations, contexte…", fShot: "Screenshot (URL)",
    save: "Enregistrer", cancel: "Annuler",
    win: "Win", loss: "Loss", be: "BE", long: "LONG", short: "SHORT",
    created: "Session créée ✓", deleted: "Supprimé",
    confirmDelSession: "Supprimer cette session et tous ses trades ?", trades: "trades",
  },
  en: {
    title: "Backtesting",
    sub: "Sessions and historical analysis scenarios — separate from your live journal",
    newSession: "New session", createSession: "Create session",
    noSessionsT: "No backtest session",
    noSessionsS: "Create your first session to test a strategy on history. It never touches your live stats.",
    sName: "Session name", sNamePh: "e.g. NY Open Sweep — August",
    sInstrument: "Instrument", sTf: "Timeframe", sTfPh: "e.g. 1m, 5m, 15m",
    sOneR: "Value of 1R ($)", sNote: "Note",
    wr: "Win Rate", pf: "Profit Factor", totalR: "Total R", expectancy: "Expectancy / trade",
    addTrade: "Trade", noTradesT: "No trade", noTradesS: "Add your backtest trades in R (result + RR).",
    thDate: "Date", thDir: "Dir", thResult: "Result", thR: "R", thSetup: "Setup",
    selectHint: "Select a session above, or create a new one.",
    tradeTitle: "Backtest trade", editTradeTitle: "Edit trade",
    fDate: "Date", fTime: "Time", fDir: "Direction", fResult: "Result",
    fRR: "RR (risk/reward)", fSetup: "Setup", fNone: "— none —",
    fNotes: "Notes", fNotesPh: "Observations, context…", fShot: "Screenshot (URL)",
    save: "Save", cancel: "Cancel",
    win: "Win", loss: "Loss", be: "BE", long: "LONG", short: "SHORT",
    created: "Session created ✓", deleted: "Deleted",
    confirmDelSession: "Delete this session and all its trades?", trades: "trades",
  },
};

const rOf = (t) => (t.result === "win" ? Number(t.rr || 0) : t.result === "loss" ? -1 : 0);

export default function BacktestPage() {
  const { lang, notify, playbooks } = useBook();
  const supabase = useMemo(() => createClient(), []);
  const L = STR[lang] || STR.fr;

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [trades, setTrades] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", instrument: "MNQ", timeframe: "", one_r: 200, note: "" });
  const [showTrade, setShowTrade] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    (async () => {
      const [ss, tt] = await Promise.all([
        supabase.from("bt_sessions").select("*").order("created_at", { ascending: false }),
        supabase.from("bt_trades").select("*").order("date", { ascending: false }),
      ]);
      const sList = ss.data || [];
      setSessions(sList);
      setTrades(tt.data || []);
      if (sList.length) setSelectedId(sList[0].id);
      setLoading(false);
    })();
  }, [supabase]);

  const selected = sessions.find((s) => s.id === selectedId) || null;
  const sTrades = trades.filter((t) => t.session_id === selectedId);

  const stats = useMemo(() => {
    const wins = sTrades.filter((t) => t.result === "win").length;
    const losses = sTrades.filter((t) => t.result === "loss").length;
    const be = sTrades.filter((t) => t.result === "be").length;
    const totalR = sTrades.reduce((a, t) => a + rOf(t), 0);
    const wr = wins + losses ? (wins / (wins + losses)) * 100 : 0;
    const grossWin = sTrades.filter((t) => t.result === "win").reduce((a, t) => a + Number(t.rr || 0), 0);
    const pf = losses > 0 ? grossWin / losses : grossWin > 0 ? Infinity : 0;
    const expectancy = sTrades.length ? totalR / sTrades.length : 0;
    return { wins, losses, be, totalR, wr, pf, expectancy, n: sTrades.length };
  }, [sTrades]);

  async function createSession() {
    if (!form.name.trim()) return;
    const { data, error } = await supabase
      .from("bt_sessions")
      .insert({
        name: form.name.trim(),
        instrument: form.instrument || "MNQ",
        timeframe: form.timeframe || null,
        one_r: Number(form.one_r) || 200,
        note: form.note || null,
      })
      .select()
      .single();
    if (error) return notify(error.message, true);
    setSessions((s) => [data, ...s]);
    setSelectedId(data.id);
    setShowNew(false);
    setForm({ name: "", instrument: "MNQ", timeframe: "", one_r: 200, note: "" });
    notify(L.created);
  }

  async function deleteSession(id) {
    if (!window.confirm(L.confirmDelSession)) return;
    const { error } = await supabase.from("bt_sessions").delete().eq("id", id);
    if (error) return notify(error.message, true);
    setSessions((s) => s.filter((x) => x.id !== id));
    setTrades((t) => t.filter((x) => x.session_id !== id));
    if (selectedId === id) setSelectedId(null);
    notify(L.deleted);
  }

  async function saveTrade(row) {
    if (editing) {
      const { data, error } = await supabase.from("bt_trades").update(row).eq("id", editing.id).select().single();
      if (error) return notify(error.message, true);
      setTrades((t) => t.map((x) => (x.id === editing.id ? data : x)));
    } else {
      const { data, error } = await supabase.from("bt_trades").insert({ ...row, session_id: selectedId }).select().single();
      if (error) return notify(error.message, true);
      setTrades((t) => [data, ...t]);
    }
    setShowTrade(false);
    setEditing(null);
  }

  async function deleteTrade(id) {
    const { error } = await supabase.from("bt_trades").delete().eq("id", id);
    if (error) return notify(error.message, true);
    setTrades((t) => t.filter((x) => x.id !== id));
    notify(L.deleted);
  }

  const fmtD = (d) => (d ? new Date(d).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR", { day: "2-digit", month: "short" }) : "");
  const fmtPf = (v) => (v === Infinity ? "∞" : v.toFixed(2));

  if (loading) return <div className="py-10 text-center text-[13px] text-muted2">…</div>;

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[16px] font-extrabold">
            <FlaskConical size={18} className="text-accent" /> {L.title}
          </h2>
          <div className="mt-0.5 text-[12px] text-muted2">{L.sub}</div>
        </div>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[12px] font-bold text-black hover:brightness-110">
          <Plus size={15} /> {L.newSession}
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-2xl border border-line bg-panel p-10 text-center">
          <div className="text-3xl">🔬</div>
          <div className="mt-2 text-[15px] font-bold">{L.noSessionsT}</div>
          <div className="mx-auto mt-1 max-w-[420px] text-[12.5px] text-muted2">{L.noSessionsS}</div>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {sessions.map((s) => {
              const active = s.id === selectedId;
              return (
                <button key={s.id} onClick={() => setSelectedId(s.id)}
                  className={`group flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left transition-colors ${active ? "border-accent bg-accentDim" : "border-line bg-panel hover:border-line2"}`}>
                  <div>
                    <div className={`text-[13px] font-bold ${active ? "text-accent" : "text-white"}`}>{s.name}</div>
                    <div className="text-[10px] text-muted2">{s.instrument}{s.timeframe ? ` · ${s.timeframe}` : ""} · 1R = {Number(s.one_r || 0)}$</div>
                  </div>
                  <span onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }} className="ml-1 rounded p-1 text-muted2 opacity-0 hover:text-loss group-hover:opacity-100" title="×">
                    <Trash2 size={13} />
                  </span>
                </button>
              );
            })}
          </div>

          {selected ? (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Kpi label={L.wr} tone={stats.wr >= 50 ? "pos" : "warn"} value={stats.wr.toFixed(1) + "%"} sub={`${stats.wins}W · ${stats.losses}L · ${stats.be}BE`} />
                <Kpi label={L.pf} tone={stats.pf >= 1.5 ? "pos" : stats.pf >= 1 ? "warn" : "neg"} value={fmtPf(stats.pf)} />
                <Kpi label={L.totalR} tone={stats.totalR >= 0 ? "pos" : "neg"} value={(stats.totalR >= 0 ? "+" : "") + stats.totalR.toFixed(1) + "R"} sub={`${Math.round(stats.totalR * Number(selected.one_r || 0))} $ · ${stats.n} ${L.trades}`} />
                <Kpi label={L.expectancy} tone={stats.expectancy >= 0 ? "pos" : "neg"} value={(stats.expectancy >= 0 ? "+" : "") + stats.expectancy.toFixed(2) + "R"} />
              </div>

              <div className="rounded-2xl border border-line bg-panel p-[18px]">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-[12px] font-semibold uppercase tracking-wide text-muted2">{selected.name}</h3>
                  <button onClick={() => { setEditing(null); setShowTrade(true); }} className="inline-flex items-center gap-1 rounded-lg bg-accentDim px-2.5 py-1.5 text-[12px] font-bold text-accent hover:brightness-110">
                    <Plus size={14} /> {L.addTrade}
                  </button>
                </div>

                {sTrades.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="text-[13px] font-semibold">{L.noTradesT}</div>
                    <div className="mt-1 text-[12px] text-muted2">{L.noTradesS}</div>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wide text-muted2">
                        <th className="pb-2.5 text-left font-bold">{L.thDate}</th>
                        <th className="pb-2.5 text-left font-bold">{L.thDir}</th>
                        <th className="pb-2.5 text-left font-bold">{L.thResult}</th>
                        <th className="pb-2.5 text-right font-bold">{L.thR}</th>
                        <th className="pb-2.5 pl-3 text-left font-bold">{L.thSetup}</th>
                        <th className="pb-2.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sTrades.map((tr) => {
                        const r = rOf(tr);
                        const rColor = r > 0 ? "text-accent" : r < 0 ? "text-loss" : "text-muted2";
                        return (
                          <tr key={tr.id} className="border-t border-line text-[13px]">
                            <td className="py-2 font-mono text-muted2">{fmtD(tr.date)}</td>
                            <td className="py-2 font-mono uppercase">{tr.dir}</td>
                            <td className="py-2">
                              <span className={`text-[11px] font-bold uppercase ${tr.result === "win" ? "text-accent" : tr.result === "loss" ? "text-loss" : "text-muted2"}`}>{L[tr.result] || tr.result}</span>
                            </td>
                            <td className={`py-2 text-right font-mono font-bold ${rColor}`}>{(r > 0 ? "+" : "") + r.toFixed(1)}R</td>
                            <td className="py-2 pl-3 text-muted2">{tr.setup || "—"}</td>
                            <td className="py-2 text-right">
                              <button onClick={() => { setEditing(tr); setShowTrade(true); }} className="mr-2 text-[11px] text-muted2 hover:text-white">✎</button>
                              <button onClick={() => deleteTrade(tr.id)} className="text-muted2 hover:text-loss"><Trash2 size={13} /></button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-panel p-8 text-center text-[13px] text-muted2">{L.selectHint}</div>
          )}
        </>
      )}

      {showNew && (
        <Modal title={L.newSession} onClose={() => setShowNew(false)}
          footer={<><GhostBtn className="flex-1" onClick={() => setShowNew(false)}>{L.cancel}</GhostBtn><PrimaryBtn className="flex-1" onClick={createSession}>{L.createSession}</PrimaryBtn></>}>
          <Field label={L.sName}><input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={L.sNamePh} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={L.sInstrument}><input className={inputCls} value={form.instrument} onChange={(e) => setForm((f) => ({ ...f, instrument: e.target.value }))} placeholder="MNQ" /></Field>
            <Field label={L.sTf}><input className={inputCls} value={form.timeframe} onChange={(e) => setForm((f) => ({ ...f, timeframe: e.target.value }))} placeholder={L.sTfPh} /></Field>
          </div>
          <Field label={L.sOneR}><input type="number" className={inputCls} value={form.one_r} onChange={(e) => setForm((f) => ({ ...f, one_r: e.target.value }))} placeholder="200" /></Field>
          <Field label={L.sNote}><input className={inputCls} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} /></Field>
        </Modal>
      )}

      {showTrade && (
        <BtTradeModal L={L} playbooks={playbooks} editing={editing} onClose={() => { setShowTrade(false); setEditing(null); }} onSave={saveTrade} />
      )}
    </div>
  );
}

function BtTradeModal({ L, playbooks, editing, onClose, onSave }) {
  const [f, setF] = useState(editing || { date: new Date().toISOString().slice(0, 10), entry_time: "", dir: "long", result: "win", rr: 2, setup: "", notes: "", screenshot_url: "" });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  function submit() {
    onSave({
      date: f.date, entry_time: f.entry_time || null, dir: f.dir, result: f.result,
      rr: Number(f.rr) || 0, setup: f.setup || null, notes: f.notes || null, screenshot_url: f.screenshot_url || null,
    });
  }

  return (
    <Modal title={editing ? L.editTradeTitle : L.tradeTitle} onClose={onClose}
      footer={<><GhostBtn className="flex-1" onClick={onClose}>{L.cancel}</GhostBtn><PrimaryBtn className="flex-1" onClick={submit}>{L.save}</PrimaryBtn></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label={L.fDate}><input type="date" className={inputCls} value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
        <Field label={L.fTime}><input type="time" className={inputCls} value={f.entry_time || ""} onChange={(e) => set("entry_time", e.target.value)} /></Field>
      </div>
      <Field label={L.fDir}>
        <div className="flex gap-1.5">
          <Chip active={f.dir === "long"} onClick={() => set("dir", "long")}>{L.long}</Chip>
          <Chip active={f.dir === "short"} onClick={() => set("dir", "short")}>{L.short}</Chip>
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={L.fResult}>
          <div className="flex gap-1.5">
            <Chip active={f.result === "win"} onClick={() => set("result", "win")}>{L.win}</Chip>
            <Chip active={f.result === "loss"} danger onClick={() => set("result", "loss")}>{L.loss}</Chip>
            <Chip active={f.result === "be"} onClick={() => set("result", "be")}>{L.be}</Chip>
          </div>
        </Field>
        <Field label={L.fRR}><input type="number" step="0.1" className={inputCls} value={f.rr} onChange={(e) => set("rr", e.target.value)} placeholder="2" /></Field>
      </div>
      <Field label={L.fSetup}>
        <select className={inputCls} value={f.setup || ""} onChange={(e) => set("setup", e.target.value)}>
          <option value="">{L.fNone}</option>
          {(playbooks || []).map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
      </Field>
      <Field label={L.fNotes}><textarea className={inputCls + " min-h-[60px] resize-y"} value={f.notes || ""} onChange={(e) => set("notes", e.target.value)} placeholder={L.fNotesPh} /></Field>
      <Field label={L.fShot}><input className={inputCls} value={f.screenshot_url || ""} onChange={(e) => set("screenshot_url", e.target.value)} placeholder="https://i.imgur.com/..." /></Field>
    </Modal>
  );
}
