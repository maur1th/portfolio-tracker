import type { PortfolioPosition } from "@/types";

// Default drawdown from the 52-week high that flags a position as a dip-buy
// candidate. 10% is the conventional "market correction" threshold.
export const DEFAULT_DIP_THRESHOLD = 0.1;

export interface DipSignal {
  ticker: string;
  name: string;
  accountName: string;
  /** Negative fraction, e.g. -0.123 means 12.3% below the 52-week high. */
  drawdown: number;
  currentValue: number;
}

/**
 * Drawdown of the current price relative to its 52-week high, as a non-positive
 * fraction. Returns null when there is no usable reference (no price/high yet),
 * and clamps to 0 when the price is at or above the high.
 *
 * Currency-agnostic: pass price and high in the same currency (the FX cancels).
 */
export function computeDrawdownFromHigh(
  price: number | null,
  high: number | null
): number | null {
  if (price == null || high == null || high <= 0) return null;
  const drawdown = (price - high) / high;
  return drawdown < 0 ? drawdown : 0;
}

/**
 * Selects positions currently trading at least `threshold` below their 52-week
 * high, sorted deepest drawdown first.
 */
export function selectDipSignals(
  positions: PortfolioPosition[],
  threshold: number = DEFAULT_DIP_THRESHOLD
): DipSignal[] {
  return positions
    .filter(
      (p) => p.drawdownFromHigh != null && p.drawdownFromHigh <= -threshold
    )
    .map((p) => ({
      ticker: p.instrument.ticker,
      name: p.instrument.name,
      accountName: p.account.name,
      drawdown: p.drawdownFromHigh as number,
      currentValue: p.totalValue,
    }))
    .sort((a, b) => a.drawdown - b.drawdown);
}
