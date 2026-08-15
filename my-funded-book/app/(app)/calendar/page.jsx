"use client";

import { useEffect, useMemo, useState } from "react";
import { useBook } from "@/components/BookProvider";
import { createClient } from "@/lib/supabase/client";
import { Modal, Field, inputCls, Chip, PrimaryBtn, GhostBtn } from "@/components/ui";
import { CalendarDays, Plus, Pencil, Trash2 } from "lucide-react";

const ADMIN_ID = "302ef29a-104a-4fe0-bfb3-2fbfdea5bc09";

const COUNTRIES = {
  US: { flag: "🇺🇸", fr: "États-Unis", en: "United States" },
  FR: { flag: "🇫🇷", fr: "France", en: "France" },
  GB: { flag: "🇬🇧", fr: "Royaume-Uni", en: "United Kingdom" },
  CN: { flag: "🇨🇳", fr: "Chine", en: "China" },
  EU: { flag: "🇪🇺", fr: "Zone euro", en: "Eurozone" },
  JP: { flag: "🇯🇵", fr: "Japon", en: "Japan" },
  DE: { flag: "🇩🇪", fr: "Allemagne", en: "Germany" },
  CA: { flag: "🇨🇦", fr: "Canada", en: "Canada" },
};
const COUNTRY_CODES = Object.keys(COUNTRIES);

const IMP = {
  3: { fr: "Élevée", en: "High", color: "#ff3b5c" },
  2: { fr: "Moyenne", en: "Medium", color: "#f59e0b" },
  1: { fr: "Faible", en: "Low", color: "#6b7280" },
};

const emptyForm = { event_date: new Date().toISOString().slice(0, 10), event_time: "", title: "", country: "US", importance: 2, forecast: "", previous: "", actual: "", note: "" };

