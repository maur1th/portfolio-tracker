"use client";

import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface AccountCardSparklineProps {
  data: Array<{
    date: string;
    value: number;
  }>;
  positive: boolean;
}

export function AccountCardSparkline({
  data,
  positive,
}: AccountCardSparklineProps) {
  const uniqueId = useId();

  if (data.length === 0) {
    return (
      <div className="flex h-24 items-end justify-end">
        <div className="dashboard-chip rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.22em]">
          Pas d&apos;historique
        </div>
      </div>
    );
  }

  const color = positive ? "#6ee7b7" : "#fb7185";
  const areaId = `${positive ? "profit" : "loss"}-${uniqueId.replace(/:/g, "")}`;
  const chartData =
    data.length === 1
      ? [
          { ...data[0], date: `${data[0].date}-start` },
          data[0],
        ]
      : data;

  return (
    <div className="h-24 w-full min-w-[140px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.5} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            dataKey="value"
            type="monotone"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${areaId})`}
            fillOpacity={1}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
