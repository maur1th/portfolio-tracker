export interface TradeTransaction {
  instrumentId: number;
  transactionType: string;
  quantity: number;
  price: number;
}

export interface ComputedPosition {
  instrumentId: number;
  quantity: number;
  avgCostPerUnit: number;
}

export function computeWeightedPositions(
  trades: TradeTransaction[]
): ComputedPosition[] {
  const byInstrument = new Map<
    number,
    { quantity: number; totalCost: number }
  >();

  for (const txn of trades) {
    if (!byInstrument.has(txn.instrumentId)) {
      byInstrument.set(txn.instrumentId, { quantity: 0, totalCost: 0 });
    }
    const pos = byInstrument.get(txn.instrumentId)!;
    const absQty = Math.abs(txn.quantity);

    if (txn.transactionType === "buy") {
      pos.totalCost += absQty * txn.price;
      pos.quantity += absQty;
    } else if (txn.transactionType === "sell") {
      if (pos.quantity > 0) {
        const ratio = absQty / pos.quantity;
        pos.totalCost -= ratio * pos.totalCost;
      }
      pos.quantity -= absQty;
    }
  }

  const results: ComputedPosition[] = [];
  for (const [instrumentId, { quantity, totalCost }] of byInstrument) {
    if (quantity <= 0) continue;
    results.push({
      instrumentId,
      quantity,
      avgCostPerUnit: totalCost / quantity,
    });
  }

  return results;
}
