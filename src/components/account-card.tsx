import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { AccountCardSparkline } from "@/components/account-card-sparkline";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { AccountSummary } from "@/lib/portfolio";

interface AccountCardProps {
  summary: AccountSummary;
}

export function AccountCard({ summary }: AccountCardProps) {
  const isPositive = summary.gainLoss >= 0;

  return (
    <Link href={`/accounts/${summary.account.id}`}>
      <Card className="bg-dash-panel border-dash-border shadow-dash-panel-lg group relative h-full overflow-hidden transition-transform duration-300 hover:-translate-y-1">
        <div className="border-dash-inner-border pointer-events-none absolute inset-[1px] rounded-[1.15rem] border" />
        <CardContent className="relative flex h-full flex-col gap-6 p-6">
          <div className="text-[1.85rem] font-semibold leading-none tracking-[-0.05em] text-white">
            {summary.broker.name} - {summary.account.name}
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_170px] lg:items-end">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-dash-muted text-sm">Valorisation</div>
                  <div className="mt-1 text-xl font-semibold leading-none tracking-[-0.04em] text-white">
                    {formatCurrency(summary.totalValue)}
                  </div>
                </div>
                <div>
                  <div className="text-dash-muted text-sm">+/- value latente</div>
                  <div
                    className={`mt-1 text-xl font-semibold leading-none tracking-[-0.04em] ${
                      isPositive ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {formatCurrency(summary.gainLoss)}
                  </div>
                  <div
                    className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${
                      isPositive
                        ? "border-emerald-400/24 bg-emerald-400/10 text-emerald-200"
                        : "border-rose-400/24 bg-rose-400/10 text-rose-200"
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    {formatPercent(summary.gainLossPercent)}
                  </div>
                </div>
              </div>

              <div className="text-dash-muted text-sm">
                {summary.positionCount} position{summary.positionCount > 1 ? "s" : ""}
              </div>
            </div>

            <div className="flex flex-col items-end justify-end">
              <AccountCardSparkline
                data={summary.sparklineHistory}
                positive={isPositive}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
