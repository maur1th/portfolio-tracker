"use client";

import { Line, LineChart, XAxis, YAxis, Legend } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrency } from "@/lib/format";
import type { SnapshotTotal } from "@/lib/value-averaging";

interface PortfolioChartProps {
  snapshotHistory: SnapshotTotal[];
}

const chartConfig = {
  totalValueEur: {
    label: "Valeur",
    color: "hsl(var(--chart-1))",
  },
  totalCostEur: {
    label: "Coût",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function PortfolioChartContent({ snapshotHistory }: PortfolioChartProps) {
  if (snapshotHistory.length === 0) return null;
  const chartData = snapshotHistory.slice(-12);

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <LineChart data={chartData} accessibilityLayer>
        <XAxis
          dataKey="date"
          tickFormatter={formatDateLabel}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={["dataMin", "dataMax"]}
          tickFormatter={(v) =>
            new Intl.NumberFormat("fr-FR", {
              notation: "compact",
              maximumFractionDigits: 0,
            }).format(v)
          }
          tickLine={false}
          axisLine={false}
          width={60}
        />
        <ChartTooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="rounded-lg border bg-background p-2 shadow-sm">
                <div className="mb-1 text-sm font-medium">
                  {new Date(label).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                {payload.map((entry) => (
                  <div
                    key={entry.dataKey}
                    className="flex items-center gap-2 text-sm"
                  >
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-muted-foreground">
                      {chartConfig[entry.dataKey as keyof typeof chartConfig]
                        ?.label ?? entry.dataKey}
                    </span>
                    <span className="ml-auto font-medium">
                      {formatCurrency(entry.value as number)}
                    </span>
                  </div>
                ))}
              </div>
            );
          }}
        />
        <Legend
          formatter={(value) =>
            chartConfig[value as keyof typeof chartConfig]?.label ?? value
          }
        />
        <Line
          type="monotone"
          dataKey="totalValueEur"
          stroke="var(--color-totalValueEur)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="totalCostEur"
          stroke="var(--color-totalCostEur)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
