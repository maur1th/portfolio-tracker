"use client";

import { useState, useMemo } from "react";
import { Line, LineChart, XAxis, YAxis, Legend } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrency } from "@/lib/format";
import type { SnapshotTotal } from "@/lib/value-averaging";
import { usePrivacy } from "./privacy-provider";

type TimeRange = "30d" | "90d" | "6m" | "ytd" | "12m";

const timeRangeLabels: Record<TimeRange, string> = {
  "30d": "30 jours",
  "90d": "90 jours",
  "6m": "6 mois",
  "ytd": "YTD",
  "12m": "12 mois",
};

function getTimeRangeCutoff(range: TimeRange): Date {
  const now = new Date();
  switch (range) {
    case "30d":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    case "90d":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
    case "6m":
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case "ytd":
      return new Date(now.getFullYear(), 0, 1);
    case "12m":
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  }
}

interface PortfolioChartProps {
  snapshotHistory: SnapshotTotal[];
}

const portfolioChartTooltip = {
  backgroundColor: "var(--color-chart-tooltip-bg)",
  border: "1px solid var(--color-chart-tooltip-border)",
  color: "var(--color-foreground)",
};

const chartConfig = {
  totalValueEur: {
    label: "Valorisation",
    color: "hsl(var(--chart-1))",
  },
  totalCostEur: {
    label: "Montant investi",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function PortfolioChartContent({ snapshotHistory }: PortfolioChartProps) {
  const { privacyMode } = usePrivacy();
  const [timeRange, setTimeRange] = useState<TimeRange>("12m");

  const chartData = useMemo(() => {
    const cutoff = getTimeRangeCutoff(timeRange).toISOString().split("T")[0];
    return snapshotHistory.filter((s) => s.date >= cutoff);
  }, [snapshotHistory, timeRange]);

  if (snapshotHistory.length === 0) return null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold tracking-[-0.02em] text-white">
          Valorisation du portefeuille
        </h3>
        <div className="flex items-center gap-1.5">
        {(Object.keys(timeRangeLabels) as TimeRange[]).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              timeRange === range
                ? "bg-emerald-400/15 text-emerald-300"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            {timeRangeLabels[range]}
          </button>
        ))}
        </div>
      </div>
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
              privacyMode
                ? "••••"
                : new Intl.NumberFormat("fr-FR", {
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
                <div
                  className="rounded-xl p-2 shadow-sm"
                  style={portfolioChartTooltip}
                >
                  <div
                    className="mb-1 text-sm font-medium"
                    style={{ color: "var(--color-foreground)" }}
                  >
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
                      <span style={{ color: "var(--color-muted-foreground)" }}>
                        {chartConfig[entry.dataKey as keyof typeof chartConfig]
                          ?.label ?? entry.dataKey}
                      </span>
                      <span
                        className="ml-auto font-medium"
                        style={{ color: "var(--color-foreground)" }}
                      >
                        {privacyMode ? "••••" : formatCurrency(entry.value as number)}
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
    </div>
  );
}
