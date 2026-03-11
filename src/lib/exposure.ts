import type { PortfolioPosition } from "@/types";
import { db } from "@/db";
import { etfCountryWeights } from "@/db/schema";
import { desc } from "drizzle-orm";

export type Geography =
  | "US"
  | "Europe"
  | "Monde"
  | "Émergents"
  | "Japon"
  | "Asie-Pacifique"
  | "UK"
  | "Non classé";

export type AssetClass =
  | "Actions"
  | "Obligations"
  | "Matières premières"
  | "Immobilier"
  | "Monétaire"
  | "Non classé";

export type MarketCap =
  | "Large Cap"
  | "Mid Cap"
  | "Small Cap"
  | "N/A";

export interface InstrumentClassification {
  geography: Geography;
  geoMatched: boolean;
  assetClass: AssetClass;
  capSplit: CapSplit;
  capSplitMatched: boolean;
}

export interface ExposureBreakdown {
  geography: Record<Geography, number>;
  assetClass: Record<AssetClass, number>;
  marketCap: Record<MarketCap, number>;
  unmatchedCapEtfs: string[];
  unmatchedGeoEtfs: string[];
  totalValueEur: number;
}

const GEO_PATTERNS: Array<{ pattern: RegExp; geography: Geography }> = [
  // US
  { pattern: /s&p\s*500|sp500/i, geography: "US" },
  { pattern: /nasdaq/i, geography: "US" },
  { pattern: /russell/i, geography: "US" },
  { pattern: /dow\s*jones/i, geography: "US" },
  { pattern: /\busa?\b/i, geography: "US" },
  { pattern: /united\s*states/i, geography: "US" },
  { pattern: /america/i, geography: "US" },
  
  // World
  { pattern: /msci\s*world/i, geography: "Monde" },
  { pattern: /acwi/i, geography: "Monde" },
  { pattern: /\bworld\b/i, geography: "Monde" },
  { pattern: /global/i, geography: "Monde" },
  { pattern: /mondial/i, geography: "Monde" },
  
  // Europe
  { pattern: /euro\s*stoxx/i, geography: "Europe" },
  { pattern: /stoxx.*600/i, geography: "Europe" },
  { pattern: /msci\s*europe/i, geography: "Europe" },
  { pattern: /\bcac\b/i, geography: "Europe" },
  { pattern: /\bdax\b/i, geography: "Europe" },
  { pattern: /ftse\s*100/i, geography: "UK" },
  { pattern: /\beurope/i, geography: "Europe" },
  { pattern: /eurozone/i, geography: "Europe" },
  
  // UK
  { pattern: /\buk\b/i, geography: "UK" },
  { pattern: /united\s*kingdom/i, geography: "UK" },
  { pattern: /britain/i, geography: "UK" },
  
  // Emerging Markets (specific EM sub-regions must come before generic EM)
  { pattern: /em\s*asia/i, geography: "Asie-Pacifique" },
  { pattern: /emerging/i, geography: "Émergents" },
  { pattern: /msci\s*em\b/i, geography: "Émergents" },
  { pattern: /émergents/i, geography: "Émergents" },
  
  // Japan
  { pattern: /japan/i, geography: "Japon" },
  { pattern: /japon/i, geography: "Japon" },
  { pattern: /nikkei/i, geography: "Japon" },
  { pattern: /topix/i, geography: "Japon" },
  
  // Asia-Pacific
  { pattern: /asia/i, geography: "Asie-Pacifique" },
  { pattern: /asie/i, geography: "Asie-Pacifique" },
  { pattern: /pacific/i, geography: "Asie-Pacifique" },
  { pattern: /pacifique/i, geography: "Asie-Pacifique" },
  { pattern: /china/i, geography: "Asie-Pacifique" },
  { pattern: /chine/i, geography: "Asie-Pacifique" },
];

