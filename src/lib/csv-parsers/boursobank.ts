import Papa from "papaparse";
import type { ParsedPosition } from "./types";

export function parseBoursobankCSV(csvContent: string): ParsedPosition[] {
  const result = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    delimiter: ";",
    skipEmptyLines: true,
  });

  if (result.errors.length > 0) {
    console.error("CSV parsing errors:", result.errors);
  }

  const positions: ParsedPosition[] = [];

  for (const row of result.data) {
    const isin = 
      row["isin"] ||
      row["ISIN"] ||
      row["Code ISIN"] ||
      row["Code"] ||
      row["code"];
      
    const name =
      row["name"] ||
      row["Name"] ||
      row["Désignation"] ||
      row["Libellé"] ||
      row["Nom"] ||
      row["designation"];
      
    const quantityStr =
      row["quantity"] ||
      row["Quantity"] ||
      row["Quantité"] ||
      row["Qté"] ||
      row["qty"];
      
    const pruStr =
      row["buyingPrice"] ||
      row["BuyingPrice"] ||
      row["PRU"] ||
      row["Prix de revient unitaire"] ||
      row["avgCostPerUnit"] ||
      row["pru"];
      
    const currency = row["Devise"] || row["Currency"] || row["currency"] || "EUR";

    if (!name || !quantityStr || !pruStr) {
      console.warn("Skipping incomplete row:", row);
      continue;
    }

    // Parse French number format: remove spaces (thousands separator) and replace comma with dot
    const quantity = parseFloat(quantityStr.replace(/\s/g, "").replace(",", "."));
    const avgCostPerUnit = parseFloat(pruStr.replace(/\s/g, "").replace(",", "."));

    if (isNaN(quantity) || isNaN(avgCostPerUnit)) {
      console.warn("Invalid numbers in row:", row);
      continue;
    }

    positions.push({
      isin: isin || undefined,
      name,
      quantity,
      avgCostPerUnit,
      currency: currency.toUpperCase(),
    });
  }

  return positions;
}
