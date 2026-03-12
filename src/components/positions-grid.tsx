import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent, formatQuantity } from "@/lib/format";
import type { PortfolioPosition } from "@/types";

interface PositionsGridProps {
  positions: PortfolioPosition[];
  portfolioTotalValue: number;
}

export function PositionsGrid({
  positions,
  portfolioTotalValue,
}: PositionsGridProps) {
  if (positions.length === 0) {
    return (
      <div className="dashboard-subtle-surface dashboard-text-muted rounded-[1.4rem] border border-white/10 px-6 py-12 text-center">
        Aucune position trouvée
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {positions.map((position) => {
        const allocation =
          portfolioTotalValue > 0 ? position.totalValue / portfolioTotalValue : 0;
        const isPositive = position.gainLoss >= 0;

        return (
          <article
            key={position.position.id}
            className="dashboard-panel relative h-full overflow-hidden rounded-[1.45rem] border p-5"
          >
            <div className="relative flex h-full flex-col space-y-5">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="overflow-hidden text-[1.1rem] font-semibold leading-[1.15] tracking-[-0.03em] text-white [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                      {position.instrument.name}
                    </h3>
                    <p className="dashboard-text-soft mt-1 text-[1.05rem] tracking-[-0.03em]">
                      {position.instrument.ticker}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="dashboard-chip shrink-0 px-3 py-1 text-sm"
                  >
                    {position.broker.name.replace("Boursobank", "Bourso")}{" "}
                    {position.account.type}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="dashboard-text-muted text-sm">Quantité</div>
                  <div className="mt-1 text-[1.1rem] font-semibold text-white">
                    {formatQuantity(position.position.quantity)}
                  </div>
                </div>
                <div>
                  <div className="dashboard-text-muted text-sm">PRU</div>
                  <div className="mt-1 text-[1.1rem] font-semibold text-white">
                    {formatCurrency(position.position.avgCostPerUnit)}
                  </div>
                </div>
                <div>
                  <div className="dashboard-text-muted text-sm">Prix actuel</div>
                  <div className="mt-1 text-[1.1rem] font-semibold text-white">
                    {position.currentPrice
                      ? formatCurrency(position.currentPrice)
                      : "-"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
                <div>
                  <div className="dashboard-text-muted text-sm">Valeur totale</div>
                  <div className="mt-1 text-xl font-semibold leading-none tracking-[-0.04em] text-white">
                    {formatCurrency(position.totalValue)}
                  </div>
                  <div
                    className={`mt-2 text-[1.05rem] ${
                      isPositive ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {formatCurrency(position.gainLoss)} (
                    {formatPercent(position.gainLossPercent)})
                  </div>
                </div>
              </div>

              <div className="mt-auto space-y-2 pt-2">
                <div className="dashboard-text-muted flex items-center justify-between text-sm">
                  <span>Poids dans le portefeuille</span>
                  <span>{formatPercent(allocation)}</span>
                </div>
                <div className="dashboard-track h-2.5 overflow-hidden rounded-full">
                  <div
                    className="dashboard-fill-neutral h-full rounded-full"
                    style={{ width: `${Math.min(allocation * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
