import YahooFinanceAPI from "yahoo-finance2";

interface ExchangeRateCache {
  rate: number;
  timestamp: number;
}

const yahooFinance = new YahooFinanceAPI({ suppressNotices: ["yahooSurvey"] });
const rateCache = new Map<string, ExchangeRateCache>();
const CACHE_TTL = 3600000; // 1 hour in milliseconds

export async function getExchangeRate(
  from: string,
  to: string
): Promise<number> {
  if (from === to) return 1;

  const cacheKey = `${from}${to}`;
  const cached = rateCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.rate;
  }

  try {
    const ticker = `${from}${to}=X`;
    const queryOptions = { modules: ["price"] } as { modules: Array<"price"> };
    const result = await yahooFinance.quoteSummary(ticker, queryOptions) as any;
    
    if (!result || !result.price || !result.price.regularMarketPrice) {
      throw new Error(`No exchange rate found for ${ticker}`);
    }

    const rate = result.price.regularMarketPrice as number;
    rateCache.set(cacheKey, { rate, timestamp: Date.now() });
    
    return rate;
  } catch (error) {
    console.error(`Failed to fetch exchange rate ${from}->${to}:`, error);
    
    if (cached) {
      console.warn("Using stale cached rate");
      return cached.rate;
    }
    
    throw error;
  }
}

export async function convertToEUR(
  amount: number,
  currency: string
): Promise<number> {
  if (currency === "EUR") return amount;
  
  const rate = await getExchangeRate(currency, "EUR");
  return amount * rate;
}
