import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { AccountSummary } from "@/lib/portfolio";

interface AccountCardProps {
  summary: AccountSummary;
}

export function AccountCard({ summary }: AccountCardProps) {
  return (
    <Link href={`/accounts/${summary.account.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {summary.broker.name} - {summary.account.name}
            </CardTitle>
            <Badge variant="outline">{summary.account.type}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Valeur</div>
              <div className="font-semibold">
                {formatCurrency(summary.totalValue)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Gain/Perte</div>
              <div
                className={`font-semibold ${
                  summary.gainLoss >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(summary.gainLoss)} (
                {formatPercent(summary.gainLossPercent)})
              </div>
            </div>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            {summary.positionCount} position{summary.positionCount > 1 ? "s" : ""}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
