"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, ChartColumnBig, LayoutGrid, TableProperties } from "lucide-react";
import { PriceRefreshButton } from "@/components/price-refresh-button";
import { PositionsGrid } from "@/components/positions-grid";
import { PositionsTable } from "@/components/positions-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PortfolioPosition } from "@/types";

type SortOption = "weight" | "gain-loss" | "performance" | "name";
type ViewMode = "grid" | "table";

interface PositionsSectionProps {
  positions: PortfolioPosition[];
  portfolioTotalValue: number;
}

export function PositionsSection({
  positions,
  portfolioTotalValue,
}: PositionsSectionProps) {
  const [sortBy, setSortBy] = useState<SortOption>("weight");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  useEffect(() => {
    const stored = localStorage.getItem("positions-view-mode");
    if (stored === "table") setViewMode("table");
  }, []);

  const handleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("positions-view-mode", mode);
  };

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
    <Card className="bg-dash-panel border-dash-border shadow-dash-panel overflow-hidden">
      <CardHeader className="flex flex-col gap-4 border-b border-white/8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-border bg-[hsl(var(--surface-muted))] p-2">
            <ChartColumnBig className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold tracking-[-0.03em]">
              Toutes les positions <span className="text-white/35">({positions.length})</span>
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Détail de l&apos;ensemble des positions
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleViewMode("grid")}
              className={viewMode === "grid" ? "text-white" : "text-white/40 hover:text-white/70"}
              title="Vue grille"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleViewMode("table")}
              className={viewMode === "table" ? "text-white" : "text-white/40 hover:text-white/70"}
              title="Vue tableau"
            >
              <TableProperties className="h-4 w-4" />
            </Button>
          </div>
          {viewMode === "grid" && (
            <div className="flex items-center gap-3 sm:justify-end">
              <span className="text-dash-muted inline-flex items-center gap-2 text-sm">
                <ArrowDownUp className="h-4 w-4" />
                Trier par
              </span>
              <Select
                value={sortBy}
                onValueChange={(value) => setSortBy(value as SortOption)}
              >
                <SelectTrigger className="bg-white/5 border-dash-border text-foreground shadow-dash-action h-12 w-[180px] rounded-full px-5 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weight">Valorisation</SelectItem>
                  <SelectItem value="gain-loss">+/- value latente</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="name">Nom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <PriceRefreshButton />
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        {viewMode === "grid" ? (
          <PositionsGrid
            positions={sortedPositions}
            portfolioTotalValue={portfolioTotalValue}
          />
        ) : (
          <PositionsTable positions={positions} />
        )}
      </CardContent>
    </Card>
  );
}
