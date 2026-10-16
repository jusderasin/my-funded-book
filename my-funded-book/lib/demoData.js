// Données fictives du mode démo (/demo) : ~2 mois de trades NQ/MNQ générés de
// façon déterministe pour que la démo soit identique pour tous les visiteurs.

const SETUPS = ["ORB", "Liquidity Sweep", "FVG Retest", "VWAP Reclaim"];
const TAGS = ["VWAP", "HTF bias", "News", "Overtrading", "FOMO", "A+ setup", "Revenge", "Patience"];
const NOTES = [
  "Attendu la confirmation sur le retest, exécution propre, sortie au TP.",
  "Entrée trop tôt avant la cassure, stop pris. Attendre la clôture 5m.",
  "Bonne lecture du sweep de la London low, tenu jusqu'au 2R.",
  "Trade forcé après deux pertes, hors plan. Couper l'écran après -2R.",
  "Setup A+, taille normale, géré au break-even puis TP.",
  "Range sans direction, petite perte, setup pas validé.",
];
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function demoTrades(today = new Date()) {
  const rand = rng(42);
  const trades = [];
  let id = 0;
  for (let back = 62; back >= 0; back -= 1) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back);
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    const count = rand() < 0.15 ? 0 : 1 + Math.floor(rand() * 3);
    for (let k = 0; k < count; k += 1) {
      const setupIndex = Math.floor(rand() * SETUPS.length);
      const setup = SETUPS[setupIndex];
      const edge = [0.62, 0.55, 0.5, 0.38][setupIndex];
      const plan = rand() > 0.18;
      const win = rand() < (plan ? edge : 0.25);
      const be = !win && rand() < 0.15;
      const r = win ? Math.round((1.2 + rand() * 1.8) * 10) / 10 : be ? 0 : -1;
      const micro = rand() < 0.6;
      const qty = micro ? 2 + Math.floor(rand() * 3) : 1;
      const riskPts = 12 + Math.floor(rand() * 10);
      const pv = micro ? 2 : 20;
      const pnl = Math.round(r * riskPts * pv * qty);
      const dir = rand() < 0.55 ? "long" : "short";
      const hour = rand() < 0.75 ? 9 + Math.floor(rand() * 2) : 13 + Math.floor(rand() * 2);
      const minute = hour === 9 ? 30 + Math.floor(rand() * 29) : Math.floor(rand() * 59);
      const entry = Math.round((21000 + rand() * 600) * 4) / 4;
      const exit = entry + (dir === "long" ? 1 : -1) * r * riskPts;
      const tags = [TAGS[Math.floor(rand() * 3)]];
      if (!plan) tags.push(TAGS[3 + Math.floor(rand() * 3)]);
      else if (win && rand() < 0.4) tags.push("A+ setup");
      trades.push({
        id: `demo-${(id += 1)}`,
        created_at: `${iso(day)}T${pad(hour)}:${pad(minute)}:00Z`,
        date: iso(day),
        symbol: micro ? "MNQ" : "NQ",
        dir,
        session: hour < 12 ? "NY AM" : "NY PM",
        grade: win && plan ? "A" : plan ? "B" : null,
        r,
        pnl,
        setup,
        tags,
        why: NOTES[win ? (plan ? (rand() < 0.5 ? 0 : 2) : 4) : plan ? (rand() < 0.5 ? 1 : 5) : 3],
        plan,
        outcome: be ? "BE" : null,
        account_id: null,
        screenshot_url: null,
        screenshot_url_2: null,
        strategy_checks: [],
        execution: { mode: "day", entry_time: `${pad(hour)}:${pad(minute)}:00`, exit_time: `${pad(hour)}:${pad(Math.min(59, minute + 4 + Math.floor(rand() * 20)))}:00`, entry_price: entry, exit_price: Math.round(exit * 4) / 4, size: qty },
      });
    }
  }
  return trades.reverse();
}

export const DEMO_PLAYBOOKS = SETUPS.map((name, index) => ({
  id: `demo-pb-${index}`,
  name,
  rules: [["Range 15m défini", "Cassure avec volume", "Bias HTF aligné"], ["Sweep d'un niveau clé", "Reprise au-dessus/dessous", "CVD en divergence"], ["FVG 5m clair", "Retest sans clôture dedans", "Cible = liquidité opposée"], ["Reclaim VWAP en clôture", "Retest tenu", "Pas de news < 15 min"]][index],
}));