const ASSET_CLASS_PATTERNS: Array<{ pattern: RegExp; assetClass: AssetClass }> = [
  // Commodities (check first as they override geography)
  { pattern: /\bgold\b/i, assetClass: "Matières premières" },
  { pattern: /\bor\b/i, assetClass: "Matières premières" },
  { pattern: /commodity|commodities/i, assetClass: "Matières premières" },
  { pattern: /precious\s*metal/i, assetClass: "Matières premières" },
  { pattern: /silver/i, assetClass: "Matières premières" },
  { pattern: /platinum/i, assetClass: "Matières premières" },
  { pattern: /energy/i, assetClass: "Matières premières" },
  
  // Bonds
  { pattern: /\bbond/i, assetClass: "Obligations" },
  { pattern: /obligat/i, assetClass: "Obligations" },
  { pattern: /treasury/i, assetClass: "Obligations" },
  { pattern: /aggregate/i, assetClass: "Obligations" },
  { pattern: /fixed\s*income/i, assetClass: "Obligations" },
  { pattern: /debt/i, assetClass: "Obligations" },
  
  // Real Estate
  { pattern: /reit/i, assetClass: "Immobilier" },
  { pattern: /immobilier/i, assetClass: "Immobilier" },
  { pattern: /real\s*estate/i, assetClass: "Immobilier" },
  { pattern: /property/i, assetClass: "Immobilier" },
  
  // Money Market
  { pattern: /money\s*market/i, assetClass: "Monétaire" },
  { pattern: /monétaire/i, assetClass: "Monétaire" },
  { pattern: /cash/i, assetClass: "Monétaire" },
  { pattern: /liquidity/i, assetClass: "Monétaire" },
  { pattern: /overnight/i, assetClass: "Monétaire" },
  { pattern: /€ster|estr|eonia/i, assetClass: "Monétaire" },
];

type CapSplit = { large: number; mid: number; small: number };

const MARKET_CAP_SPLITS: Array<{ pattern: RegExp; split: CapSplit }> = [
  // Explicit cap-specific ETFs
  { pattern: /small\s*cap/i, split: { large: 0, mid: 0, small: 1 } },
  { pattern: /mid\s*cap/i, split: { large: 0, mid: 1, small: 0 } },
  { pattern: /large\s*cap/i, split: { large: 1, mid: 0, small: 0 } },
  { pattern: /mega\s*cap/i, split: { large: 1, mid: 0, small: 0 } },
  { pattern: /big\s*cap/i, split: { large: 1, mid: 0, small: 0 } },
  { pattern: /russell\s*2000/i, split: { large: 0, mid: 0, small: 1 } },

  // Large+Mid indices (no small cap exposure)
  { pattern: /msci\s*world/i, split: { large: 0.85, mid: 0.15, small: 0 } },
  { pattern: /acwi/i, split: { large: 0.85, mid: 0.15, small: 0 } },
  { pattern: /msci\s*europe/i, split: { large: 0.85, mid: 0.15, small: 0 } },
  { pattern: /s&p\s*500/i, split: { large: 0.85, mid: 0.15, small: 0 } },
  { pattern: /nasdaq/i, split: { large: 0.85, mid: 0.15, small: 0 } },
  { pattern: /ftse\s*100/i, split: { large: 1, mid: 0, small: 0 } },
  { pattern: /euro\s*stoxx\s*50/i, split: { large: 1, mid: 0, small: 0 } },
  { pattern: /topix/i, split: { large: 0.7, mid: 0.2, small: 0.1 } },
  { pattern: /nikkei/i, split: { large: 0.85, mid: 0.15, small: 0 } },
  { pattern: /emerging|émergents|msci\s*em\b/i, split: { large: 0.85, mid: 0.15, small: 0 } },

  // Broad indices (include small caps)
  { pattern: /stoxx.*600/i, split: { large: 0.7, mid: 0.2, small: 0.1 } },
];

