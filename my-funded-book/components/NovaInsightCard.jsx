"use client";

import React from "react";

/**
 * NOVA Insight Card Component — MyTradeBook edition
 * AI-powered trading insights with status badge, metrics, and recommendation
 *
 * Integrates with MyTradeBook's design tokens:
 * - bg-ink, bg-panel, border-line
 * - text-muted2, text-accent, text-loss
 * - Uses font-mono for metrics
 */

const NovaInsightCard = ({
  // Core
  status = "trending",
  statusLabel = "Trending Up",
  statusColor = "text-accent", // text-accent, text-loss, cyanx, goldx, pinkx
  title = "Pattern Detected",

  // Metrics (3 columns)
  metric1 = { label: "Win Rate", value: "73%", change: null },
  metric2 = { label: "Avg Win", value: "+$450", change: null },
  metric3 = { label: "Streak", value: "8 days", change: null },

  // Recommendation
  recommendation = "Default insight recommendation text.",
  recommendations = null, // Array for multiple paragraphs

  // Styling
  variant = "success", // success (green), warning (gold), critical (red), info (cyan)
  icon = null, // Optional emoji/icon before title

  // Optional action
  showAction = false,
  actionLabel = "View Details",
  onAction = null,

  // Layout
  isCompact = false,
}) => {
  // Map variant to background tint
  const variantBgMap = {
    success: "bg-green-500 bg-opacity-5",
    warning: "bg-yellow-400 bg-opacity-5",
    critical: "bg-red-500 bg-opacity-5",
    info: "bg-blue-400 bg-opacity-5",
  };

  // Map variant to left accent border
  const variantAccentMap = {
    success: "border-l-2 border-l-green-500",
    warning: "border-l-2 border-l-yellow-400",
    critical: "border-l-2 border-l-red-500",
    info: "border-l-2 border-l-blue-400",
  };

  const recList = recommendations || [recommendation];

  return (
    <div className={`bg-panel border border-line rounded-xl ${isCompact ? "p-4" : "p-5"} space-y-4`}>
      {/* Header: Title, icon, badge */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {icon && <span className="text-lg flex-shrink-0">{icon}</span>}
          <h3 className={`font-semibold text-white truncate ${isCompact ? "text-sm" : "text-base"}`}>
            {title}
          </h3>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusColor} bg-opacity-10 border border-current border-opacity-20`}>
          {statusLabel}
        </div>
      </div>

      {/* Metrics Grid — 3 columns */}
      <div className="grid grid-cols-3 gap-3">
        {[metric1, metric2, metric3].map((m, idx) => (
          <div key={idx} className="bg-ink rounded-lg p-3">
            <div className="text-xs text-muted2 mb-1 font-medium">{m.label}</div>
            <div className="text-base font-mono font-bold text-white">{m.value}</div>
            {m.change && (
              <div
                className={`text-xs font-mono mt-1 ${
                  m.change.includes("+") || m.change === "↑"
                    ? "text-accent"
                    : m.change.includes("-") || m.change === "↓"
                    ? "text-loss"
                    : "text-muted2"
                }`}
              >
                {m.change}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Recommendation Box — tinted with accent border */}
      <div
        className={`${variantBgMap[variant]} ${variantAccentMap[variant]} rounded-lg p-3 ml-2 space-y-2`}
      >
        <div className="text-xs font-semibold text-muted2 uppercase tracking-wider">
          ✨ NOVA
        </div>
        {recList.map((rec, idx) => (
          <p key={idx} className="text-sm leading-relaxed text-muted2">
            {rec}
          </p>
        ))}
      </div>

      {/* Optional Action Button */}
      {showAction && (
        <button
          onClick={onAction}
          className="w-full bg-ink hover:bg-panel border border-line rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-line2"
        >
          {actionLabel} →
        </button>
      )}
    </div>
  );
};

export default NovaInsightCard;

/**
 * USAGE EXAMPLES
 *
 * // Win rate by time window
 * <NovaInsightCard
 *   icon="🎯"
 *   statusLabel="Sweet Spot"
 *   statusColor="text-accent"
 *   title="Morning Window (9:30-10:30 EST)"
 *   metric1={{ label: "Win Rate", value: "79%", change: "+8%" }}
 *   metric2={{ label: "Avg Win", value: "+$620", change: "+$170" }}
 *   metric3={{ label: "Trades", value: "45", change: "↑" }}
 *   recommendation="Your 9:30-10:30 AM EST zone shows 79% win rate with average wins of $620. You're significantly more profitable during this window."
 *   variant="success"
 * />
 *
 * // Risk alert
 * <NovaInsightCard
 *   icon="⚠️"
 *   statusLabel="Critical"
 *   statusColor="text-loss"
 *   title="Daily Loss Limit Exceeded"
 *   metric1={{ label: "Today", value: "-$1.2K", change: "↓" }}
 *   metric2={{ label: "Max DD", value: "-6.2%", change: null }}
 *   metric3={{ label: "Limit", value: "-$1K", change: null }}
 *   recommendation="You've exceeded your daily 2% loss limit. Consider closing trades to protect capital and follow your risk management rules."
 *   variant="critical"
 * />
 *
 * // Behavioral pattern
 * <NovaInsightCard
 *   icon="💭"
 *   statusLabel="Pattern Found"
 *   statusColor="cyanx"
 *   title="Emotional Recovery Trading"
 *   metric1={{ label: "After Loss", value: "3.2x", change: null }}
 *   metric2={{ label: "Risk Scale", value: "+45%", change: null }}
 *   metric3={{ label: "Sample", value: "47x", change: null }}
 *   recommendations={[
 *     "You tend to hold winners longer after experiencing a loss—a 3.2x increase.",
 *     "This recovery trading correlates with 45% larger position sizing.",
 *     "Consider a 15-minute cooldown after losses to reset emotionally."
 *   ]}
 *   variant="info"
 *   showAction={true}
 *   actionLabel="View Timeline"
 *   onAction={() => console.log("open pattern")}
 * />
 */
