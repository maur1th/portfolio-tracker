import { getAccountPositions } from "@/lib/portfolio";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PositionsTable } from "@/components/positions-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent } from "@/lib/format";
import { notFound } from "next/navigation";

interface AccountPageProps {
  params: Promise<{ accountId: string }>;
}

export default async function AccountPage({ params }: AccountPageProps) {
  const { accountId } = await params;
  const accountIdNum = parseInt(accountId);

  const account = await db.query.accounts.findFirst({
    where: eq(accounts.id, accountIdNum),
    with: {
      broker: true,
    },
  });

  if (!account) {
    notFound();
  }

  const positions = await getAccountPositions(accountIdNum);

  const totalValue = positions.reduce((sum, p) => sum + p.totalValue, 0);
  const totalCost = positions.reduce((sum, p) => sum + p.totalCost, 0);
  const gainLoss = totalValue - totalCost;
  const gainLossPercent = totalCost > 0 ? gainLoss / totalCost : 0;

  return (
    <div className="container mx-auto py-8 space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {account.broker.name} - {account.name}
            </CardTitle>
            <Badge variant="outline">{account.type}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Valeur totale</div>
              <div className="text-2xl font-bold">
                {formatCurrency(totalValue, account.currency)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Coût total</div>
              <div className="text-2xl font-bold">
                {formatCurrency(totalCost, account.currency)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Gain/Perte</div>
              <div
                className={`text-2xl font-bold ${
                  gainLoss >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatCurrency(gainLoss, account.currency)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Performance</div>
              <div
                className={`text-2xl font-bold ${
                  gainLossPercent >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatPercent(gainLossPercent)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-bold mb-4">Positions</h2>
        <PositionsTable positions={positions} />
      </div>
    </div>
  );
}
