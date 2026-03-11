import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import { computePortfolioTotalEUR } from "@/lib/value-averaging";
import type { PortfolioPosition } from "@/types";

interface PortfolioSummaryProps {
  positions: PortfolioPosition[];
}

export async function PortfolioSummary({ positions }: PortfolioSummaryProps) {
  const { totalValueEur, totalCostEur } = await computePortfolioTotalEUR(positions);

  const gainLossEUR = totalValueEur - totalCostEur;
  const gainLossPercent = totalCostEur > 0 ? gainLossEUR / totalCostEur : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Résumé du portefeuille</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Valeur totale</div>
            <div className="text-2xl font-bold">
              {formatCurrency(totalValueEur)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Coût total</div>
            <div className="text-2xl font-bold">
              {formatCurrency(totalCostEur)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Gain/Perte</div>
            <div
              className={`text-2xl font-bold ${
                gainLossEUR >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(gainLossEUR)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Performance</div>
            <div
              className={`text-2xl font-bold ${
                gainLossPercent >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatPercent(gainLossPercent)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
