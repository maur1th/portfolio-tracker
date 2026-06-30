import YahooFinanceAPI from "yahoo-finance2";

const yahooFinance = new YahooFinanceAPI({ suppressNotices: ["yahooSurvey"] });

export interface YahooInstrument {
  ticker: string;
  name: string;
  type: "stock" | "etf" | "bond" | "fund";
  currency: string;
  exchange?: string;
}

export async function lookupInstrument(
  ticker: string
): Promise<YahooInstrument | null> {
  try {
    const queryOptions = { modules: ["price", "summaryProfile"] } as { modules: Array<"price" | "summaryProfile"> };
    const result = await yahooFinance.quoteSummary(ticker, queryOptions);

    if (!result || !result.price) return null;

    const price = result.price;
    const type = determineInstrumentType(price.quoteType);

    // Normalize GBp (pence) to GBP (pounds)
    const currency = normalizeCurrency(price.currency || "USD");

    return {
      ticker: price.symbol,
      name: price.longName || price.shortName || ticker,
      type,
      currency,
      exchange: price.exchangeName || price.exchange || undefined,
    };
  } catch (error) {
    console.error(`Failed to lookup instrument ${ticker}:`, error);
    return null;
  }
}

export async function searchByISIN(isin: string): Promise<string | null> {
  try {
    console.log(`[searchByISIN] Searching for ISIN: ${isin}`);

    // Try OpenFIGI first
    const openFigiUrl = "https://api.openfigi.com/v3/mapping";
    const response = await fetch(openFigiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        {
          idType: "ID_ISIN",
          idValue: isin,
        },
      ]),
    });

    if (response.ok) {
      const results = await response.json();
      console.log(`[searchByISIN] OpenFIGI response:`, JSON.stringify(results).substring(0, 300));

      if (results && results.length > 0) {
        const firstResult = results[0];

        if (firstResult.error) {
          console.warn(`[searchByISIN] OpenFIGI error: ${firstResult.error}, trying Yahoo Finance fallback`);
        } else if (firstResult.data && firstResult.data.length > 0) {
          const data = firstResult.data;
          console.log(`[searchByISIN] Found ${data.length} results from OpenFIGI`);

          // Validate candidates against Yahoo in exchange-preference order and
          // return the first that actually resolves. The top-ranked ticker is
          // not necessarily a real Yahoo symbol (e.g. currency-suffixed MTF
          // listings on EP that format to a non-existent .PA ticker).
          const rankedTickers = rankExchangeTickers(data);
          const tried = new Set<string>();
          for (const ticker of rankedTickers) {
            tried.add(ticker);
            const validated = await validateTicker(ticker);
            if (validated) {
              console.log(`[searchByISIN] ✓ Validated preferred exchange ticker: ${ticker}`);
              return ticker;
            }
          }

          // Last resort: try remaining candidates (unknown exchange codes)
          for (const item of data) {
            if (item.ticker && item.exchCode) {
              const ticker = formatYahooTicker(item.ticker, item.exchCode);
              if (tried.has(ticker)) continue;
              tried.add(ticker);
              const validated = await validateTicker(ticker);
              if (validated) {
                console.log(`[searchByISIN] ✓ Validated: ${ticker}`);
                return ticker;
              }
            }
          }
        }
      }
    }

    // Fallback: Try Yahoo Finance search directly with ISIN
    console.log(`[searchByISIN] Trying Yahoo Finance search for ${isin}`);
    const yahooResults = await yahooFinance.search(isin, { quotesCount: 5 }, { validateResult: false }) as { quotes?: Array<{ symbol?: string; shortname?: string; longname?: string }> };

    if (yahooResults.quotes && yahooResults.quotes.length > 0) {
      console.log(`[searchByISIN] Yahoo Finance found ${yahooResults.quotes.length} results`);
      for (const quote of yahooResults.quotes) {
        console.log(`[searchByISIN] Yahoo result: ${quote.symbol} - ${quote.shortname || quote.longname}`);
        const symbol = quote.symbol as string | undefined;
        // Prefer Paris exchange (.PA suffix)
        if (symbol && typeof symbol === 'string' && (symbol.endsWith('.PA') || !symbol.includes('.'))) {
          console.log(`[searchByISIN] ✓ Using Yahoo result: ${symbol}`);
          return symbol;
        }
      }
      // If no .PA found, use first result
      const firstSymbol = yahooResults.quotes[0].symbol as string | undefined;
      if (firstSymbol && typeof firstSymbol === 'string') {
        console.log(`[searchByISIN] ✓ Using first Yahoo result: ${firstSymbol}`);
        return firstSymbol;
      }
    }

    console.error(`[searchByISIN] No results from OpenFIGI or Yahoo Finance for ${isin}`);
    return null;
  } catch (error) {
    console.error(`[searchByISIN] Exception:`, error);
    return null;
  }
}

