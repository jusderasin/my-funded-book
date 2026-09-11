// my-funded-book/lib/pdf/propfirm.jsx
//
// Template + exporter du PDF "Prop firm account" — version imprimable de la
// page /accounts/[id]. Thème dérivé de profile.theme + profile.accent_gain
// / profile.accent_loss.
//
// Consommé UNIQUEMENT via dynamic import depuis app/(app)/accounts/[id]/page.jsx
// pour ne pas charger @react-pdf/renderer dans le bundle principal.

import React from "react";
import {
  Document, Page, Text, View, StyleSheet, pdf,
  Svg, Line, Path,
} from "@react-pdf/renderer";
import { fmtMoney, frDate } from "@/lib/format";
import { signedMoney } from "@/lib/accountHealth";

// ============================================================
// Thème
// ============================================================

const THEME_PALETTES = {
  dark: {
    ink: "#0D0F12", ink2: "#0a0c10", panel: "#161920", panel2: "#1c2029",
    line: "#242833", line2: "#2e3340", muted: "#8a93a6", muted2: "#6b7385",
  },
  oled: {
    ink: "#000000", ink2: "#000000", panel: "#0a0a0a", panel2: "#141414",
    line: "#1f1f1f", line2: "#2a2a2a", muted: "#8a93a6", muted2: "#6b7385",
  },
  darker: {
    ink: "#05070a", ink2: "#030507", panel: "#0e1116", panel2: "#151922",
    line: "#1e2230", line2: "#282d3d", muted: "#8a93a6", muted2: "#6b7385",
  },
  cyberpunk: {
    ink: "#0a0a1f", ink2: "#050515", panel: "#12122e", panel2: "#1a1a3d",
    line: "#2a2a55", line2: "#3a3a70", muted: "#a5b0d4", muted2: "#7d87a8",
  },
};

function paletteFor(profile) {
  const t = (profile && profile.theme) || "dark";
  const base = THEME_PALETTES[t] || THEME_PALETTES.dark;
  return {
    ...base,
    accent: (profile && profile.accent_gain) || "#00d301",
    loss: (profile && profile.accent_loss) || "#ff3b5c",
    pink: "#ff66e4",
    amber: "#f59e0b",
    white: "#ffffff",
  };
}

// Convertit un hex (#RRGGBB) en rgba(r,g,b,a) — utilisé pour les fonds tintés
// (l'équivalent des color-mix() de la page).
function tint(hex, alpha) {
  if (!hex || hex[0] !== "#" || (hex.length !== 7 && hex.length !== 4)) {
    return "rgba(255,255,255," + alpha + ")";
  }
  let r, g, b;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
}

const alertColor = (p, lvl) =>
  lvl === "danger" ? p.loss : lvl === "warn" ? p.amber : lvl === "ok" ? p.accent : p.muted2;
const alertBg = (p, lvl) =>
  lvl === "danger" ? tint(p.loss, 0.10)
    : lvl === "warn" ? tint(p.amber, 0.10)
    : lvl === "ok" ? tint(p.accent, 0.10)
    : tint(p.white, 0.04);

// ============================================================
// Styles
// ============================================================

