import { getPortfolioPositions, getAccountSummaries } from "@/lib/portfolio";
import { PortfolioSummary } from "@/components/portfolio-summary";
import { AccountCard } from "@/components/account-card";
import { PositionsTable } from "@/components/positions-table";
import { VAWidget } from "@/components/va-widget";
import { ExposureCharts } from "@/components/exposure-charts";
import { PortfolioChart } from "@/components/portfolio-chart";
import { Separator } from "@/components/ui/separator";
import { PriceRefreshButton } from "@/components/price-refresh-button";
import {
  getVAConfig,
  calculateVA,
  getSnapshotTotals,
  getLatestSnapshotDate,
  detectContributions,
  computePortfolioTotalEUR,
} from "@/lib/value-averaging";
import { computeExposure, getLastCountryWeightsFetchDate } from "@/lib/exposure";
import { loadTargets } from "@/lib/targets";
import { computeDcaSuggestions } from "@/lib/dca-suggestions";

export default async function HomePage() {
  const positions = await getPortfolioPositions();
  const accountSummaries = await getAccountSummaries();

  const vaConfig = await getVAConfig();
  const snapshotHistory = await getSnapshotTotals();
  const latestSnapshotDate = await getLatestSnapshotDate();
  const { totalValueEur } = await computePortfolioTotalEUR(positions);
  const exposure = await computeExposure(positions);
  const lastCountryWeightsFetchDate = getLastCountryWeightsFetchDate();
  const targets = loadTargets();

  let vaCalculation = null;
  let contributionsThisMonth = 0;

  if (vaConfig) {
    vaCalculation = calculateVA(vaConfig, totalValueEur, snapshotHistory);

    if (latestSnapshotDate) {
      const currentMonth = new Date().toISOString().substring(0, 7);
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastMonthStr = lastMonth.toISOString().substring(0, 7);

      const currentMonthSnapshot = snapshotHistory.findLast((s) =>
        s.date.startsWith(currentMonth)
      );
      const lastMonthSnapshot = snapshotHistory.findLast((s) =>
        s.date.startsWith(lastMonthStr)
      );

      if (currentMonthSnapshot && lastMonthSnapshot) {
        contributionsThisMonth = await detectContributions(
          lastMonthSnapshot.date,
          currentMonthSnapshot.date
        );
      }
    }
  }

  const isNextMonth = vaCalculation?.amountToInvest === 0;
  const suggestionsAmount =
    vaCalculation && vaConfig
      ? isNextMonth
        ? vaConfig.monthlyIncrement
        : vaCalculation.amountToInvest
      : 0;
  const suggestions =
    suggestionsAmount > 0
      ? computeDcaSuggestions({
          amountToInvest: suggestionsAmount,
          positions,
          exposure,
          geoTargets: targets.geography,
          capTargets: targets.marketCap,
        })
      : [];

  return (
    <div className="container mx-auto py-8 space-y-8">
      <PortfolioSummary positions={positions} />

      <VAWidget
        config={vaConfig}
        calculation={vaCalculation}
        latestSnapshotDate={latestSnapshotDate}
        contributionsThisMonth={contributionsThisMonth}
        snapshotHistory={snapshotHistory}
        currentPortfolioValue={totalValueEur}
        suggestions={suggestions}
        suggestionsAmount={suggestionsAmount}
        isNextMonth={isNextMonth ?? false}
      />

      <PortfolioChart snapshotHistory={snapshotHistory} />

      <ExposureCharts
        exposure={exposure}
        lastCountryWeightsFetchDate={lastCountryWeightsFetchDate}
        geoTargets={targets.geography}
        capTargets={targets.marketCap}
      />

      <div>
        <h2 className="text-2xl font-bold mb-4">Comptes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accountSummaries.map((summary) => (
            <AccountCard key={summary.account.id} summary={summary} />
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">
            Toutes les positions ({positions.length})
          </h2>
          <PriceRefreshButton />
        </div>
        <PositionsTable positions={positions} />
      </div>
    </div>
  );
}