// Prefer Paris, then other European exchanges, then US/UK
export const EXCHANGE_PREFERENCE = ["FP", "EP", "PA", "GR", "GY", "LN", "SW", "SE", "US"];

export interface OpenFIGIResult {
  ticker?: string;
  exchCode?: string;
}

/**
 * Rank OpenFIGI listings by exchange preference and return their formatted
 * Yahoo tickers, best first, deduplicated. Items on unrecognised exchanges are
 * omitted. Ties keep their original encounter order.
 */
export function rankExchangeTickers(data: OpenFIGIResult[]): string[] {
  const ranked: { ticker: string; rank: number; order: number }[] = [];
  let order = 0;

  for (const item of data) {
    if (item.ticker && item.exchCode) {
      const rank = EXCHANGE_PREFERENCE.indexOf(item.exchCode.toUpperCase());
      if (rank >= 0) {
        ranked.push({
          ticker: formatYahooTicker(item.ticker, item.exchCode),
          rank,
          order: order++,
        });
      }
    }
  }

  ranked.sort((a, b) => a.rank - b.rank || a.order - b.order);

  const seen = new Set<string>();
  const result: string[] = [];
  for (const { ticker } of ranked) {
    if (!seen.has(ticker)) {
      seen.add(ticker);
      result.push(ticker);
    }
  }
  return result;
}

export function selectBestExchangeTicker(data: OpenFIGIResult[]): string | null {
  return rankExchangeTickers(data)[0] ?? null;
}

export function formatYahooTicker(ticker: string, exchCode: string): string {
  const exchangeMap: Record<string, string> = {
    "FP": "PA",  // Euronext Paris (OpenFIGI code)
    "EP": "PA",  // Euronext Paris (alternative)
    "PA": "PA",
    "EB": "BR",  // Euronext Brussels
    "EA": "AS",  // Euronext Amsterdam
    "EL": "LS",  // Euronext Lisbon
    "US": "",    // US stocks don't need suffix
    "UW": "",    // US exchanges
    "UR": "",
    "UN": "",
    "LN": "L",   // London Stock Exchange
    "GR": "DE",  // Deutsche Börse (XETRA)
    "GY": "DE",
    "GF": "DE",  // Frankfurt
    "GD": "DE",  // Düsseldorf
    "SW": "SW",  // SIX Swiss Exchange
    "SE": "SW",  // SIX Swiss Exchange (alternative)
    "IM": "MI",  // Borsa Italiana (Milan)
  };

  const suffix = exchangeMap[exchCode.toUpperCase()];
  if (suffix === undefined) {
    console.log(`[formatYahooTicker] Unknown exchange code: ${exchCode}, using as-is`);
    return ticker;
  }

  return suffix ? `${ticker}.${suffix}` : ticker;
}

/**
 * Normalize currency codes.
 * Yahoo Finance returns "GBp" or "GBX" for UK pence, but we want to store everything as GBP (pounds).
 */
function normalizeCurrency(currency: string): string {
  if (currency === "GBp" || currency === "GBX") {
    return "GBP";
  }
  return currency;
}

async function validateTicker(ticker: string): Promise<boolean> {
  try {
    console.log(`[validateTicker] Validating ${ticker}...`);
    const result = await yahooFinance.quoteSummary(ticker, { modules: ["price"] } as { modules: Array<"price"> });
    const isValid = !!(result && result.price);
    console.log(`[validateTicker] ${ticker} validation: ${isValid ? 'PASS' : 'FAIL'}`);
    return isValid;
  } catch (error) {
    console.error(`[validateTicker] Error validating ${ticker}:`, error instanceof Error ? error.message : String(error));
    return false;
  }
}

const CURRENCY_EXCHANGE_SUFFIXES: Record<string, string[]> = {
  GBP: [".L"],
  EUR: [".DE", ".AS", ".PA", ".MI", ".SW"],
  CHF: [".SW"],
  SEK: [".ST"],
  DKK: [".CO"],
  NOK: [".OL"],
};

