"use client";

import { useEffect, useMemo, useState } from "react";
import { useBook } from "@/components/BookProvider";
import { Field, inputCls, Chip, PrimaryBtn, GhostBtn } from "@/components/ui";
import { Compass, Target, Wrench, Sparkles } from "lucide-react";

/* Valeurs CANONIQUES stockées en base = `v` (français, langue du rapport IA).
   `en` sert uniquement à l'affichage quand lang === "en". */
const EXPERIENCE = [
  { v: "Débutant", en: "Beginner" },
  { v: "Intermédiaire", en: "Intermediate" },
  { v: "Avancé", en: "Advanced" },
  { v: "Pro / Funded", en: "Pro / Funded" },
];

const STYLES = [
  { v: "Scalping", en: "Scalping" },
  { v: "Intraday", en: "Intraday" },
  { v: "Swing", en: "Swing" },
  { v: "Position", en: "Position" },
];

const PLATFORMS = [
  { v: "Tradovate", en: "Tradovate" },
  { v: "Rithmic", en: "Rithmic" },
  { v: "NinjaTrader", en: "NinjaTrader" },
  { v: "TradingView", en: "TradingView" },
  { v: "Quantower", en: "Quantower" },
  { v: "MetaTrader 5", en: "MetaTrader 5" },
  { v: "Autre", en: "Other" },
];

const INSTRUMENTS = [
  "MNQ", "NQ", "MES", "ES", "MGC", "GC",
  "MCL", "CL", "RTY", "YM", "6E", "BTC",
].map((x) => ({ v: x, en: x }));

const CHALLENGES = [
  { v: "Discipline", en: "Discipline" },
  { v: "FOMO", en: "FOMO" },
  { v: "Revenge trading", en: "Revenge trading" },
  { v: "Sur-taille", en: "Oversizing" },
  { v: "Sortie trop tôt", en: "Cutting winners early" },
  { v: "Overtrading", en: "Overtrading" },
  { v: "Patience", en: "Patience" },
  { v: "Respect du plan", en: "Following the plan" },
  { v: "Gestion des pertes", en: "Managing losses" },
  { v: "Hésitation", en: "Hesitation" },
];

const FOCUS = [
  { v: "Psychologie", en: "Psychology" },
  { v: "Gestion du risque", en: "Risk management" },
  { v: "Macro", en: "Macro" },
  { v: "Setups techniques", en: "Technical setups" },
  { v: "Timing des sessions", en: "Session timing" },
  { v: "Money management", en: "Money management" },
  { v: "Journal & review", en: "Journaling & review" },
];

const asArray = (x) => (Array.isArray(x) ? x : []);

