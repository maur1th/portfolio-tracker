"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent, formatQuantity } from "@/lib/format";
import { ArrowUpDown } from "lucide-react";
import type { PortfolioPosition } from "@/types";

interface PositionsTableProps {
  positions: PortfolioPosition[];
}

type SortKey =
  | "name"
  | "ticker"
  | "quantity"
  | "avgCost"
  | "currentPrice"
  | "totalValue"
  | "gainLoss"
  | "gainLossPercent";

export function PositionsTable({ positions }: PositionsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("totalValue");
  const [sortAsc, setSortAsc] = useState(false);

  const sortedPositions = useMemo(() => {
    const sorted = [...positions].sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortKey) {
        case "name":
          aVal = a.instrument.name;
          bVal = b.instrument.name;
          break;
        case "ticker":
          aVal = a.instrument.ticker;
          bVal = b.instrument.ticker;
          break;
        case "quantity":
          aVal = a.position.quantity;
          bVal = b.position.quantity;
          break;
        case "avgCost":
          aVal = a.position.avgCostPerUnit;
          bVal = b.position.avgCostPerUnit;
          break;
        case "currentPrice":
          aVal = a.currentPrice || 0;
          bVal = b.currentPrice || 0;
          break;
        case "totalValue":
          aVal = a.totalValue;
          bVal = b.totalValue;
          break;
        case "gainLoss":
          aVal = a.gainLoss;
          bVal = b.gainLoss;
          break;
        case "gainLossPercent":
          aVal = a.gainLossPercent;
          bVal = b.gainLossPercent;
          break;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortAsc
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return sorted;
  }, [positions, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const SortButton = ({ column }: { column: SortKey }) => (
    <button
      onClick={() => handleSort(column)}
      className="flex items-center gap-1 hover:text-foreground"
    >
      <ArrowUpDown className="h-4 w-4" />
    </button>
  );

  if (positions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucune position trouvée
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <div className="flex items-center gap-2">
                Instrument
                <SortButton column="name" />
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-2">
                Ticker
                <SortButton column="ticker" />
              </div>
            </TableHead>
            <TableHead>Compte</TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-2">
                Quantité
                <SortButton column="quantity" />
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-2">
                PRU
                <SortButton column="avgCost" />
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-2">
                Prix actuel
                <SortButton column="currentPrice" />
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-2">
                Valeur
                <SortButton column="totalValue" />
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-2">
                Gain/Perte
                <SortButton column="gainLoss" />
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-2">
                %
                <SortButton column="gainLossPercent" />
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPositions.map((p) => (
            <TableRow key={p.position.id}>
              <TableCell className="font-medium">{p.instrument.name}</TableCell>
              <TableCell className="font-mono text-sm">
                {p.instrument.ticker}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {p.broker.name.replace("Boursobank", "Bourso")} {p.account.type}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {formatQuantity(p.position.quantity)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(p.position.avgCostPerUnit)}
              </TableCell>
              <TableCell className="text-right">
                {p.currentPrice
                  ? formatCurrency(p.currentPrice)
                  : "-"}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(p.totalValue)}
              </TableCell>
              <TableCell
                className={`text-right font-semibold ${
                  p.gainLoss >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(p.gainLoss)}
              </TableCell>
              <TableCell
                className={`text-right font-semibold ${
                  p.gainLossPercent >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatPercent(p.gainLossPercent)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
