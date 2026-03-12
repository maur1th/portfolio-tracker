import { BriefcaseBusiness } from "lucide-react";
import { getPortfolioPositions, getAccountSummaries } from "@/lib/portfolio";
import { PortfolioSummary } from "@/components/portfolio-summary";
import { AccountCard } from "@/components/account-card";
import { PositionsSection } from "@/components/positions-section";
import { VAWidget } from "@/components/va-widget";
import { ExposureCharts } from "@/components/exposure-charts";
import { Separator } from "@/components/ui/separator";
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
  const sortedAccountSummaries = [...accountSummaries].sort(
    (a, b) => b.totalValue - a.totalValue
  );

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
    <div className="container mx-auto space-y-8 px-4 py-8">
      <PortfolioSummary positions={positions} snapshotHistory={snapshotHistory} />

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

      <ExposureCharts
        exposure={exposure}
        lastCountryWeightsFetchDate={lastCountryWeightsFetchDate}
        geoTargets={targets.geography}
        capTargets={targets.marketCap}
      />

      <Separator className="bg-white/10" />

      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-border bg-[hsl(var(--surface-muted))] p-2">
            <BriefcaseBusiness className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">
              Mes Comptes <span className="text-white/35">({accountSummaries.length})</span>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Vue synthétique de vos comptes et de leur progression récente
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {sortedAccountSummaries.map((summary) => (
            <AccountCard key={summary.account.id} summary={summary} />
          ))}
        </div>
      </section>

      <Separator className="bg-white/10" />

      <PositionsSection
        positions={positions}
        portfolioTotalValue={totalValueEur}
      />
    </div>
  );
}
