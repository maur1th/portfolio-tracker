import type { PortfolioPosition } from "@/types";
import type { ExposureBreakdown, Geography } from "./exposure";
import { classifyInstrument } from "./exposure";

export interface DcaSuggestion {
  instrumentName: string;
  ticker: string;
  accountName: string;
  category: string;
  suggestedAmount: number;
}

interface PositionInfo {
  position: PortfolioPosition;
  geography: Geography;
  dominantCap: string | null;
  capSplitValue: number;
}

function classifyPositions(positions: PortfolioPosition[]): PositionInfo[] {
  return positions
    .filter((p) => p.instrument.type === "etf" || p.instrument.type === "fund")
    .map((p) => {
      const c = classifyInstrument(p.instrument);
      if (c.assetClass !== "Actions") return null;

      let dominantCap: string | null = null;
      let capSplitValue = 0;
      if (c.capSplit.small >= 0.5) {
        dominantCap = "Small Cap";
        capSplitValue = c.capSplit.small;
      } else if (c.capSplit.mid >= 0.5) {
        dominantCap = "Mid Cap";
        capSplitValue = c.capSplit.mid;
      } else if (c.capSplit.large >= 0.5) {
        dominantCap = "Large Cap";
        capSplitValue = c.capSplit.large;
      }

      return {
        position: p,
        geography: c.geography,
        dominantCap,
        capSplitValue,
      };
    })
    .filter((info): info is PositionInfo => info !== null);
}

function clampAndNormalize(
  gaps: Record<string, number>,
  budget: number
): Record<string, number> {
  const clamped: Record<string, number> = {};
  let total = 0;
  for (const [key, value] of Object.entries(gaps)) {
    const v = Math.max(0, value);
    clamped[key] = v;
    total += v;
  }

  const result: Record<string, number> = {};
  if (total === 0) return result;

  const scale = total > budget ? budget / total : 1;
  for (const [key, value] of Object.entries(clamped)) {
    if (value > 0) {
      result[key] = value * scale;
    }
  }
  return result;
}

function findLowestValueEtf(
  candidates: PositionInfo[],
  excludeTickers: Set<string>
): PositionInfo | null {
  let best: PositionInfo | null = null;
  for (const c of candidates) {
    if (excludeTickers.has(c.position.instrument.ticker)) continue;
    if (best === null || c.position.totalValue < best.position.totalValue) {
      best = c;
    }
  }
  return best;
}

function roundDown100(value: number): number {
  return Math.floor(value / 100) * 100;
}

export function computeDcaSuggestions(params: {
  amountToInvest: number;
  positions: PortfolioPosition[];
  exposure: ExposureBreakdown;
  geoTargets: Record<string, number>;
  capTargets: Record<string, number>;
}): DcaSuggestion[] {
  const { amountToInvest, positions, exposure, geoTargets, capTargets } =
    params;

  if (amountToInvest <= 0) return [];

  const classified = classifyPositions(positions);
  const suggestions: DcaSuggestion[] = [];
  const usedTickers = new Set<string>();

  // --- Pass 1: Geography gaps (primary allocation) ---
  const geoEntries = Object.entries(exposure.geography).filter(
    ([label]) => label !== "Non classé"
  );
  const currentGeoTotal = geoEntries.reduce((sum, [, v]) => sum + v, 0);
  const newGeoTotal = currentGeoTotal + amountToInvest;

  const geoGaps: Record<string, number> = {};
  for (const [geo, targetPct] of Object.entries(geoTargets)) {
    const current =
      exposure.geography[geo as keyof typeof exposure.geography] ?? 0;
    geoGaps[geo] = (newGeoTotal * targetPct) / 100 - current;
  }

  const geoAllocations = clampAndNormalize(geoGaps, amountToInvest);
  let geoAllocatedTotal = 0;

  for (const [geo, amount] of Object.entries(geoAllocations)) {
    if (amount <= 0) continue;

    const candidates = classified.filter((c) => c.geography === geo);
    const best = findLowestValueEtf(candidates, usedTickers);

    if (!best) continue;

    usedTickers.add(best.position.instrument.ticker);
    geoAllocatedTotal += amount;

    suggestions.push({
      instrumentName: best.position.instrument.name,
      ticker: best.position.instrument.ticker,
      accountName: best.position.account.name,
      category: geo,
      suggestedAmount: amount,
    });
  }

  // --- Pass 2: Market Cap gaps (with remaining amount) ---
  const remainingAmount = amountToInvest - geoAllocatedTotal;
  if (remainingAmount > 0) {
    // Account for cap impact of geo-pass ETFs
    const updatedCap = { ...exposure.marketCap };
    for (const s of suggestions) {
      const info = classified.find(
        (c) => c.position.instrument.ticker === s.ticker
      );
      if (info?.dominantCap) {
        updatedCap[info.dominantCap as keyof typeof updatedCap] =
          (updatedCap[info.dominantCap as keyof typeof updatedCap] ?? 0) +
          s.suggestedAmount;
      }
    }

    const capEntries = Object.entries(updatedCap).filter(
      ([label]) => label !== "N/A"
    );
    const currentCapTotal = capEntries.reduce((sum, [, v]) => sum + v, 0);
    const newCapTotal = currentCapTotal + remainingAmount;

    const capGaps: Record<string, number> = {};
    for (const [cap, targetPct] of Object.entries(capTargets)) {
      const current =
        updatedCap[cap as keyof typeof updatedCap] ?? 0;
      capGaps[cap] = (newCapTotal * targetPct) / 100 - current;
    }

    const capAllocations = clampAndNormalize(capGaps, remainingAmount);

    for (const [cap, amount] of Object.entries(capAllocations)) {
      if (amount <= 0) continue;

      // Only use dedicated cap ETFs (e.g. small cap, mid cap)
      const candidates = classified.filter((c) => c.dominantCap === cap);
      const best = findLowestValueEtf(candidates, usedTickers);

      if (!best) continue;

      usedTickers.add(best.position.instrument.ticker);

      suggestions.push({
        instrumentName: best.position.instrument.name,
        ticker: best.position.instrument.ticker,
        accountName: best.position.account.name,
        category: cap,
        suggestedAmount: amount,
      });
    }
  }

  // Redistribute any unallocated remainder proportionally
  const allocatedTotal = suggestions.reduce(
    (sum, s) => sum + s.suggestedAmount,
    0
  );
  const unallocated = amountToInvest - allocatedTotal;
  if (unallocated > 0.01 && suggestions.length > 0) {
    const scale = amountToInvest / allocatedTotal;
    for (const s of suggestions) {
      s.suggestedAmount = s.suggestedAmount * scale;
    }
  }

  // Round down to nearest 100€
  for (const s of suggestions) {
    s.suggestedAmount = roundDown100(s.suggestedAmount);
  }

  // Remove suggestions that rounded to 0
  return suggestions.filter((s) => s.suggestedAmount > 0);
}