export async function searchBySymbolAndName(
  symbol: string,
  name: string,
  currency?: string | null
): Promise<string | null> {
  try {
    console.log(`[searchBySymbolAndName] Resolving ${symbol} ("${name}", currency=${currency})`);

    // Strategy 1: Search Yahoo Finance with the instrument name
    const searchResults = await yahooFinance.search(name, { quotesCount: 10 }, { validateResult: false }) as { quotes?: Array<{ symbol?: string; shortname?: string; longname?: string }> };

    if (searchResults.quotes && searchResults.quotes.length > 0) {
      const upperSymbol = symbol.toUpperCase();

      // Find a result whose Yahoo symbol starts with our raw ticker
      for (const quote of searchResults.quotes) {
        const qSymbol = String(quote.symbol || "").toUpperCase();
        if (qSymbol === upperSymbol || qSymbol.startsWith(upperSymbol + ".")) {
          console.log(`[searchBySymbolAndName] ✓ Name search matched: ${quote.symbol}`);
          return quote.symbol as string;
        }
      }

      console.log(`[searchBySymbolAndName] Name search found ${searchResults.quotes.length} results but none matched ${symbol}`);
    }

    // Strategy 2: Try common exchange suffixes based on currency
    const suffixes = currency ? CURRENCY_EXCHANGE_SUFFIXES[currency.toUpperCase()] : undefined;
    if (suffixes) {
      for (const suffix of suffixes) {
        const candidate = `${symbol.toUpperCase()}${suffix}`;
        const validated = await validateTicker(candidate);
        if (validated) {
          console.log(`[searchBySymbolAndName] ✓ Suffix probe matched: ${candidate}`);
          return candidate;
        }
      }
    }

    // Strategy 3: Try all known suffixes as a last resort
    const allSuffixes = [".L", ".DE", ".AS", ".PA", ".MI", ".SW", ".ST", ".CO", ".OL"];
    const triedSuffixes = new Set(suffixes || []);
    for (const suffix of allSuffixes) {
      if (triedSuffixes.has(suffix)) continue;
      const candidate = `${symbol.toUpperCase()}${suffix}`;
      const validated = await validateTicker(candidate);
      if (validated) {
        console.log(`[searchBySymbolAndName] ✓ Broad suffix probe matched: ${candidate}`);
        return candidate;
      }
    }

    console.error(`[searchBySymbolAndName] Could not resolve ${symbol}`);
    return null;
  } catch (error) {
    console.error(`[searchBySymbolAndName] Exception:`, error);
    return null;
  }
}

export interface YahooQuote {
  price: number;
  fiftyTwoWeekHigh: number | null;
}

export async function fetchQuotes(
  tickers: string[]
): Promise<Map<string, YahooQuote>> {
  const quoteMap = new Map<string, YahooQuote>();

  if (tickers.length === 0) return quoteMap;

  for (const ticker of tickers) {
    try {
      const queryOptions = { modules: ["price", "summaryDetail"] } as {
        modules: Array<"price" | "summaryDetail">;
      };
      const result = await yahooFinance.quoteSummary(ticker, queryOptions);

      if (result && result.price && result.price.regularMarketPrice) {
        const currency = result.price.currency;
        // Normalize GBp (pence) to GBP (pounds) for both price and high
        const scale = currency === "GBp" || currency === "GBX" ? 1 / 100 : 1;

        const rawHigh = result.summaryDetail?.fiftyTwoWeekHigh;
        quoteMap.set(ticker, {
          price: result.price.regularMarketPrice * scale,
          fiftyTwoWeekHigh:
            typeof rawHigh === "number" ? rawHigh * scale : null,
        });
      }
    } catch (err) {
      console.error(`Failed to fetch quote for ${ticker}:`, err);
    }
  }

  return quoteMap;
}

export async function fetchPrices(
  tickers: string[]
): Promise<Map<string, number>> {
  const quotes = await fetchQuotes(tickers);
  const priceMap = new Map<string, number>();
  for (const [ticker, quote] of quotes) {
    priceMap.set(ticker, quote.price);
  }
  return priceMap;
}

function determineInstrumentType(
  quoteType?: string
): "stock" | "etf" | "bond" | "fund" {
  if (!quoteType) return "stock";

  const type = quoteType.toLowerCase();
  if (type.includes("etf")) return "etf";
  if (type.includes("fund") || type.includes("mutualfund")) return "fund";
  if (type.includes("bond")) return "bond";

  return "stock";
}