export default function CalendarPage() {
  const { profile, lang, notify } = useBook();
  const supabase = useMemo(() => createClient(), []);
  const L = lang === "en" ? "en" : "fr";
  const isAdmin = profile?.id === ADMIN_ID;

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fImp, setFImp] = useState(0);      // 0 = toutes
  const [fCountry, setFCountry] = useState("ALL");
  const [scope, setScope] = useState("upcoming"); // upcoming | all
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("econ_events").select("*").order("event_date", { ascending: true });
      setEvents(data || []);
      setLoading(false);
    })();
  }, [supabase]);

  const todayStr = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (fImp && e.importance !== fImp) return false;
      if (fCountry !== "ALL" && e.country !== fCountry) return false;
      if (scope === "upcoming" && e.event_date < todayStr) return false;
      return true;
    });
  }, [events, fImp, fCountry, scope, todayStr]);

  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach((e) => { (g[e.event_date] = g[e.event_date] || []).push(e); });
    return Object.keys(g).sort().map((d) => [d, g[d].sort((a, b) => (a.event_time || "").localeCompare(b.event_time || ""))]);
  }, [filtered]);

  function openNew() { setEditing(null); setForm(emptyForm); setShowForm(true); }
  function openEdit(e) {
    setEditing(e);
    setForm({ event_date: e.event_date, event_time: e.event_time || "", title: e.title, country: e.country, importance: e.importance, forecast: e.forecast || "", previous: e.previous || "", actual: e.actual || "", note: e.note || "" });
    setShowForm(true);
  }

  async function saveEvent() {
    if (!form.title.trim()) return;
    const payload = {
      event_date: form.event_date, event_time: form.event_time || null, title: form.title.trim(),
      country: form.country, importance: Number(form.importance),
      forecast: form.forecast || null, previous: form.previous || null, actual: form.actual || null, note: form.note || null,
    };
    if (editing) {
      const { data, error } = await supabase.from("econ_events").update(payload).eq("id", editing.id).select().single();
      if (error) return notify(error.message, true);
      setEvents((s) => s.map((x) => (x.id === editing.id ? data : x)));
    } else {
      const { data, error } = await supabase.from("econ_events").insert(payload).select().single();
      if (error) return notify(error.message, true);
      setEvents((s) => [...s, data]);
    }
    setShowForm(false); setEditing(null);
    notify(L === "en" ? "Saved ✓" : "Enregistré ✓");
  }

  async function delEvent(id) {
    if (!window.confirm(L === "en" ? "Delete this event?" : "Supprimer cette échéance ?")) return;
    const { error } = await supabase.from("econ_events").delete().eq("id", id);
    if (error) return notify(error.message, true);
    setEvents((s) => s.filter((x) => x.id !== id));
  }

  const fmtDay = (d) => new Date(d + "T00:00:00").toLocaleDateString(L === "en" ? "en-US" : "fr-FR", { weekday: "long", day: "numeric", month: "long" });

  if (loading) return <div className="py-10 text-center text-[13px] text-muted2">…</div>;

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[16px] font-extrabold"><CalendarDays size={18} className="text-accent" /> {L === "en" ? "Economic calendar" : "Calendrier économique"}</h2>
          <div className="mt-0.5 text-[12px] text-muted2">{L === "en" ? "Key macro releases to watch." : "Les échéances macro à surveiller."}</div>
        </div>
        {isAdmin && (
          <button onClick={openNew} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[12px] font-bold text-black hover:brightness-110">
            <Plus size={15} /> {L === "en" ? "Add" : "Ajouter"}
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="mb-4 space-y-2.5 rounded-2xl border border-line bg-panel p-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-wide text-muted2">{L === "en" ? "Impact" : "Importance"}</span>
          <Chip active={fImp === 0} onClick={() => setFImp(0)}>{L === "en" ? "All" : "Toutes"}</Chip>
          {[3, 2, 1].map((i) => <Chip key={i} active={fImp === i} onClick={() => setFImp(i)}>{IMP[i][L]}</Chip>)}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-wide text-muted2">{L === "en" ? "Region" : "Région"}</span>
          <Chip active={fCountry === "ALL"} onClick={() => setFCountry("ALL")}>{L === "en" ? "All" : "Toutes"}</Chip>
          {COUNTRY_CODES.map((c) => <Chip key={c} active={fCountry === c} onClick={() => setFCountry(c)}>{COUNTRIES[c].flag} {c}</Chip>)}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-wide text-muted2">{L === "en" ? "Show" : "Afficher"}</span>
          <Chip active={scope === "upcoming"} onClick={() => setScope("upcoming")}>{L === "en" ? "Upcoming" : "À venir"}</Chip>
          <Chip active={scope === "all"} onClick={() => setScope("all")}>{L === "en" ? "All" : "Tout"}</Chip>
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-2xl border border-line bg-panel p-10 text-center">
          <div className="text-3xl">📅</div>
          <div className="mt-2 text-[15px] font-bold">{L === "en" ? "No event" : "Aucune échéance"}</div>
          <div className="mx-auto mt-1 max-w-[420px] text-[12.5px] text-muted2">
            {isAdmin ? (L === "en" ? "Add your first economic event." : "Ajoute ta première échéance économique.") : (L === "en" ? "Nothing matches your filters." : "Rien ne correspond à tes filtres.")}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([day, list]) => (
            <div key={day}>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted2">{fmtDay(day)}</div>
              <div className="overflow-hidden rounded-2xl border border-line bg-panel">
                {list.map((e, i) => {
                  const imp = IMP[e.importance] || IMP[2];
                  const c = COUNTRIES[e.country] || { flag: "🏳️", [L]: e.country };
                  return (
                    <div key={e.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-line" : ""}`}>
                      <div className="w-12 shrink-0 font-mono text-[12px] text-muted2">{e.event_time || "—"}</div>
                      <div className="flex w-1.5 shrink-0 justify-center">
                        <span className="h-2 w-2 rounded-full" style={{ background: imp.color }} title={imp[L]} />
                      </div>
                      <div className="w-[74px] shrink-0 text-[12px]"><span className="mr-1">{c.flag}</span><span className="text-muted2">{e.country}</span></div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-semibold">{e.title}</div>
                        {(e.forecast || e.previous || e.actual) && (
                          <div className="mt-0.5 flex flex-wrap gap-3 font-mono text-[11px] text-muted2">
                            {e.actual != null && e.actual !== "" && <span>{L === "en" ? "Act:" : "Réel :"} <b className="text-white">{e.actual}</b></span>}
                            {e.forecast && <span>{L === "en" ? "Fcst:" : "Prév. :"} {e.forecast}</span>}
                            {e.previous && <span>{L === "en" ? "Prev:" : "Préc. :"} {e.previous}</span>}
                          </div>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex shrink-0 gap-1">
                          <button onClick={() => openEdit(e)} className="rounded p-1 text-muted2 hover:text-white"><Pencil size={13} /></button>
                          <button onClick={() => delEvent(e.id)} className="rounded p-1 text-muted2 hover:text-loss"><Trash2 size={13} /></button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? (L === "en" ? "Edit event" : "Éditer l'échéance") : (L === "en" ? "New event" : "Nouvelle échéance")} onClose={() => { setShowForm(false); setEditing(null); }}
          footer={<><GhostBtn className="flex-1" onClick={() => { setShowForm(false); setEditing(null); }}>{L === "en" ? "Cancel" : "Annuler"}</GhostBtn><PrimaryBtn className="flex-1" onClick={saveEvent}>{L === "en" ? "Save" : "Enregistrer"}</PrimaryBtn></>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label={L === "en" ? "Date" : "Date"}><input type="date" className={inputCls} value={form.event_date} onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))} /></Field>
            <Field label={L === "en" ? "Time" : "Heure"}><input className={inputCls} value={form.event_time} onChange={(e) => setForm((f) => ({ ...f, event_time: e.target.value }))} placeholder="14:30" /></Field>
          </div>
          <Field label={L === "en" ? "Event" : "Événement"}><input className={inputCls} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="CPI (YoY), NFP, FOMC…" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={L === "en" ? "Region" : "Région"}>
              <select className={inputCls} value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}>
                {COUNTRY_CODES.map((c) => <option key={c} value={c}>{COUNTRIES[c].flag} {COUNTRIES[c][L]}</option>)}
              </select>
            </Field>
            <Field label={L === "en" ? "Impact" : "Importance"}>
              <div className="flex gap-1.5">{[3, 2, 1].map((i) => <Chip key={i} active={Number(form.importance) === i} onClick={() => setForm((f) => ({ ...f, importance: i }))}>{IMP[i][L]}</Chip>)}</div>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label={L === "en" ? "Forecast" : "Prévision"}><input className={inputCls} value={form.forecast} onChange={(e) => setForm((f) => ({ ...f, forecast: e.target.value }))} placeholder="3.1%" /></Field>
            <Field label={L === "en" ? "Previous" : "Précédent"}><input className={inputCls} value={form.previous} onChange={(e) => setForm((f) => ({ ...f, previous: e.target.value }))} placeholder="3.2%" /></Field>
            <Field label={L === "en" ? "Actual" : "Réel"}><input className={inputCls} value={form.actual} onChange={(e) => setForm((f) => ({ ...f, actual: e.target.value }))} placeholder="—" /></Field>
          </div>
          <Field label={L === "en" ? "Note" : "Note"}><input className={inputCls} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} /></Field>
        </Modal>
      )}
    </div>
  );
}
