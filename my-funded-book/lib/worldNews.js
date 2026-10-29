// Actus « Monde » : uniquement des sources reconnues (flux RSS publics), filtrées
// par pays, puis recoupées : un titre repris par plusieurs sources est « confirmé ».

export const NEWS_SOURCES = [
  { name: "Fed", tier: "officiel", url: "https://www.federalreserve.gov/feeds/press_all.xml" },
  { name: "BCE", tier: "officiel", url: "https://www.ecb.europa.eu/rss/press.html" },
  { name: "Investing.com", tier: "marchés", url: "https://www.investing.com/rss/news_14.rss" },
  { name: "Investing.com", tier: "marchés", url: "https://www.investing.com/rss/news_1.rss" },
  { name: "FXStreet", tier: "marchés", url: "https://www.fxstreet.com/rss/news" },
  { name: "CNBC", tier: "marchés", url: "https://www.cnbc.com/id/20910258/device/rss/rss.html" },
  { name: "CNBC", tier: "marchés", url: "https://www.cnbc.com/id/100727362/device/rss/rss.html" },
  { name: "MarketWatch", tier: "marchés", url: "https://feeds.content.dowjones.io/public/rss/mw_topstories" },
  { name: "BBC", tier: "presse", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
  { name: "BBC", tier: "presse", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { name: "Al Jazeera", tier: "presse", url: "https://www.aljazeera.com/xml/rss/all.xml" },
];

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };
const clean = (s) => String(s || "")
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/<[^>]+>/g, " ")
  .replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (m, e) => (ENTITIES[e.toLowerCase()] ?? (e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : m)))
  .replace(/\s+/g, " ")
  .trim();
const tag = (xml, name) => (xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i")) || [])[1] || "";

export function parseRss(xml) {
  const items = String(xml).match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  return items.map((it) => {
    const raw = tag(it, "pubDate") || tag(it, "dc:date");
    const date = raw ? new Date(/^\d{4}-\d{2}-\d{2} \d/.test(raw) ? raw.replace(" ", "T") + "Z" : raw) : null;
    return {
      title: clean(tag(it, "title")),
      url: clean(tag(it, "link")) || (it.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || "",
      summary: clean(tag(it, "description")).slice(0, 280),
      date: date && !Number.isNaN(date.getTime()) ? date.toISOString() : null,
    };
  }).filter((a) => a.title && a.url);
}

// Mots-clés par pays (ISO2) : nom, gentilé, banque centrale, devise, dirigeants clés.
const ALIASES = {
  US: ["U\\.S\\.", "US", "United States", "America", "American", "Fed", "Federal Reserve", "FOMC", "Powell", "Treasury", "Wall Street", "Nasdaq", "S&P 500", "Dow", "dollar", "White House", "Trump"],
  GB: ["UK", "U\\.K\\.", "Britain", "British", "England", "BoE", "Bank of England", "sterling", "pound", "gilts?", "London", "Reeves"],
  FR: ["France", "French", "Paris", "Macron", "CAC 40", "Banque de France"],
  DE: ["Germany", "German", "Bundesbank", "Berlin", "DAX", "Merz"],
  IT: ["Italy", "Italian", "Rome", "Meloni"],
  ES: ["Spain", "Spanish", "Madrid"],
  JP: ["Japan", "Japanese", "BoJ", "BOJ", "Bank of Japan", "Ueda", "yen", "Tokyo", "Nikkei"],
  CN: ["China", "Chinese", "Beijing", "PBOC", "PBoC", "yuan", "renminbi", "Xi", "Shanghai", "Hong Kong"],
  CH: ["Switzerland", "Swiss", "SNB", "franc"],
  CA: ["Canada", "Canadian", "BoC", "Bank of Canada", "loonie", "Ottawa", "Carney"],
  AU: ["Australia", "Australian", "RBA", "Aussie", "Sydney"],
  NZ: ["New Zealand", "RBNZ"],
  RU: ["Russia", "Russian", "Moscow", "Kremlin", "Putin", "rouble", "ruble"],
  UA: ["Ukraine", "Ukrainian", "Kyiv", "Zelensky"],
  IL: ["Israel", "Israeli", "Gaza", "Netanyahu"],
  IR: ["Iran", "Iranian", "Tehran"],
  SA: ["Saudi", "Riyadh", "Aramco", "OPEC"],
  IN: ["India", "Indian", "RBI", "rupee", "Modi", "New Delhi", "Mumbai"],
  BR: ["Brazil", "Brazilian", "Lula"],
  MX: ["Mexico", "Mexican", "peso", "Banxico"],
  KR: ["South Korea", "Korean", "Seoul"],
  TR: ["Turkey", "Turkish", "lira", "Erdogan", "Ankara"],
};

export function countryKeywords(name, iso) {
  if (!name && !iso) return null;
  const words = [...(ALIASES[iso] || []), ...(name ? [name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")] : [])];
  // Les mots courts à majuscule (US, Fed, BoJ, Xi…) sont sensibles à la casse : pas de « fed » ou « us ».
  return words.map((w) => new RegExp(`(^|[^A-Za-z])${w}($|[^A-Za-z])`, /^[A-Z][A-Za-z.\\]{1,4}$/.test(w) ? "" : "i"));
}

const STOP = new Set("the a an and or of to in on for with at by from as is are was were be been after over amid into its it this that their his her says said will would could new more than up down out about against under ahead".split(" "));
const tokens = (s) => new Set(String(s).toLowerCase().replace(/[^a-z0-9à-ÿ ]/g, " ").split(" ").filter((w) => w.length > 2 && !STOP.has(w)));
const jaccard = (a, b) => { let n = 0; a.forEach((w) => b.has(w) && n++); return n / Math.max(1, a.size + b.size - n); };

// Regroupe les titres qui parlent du même événement et compte les sources distinctes.
export function crossCheck(items) {
  const sorted = [...items].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const groups = [];
  for (const it of sorted) {
    const tk = tokens(it.title);
    const g = groups.find((x) => jaccard(x.tk, tk) >= 0.3);
    if (g) {
      if (!g.sources.includes(it.source)) g.sources.push(it.source);
      g.others.push({ source: it.source, url: it.url, title: it.title });
    } else {
      groups.push({ ...it, tk, sources: [it.source], others: [] });
    }
  }
  return groups.map(({ tk, ...g }) => ({ ...g, confirmed: g.sources.length >= 2 || g.tier === "officiel" }));
}