export default function ProfilePage() {
  const { profile, saveProfile, lang } = useBook();
  const fr = lang !== "en";
  const label = (o) => (fr ? o.v : o.en);

  const [f, setF] = useState({
    experience: "",
    trading_style: "",
    platform: "",
    instruments: [],
    challenges: [],
    focus_topics: [],
    profile_note: "",
  });
  const [saving, setSaving] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);

  // Resync quand le vrai profil arrive de Supabase
  useEffect(() => {
    setF({
      experience: profile?.experience || "",
      trading_style: profile?.trading_style || "",
      platform: profile?.platform || "",
      instruments: asArray(profile?.instruments),
      challenges: asArray(profile?.challenges),
      focus_topics: asArray(profile?.focus_topics),
      profile_note: profile?.profile_note || "",
    });
  }, [profile?.id]);

  const setOne = (k, v) => setF((s) => ({ ...s, [k]: s[k] === v ? "" : v }));
  const toggle = (k, v) =>
    setF((s) => {
      const cur = asArray(s[k]);
      return { ...s, [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] };
    });

  const filled = useMemo(() => {
    let n = 0;
    if (f.experience) n++;
    if (f.trading_style) n++;
    if (f.platform) n++;
    if (f.instruments.length) n++;
    if (f.challenges.length) n++;
    if (f.focus_topics.length) n++;
    return n;
  }, [f]);
  const pct = Math.round((filled / 6) * 100);

  async function save() {
    setSaving(true);
    await saveProfile({
      experience: f.experience,
      trading_style: f.trading_style,
      platform: f.platform,
      instruments: f.instruments,
      challenges: f.challenges,
      focus_topics: f.focus_topics,
      profile_note: (f.profile_note || "").slice(0, 2000),
    });
    setSaving(false);
    setSavedOnce(true);
  }

  const Card = ({ icon, title, sub, children }) => (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="mt-0.5 rounded-lg border border-line2 bg-panel2 p-2 text-accent">{icon}</div>
        <div>
          <h2 className="text-[15px] font-extrabold text-white">{title}</h2>
          {sub && <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  );

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-6 sm:py-8">
      {/* En-tête */}
      <div className="mb-6">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
          {fr ? "Profil trader" : "Trader profile"}
        </div>
        <h1 className="text-[26px] font-extrabold leading-tight text-white">
          {fr ? "Dis-nous comment tu trades." : "Tell us how you trade."}
        </h1>
        <p className="mt-2 max-w-[560px] text-[13.5px] leading-relaxed text-muted">
          {fr
            ? "Ces réponses nourrissent ton rapport IA. Plus il te connaît, plus l'analyse est personnalisée : il croise ce que tu déclares avec ce que montrent tes trades."
            : "These answers feed your AI report. The more it knows you, the more personal the analysis — it cross-checks what you declare against what your trades actually show."}
        </p>

        {/* Barre de complétion */}
        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel2">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${Math.max(pct, 4)}%` }}
            />
          </div>
          <span className="font-mono text-[11px] font-bold text-muted2">{pct}%</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Expérience & style */}
        <Card
          icon={<Compass size={16} />}
          title={fr ? "Ton niveau & ton style" : "Your level & style"}
          sub={fr ? "Où tu en es et comment tu abordes le marché." : "Where you're at and how you approach the market."}
        >
          <Field label={fr ? "Expérience" : "Experience"}>
            <div className="flex flex-wrap gap-2">
              {EXPERIENCE.map((o) => (
                <Chip key={o.v} active={f.experience === o.v} onClick={() => setOne("experience", o.v)}>
                  {label(o)}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label={fr ? "Style principal" : "Primary trading style"}>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((o) => (
                <Chip key={o.v} active={f.trading_style === o.v} onClick={() => setOne("trading_style", o.v)}>
                  {label(o)}
                </Chip>
              ))}
            </div>
          </Field>
          <div className="mb-0">
            <Field label={fr ? "Plateforme principale" : "Primary platform"}>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((o) => (
                  <Chip key={o.v} active={f.platform === o.v} onClick={() => setOne("platform", o.v)}>
                    {label(o)}
                  </Chip>
                ))}
              </div>
            </Field>
          </div>
        </Card>

        {/* Instruments */}
        <Card
          icon={<Wrench size={16} />}
          title={fr ? "Instruments que tu trades" : "Instruments you trade"}
          sub={fr ? "Sélectionne tout ce que tu touches régulièrement." : "Pick everything you trade regularly."}
        >
          <div className="flex flex-wrap gap-2">
            {INSTRUMENTS.map((o) => (
              <Chip key={o.v} active={f.instruments.includes(o.v)} onClick={() => toggle("instruments", o.v)}>
                {o.v}
              </Chip>
            ))}
          </div>
        </Card>

        {/* Difficultés */}
        <Card
          icon={<Target size={16} />}
          title={fr ? "Tes plus grosses difficultés" : "Your biggest challenges"}
          sub={
            fr
              ? "L'IA reliera chacune à tes chiffres réels (tags, sessions, discipline)."
              : "The AI will tie each one to your real numbers (tags, sessions, discipline)."
          }
        >
          <div className="flex flex-wrap gap-2">
            {CHALLENGES.map((o) => (
              <Chip
                key={o.v}
                danger
                active={f.challenges.includes(o.v)}
                onClick={() => toggle("challenges", o.v)}
              >
                {label(o)}
              </Chip>
            ))}
          </div>
        </Card>

        {/* Sujets prioritaires */}
        <Card
          icon={<Sparkles size={16} />}
          title={fr ? "Sujets à prioriser" : "Topics to prioritise"}
          sub={fr ? "Ce sur quoi tu veux que le coach insiste." : "What you want the coach to focus on."}
        >
          <div className="flex flex-wrap gap-2">
            {FOCUS.map((o) => (
              <Chip key={o.v} active={f.focus_topics.includes(o.v)} onClick={() => toggle("focus_topics", o.v)}>
                {label(o)}
              </Chip>
            ))}
          </div>

          <div className="mt-4">
            <Field label={fr ? "Autre chose à savoir ? (optionnel)" : "Anything else? (optional)"}>
              <textarea
                className={`${inputCls} min-h-[110px] resize-y`}
                maxLength={2000}
                placeholder={
                  fr
                    ? "Contexte, objectifs, contraintes horaires, règles de ta prop firm…"
                    : "Context, goals, time constraints, your prop firm rules…"
                }
                value={f.profile_note}
                onChange={(e) => setF((s) => ({ ...s, profile_note: e.target.value }))}
              />
            </Field>
            <div className="text-right font-mono text-[10.5px] text-muted2">
              {(f.profile_note || "").length}/2000
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <PrimaryBtn onClick={save} disabled={saving}>
            {saving
              ? fr ? "Enregistrement…" : "Saving…"
              : fr ? "Enregistrer mon profil" : "Save my profile"}
          </PrimaryBtn>
          {savedOnce && !saving && (
            <span className="text-[12.5px] font-semibold text-accent">
              {fr ? "Profil enregistré ✓" : "Profile saved ✓"}
            </span>
          )}
          <span className="ml-auto text-[12px] text-muted2">
            {fr ? "Modifiable à tout moment." : "Editable anytime."}
          </span>
        </div>
      </div>
    </div>
  );
}
