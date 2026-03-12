import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { fxRates } from "@/db/schema";

const ECB_DAILY_RATES_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";

function parseEcbRates(xml: string): Map<string, number> {
  const rates = new Map<string, number>();
  const ratePattern = /currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g;

  for (const match of xml.matchAll(ratePattern)) {
    const [, currency, rate] = match;
    const parsedRate = Number(rate);
    if (Number.isFinite(parsedRate)) {
      rates.set(currency, parsedRate);
    }
  }

  return rates;
}

async function fetchExchangeRates(
  baseCurrencies: string[],
  quoteCurrency = "EUR"
): Promise<Map<string, number>> {
  if (quoteCurrency !== "EUR") {
    throw new Error(`Unsupported quote currency ${quoteCurrency}. Only EUR is supported.`);
  }

  const response = await fetch(ECB_DAILY_RATES_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch ECB FX rates: ${response.status}`);
  }

  const xml = await response.text();
  const ecbRates = parseEcbRates(xml);
  const uniqueCurrencies = [...new Set(baseCurrencies)]
    .filter((currency) => currency !== quoteCurrency);
  const rateMap = new Map<string, number>();

  for (const baseCurrency of uniqueCurrencies) {
    const eurToBaseRate = ecbRates.get(baseCurrency);
    if (!eurToBaseRate) {
      console.error(`No ECB FX rate available for ${baseCurrency}->${quoteCurrency}`);
      continue;
    }

    rateMap.set(baseCurrency, 1 / eurToBaseRate);
  }

  return rateMap;
}

export async function getExchangeRate(
  from: string,
  to: string
): Promise<number> {
  if (from === to) return 1;

  const result = await db
    .select({ rate: fxRates.rate })
    .from(fxRates)
    .where(
      and(
        eq(fxRates.baseCurrency, from),
        eq(fxRates.quoteCurrency, to)
      )
    )
    .orderBy(desc(fxRates.fetchedAt))
    .limit(1);

  const storedRate = result[0]?.rate;
  if (typeof storedRate === "number" && Number.isFinite(storedRate)) {
    return storedRate;
  }

  // Lazy fetch: no stored rate yet, fetch from ECB and persist
  const rateMap = await fetchExchangeRates([from], to);
  const fetchedRate = rateMap.get(from);
  if (typeof fetchedRate !== "number" || !Number.isFinite(fetchedRate)) {
    throw new Error(`No exchange rate available for ${from}->${to}`);
  }

  const now = new Date().toISOString();
  await db
    .insert(fxRates)
    .values({
      baseCurrency: from,
      quoteCurrency: to,
      rate: fetchedRate,
      fetchedAt: now,
    })
    .onConflictDoUpdate({
      target: [fxRates.baseCurrency, fxRates.quoteCurrency],
      set: { rate: fetchedRate, fetchedAt: now },
    });

  return fetchedRate;
}

export async function convertToEUR(
  amount: number,
  currency: string
): Promise<number> {
  if (currency === "EUR") return amount;

  const rate = await getExchangeRate(currency, "EUR");
  return amount * rate;
}

export async function refreshExchangeRates(
  currencies: string[],
  quoteCurrency = "EUR"
): Promise<number> {
  const rateMap = await fetchExchangeRates(currencies, quoteCurrency);
  const now = new Date().toISOString();

  for (const [baseCurrency, rate] of rateMap.entries()) {
    await db
      .insert(fxRates)
      .values({
        baseCurrency,
        quoteCurrency,
        rate,
        fetchedAt: now,
      })
      .onConflictDoUpdate({
        target: [fxRates.baseCurrency, fxRates.quoteCurrency],
        set: {
          rate,
          fetchedAt: now,
        },
      });
  }

  return rateMap.size;
}
