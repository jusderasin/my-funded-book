// Catalogues de la page « Monde » : catégories de satellites, compagnies aériennes,
// types de navires. Partagés entre le globe, les filtres et les fiches.

export const SAT_GROUPS = {
  stations: { label: "Stations spatiales", hint: "ISS, Tiangong", color: "#ffffff", size: 4 },
  starlink: { label: "Internet · Starlink", hint: "SpaceX", color: "#a5b4fc", size: 1.3 },
  internet: { label: "Internet · autres", hint: "OneWeb, Kuiper (Amazon)", color: "#f472b6", size: 1.8 },
  navigation: { label: "Navigation GPS", hint: "GPS, Galileo, GLONASS, BeiDou", color: "#4ade80", size: 3 },
  weather: { label: "Météo", hint: "NOAA, Meteosat, GOES…", color: "#38bdf8", size: 3 },
  tv: { label: "TV & télécoms", hint: "satellites géostationnaires", color: "#fbbf24", size: 2.6 },
  military: { label: "Militaires", hint: "seulement ceux rendus publics", color: "#ef4444", size: 3 },
  earth: { label: "Observation de la Terre", hint: "Landsat, Sentinel…", color: "#a3e635", size: 2.4 },
  science: { label: "Science", hint: "télescopes, recherche", color: "#c084fc", size: 2.6 },
  iridium: { label: "Téléphone satellite", hint: "Iridium", color: "#2dd4bf", size: 2.2 },
};

// Sous-familles reconnues au nom du satellite (pour la fiche).
const FAMILIES = [
  [/^STARLINK/, "Starlink (SpaceX)"], [/^ONEWEB/, "OneWeb"], [/^KUIPER/, "Kuiper (Amazon)"],
  [/^GPS|NAVSTAR/, "GPS (États-Unis)"], [/^GSAT0|GALILEO/, "Galileo (Europe)"], [/^COSMOS.*\(GLONASS|GLONASS/, "GLONASS (Russie)"], [/^BEIDOU/, "BeiDou (Chine)"],
  [/^ISS/, "Station spatiale internationale"], [/^CSS|TIANHE|WENTIAN|MENGTIAN/, "Station chinoise Tiangong"],
  [/^NOAA/, "NOAA (États-Unis)"], [/^METEOSAT|^MSG/, "Meteosat (Europe)"], [/^GOES/, "GOES (États-Unis)"], [/^HIMAWARI/, "Himawari (Japon)"], [/^FENGYUN|^FY-/, "Fengyun (Chine)"], [/^METOP/, "MetOp (Europe)"],
  [/^SENTINEL/, "Sentinel (Copernicus, UE)"], [/^LANDSAT/, "Landsat (NASA)"], [/^HST|HUBBLE/, "Télescope Hubble"], [/^IRIDIUM/, "Iridium"],
  [/^INTELSAT/, "Intelsat"], [/^SES|^ASTRA/, "SES / Astra"], [/^EUTELSAT|^HOTBIRD/, "Eutelsat"], [/^SIRIUS|^XM-/, "Radio SiriusXM"], [/^DIRECTV/, "DirecTV"],
];
export const satFamily = (name) => FAMILIES.find(([re]) => re.test(name))?.[1] || null;

// Préfixe OACI de l'indicatif → compagnie.
export const AIRLINES = {
  AFR: "Air France", TVF: "Transavia France", BAW: "British Airways", DLH: "Lufthansa", KLM: "KLM", RYR: "Ryanair", EZY: "easyJet", EJU: "easyJet Europe", EZS: "easyJet Suisse",
  WZZ: "Wizz Air", VLG: "Vueling", IBE: "Iberia", SWR: "Swiss", AUA: "Austrian", ITY: "ITA Airways", TAP: "TAP Portugal", SAS: "SAS", FIN: "Finnair", NAX: "Norwegian", EWG: "Eurowings",
  THY: "Turkish Airlines", PGT: "Pegasus", UAE: "Emirates", QTR: "Qatar Airways", ETD: "Etihad", SVA: "Saudia", RAM: "Royal Air Maroc", ETH: "Ethiopian", MSR: "EgyptAir",
  UAL: "United", AAL: "American Airlines", DAL: "Delta", SWA: "Southwest", JBU: "JetBlue", ASA: "Alaska Airlines", NKS: "Spirit", FFT: "Frontier", SKW: "SkyWest", ENY: "Envoy", RPA: "Republic",
  ACA: "Air Canada", WJA: "WestJet", AMX: "Aeroméxico", VOI: "Volaris", AVA: "Avianca", LAN: "LATAM", TAM: "LATAM Brasil", GLO: "Gol", AZU: "Azul",
  CCA: "Air China", CES: "China Eastern", CSN: "China Southern", CHH: "Hainan", CPA: "Cathay Pacific", SIA: "Singapore Airlines", ANA: "ANA", JAL: "Japan Airlines", KAL: "Korean Air", AAR: "Asiana",
  AIC: "Air India", IGO: "IndiGo", THA: "Thai Airways", MAS: "Malaysia Airlines", GIA: "Garuda", PAL: "Philippine Airlines", QFA: "Qantas", ANZ: "Air New Zealand", VOZ: "Virgin Australia",
  JIA: "PSA Airlines", AAY: "Allegiant", EDV: "Endeavor Air", EJA: "NetJets", MXY: "Breeze", BCS: "DHL (EAT)", SCX: "Sun Country", ROU: "Air Canada Rouge", JZA: "Jazz", CFG: "Condor", BEL: "Brussels Airlines", AEA: "Air Europa", LOT: "LOT", ELY: "El Al", CAL: "China Airlines", EVA: "EVA Air", VJC: "VietJet", AXM: "AirAsia",
  FDX: "FedEx", UPS: "UPS", GTI: "Atlas Air", CLX: "Cargolux", DHK: "DHL",
};
export const airlineCode = (call) => (/^[A-Z]{3}\d/.test(call || "") ? call.slice(0, 3) : null);
export const airlineName = (call) => { const c = airlineCode(call); return c ? AIRLINES[c] || c : null; };

// Type AIS → famille de navire.
export const SHIP_TYPES = {
  cargo: { label: "Cargos", color: "#34d399" },
  tanker: { label: "Pétroliers", color: "#f97316" },
  passenger: { label: "Passagers / ferries", color: "#60a5fa" },
  fishing: { label: "Pêche", color: "#facc15" },
  service: { label: "Remorqueurs / service", color: "#c084fc" },
  pleasure: { label: "Plaisance / voiliers", color: "#f472b6" },
  other: { label: "Autres / inconnus", color: "#94a3b8" },
};
export function shipType(code) {
  const t = Number(code) || 0;
  if (t >= 70 && t <= 79) return "cargo";
  if (t >= 80 && t <= 89) return "tanker";
  if (t >= 60 && t <= 69) return "passenger";
  if (t === 30) return "fishing";
  if (t === 36 || t === 37) return "pleasure";
  if ((t >= 31 && t <= 35) || (t >= 50 && t <= 59)) return "service";
  return "other";
}
