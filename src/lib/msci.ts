import { extractText } from "unpdf";

interface CountryWeight {
  country: string;
  weight: number;
}

const MSCI_FACTSHEETS: Array<{
  pattern: RegExp;
  url: string;
}> = [
  {
    pattern: /acwi|all.country/i,
    url: "https://www.msci.com/documents/10199/a71b65b5-d0ea-4b5c-a709-24b1213bc3c5",
  },
  {
    pattern: /small.cap/i,
    url: "https://www.msci.com/documents/10199/255599/msci-world-small-cap-index.pdf",
  },
  {
    pattern: /msci.world|world/i,
    url: "https://www.msci.com/documents/10199/178e6643-6ae6-47b9-82be-e1fc565ededb",
  },
];

function parseCountryWeightsFromText(text: string): CountryWeight[] {
  const lines = text.split("\n");
  const idx = lines.findIndex((l) => /COUNTRY WEIGHTS/i.test(l));
  if (idx < 0) return [];

  // Country weights follow on the next 2-3 lines: "United States 70.11% Japan 6.13% ..."
  const weightLines = lines.slice(idx + 1, idx + 5).join(" ");
  const regex = /([\w\s]+?)\s+([\d.]+)%/g;
  const weights: CountryWeight[] = [];
  const seen = new Set<string>();

  let match;
  while ((match = regex.exec(weightLines)) !== null) {
    const country = match[1].trim();
    const weight = parseFloat(match[2]) / 100;
    if (country && !isNaN(weight) && !seen.has(country)) {
      seen.add(country);
      weights.push({ country, weight });
    }
  }

  return weights;
}

export async function fetchCountryWeights(
  etfName: string
): Promise<CountryWeight[] | null> {
  const factsheet = MSCI_FACTSHEETS.find((f) => f.pattern.test(etfName));
  if (!factsheet) return null;

  const response = await fetch(factsheet.url);
  if (!response.ok) {
    throw new Error(`MSCI factsheet returned ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const result = await extractText(new Uint8Array(buffer));
  const fullText = Array.isArray(result.text)
    ? result.text.join("\n")
    : result.text;

  const weights = parseCountryWeightsFromText(fullText);
  if (weights.length === 0) {
    throw new Error("Could not parse country weights from MSCI factsheet");
  }

  return weights;
}
