export interface Instrument {
  ticker: string;
  name: string;
  type: "stock" | "etf" | "bond" | "fund";
  currency: string;
  exchange?: string | null;
}

export interface Position {
  id: number;
  accountId: number;
  instrumentId: number;
  quantity: number;
  avgCostPerUnit: number;
  importedAt: string;
}

export interface Price {
  instrumentId: number;
  price: number;
  date: string;
  fetchedAt: string;
}

export interface Account {
  id: number;
  brokerId: number;
  name: string;
  type: "PEA" | "CTO";
  currency: string;
}

export interface Broker {
  id: number;
  name: string;
}

export interface Transaction {
  id: number;
  accountId: number;
  instrumentId: number | null;
  date: string;
  transactionType: string;
  symbol: string | null;
  description: string;
  quantity: number | null;
  price: number | null;
  priceCurrency: string | null;
  grossAmount: number | null;
  commission: number | null;
  netAmount: number;
  importedAt: string;
}

export interface PortfolioPosition {
  position: Position;
  instrument: Instrument & { id: number; isin?: string | null };
  account: Account;
  broker: Broker;
  currentPrice: number | null;
  totalValue: number;
  totalCost: number;
  gainLoss: number;
  gainLossPercent: number;
}