function makeStyles(p) {
  return StyleSheet.create({
    page: {
      backgroundColor: p.ink,
      color: p.white,
      padding: 24,
      fontFamily: "Helvetica",
      fontSize: 8.5,
      lineHeight: 1.35,
    },
    // header
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
    firm: { fontSize: 15, fontWeight: 700 },
    pillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
    pill: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3, fontSize: 7.5, fontFamily: "Courier" },
    dateNote: { color: p.muted2, fontSize: 7.5, marginTop: 3, fontFamily: "Courier" },
    // brand block top-right
    brand: { color: p.muted2, fontSize: 7.5, textAlign: "right" },
    brandStrong: { color: p.white, fontSize: 9, fontWeight: 700, textAlign: "right" },
    // section
    section: {
      borderWidth: 1, borderColor: p.line, borderRadius: 6,
      backgroundColor: p.panel, padding: 8, marginBottom: 6,
    },
    sectionTitle: {
      fontSize: 7.5, fontWeight: 700, textTransform: "uppercase",
      color: p.muted2, marginBottom: 6, letterSpacing: 0.4,
    },
    // alerts
    alertBox: { borderLeftWidth: 2, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 3, marginBottom: 3, fontSize: 8.5, fontWeight: 700 },
    // recos
    recoBox: {
      borderWidth: 1, borderColor: tint(p.accent, 0.40), borderRadius: 6,
      backgroundColor: tint(p.accent, 0.05), padding: 8, marginBottom: 6,
    },
    recoTitle: { fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", color: p.accent, marginBottom: 5, letterSpacing: 0.4 },
    recoRow: { flexDirection: "row", gap: 5, marginBottom: 3, alignItems: "flex-start" },
    recoNum: {
      width: 12, height: 12, borderRadius: 3, backgroundColor: tint(p.accent, 0.15),
      color: p.accent, fontFamily: "Courier", fontSize: 8, fontWeight: 700, textAlign: "center",
    },
    recoMsg: { flex: 1, fontSize: 9, color: p.white },
    // cushion box (santé)
    cushion: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      backgroundColor: p.panel2, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 8, marginBottom: 6,
    },
    cushionLabel: { color: p.muted2, fontSize: 7, textTransform: "uppercase" },
    cushionVal: { fontFamily: "Courier", fontSize: 18, fontWeight: 700 },
    cushionSide: { textAlign: "right" },
    cushionSideSmall: { color: p.muted2, fontFamily: "Courier", fontSize: 7 },
    cushionBal: { color: p.white, fontFamily: "Courier", fontSize: 12, fontWeight: 700 },
    // meter
    meterWrap: { marginBottom: 5 },
    meterHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
    meterLabel: { color: p.muted2, fontSize: 8 },
    meterSub: { fontFamily: "Courier", fontSize: 8, fontWeight: 700 },
    meterBar: { height: 3, backgroundColor: p.line2, borderRadius: 2, overflow: "hidden" },
    meterFill: { height: 3, borderRadius: 2 },
    // stats grid
    statsRow: { flexDirection: "row", gap: 4, marginTop: 6 },
    stat: {
      flex: 1, backgroundColor: p.panel2, borderRadius: 3,
      paddingVertical: 4, paddingHorizontal: 3, alignItems: "center",
    },
    statLabel: { color: p.muted2, fontSize: 6.5, textTransform: "uppercase", letterSpacing: 0.3 },
    statVal: { fontFamily: "Courier", fontSize: 9, fontWeight: 700, marginTop: 1 },
    // metric row
    metricRow: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "baseline",
      paddingVertical: 2,
    },
    metricLabel: { color: p.muted2, fontSize: 8.5 },
    metricHint: { color: p.muted2, fontSize: 7 },
    metricVal: { fontFamily: "Courier", fontSize: 9, fontWeight: 700 },
    // projection notes
    projBox: { backgroundColor: p.panel2, borderRadius: 4, padding: 5, marginTop: 4, fontSize: 8 },
    projBoxLoss: { backgroundColor: tint(p.loss, 0.08), borderRadius: 4, padding: 5, marginTop: 4, fontSize: 8 },
    // bar row (leaks)
    barRow: { marginBottom: 4 },
    barHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
    barLabel: { color: p.white, fontSize: 7.5 },
    barSub: { fontFamily: "Courier", fontSize: 7.5 },
    barTrack: { height: 2.5, backgroundColor: p.line2, borderRadius: 1.5 },
    barFill: { height: 2.5, borderRadius: 1.5 },
    // small colored box
    smallBox: { backgroundColor: p.panel2, borderRadius: 4, padding: 5, marginTop: 4 },
    // trades log
    tradeRow: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      backgroundColor: p.panel2, borderRadius: 3,
      paddingVertical: 3, paddingHorizontal: 5, marginBottom: 2,
    },
    tradeLeft: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
    tradeSym: { fontSize: 8.5, fontWeight: 700 },
    tradeMeta: { color: p.muted2, fontFamily: "Courier", fontSize: 7 },
    tradePnl: { fontFamily: "Courier", fontSize: 9, fontWeight: 700 },
    dirTag: {
      fontFamily: "Courier", fontSize: 6.5, textTransform: "uppercase",
      paddingHorizontal: 3, paddingVertical: 1, borderRadius: 2,
    },
    emoTag: {
      backgroundColor: p.panel, color: p.muted2, fontFamily: "Courier", fontSize: 6.5,
      paddingHorizontal: 3, paddingVertical: 1, borderRadius: 2,
    },
    // footer
    footer: {
      marginTop: 8, color: p.muted2, fontSize: 7.5,
      borderTopWidth: 1, borderTopColor: p.line, paddingTop: 6,
    },
    // 2-col split (santé | trajectoire, edge | discipline)
    splitRow: { flexDirection: "row", gap: 6, marginBottom: 6 },
    splitCol: { flex: 1 },
    // 4-col grid (leaks)
    leaksGrid: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
    leaksCol: { width: "48%" },
    // block header inside a section
    blockHead: { fontSize: 7, textTransform: "uppercase", color: p.muted2, marginBottom: 4, letterSpacing: 0.3 },
  });
}

// ============================================================
// Sous-composants
// ============================================================

function Pill({ label, bg, fg, styles }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg, color: fg }]}>
      <Text style={{ color: fg, fontFamily: "Courier", fontSize: 7.5 }}>{label}</Text>
    </View>
  );
}

function Meter({ label, sub, pct, color, palette, styles }) {
  const w = Math.max(0, Math.min(100, pct || 0));
  return (
    <View style={styles.meterWrap}>
      <View style={styles.meterHead}>
        <Text style={styles.meterLabel}>{label}</Text>
        <Text style={[styles.meterSub, { color }]}>{sub}</Text>
      </View>
      <View style={styles.meterBar}>
        <View style={[styles.meterFill, { width: w + "%", backgroundColor: color }]} />
      </View>
    </View>
  );
}

