"use client";
import { useState } from "react";
import { useBook } from "@/components/BookProvider";
import { LogTradeModal } from "@/components/modals";
import { ImportCsvModal } from "@/components/ImportCsvModal";
import { gradeClass, EMOTION_BY_KEY } from "@/lib/constants";
import { fmtMoney } from "@/lib/format";
import { Plus, Upload, BookOpen, Pencil, Trash2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Primitives locales PRISM (au lieu de Pill/EmptyState/Btn de ui.jsx).*/
/* ------------------------------------------------------------------ */

const PILL_TONES = {
  green:   "bg-prism-win/10 text-prism-win border-prism-win/20",
  red:     "bg-prism-loss/10 text-prism-loss border-prism-loss/20",
  gray:    "bg-white/[0.04] text-prism-muted border-prism-line",
  accent:  "bg-prism-accentDim text-prism-accent border-prism-accent/20",
  gold:    "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  cyan:    "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  pink:    "bg-pink-500/10 text-pink-400 border-pink-500/20",
};

function Pill({ tone = "gray", children }) {
  const cls = PILL_TONES[tone] || PILL_TONES.gray;
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cls}`}>
      {children}
    </span>
  );
}

// Mapping grade → tone Pill PRISM
const GRADE_TONES = {
  ap: "accent", // A+
  a:  "cyan",
  b:  "gold",
  c:  "pink",
  f:  "red",
};

function EmptyState({ title, sub }) {
  return (
    <div className="rounded-2xl border border-dashed border-prism-line bg-prism-panel p-12 text-center">
      <BookOpen className="mx-auto h-10 w-10 text-prism-muted2 mb-4" />
      <div className="text-lg font-semibold text-white mb-1">{title}</div>
      <div className="text-sm text-prism-muted">{sub}</div>
    </div>
  );
}

function GhostBtn({ children, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-xl border border-prism-line bg-transparent px-3 py-2 text-xs font-semibold text-white hover:bg-white/[0.03] hover:border-prism-line2 transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

function PrimaryBtn({ children, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-xl bg-white text-black px-3 py-2 text-xs font-semibold hover:bg-white/90 active:bg-white/80 transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function JournalPage() {
  const { trades, deleteTrade, t, lang } = useBook();
  const [editing, setEditing] = useState(null);
  const [importing, setImporting] = useState(false);

  return (
    <div className="min-h-full bg-black text-white p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {t("jrn_title")}
          </h1>
          <p className="mt-1 text-sm text-prism-muted">
            {lang === "en"
              ? "Every logged trade with notes, tags and screenshots"
              : "Chaque trade loggé avec notes, tags et captures"}
          </p>
        </div>
        <div className="flex gap-2">
          <GhostBtn onClick={() => setImporting(true)}>
            <Upload className="h-3.5 w-3.5" />
            {t("jrn_import")}
          </GhostBtn>
          <PrimaryBtn onClick={() => setEditing("new")}>
            <Plus className="h-3.5 w-3.5" />
            {t("jrn_add")}
          </PrimaryBtn>
        </div>
      </div>

      {trades.length === 0 ? (
        <EmptyState title={t("jrn_empty_t")} sub={t("jrn_empty_s")} />
      ) : (
        <div className="flex flex-col gap-3">
          {trades.map((tr) => {
            const win = tr.pnl >= 0;
            const gradeTone = GRADE_TONES[gradeClass(tr.grade)] || "gray";
            return (
              <div
                key={tr.id}
                className={`rounded-2xl border border-prism-line bg-prism-panel px-5 py-4 border-l-[3px] ${
                  win ? "border-l-prism-win" : "border-l-prism-loss"
                }`}
              >
                {/* Ligne 1 : montant + grade + méta */}
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`font-mono text-2xl font-bold tabular-nums ${
                      win ? "text-prism-win" : "text-prism-loss"
                    }`}
                  >
                    {(win ? "+" : "") + fmtMoney(tr.pnl)}
                  </span>
                  <Pill tone={gradeTone}>{tr.grade}</Pill>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-prism-muted2">
                    <Pill tone="gray">
                      {(tr.r >= 0 ? "+" : "") + Number(tr.r).toFixed(0)}R
                    </Pill>
                    <span className="font-mono">{tr.date}</span>
                    <span>·</span>
                    <b className="font-mono text-prism-muted">{tr.symbol}</b>
                    <Pill tone={tr.dir === "long" ? "green" : "red"}>
                      {tr.dir === "long" ? "LONG" : "SHORT"}
                    </Pill>
                    {tr.outcome && (
                      <Pill
                        tone={
                          tr.outcome === "TP"
                            ? "green"
                            : tr.outcome === "SL"
                            ? "red"
                            : "gray"
                        }
                      >
                        {tr.outcome}
                      </Pill>
                    )}
                    <span className="text-prism-muted2">
                      {tr.session}
                      {tr.setup ? " · " + tr.setup : ""}
                    </span>
                  </div>
                </div>

                {/* Ligne 2 : emotion + tags */}
                {((tr.tags && tr.tags.length > 0) || tr.emotion) && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {tr.emotion && EMOTION_BY_KEY[tr.emotion] && (
                      <Pill
                        tone={
                          EMOTION_BY_KEY[tr.emotion].tone === "red" ? "red" : "green"
                        }
                      >
                        {lang === "en"
                          ? EMOTION_BY_KEY[tr.emotion].en
                          : EMOTION_BY_KEY[tr.emotion].fr}
                      </Pill>
                    )}
                    {tr.tags &&
                      tr.tags.map((x) => (
                        <Pill key={x} tone="accent">
                          {x}
                        </Pill>
                      ))}
                  </div>
                )}

                {/* Ligne 3 : Why */}
                {tr.why && (
                  <div className="mt-3 rounded-xl border border-prism-line bg-white/[0.02] px-3 py-2.5 text-sm leading-relaxed text-white/85">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-prism-muted2 mb-1">
                      {t("jrn_why")}
                    </div>
                    {tr.why}
                  </div>
                )}

                {/* Ligne 4 : Screenshots */}
                {(tr.screenshot_url || tr.screenshot_url_2) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tr.screenshot_url && (
                      <a
                        href={tr.screenshot_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-fit"
                      >
                        <img
                          src={tr.screenshot_url}
                          alt="capture 1"
                          loading="lazy"
                          className="max-h-64 rounded-xl border border-prism-line object-contain"
                        />
                      </a>
                    )}
                    {tr.screenshot_url_2 && (
                      <a
                        href={tr.screenshot_url_2}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-fit"
                      >
                        <img
                          src={tr.screenshot_url_2}
                          alt="capture 2"
                          loading="lazy"
                          className="max-h-64 rounded-xl border border-prism-line object-contain"
                        />
                      </a>
                    )}
                  </div>
                )}

                {/* Ligne 5 : Actions */}
                <div className="mt-4 flex gap-2 pt-3 border-t border-prism-line">
                  <GhostBtn onClick={() => setEditing(tr)}>
                    <Pencil className="h-3 w-3" />
                    {t("jrn_edit")}
                  </GhostBtn>
                  <button
                    type="button"
                    onClick={() => deleteTrade(tr.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-prism-line bg-transparent px-3 py-2 text-xs font-semibold text-prism-muted hover:bg-prism-loss/10 hover:border-prism-loss/30 hover:text-prism-loss transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    {t("jrn_delete")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <LogTradeModal
          editing={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {importing && <ImportCsvModal onClose={() => setImporting(false)} />}
    </div>
  );
}