const COUNTRY_TO_GEOGRAPHY: Record<string, Geography> = {
  "United States": "US",
  "Canada": "US",
  "Japan": "Japon",
  "United Kingdom": "UK",
  "France": "Europe",
  "Germany": "Europe",
  "Switzerland": "Europe",
  "Netherlands": "Europe",
  "Ireland": "Europe",
  "Italy": "Europe",
  "Spain": "Europe",
  "Sweden": "Europe",
  "Denmark": "Europe",
  "Norway": "Europe",
  "Finland": "Europe",
  "Belgium": "Europe",
  "Austria": "Europe",
  "Portugal": "Europe",
  "Luxembourg": "Europe",
  "China": "Émergents",
  "Taiwan": "Émergents",
  "South Korea": "Émergents",
  "India": "Émergents",
  "Brazil": "Émergents",
  "Mexico": "Émergents",
  "South Africa": "Émergents",
  "Saudi Arabia": "Émergents",
  "Thailand": "Émergents",
  "Indonesia": "Émergents",
  "Malaysia": "Émergents",
  "Philippines": "Émergents",
  "Turkey": "Émergents",
  "Poland": "Émergents",
  "Chile": "Émergents",
  "Colombia": "Émergents",
  "Peru": "Émergents",
  "Czech Republic": "Émergents",
  "Hungary": "Émergents",
  "Egypt": "Émergents",
  "Qatar": "Émergents",
  "United Arab Emirates": "Émergents",
  "Kuwait": "Émergents",
  "Australia": "Asie-Pacifique",
  "Hong Kong": "Asie-Pacifique",
  "Singapore": "Asie-Pacifique",
  "New Zealand": "Asie-Pacifique",
};

function mapCountryToGeography(country: string): Geography | null {
  return COUNTRY_TO_GEOGRAPHY[country] ?? null;
}

function distributeWorldWeights(
  valueEur: number,
  weights: Array<{ country: string; weight: number }>,
  geography: Record<Geography, number>
) {
  const knownGeoWeights: Partial<Record<Geography, number>> = {};
  let otherWeight = 0;
  let knownTotal = 0;

  for (const { country, weight } of weights) {
    if (country === "Other") {
      otherWeight = weight;
      continue;
    }
    const geo = mapCountryToGeography(country);
    if (geo) {
      knownGeoWeights[geo] = (knownGeoWeights[geo] ?? 0) + weight;
      knownTotal += weight;
    }
  }

  // Distribute "Other" proportionally across known geographies
  if (otherWeight > 0 && knownTotal > 0) {
    for (const geo of Object.keys(knownGeoWeights) as Geography[]) {
      const proportion = knownGeoWeights[geo]! / knownTotal;
      knownGeoWeights[geo] = knownGeoWeights[geo]! + otherWeight * proportion;
    }
  }

  // Apply to geography breakdown
  for (const [geo, weight] of Object.entries(knownGeoWeights)) {
    geography[geo as Geography] += valueEur * weight;
  }
}

export function getLastCountryWeightsFetchDate(): string | null {
  const row = db
    .select({ fetchedAt: etfCountryWeights.fetchedAt })
    .from(etfCountryWeights)
    .orderBy(desc(etfCountryWeights.fetchedAt))
    .limit(1)
    .all();
  return row.length > 0 ? row[0].fetchedAt : null;
}

export function classifyInstrument(instrument: {
  name: string;
  ticker: string;
  type: "stock" | "etf" | "bond" | "fund";
  exchange?: string | null;
}): InstrumentClassification {
  const name = instrument.name;
  const ticker = instrument.ticker;
  
  // Asset class classification (do this first)
  let assetClass: AssetClass = "Non classé";
  
  // Check for specific asset classes in name
  for (const { pattern, assetClass: ac } of ASSET_CLASS_PATTERNS) {
    if (pattern.test(name)) {
      assetClass = ac;
      break;
    }
  }
  
  // If no specific asset class found, use type
  if (assetClass === "Non classé") {
    if (instrument.type === "stock") {
      assetClass = "Actions";
    } else if (instrument.type === "etf" || instrument.type === "fund") {
      // Default ETFs to equities unless otherwise classified
      assetClass = "Actions";
    } else if (instrument.type === "bond") {
      assetClass = "Obligations";
    }
  }
  
  // Geography classification
  let geography: Geography = "Non classé";
  let geoMatched = true;

  if (assetClass === "Matières premières") {
    geography = "Non classé";
  } else {
    for (const { pattern, geography: geo } of GEO_PATTERNS) {
      if (pattern.test(name)) {
        geography = geo;
        break;
      }
    }

    if (geography === "Non classé" && instrument.type === "stock") {
      if (ticker.endsWith(".PA") || ticker.endsWith(".DE") || ticker.endsWith(".AS") ||
          ticker.endsWith(".MI") || ticker.endsWith(".SW") || ticker.endsWith(".BR")) {
        geography = "Europe";
      } else if (ticker.endsWith(".L")) {
        geography = "UK";
      } else if (!ticker.includes(".")) {
        geography = "US";
      }
    }

    if (geography === "Non classé" && assetClass === "Actions" && (instrument.type === "etf" || instrument.type === "fund")) {
      geoMatched = false;
    }
  }
  
  // Market cap classification
  let capSplit: CapSplit = { large: 0, mid: 0, small: 0 };
  let capSplitMatched = assetClass !== "Actions" || instrument.type === "stock";

  if (assetClass === "Actions") {
    if (instrument.type === "stock") {
      capSplit = { large: 0, mid: 0, small: 0 };
    } else {
      for (const { pattern, split } of MARKET_CAP_SPLITS) {
        if (pattern.test(name)) {
          capSplit = split;
          capSplitMatched = true;
          break;
        }
      }
      if (!capSplitMatched) {
        capSplit = { large: 0.85, mid: 0.15, small: 0 };
      }
    }
  }

  return {
    geography,
    geoMatched,
    assetClass,
    capSplit,
    capSplitMatched,
  };
}

