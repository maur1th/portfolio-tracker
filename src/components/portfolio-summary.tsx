import { Landmark } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PortfolioChartContent } from "@/components/portfolio-chart";
import { formatCurrency, formatPercent } from "@/lib/format";
import { computePortfolioTotalEUR, type SnapshotTotal } from "@/lib/value-averaging";
import type { PortfolioPosition } from "@/types";

interface PortfolioSummaryProps {
  positions: PortfolioPosition[];
  snapshotHistory: SnapshotTotal[];
}

export async function PortfolioSummary({ positions, snapshotHistory }: PortfolioSummaryProps) {
  const { totalValueEur, totalCostEur } = await computePortfolioTotalEUR(positions);

  const gainLossEUR = totalValueEur - totalCostEur;
  const gainLossPercent = totalCostEur > 0 ? gainLossEUR / totalCostEur : 0;

  return (
    <Card className="dashboard-panel overflow-hidden">
      <CardHeader className="border-b border-white/8 pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-border bg-[hsl(var(--surface-muted))] p-2">
            <Landmark className="h-4 w-4 text-emerald-300" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold tracking-[-0.03em]">
              Résumé du portefeuille
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Vue d&apos;ensemble de la valeur, de la performance et de l&apos;historique
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Valeur totale</div>
            <div className="text-xl font-semibold tracking-[-0.03em]">
              {formatCurrency(totalValueEur)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Coût total</div>
            <div className="text-xl font-semibold tracking-[-0.03em]">
              {formatCurrency(totalCostEur)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Gain/Perte</div>
            <div
              className={`text-xl font-semibold tracking-[-0.03em] ${
                gainLossEUR >= 0 ? "text-emerald-300" : "text-rose-400"
              }`}
            >
              {formatCurrency(gainLossEUR)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Performance</div>
            <div
              className={`text-xl font-semibold tracking-[-0.03em] ${
                gainLossPercent >= 0 ? "text-emerald-300" : "text-rose-400"
              }`}
            >
              {formatPercent(gainLossPercent)}
            </div>
          </div>
        </div>

        {snapshotHistory.length > 0 ? (
          <div className="mt-6 border-t border-white/8 pt-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold tracking-[-0.02em] text-white">
                Valorisation du portefeuille
              </h3>
              <p className="text-sm text-muted-foreground">
                Valeur et coût sur l&apos;historique des snapshots
              </p>
            </div>
            <PortfolioChartContent snapshotHistory={snapshotHistory} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
