export interface ParsedPosition {
  isin?: string;
  ticker?: string;
  name: string;
  quantity: number;
  avgCostPerUnit: number;
  currency: string;
}

export interface ParsedTransaction {
  date: string;
  description: string;
  transactionType: string;
  symbol: string | null;
  quantity: number | null;
  price: number | null;
  priceCurrency: string | null;
  grossAmount: number | null;
  commission: number | null;
  netAmount: number;
}

export type BrokerType = "boursobank" | "ibkr";
