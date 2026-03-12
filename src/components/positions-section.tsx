"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp, ChartColumnBig } from "lucide-react";
import { PriceRefreshButton } from "@/components/price-refresh-button";
import { PositionsGrid } from "@/components/positions-grid";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PortfolioPosition } from "@/types";

type SortOption = "weight" | "gain-loss" | "performance" | "name";

interface PositionsSectionProps {
  positions: PortfolioPosition[];
  portfolioTotalValue: number;
}

export function PositionsSection({
  positions,
  portfolioTotalValue,
}: PositionsSectionProps) {
  const [sortBy, setSortBy] = useState<SortOption>("weight");

  const sortedPositions = useMemo(() => {
    const sorted = [...positions];

    sorted.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.instrument.name.localeCompare(b.instrument.name);
        case "gain-loss":
          return b.gainLoss - a.gainLoss;
        case "performance":
          return b.gainLossPercent - a.gainLossPercent;
        case "weight":
        default:
          return b.totalValue - a.totalValue;
      }
    });

    return sorted;
  }, [positions, sortBy]);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-border bg-[hsl(var(--surface-muted))] p-2">
            <ChartColumnBig className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">
              Toutes les positions <span className="text-white/35">({positions.length})</span>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Positions classées par valorisation
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
          <div className="flex items-center gap-3 sm:justify-end">
            <span className="dashboard-text-muted inline-flex items-center gap-2 text-sm">
              <ArrowDownUp className="h-4 w-4" />
              Trier par
            </span>
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as SortOption)}
            >
              <SelectTrigger className="dashboard-action h-10 w-[180px] rounded-full px-4 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weight">Valorisation</SelectItem>
                <SelectItem value="gain-loss">Gain / Perte</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="name">Nom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <PriceRefreshButton />
        </div>
      </div>

      <PositionsGrid
        positions={sortedPositions}
        portfolioTotalValue={portfolioTotalValue}
      />
    </section>
  );
}
