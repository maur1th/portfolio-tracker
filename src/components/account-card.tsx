import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { AccountCardSparkline } from "@/components/account-card-sparkline";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { AccountSummary } from "@/lib/portfolio";

interface AccountCardProps {
  summary: AccountSummary;
}

export function AccountCard({ summary }: AccountCardProps) {
  const isPositive = summary.gainLoss >= 0;

  return (
    <Link href={`/accounts/${summary.account.id}`}>
      <Card className="group relative h-full overflow-hidden border-white/14 bg-[rgba(8,18,42,0.92)] shadow-[0_30px_80px_rgba(2,6,23,0.48)] transition-transform duration-300 hover:-translate-y-1">
        <div className="pointer-events-none absolute inset-[1px] rounded-[1.15rem] border border-white/10" />
        <CardContent className="relative flex h-full flex-col gap-6 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-white/45">
                Compte
              </div>
              <div className="text-[1.85rem] font-semibold leading-none tracking-[-0.05em] text-white">
                {summary.broker.name} - {summary.account.name}
              </div>
            </div>
            <Badge
              variant="outline"
              className="border-white/16 bg-white/6 px-3 py-1 text-[0.95rem] text-white/88"
            >
              {summary.account.type}
            </Badge>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_170px] lg:items-end">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-white/55">Valeur totale</div>
                  <div className="mt-1 text-xl font-semibold leading-none tracking-[-0.04em] text-white">
                    {formatCurrency(summary.totalValue)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-white/55">Gain/Perte</div>
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

              <div className="flex items-center gap-3 text-sm text-white/58">
                <span>
                  {summary.positionCount} position{summary.positionCount > 1 ? "s" : ""}
                </span>
                <span className="h-1 w-1 rounded-full bg-white/25" />
                <span>{summary.account.currency}</span>
              </div>
            </div>

            <div className="flex flex-col items-end justify-end gap-3">
              <AccountCardSparkline
                data={summary.sparklineHistory}
                positive={isPositive}
              />
              <div
                className={`inline-flex items-center gap-2 text-sm ${
                  isPositive ? "text-emerald-200" : "text-rose-200"
                }`}
              >
                <span
                  className={`h-3 w-3 rounded-full ${
                    isPositive ? "bg-emerald-300" : "bg-rose-300"
                  }`}
                />
                {isPositive ? "progression" : "repli"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