export async function computeExposure(
  positions: PortfolioPosition[]
): Promise<ExposureBreakdown> {
  const geography: Record<Geography, number> = {
    US: 0,
    Europe: 0,
    Monde: 0,
    Émergents: 0,
    Japon: 0,
    "Asie-Pacifique": 0,
    UK: 0,
    "Non classé": 0,
  };
  
  const assetClass: Record<AssetClass, number> = {
    Actions: 0,
    Obligations: 0,
    "Matières premières": 0,
    Immobilier: 0,
    Monétaire: 0,
    "Non classé": 0,
  };
  
  const marketCap: Record<MarketCap, number> = {
    "Large Cap": 0,
    "Mid Cap": 0,
    "Small Cap": 0,
    "N/A": 0,
  };
  
  let totalValueEur = 0;
  const unmatchedCapEtfs: string[] = [];
  const unmatchedGeoEtfs: string[] = [];

  // Pre-fetch all country weights for world ETFs
  const allWeights = db.select().from(etfCountryWeights).all();
  const weightsByInstrument = new Map<
    number,
    Array<{ country: string; weight: number }>
  >();
  for (const w of allWeights) {
    if (!weightsByInstrument.has(w.instrumentId)) {
      weightsByInstrument.set(w.instrumentId, []);
    }
    weightsByInstrument
      .get(w.instrumentId)!
      .push({ country: w.country, weight: w.weight });
  }

  for (const position of positions) {
    // totalValue is already converted to EUR by getPortfolioPositions()
    const valueEur = position.totalValue;

    totalValueEur += valueEur;

    const classification = classifyInstrument(position.instrument);

    // If classified as "Monde" and we have country weights, redistribute
    const weights = weightsByInstrument.get(position.instrument.id);
    if (classification.geography === "Monde" && weights && weights.length > 0) {
      distributeWorldWeights(valueEur, weights, geography);
    } else {
      geography[classification.geography] += valueEur;
    }

    assetClass[classification.assetClass] += valueEur;

    const label = `${position.instrument.name} (${position.instrument.ticker})`;
    if (!classification.capSplitMatched) {
      unmatchedCapEtfs.push(label);
    }
    if (!classification.geoMatched) {
      unmatchedGeoEtfs.push(label);
    }

    if (classification.assetClass === "Actions" && position.instrument.type === "stock") {
      marketCap["N/A"] += valueEur;
    } else if (classification.assetClass === "Actions") {
      marketCap["Large Cap"] += valueEur * classification.capSplit.large;
      marketCap["Mid Cap"] += valueEur * classification.capSplit.mid;
      marketCap["Small Cap"] += valueEur * classification.capSplit.small;
    } else {
      marketCap["N/A"] += valueEur;
    }
  }
  
  return {
    geography,
    assetClass,
    marketCap,
    unmatchedCapEtfs,
    unmatchedGeoEtfs,
    totalValueEur,
  };
}
