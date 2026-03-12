import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent, formatQuantity } from "@/lib/format";
import { computePositionAllocation } from "@/lib/homepage-widgets";
import type { PortfolioPosition } from "@/types";

interface PositionsGridProps {
  positions: PortfolioPosition[];
  portfolioTotalValue: number;
}

export function PositionsGrid({
  positions,
  portfolioTotalValue,
}: PositionsGridProps) {
  const sortedPositions = [...positions].sort((a, b) => b.totalValue - a.totalValue);

  if (positions.length === 0) {
    return (
      <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] px-6 py-12 text-center text-white/58">
        Aucune position trouvee
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {sortedPositions.map((position) => {
        const allocation = computePositionAllocation(
          position.totalValue,
          portfolioTotalValue
        );
        const isPositive = position.gainLoss >= 0;

        return (
          <article
            key={position.position.id}
            className="relative h-full overflow-hidden rounded-[1.45rem] border border-white/12 bg-[rgba(9,18,38,0.92)] p-5 shadow-[0_26px_70px_rgba(2,6,23,0.42)]"
          >
            <div className="relative flex h-full flex-col space-y-5">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="overflow-hidden text-[1.1rem] font-semibold leading-[1.15] tracking-[-0.03em] text-white [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                      {position.instrument.name}
                    </h3>
                    <p className="mt-1 text-[1.05rem] tracking-[-0.03em] text-white/56">
                      {position.instrument.ticker}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 border-white/16 bg-white/6 px-3 py-1 text-sm text-white/88"
                  >
                    {position.broker.name.replace("Boursobank", "Bourso")}{" "}
                    {position.account.type}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-white/55">Quantite</div>
                  <div className="mt-1 text-[1.1rem] font-semibold text-white">
                    {formatQuantity(position.position.quantity)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-white/55">PRU</div>
                  <div className="mt-1 text-[1.1rem] font-semibold text-white">
                    {formatCurrency(position.position.avgCostPerUnit)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-white/55">Prix actuel</div>
                  <div className="mt-1 text-[1.1rem] font-semibold text-white">
                    {position.currentPrice
                      ? formatCurrency(position.currentPrice)
                      : "-"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
                <div>
                  <div className="text-sm text-white/55">Valeur totale</div>
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
                <div className="flex items-center justify-between text-sm text-white/55">
                  <span>Poids dans le portefeuille</span>
                  <span>{formatPercent(allocation)}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-[rgba(91,116,149,0.95)]"
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