function Stat({ label, value, color, styles }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statVal, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

function MetricRow({ label, hint, value, color, styles }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>
        {label}
        {hint ? <Text style={styles.metricHint}> {hint}</Text> : null}
      </Text>
      <Text style={[styles.metricVal, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

function BarRow({ label, sub, pnl, max, palette, styles }) {
  const pct = max > 0 ? Math.min(100, (Math.abs(pnl) / max) * 100) : 0;
  const color = pnl >= 0 ? palette.accent : palette.loss;
  return (
    <View style={styles.barRow}>
      <View style={styles.barHead}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={[styles.barSub, { color }]}>{sub}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: pct + "%", backgroundColor: color }]} />
      </View>
    </View>
  );
}

// Mini courbe équité — SVG @react-pdf, avec la ligne threshold DD.
function EquityCurveSvg({ points, threshold, palette }) {
  if (!points || points.length < 2) return null;
  const w = 240, h = 44;
  const balances = points.map((p) => p.balance);
  let min = Math.min.apply(null, balances);
  let max = Math.max.apply(null, balances);
  if (threshold != null) min = Math.min(min, threshold);
  const range = max - min || 1;
  const y = (v) => h - ((v - min) / range) * h;
  const d = points
    .map((p, i) => (i === 0 ? "M" : "L") + ((i / (points.length - 1)) * w).toFixed(1) + "," + y(p.balance).toFixed(1))
    .join(" ");
  const last = points[points.length - 1];
  const up = last.cum >= 0;
  return (
    <View style={{ marginTop: 4 }}>
      <Svg viewBox={"0 0 " + w + " " + h} width={"100%"} height={h}>
        {threshold != null && (
          <Line x1={0} y1={y(threshold)} x2={w} y2={y(threshold)}
            stroke={palette.loss} strokeWidth={0.8} strokeDasharray="3 3" opacity={0.55} />
        )}
        <Path d={d} stroke={up ? palette.accent : palette.loss} strokeWidth={1.2} fill="none" />
      </Svg>
    </View>
  );
}

// ============================================================
// Document
// ============================================================

function firmPillTone(isEval, palette) {
  return isEval ? { bg: tint(palette.amber, 0.15), fg: palette.amber }
    : { bg: tint(palette.accent, 0.15), fg: palette.accent };
}
function statusPillTone(status, palette) {
  // aligne grossièrement les tons de STATUS_LABEL de la page
  if (status === "funded" || status === "passed") return { bg: tint(palette.accent, 0.15), fg: palette.accent };
  if (status === "failed") return { bg: tint(palette.loss, 0.15), fg: palette.loss };
  if (status === "paid") return { bg: tint(palette.pink, 0.15), fg: palette.pink };
  if (status === "active") return { bg: tint(palette.muted, 0.15), fg: palette.muted };
  return { bg: tint(palette.muted2, 0.15), fg: palette.muted2 };
}

function PropfirmDocument({ account, health, analytics, trades, profile, lang }) {
  const L = lang === "en" ? "en" : "fr";
  const palette = paletteFor(profile);
  const styles = makeStyles(palette);

  const h = health;
  const A = analytics;
  const isEval = !(account.type === "funded" || account.status === "funded" || account.status === "passed");
  const hasDD = h && h.maxDD != null;
  const ddColor = !hasDD ? palette.muted2
    : h.breached ? palette.loss
    : h.ddMarginPct <= 20 ? palette.loss
    : h.ddMarginPct <= 50 ? palette.amber
    : palette.accent;
  const cushionTxt = h && h.breached
    ? (L === "en" ? "BLOWN" : "CRAMÉ")
    : hasDD ? signedMoney(h.ddMargin) : "—";

  const evalTone = firmPillTone(isEval, palette);
  const statusTone = statusPillTone(account.status, palette);

  const generatedAt = new Date();
  const gen = generatedAt.toLocaleString(L === "en" ? "en-US" : "fr-FR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <Document
      title={"MyTradeBook — " + (account.firm || "Account")}
      author="MyTradeBook"
      subject={L === "en" ? "Prop firm account report" : "Rapport compte prop firm"}
    >
      <Page size="A4" style={styles.page} wrap>
        {/* ===== HEADER ===== */}
        <View style={styles.headerRow}>
          <View style={{ maxWidth: "70%" }}>
            <Text style={styles.firm}>{account.firm || "—"}</Text>
            <View style={styles.pillsRow}>
              <Pill label={fmtMoney(account.size)} bg={tint(palette.muted, 0.15)} fg={palette.muted} styles={styles} />
              <Pill label={isEval ? (L === "en" ? "Evaluation" : "Évaluation") : (L === "en" ? "Funded" : "Funded")} bg={evalTone.bg} fg={evalTone.fg} styles={styles} />
              <Pill label={(account.status || "").toUpperCase()} bg={statusTone.bg} fg={statusTone.fg} styles={styles} />
            </View>
            {account.date ? (
              <Text style={styles.dateNote}>
                {(L === "en" ? "Opened " : "Ouvert le ") + frDate(String(account.date).slice(0, 10))}
              </Text>
            ) : null}
            {account.note ? <Text style={styles.dateNote}>{account.note}</Text> : null}
          </View>
          <View>
            <Text style={styles.brandStrong}>MyTradeBook</Text>
            <Text style={styles.brand}>{L === "en" ? "Generated " : "Généré le "}{gen}</Text>
            <Text style={styles.brand}>mytradebook.vercel.app</Text>
          </View>
        </View>

        {/* ===== ALERTES ===== */}
        {h && h.alerts && h.alerts.length > 0 && (
          <View style={{ marginBottom: 6 }}>
            {h.alerts.map((al, i) => (
              <View
                key={i}
                style={[styles.alertBox, {
                  borderLeftColor: alertColor(palette, al.level),
                  backgroundColor: alertBg(palette, al.level),
                  color: alertColor(palette, al.level),
                }]}
              >
                <Text style={{ color: alertColor(palette, al.level), fontSize: 8.5, fontWeight: 700 }}>{al.msg}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ===== RECOS ===== */}
        {A && A.recos && A.recos.length > 0 && (
          <View style={styles.recoBox}>
            <Text style={styles.recoTitle}>
              {L === "en" ? "3 levers this week" : "3 leviers cette semaine"}
            </Text>
            {A.recos.map((r, i) => (
              <View key={i} style={styles.recoRow}>
                <Text style={styles.recoNum}>{i + 1}</Text>
                <Text style={styles.recoMsg}>{r.msg}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ===== SANTÉ + TRAJECTOIRE ===== */}
        <View style={styles.splitRow}>
          {/* Santé */}
          <View style={[styles.section, styles.splitCol, { borderColor: h && h.breached ? palette.loss : palette.line }]}>
            <Text style={styles.sectionTitle}>{L === "en" ? "Health" : "Santé"}</Text>
            <View style={styles.cushion}>
              <View>
                <Text style={styles.cushionLabel}>
                  {L === "en" ? "Margin before breach" : "Marge avant breach"}
                  {h && h.maxDD != null ? "  " + (h.trailing ? "trailing" : "static") : ""}
                </Text>
                <Text style={[styles.cushionVal, { color: ddColor }]}>{cushionTxt}</Text>
              </View>
              <View style={styles.cushionSide}>
                <Text style={styles.cushionLabel}>{L === "en" ? "Balance" : "Solde"}</Text>
                <Text style={styles.cushionBal}>~ {fmtMoney(Math.round((h && h.balance) || 0))}</Text>
                <Text style={styles.cushionSideSmall}>
                  {(L === "en" ? "High-water " : "Plus haut ") + fmtMoney(Math.round((h && h.highWater) || 0))}
                </Text>
              </View>
            </View>

            {h && h.target != null && h.target > 0 && (
              <Meter
                label={isEval ? (L === "en" ? "Profit target" : "Objectif profit") : (L === "en" ? "Payout target" : "Objectif payout")}
                sub={signedMoney(h.cum) + " / " + fmtMoney(h.target)}
                pct={h.targetPct || 0}
                color={h.targetReached ? palette.accent : palette.accent}
                palette={palette} styles={styles}
              />
            )}
            {hasDD && (
              <Meter
                label={L === "en" ? "Drawdown used" : "Drawdown utilisé"}
                sub={fmtMoney(Math.max(0, h.maxDD - h.ddMargin)) + " / " + fmtMoney(h.maxDD)}
                pct={h.maxDD > 0 ? Math.max(0, 100 - (h.ddMargin / h.maxDD) * 100) : 0}
                color={ddColor} palette={palette} styles={styles}
              />
            )}
            {h && h.dailyLimit != null && (
              <Meter
                label={L === "en" ? "Day loss (today)" : "Perte du jour"}
                sub={fmtMoney(h.dailyUsed) + " / " + fmtMoney(h.dailyLimit)}
                pct={h.dailyPct || 0}
                color={h.dailyHit ? palette.loss : (h.dailyPct || 0) >= 70 ? palette.amber : palette.accent}
                palette={palette} styles={styles}
              />
            )}

            <View style={styles.statsRow}>
              <Stat label="Trades" value={(h ? h.trades : 0) + " (" + (h ? h.wins : 0) + "W/" + (h ? h.losses : 0) + "L)"} styles={styles} />
              <Stat label="PnL" value={signedMoney(h ? h.cum : 0)} color={(h && h.cum) >= 0 ? palette.accent : palette.loss} styles={styles} />
              <Stat label={L === "en" ? "Days" : "Jours"} value={h ? h.tradingDays : 0} styles={styles} />
              {!isEval && <Stat label="Payouts" value={fmtMoney(h ? h.payoutTotal : 0)} color={palette.pink} styles={styles} />}
            </View>
          </View>

          {/* Trajectoire */}
          <View style={[styles.section, styles.splitCol]}>
            <Text style={styles.sectionTitle}>{L === "en" ? "Trajectory" : "Trajectoire"}</Text>
            {!A || !A.trajectory ? (
              <Text style={{ color: palette.muted2, fontSize: 8.5, textAlign: "center", paddingVertical: 8 }}>
                {L === "en" ? "Need more trades to project." : "Il faut plus de trades pour projeter."}
              </Text>
            ) : (
              <>
                <MetricRow
                  label={L === "en" ? "Recent pace" : "Rythme récent"}
                  hint={"(" + A.trajectory.recentN + (L === "en" ? "d)" : "j)")}
                  value={signedMoney(A.trajectory.recentPace) + "/" + (L === "en" ? "d" : "j")}
                  color={A.trajectory.recentPace >= 0 ? palette.accent : palette.loss}
                  styles={styles}
                />
                <MetricRow
                  label={L === "en" ? "Avg pace" : "Rythme moyen"}
                  value={signedMoney(A.trajectory.avgPace) + "/" + (L === "en" ? "d" : "j")}
                  color={A.trajectory.avgPace >= 0 ? palette.accent : palette.loss}
                  styles={styles}
                />
                {A.trajectory.daysToTarget != null && (
                  <View style={styles.projBox}>
                    <Text style={{ color: palette.muted2, fontSize: 8 }}>
                      {L === "en" ? "At this pace, target hit in " : "À ce rythme, objectif atteint dans "}
                      <Text style={{ color: palette.white, fontWeight: 700, fontFamily: "Courier" }}>
                        ~{A.trajectory.daysToTarget} {L === "en" ? "trading days" : "j"}
                      </Text>
                    </Text>
                  </View>
                )}
                {A.trajectory.daysToBlown != null && (
                  <View style={styles.projBoxLoss}>
                    <Text style={{ color: palette.muted2, fontSize: 8 }}>
                      {L === "en" ? "At this pace, blown in " : "À ce rythme, cramé dans "}
                      <Text style={{ color: palette.loss, fontWeight: 700, fontFamily: "Courier" }}>
                        ~{A.trajectory.daysToBlown} {L === "en" ? "trading days" : "j"}
                      </Text>
                    </Text>
                  </View>
                )}
                <EquityCurveSvg points={A.curve} threshold={h ? h.ddThreshold : null} palette={palette} />
                <View style={styles.statsRow}>
                  <Stat label={L === "en" ? "Best streak" : "Meilleure série"} value={A.trajectory.maxWinStreak + (L === "en" ? "d" : "j")} color={palette.accent} styles={styles} />
                  <Stat label={L === "en" ? "Worst streak" : "Pire série"} value={A.trajectory.maxLossStreak + (L === "en" ? "d" : "j")} color={palette.loss} styles={styles} />
                </View>
                {(A.trajectory.bestDay || A.trajectory.worstDay) && (
                  <View style={styles.statsRow}>
                    {A.trajectory.bestDay && (
                      <Stat label={L === "en" ? "Best day" : "Meilleur jour"} value={signedMoney(A.trajectory.bestDay.pnl)} color={palette.accent} styles={styles} />
                    )}
                    {A.trajectory.worstDay && (
                      <Stat label={L === "en" ? "Worst day" : "Pire jour"} value={signedMoney(A.trajectory.worstDay.pnl)} color={palette.loss} styles={styles} />
                    )}
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        {/* ===== EDGE + DISCIPLINE ===== */}
        {A && (
          <View style={styles.splitRow}>
            {/* Edge */}
            <View style={[styles.section, styles.splitCol]}>
              <Text style={styles.sectionTitle}>{L === "en" ? "Real edge" : "Edge réel"}</Text>
              <MetricRow label="Expectancy" value={signedMoney(A.edge.expectancy) + "/tr"} color={A.edge.expectancy >= 0 ? palette.accent : palette.loss} styles={styles} />
              <MetricRow label={L === "en" ? "Profit factor" : "Profit factor"}
                value={A.edge.profitFactor === Infinity ? "∞" : A.edge.profitFactor.toFixed(2)}
                color={A.edge.profitFactor >= 1.5 ? palette.accent : A.edge.profitFactor >= 1 ? palette.amber : palette.loss}
                styles={styles} />
              <MetricRow label={L === "en" ? "Win rate" : "Win rate"} value={Math.round(A.edge.winRate) + "%"} styles={styles} />
              <MetricRow label={L === "en" ? "Avg R:R" : "R:R moyen"} value={A.edge.rr === Infinity ? "∞" : A.edge.rr.toFixed(2)} styles={styles} />
              <MetricRow label={L === "en" ? "Avg win / loss" : "Avg win / loss"}
                value={signedMoney(A.edge.avgWin) + " / " + signedMoney(-A.edge.avgLoss)} styles={styles} />
              {A.edge.bestTrade && (
                <View style={styles.smallBox}>
                  <Text style={{ color: palette.muted2, fontSize: 7.5 }}>{L === "en" ? "Best trade" : "Meilleur trade"}</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 2 }}>
                    <Text style={{ color: palette.white, fontFamily: "Courier", fontSize: 8 }}>
                      {(A.edge.bestTrade.symbol || "—")}  {frDate(String(A.edge.bestTrade.date || "").slice(0, 10))}
                    </Text>
                    <Text style={{ color: palette.accent, fontFamily: "Courier", fontSize: 8.5, fontWeight: 700 }}>
                      {signedMoney(Number(A.edge.bestTrade.pnl) || 0)}
                    </Text>
                  </View>
                </View>
              )}
              {A.edge.worstTrade && (
                <View style={styles.smallBox}>
                  <Text style={{ color: palette.muted2, fontSize: 7.5 }}>{L === "en" ? "Worst trade" : "Pire trade"}</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 2 }}>
                    <Text style={{ color: palette.white, fontFamily: "Courier", fontSize: 8 }}>
                      {(A.edge.worstTrade.symbol || "—")}  {frDate(String(A.edge.worstTrade.date || "").slice(0, 10))}
                    </Text>
                    <Text style={{ color: palette.loss, fontFamily: "Courier", fontSize: 8.5, fontWeight: 700 }}>
                      {signedMoney(Number(A.edge.worstTrade.pnl) || 0)}
                    </Text>
                  </View>
                </View>
              )}
              {A.leaks.planStats && (A.leaks.planStats.inPlan.count || A.leaks.planStats.offPlan.count) ? (
                <View style={{ marginTop: 6, borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 4 }}>
                  <Text style={styles.blockHead}>{L === "en" ? "Playbook adherence" : "Adhérence playbook"}</Text>
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    <View style={[styles.stat, { alignItems: "flex-start" }]}>
                      <Text style={styles.statLabel}>In-plan</Text>
                      <Text style={[styles.statVal, { color: A.leaks.planStats.inPlan.avgPnl >= 0 ? palette.accent : palette.loss }]}>
                        {signedMoney(A.leaks.planStats.inPlan.avgPnl)}/tr
                      </Text>
                      <Text style={{ color: palette.muted2, fontFamily: "Courier", fontSize: 7 }}>
                        {A.leaks.planStats.inPlan.count} tr · {Math.round(A.leaks.planStats.inPlan.winRate)}% WR
                      </Text>
                    </View>
                    <View style={[styles.stat, { alignItems: "flex-start" }]}>
                      <Text style={styles.statLabel}>Off-plan</Text>
                      <Text style={[styles.statVal, { color: A.leaks.planStats.offPlan.avgPnl >= 0 ? palette.accent : palette.loss }]}>
                        {signedMoney(A.leaks.planStats.offPlan.avgPnl)}/tr
                      </Text>
                      <Text style={{ color: palette.muted2, fontFamily: "Courier", fontSize: 7 }}>
                        {A.leaks.planStats.offPlan.count} tr · {Math.round(A.leaks.planStats.offPlan.winRate)}% WR
                      </Text>
                    </View>
                  </View>
                </View>
              ) : null}
            </View>

            {/* Discipline */}
            <View style={[styles.section, styles.splitCol]}>
              <Text style={styles.sectionTitle}>{L === "en" ? "Discipline & risk" : "Discipline & risque"}</Text>
              {h && h.dailyLimit != null && (
                <>
                  <MetricRow
                    label={L === "en" ? "Daily loss hit" : "Daily loss touché"}
                    value={A.discipline.dailyTouched + "×"}
                    color={A.discipline.dailyTouched >= 2 ? palette.loss : A.discipline.dailyTouched === 1 ? palette.amber : palette.accent}
                    styles={styles}
                  />
                  <MetricRow
                    label={L === "en" ? "Daily loss near miss" : "Daily loss frôlé"}
                    hint="(≥70%)"
                    value={A.discipline.dailyNearMiss + "×"}
                    color={A.discipline.dailyNearMiss >= 2 ? palette.amber : palette.muted2}
                    styles={styles}
                  />
                </>
              )}
              {A.discipline.consistencyRule && (
                <View style={styles.smallBox}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: palette.muted2, fontSize: 8 }}>
                      {L === "en" ? "Consistency rule" : "Consistency rule"} ({A.discipline.consistencyRule.threshold}%)
                    </Text>
                    <Text style={{ fontFamily: "Courier", fontSize: 8.5, fontWeight: 700, color: A.discipline.consistencyRule.passed ? palette.accent : palette.loss }}>
                      {A.discipline.consistencyRule.passed ? "✓" : "✗"} {A.discipline.consistencyRule.bestDayPct.toFixed(0)}%
                    </Text>
                  </View>
                  <Text style={{ color: palette.muted2, fontFamily: "Courier", fontSize: 7, marginTop: 2 }}>
                    {(L === "en" ? "Best day " : "Meilleur jour ") + signedMoney(A.discipline.consistencyRule.bestDay.pnl)
                      + " = " + A.discipline.consistencyRule.bestDayPct.toFixed(0) + "% "
                      + (L === "en" ? "of total profit" : "du profit total")}
                  </Text>
                </View>
              )}
              {A.discipline.overtrading.overCount > 0 && (
                <View style={styles.smallBox}>
                  <Text style={{ color: palette.muted2, fontSize: 8, marginBottom: 2 }}>
                    {L === "en" ? "Overtrading" : "Overtrading"} (&gt; {A.discipline.overtrading.threshold} tr/{L === "en" ? "d" : "j"})
                  </Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: palette.white, fontFamily: "Courier", fontSize: 8 }}>
                      {A.discipline.overtrading.overCount} {L === "en" ? "day(s)" : "jour(s)"}
                    </Text>
                    <Text style={{ fontFamily: "Courier", fontSize: 8, color: A.discipline.overtrading.overAvgPnl >= 0 ? palette.accent : palette.loss }}>
                      {signedMoney(A.discipline.overtrading.overAvgPnl)}/{L === "en" ? "d" : "j"}
                    </Text>
                  </View>
                  <Text style={{ color: palette.muted2, fontFamily: "Courier", fontSize: 7, marginTop: 2 }}>
                    {(L === "en" ? "Normal days " : "Jours normaux ") + signedMoney(A.discipline.overtrading.normalAvgPnl) + "/" + (L === "en" ? "d" : "j")}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ===== FUITES ===== */}
        {A && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>{L === "en" ? "Leaks" : "Fuites"}</Text>
            <View style={styles.leaksGrid}>
              {/* Weekday */}
              {A.leaks.weekdayStats.length > 0 && (
                <View style={styles.leaksCol}>
                  <Text style={styles.blockHead}>{L === "en" ? "By weekday" : "Par jour de semaine"}</Text>
                  {(() => {
                    const maxAbs = Math.max.apply(null, A.leaks.weekdayStats.map((w) => Math.abs(w.pnl)).concat([1]));
                    return A.leaks.weekdayStats.map((w) => (
                      <BarRow key={w.dow}
                        label={w.label + " · " + w.count + "tr · " + Math.round(w.winRate) + "%"}
                        sub={signedMoney(w.pnl)} pnl={w.pnl} max={maxAbs}
                        palette={palette} styles={styles}
                      />
                    ));
                  })()}
                </View>
              )}
              {/* Symbols */}
              {A.leaks.symbolStats.length > 0 && (
                <View style={styles.leaksCol}>
                  <Text style={styles.blockHead}>{L === "en" ? "By symbol" : "Par symbol"}</Text>
                  {(() => {
                    const maxAbs = Math.max.apply(null, A.leaks.symbolStats.map((s) => Math.abs(s.pnl)).concat([1]));
                    return A.leaks.symbolStats.slice(0, 6).map((s) => (
                      <BarRow key={s.symbol}
                        label={s.symbol + " · " + s.count + "tr · " + Math.round(s.winRate) + "%"}
                        sub={signedMoney(s.pnl)} pnl={s.pnl} max={maxAbs}
                        palette={palette} styles={styles}
                      />
                    ));
                  })()}
                </View>
              )}
              {/* Emotions */}
              <View style={styles.leaksCol}>
                <Text style={styles.blockHead}>{L === "en" ? "By emotion" : "Par émotion"}</Text>
                {A.leaks.emotionStats.length > 0 ? (() => {
                  const maxAbs = Math.max.apply(null, A.leaks.emotionStats.map((e) => Math.abs(e.pnl)).concat([1]));
                  return A.leaks.emotionStats.map((e) => (
                    <BarRow key={e.emotion}
                      label={e.emotion + " · " + e.count + "tr · " + Math.round(e.winRate) + "%"}
                      sub={signedMoney(e.pnl)} pnl={e.pnl} max={maxAbs}
                      palette={palette} styles={styles}
                    />
                  ));
                })() : (
                  <Text style={{ color: palette.muted2, fontFamily: "Courier", fontSize: 7, textAlign: "center", paddingVertical: 6 }}>
                    {L === "en" ? "Tag emotions when logging trades." : "Tagge les émotions à la log."}
                  </Text>
                )}
              </View>
              {/* Direction */}
              {(A.leaks.directionStats.long || A.leaks.directionStats.short) && (
                <View style={styles.leaksCol}>
                  <Text style={styles.blockHead}>Long vs Short</Text>
                  {A.leaks.directionStats.long && (
                    <View style={styles.smallBox}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ color: palette.white, fontFamily: "Courier", fontSize: 8 }}>LONG</Text>
                        <Text style={{ fontFamily: "Courier", fontSize: 8.5, fontWeight: 700, color: A.leaks.directionStats.long.pnl >= 0 ? palette.accent : palette.loss }}>
                          {signedMoney(A.leaks.directionStats.long.pnl)}
                        </Text>
                      </View>
                      <Text style={{ color: palette.muted2, fontFamily: "Courier", fontSize: 7, marginTop: 1 }}>
                        {A.leaks.directionStats.long.count}tr · {Math.round(A.leaks.directionStats.long.winRate)}% WR
                      </Text>
                    </View>
                  )}
                  {A.leaks.directionStats.short && (
                    <View style={styles.smallBox}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ color: palette.white, fontFamily: "Courier", fontSize: 8 }}>SHORT</Text>
                        <Text style={{ fontFamily: "Courier", fontSize: 8.5, fontWeight: 700, color: A.leaks.directionStats.short.pnl >= 0 ? palette.accent : palette.loss }}>
                          {signedMoney(A.leaks.directionStats.short.pnl)}
                        </Text>
                      </View>
                      <Text style={{ color: palette.muted2, fontFamily: "Courier", fontSize: 7, marginTop: 1 }}>
                        {A.leaks.directionStats.short.count}tr · {Math.round(A.leaks.directionStats.short.winRate)}% WR
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* ===== PAYOUT INTEL ===== */}
        {A && A.payoutIntel && !isEval && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>{L === "en" ? "Payout intelligence" : "Payout intelligence"}</Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <View style={{ flex: 1 }}>
                <MetricRow label={L === "en" ? "Total received" : "Total touché"} value={fmtMoney(A.payoutIntel.total)} color={palette.pink} styles={styles} />
                <MetricRow label={L === "en" ? "Payout count" : "Nombre payouts"} value={String(A.payoutIntel.count)} styles={styles} />
                <MetricRow label={L === "en" ? "Average" : "Moyenne"} value={fmtMoney(Math.round(A.payoutIntel.avg))} styles={styles} />
                {A.payoutIntel.avgFreq != null && (
                  <MetricRow label={L === "en" ? "Avg frequency" : "Fréquence moyenne"} value={A.payoutIntel.avgFreq + (L === "en" ? "d" : "j")} styles={styles} />
                )}
                {A.payoutIntel.count >= 2 && (
                  <MetricRow
                    label={L === "en" ? "Regularity (CV)" : "Régularité (CV)"}
                    value={A.payoutIntel.cv.toFixed(0) + "%"}
                    color={A.payoutIntel.cv < 20 ? palette.accent : A.payoutIntel.cv < 50 ? palette.amber : palette.loss}
                    styles={styles}
                  />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.blockHead}>{L === "en" ? "Next payout projection" : "Projection prochain payout"}</Text>
                {A.payoutIntel.projected ? (
                  <View style={{ backgroundColor: tint(palette.pink, 0.08), borderWidth: 1, borderColor: tint(palette.pink, 0.30), borderRadius: 4, padding: 6 }}>
                    <Text style={{ color: palette.pink, fontFamily: "Courier", fontSize: 16, fontWeight: 700 }}>
                      ~{fmtMoney(Math.round(A.payoutIntel.projected.amount))}
                    </Text>
                    <Text style={{ color: palette.muted2, fontFamily: "Courier", fontSize: 8, marginTop: 2 }}>
                      {(L === "en" ? "in ~" : "dans ~") + A.payoutIntel.projected.days + (L === "en" ? " days" : " jours")}
                    </Text>
                  </View>
                ) : (
                  <Text style={{ color: palette.muted2, fontSize: 8, textAlign: "center", paddingVertical: 6 }}>
                    {L === "en" ? "Not enough data to project." : "Pas assez de données pour projeter."}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.blockHead}>{L === "en" ? "History" : "Historique"}</Text>
                {A.payoutIntel.payouts.length === 0 ? (
                  <Text style={{ color: palette.muted2, fontSize: 8, textAlign: "center", paddingVertical: 6 }}>
                    {L === "en" ? "No payout yet." : "Aucun payout."}
                  </Text>
                ) : (
                  A.payoutIntel.payouts.slice().reverse().slice(0, 8).map((c) => (
                    <View key={c.id} style={{
                      flexDirection: "row", justifyContent: "space-between",
                      backgroundColor: palette.panel2, borderRadius: 3,
                      paddingVertical: 3, paddingHorizontal: 4, marginBottom: 2,
                    }}>
                      <Text style={{ color: palette.muted2, fontFamily: "Courier", fontSize: 7.5 }}>
                        {frDate(String(c.date || "").slice(0, 10))}
                      </Text>
                      <Text style={{ color: palette.pink, fontFamily: "Courier", fontSize: 8.5, fontWeight: 700 }}>
                        {fmtMoney(Number(c.amount) || 0)}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          </View>
        )}

        {/* ===== TRADE LOG ===== */}
        <View style={styles.section}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.sectionTitle}>{L === "en" ? "Trade log" : "Journal du compte"}</Text>
            <Text style={{ color: palette.muted2, fontFamily: "Courier", fontSize: 7.5 }}>
              {trades.length} {L === "en" ? "trades" : "trades"}
            </Text>
          </View>
          {trades.length === 0 ? (
            <Text style={{ color: palette.muted2, fontSize: 8.5, textAlign: "center", paddingVertical: 8 }}>
              {L === "en" ? "No trades on this account yet." : "Aucun trade sur ce compte."}
            </Text>
          ) : (
            trades.map((tr) => {
              const pnl = Number(tr.pnl) || 0;
              const win = pnl > 0;
              const dir = tr.direction || tr.side || null;
              return (
                <View key={tr.id} style={styles.tradeRow} wrap={false}>
                  <View style={styles.tradeLeft}>
                    <Text style={[styles.tradeSym, { color: win ? palette.accent : palette.loss }]}>
                      {win ? "▲" : "▼"}
                    </Text>
                    <View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                        <Text style={[styles.tradeSym, { color: palette.white }]}>{tr.symbol || "—"}</Text>
                        {dir && (
                          <View style={[styles.dirTag, {
                            backgroundColor: dir === "short" ? tint(palette.loss, 0.12) : tint(palette.accent, 0.12),
                            color: dir === "short" ? palette.loss : palette.accent,
                          }]}>
                            <Text style={{ color: dir === "short" ? palette.loss : palette.accent, fontFamily: "Courier", fontSize: 6.5, textTransform: "uppercase" }}>{dir}</Text>
                          </View>
                        )}
                        {tr.emotion && tr.emotion !== "none" && (
                          <View style={styles.emoTag}>
                            <Text style={{ color: palette.muted2, fontFamily: "Courier", fontSize: 6.5 }}>{tr.emotion}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.tradeMeta}>
                        {frDate(String(tr.date || "").slice(0, 10))}
                        {tr.qty ? " · " + tr.qty + " ct" : ""}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.tradePnl, { color: win ? palette.accent : palette.loss }]}>
                    {signedMoney(pnl)}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {/* ===== FOOTER ===== */}
        <Text style={styles.footer} fixed>
          {L === "en"
            ? "Estimates from your logged trades (realized PnL), not intraday unrealized. Indicator, not the firm's official value. — MyTradeBook"
            : "Estimations basées sur tes trades loggés (PnL réalisé), pas l'unrealized intraday. Indicateur, pas la valeur officielle de la prop firm. — MyTradeBook"}
        </Text>
      </Page>
    </Document>
  );
}

// ============================================================
// Exporter — appelé depuis [id]/page.jsx via dynamic import
// ============================================================

export async function exportPropfirmPdf({ account, health, analytics, trades, profile, lang }) {
  const doc = (
    <PropfirmDocument
      account={account}
      health={health}
      analytics={analytics}
      trades={trades || []}
      profile={profile || {}}
      lang={lang}
    />
  );
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().slice(0, 10);
  const firmSlug = String(account.firm || "account").replace(/\s+/g, "-").toLowerCase();
  const sizeSlug = String(account.size || "").replace(/\D/g, "") || "0";
  const filename = "propfirm_" + firmSlug + "_" + sizeSlug + "_" + dateStr + ".pdf";

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
