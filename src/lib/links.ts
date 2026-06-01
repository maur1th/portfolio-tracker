/**
 * Per-ticker overrides for the Yahoo Finance quote link. Maps a stored ticker
 * to a different Yahoo symbol to link to — e.g. an ETC that only prices during
 * its exchange hours can point to a related ~24h contract instead.
 */
const YAHOO_QUOTE_OVERRIDES: Record<string, string> = {
  // iShares Physical Gold ETC prices only during LSE hours; link to the
  // continuous gold futures contract for near-24h price coverage.
  "SGLN.L": "GC=F",
};

/**
 * URL of the Yahoo Finance quote page for a stored (Yahoo-format) ticker,
 * e.g. "WPEA.PA" -> https://finance.yahoo.com/quote/WPEA.PA
 *
 * Uses encodeURI (not encodeURIComponent) so symbol characters such as "="
 * in futures tickers (e.g. "GC=F") are preserved while spaces are escaped.
 */
export function yahooQuoteUrl(ticker: string): string {
  const symbol = YAHOO_QUOTE_OVERRIDES[ticker] ?? ticker;
  return `https://finance.yahoo.com/quote/${encodeURI(symbol)}`;
}
