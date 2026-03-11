const frFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

const percentFormatter = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const quantityFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4,
});

export function formatCurrency(
  amount: number,
  currency: string = "EUR"
): string {
  if (currency !== "EUR") {
    const formatter = new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
    });
    return formatter.format(amount);
  }
  return frFormatter.format(amount);
}

export function formatPercent(value: number): string {
  return percentFormatter.format(value);
}

export function formatQuantity(quantity: number): string {
  return quantityFormatter.format(quantity);
}
