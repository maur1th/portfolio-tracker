"use client";

import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent, formatQuantity } from "@/lib/format";
import type { PortfolioPosition } from "@/types";
import { usePrivacy } from "./privacy-provider";

interface PositionsGridProps {
  positions: PortfolioPosition[];
  portfolioTotalValue: number;
}

export function PositionsGrid({
  positions,
  portfolioTotalValue,
}: PositionsGridProps) {
  const { privacyMode } = usePrivacy();
  const pv = (value: number) => privacyMode ? "••••" : formatCurrency(value);
  const pvq = (value: number) => privacyMode ? "••••" : formatQuantity(value);

  if (positions.length === 0) {
    return (
      <div className="bg-dash-subtle text-dash-muted rounded-[1.4rem] border border-white/10 px-6 py-12 text-center">
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
            className="bg-dash-panel border-dash-border shadow-dash-panel relative h-full overflow-hidden rounded-[1.45rem] border p-5"
          >
            <div className="relative flex h-full flex-col space-y-5">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="overflow-hidden text-[1.1rem] font-semibold leading-[1.15] tracking-[-0.03em] text-white [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                      {position.instrument.name}
                    </h3>
                    <p className="text-dash-soft mt-1 text-[1.05rem] tracking-[-0.03em]">
                      {position.instrument.ticker}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-dash-chip border-dash-chip-border text-dash-strong shrink-0 px-3 py-1 text-sm"
                  >
                    {position.broker.name.replace("Boursobank", "Bourso")}{" "}
                    {position.account.type}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-dash-muted text-sm">Quantité</div>
                  <div className="mt-1 text-[1.1rem] font-semibold text-white">
                    {pvq(position.position.quantity)}
                  </div>
                </div>
                <div>
                  <div className="text-dash-muted text-sm">Px. Revient</div>
                  <div className="mt-1 text-[1.1rem] font-semibold text-white">
                    {pv(position.position.avgCostPerUnit)}
                  </div>
                </div>
                <div>
                  <div className="text-dash-muted text-sm">Cours</div>
                  <div className="mt-1 text-[1.1rem] font-semibold text-white">
                    {position.currentPrice
                      ? pv(position.currentPrice)
                      : "-"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
                <div>
                  <div className="text-dash-muted text-sm">Valorisation</div>
                  <div className="mt-1 text-xl font-semibold leading-none tracking-[-0.04em] text-white">
                    {pv(position.totalValue)}
                  </div>
                  <div
                    className={`mt-2 text-[1.05rem] ${
                      isPositive ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {privacyMode ? "••••" : <>{formatCurrency(position.gainLoss)} ({formatPercent(position.gainLossPercent)})</>}
                  </div>
                </div>
              </div>

              <div className="mt-auto space-y-2 pt-2">
                <div className="text-dash-muted flex items-center justify-between text-sm">
                  <span>Pondération</span>
                  <span>{formatPercent(allocation)}</span>
                </div>
                <div className="bg-dash-track h-2.5 overflow-hidden rounded-full">
                  <div
                    className="bg-dash-fill h-full rounded-full"
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
