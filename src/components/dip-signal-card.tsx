import { TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import { DEFAULT_DIP_THRESHOLD, type DipSignal } from "@/lib/dip-signals";
import { PrivateValue } from "./private-value";

interface DipSignalCardProps {
  signals: DipSignal[];
  threshold?: number;
}

export function DipSignalCard({
  signals,
  threshold = DEFAULT_DIP_THRESHOLD,
}: DipSignalCardProps) {
  const thresholdLabel = formatPercent(threshold);

  return (
    <Card className="bg-dash-panel border-dash-border shadow-dash-panel overflow-hidden">
      <CardHeader className="border-b border-white/8 pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-border bg-[hsl(var(--surface-muted))] p-2">
            <TrendingDown className="h-4 w-4 text-amber-300" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold tracking-[-0.03em] text-white">
              Signal d&apos;achat sur repli
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Positions à plus de {thresholdLabel} sous leur plus haut sur 52
              semaines
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        {signals.length === 0 ? (
          <p className="text-dash-soft text-sm">
            Aucun repli significatif. Toutes les positions sont à moins de{" "}
            {thresholdLabel} de leur plus haut sur 52 semaines.
          </p>
        ) : (
          <ul className="space-y-3">
            {signals.map((s) => (
              <li
                key={`${s.ticker}-${s.accountName}`}
                className="bg-dash-subtle flex items-center justify-between gap-4 rounded-[1rem] border border-amber-500/25 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{s.name}</p>
                  <p className="text-dash-faint text-xs">
                    {s.ticker} · {s.accountName} ·{" "}
                    <PrivateValue>{formatCurrency(s.currentValue)}</PrivateValue>
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-500/15 px-2.5 py-1 text-sm font-semibold text-amber-300">
                  {formatPercent(s.drawdown)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
