export function computeTargetForSnapshot(
  config: { startDate: string; monthlyIncrement: number; initialValue: number },
  snapshotDate: string,
  allSnapshots: Array<{ date: string; totalValueEur: number }>
): number {
  const date = new Date(snapshotDate);
  const prevMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;

  const prevMonthSnapshots = allSnapshots
    .filter((s) => s.date.startsWith(prevMonthStr))
    .sort((a, b) => a.date.localeCompare(b.date));

  const baseValue =
    prevMonthSnapshots.length > 0
      ? prevMonthSnapshots[prevMonthSnapshots.length - 1].totalValueEur
      : config.initialValue;

  return baseValue + config.monthlyIncrement;
}

export function computeVariance(currentValue: number, targetValue: number) {
  const variance = currentValue - targetValue;
  return { variance, isPositive: variance >= 0 };
}

export function computeMonthProgress(date: Date) {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const daysInMonth = lastDay.getDate();
  const daysRemaining = daysInMonth - date.getDate();
  const daysProgress = (date.getDate() / daysInMonth) * 100;
  return { daysInMonth, daysRemaining, daysProgress };
}

export function computeProgressRatios(currentValue: number, targetValue: number) {
  const maxValue = Math.max(currentValue, targetValue);
  if (maxValue === 0) return { targetRatio: 0, currentRatio: 0 };
  return {
    targetRatio: (targetValue / maxValue) * 100,
    currentRatio: (currentValue / maxValue) * 100,
  };
}

export function computeContributionProgress(
  contributedThisMonth: number,
  remainingToInvest: number,
  daysProgress: number
) {
  const plannedContribution = Math.max(contributedThisMonth + remainingToInvest, 0);
  const actualRatio =
    plannedContribution > 0
      ? Math.min((contributedThisMonth / plannedContribution) * 100, 100)
      : 100;
  const expectedRatio = Math.min(Math.max(daysProgress, 0), 100);
  const delta = actualRatio - expectedRatio;

  let pace: "ahead" | "on-track" | "behind" = "on-track";
  if (delta > 5) {
    pace = "ahead";
  } else if (delta < -5) {
    pace = "behind";
  }

  return {
    plannedContribution,
    actualRatio,
    expectedRatio,
    delta,
    pace,
  };
}

export function buildChartData(
  config: { startDate: string; monthlyIncrement: number; initialValue: number },
  snapshotHistory: Array<{ date: string; totalValueEur: number }>,
  locale = "fr-FR"
) {
  return snapshotHistory.slice(-6).map((snapshot) => ({
    date: new Date(snapshot.date).toLocaleDateString(locale, { month: "short", year: "2-digit" }),
    target: computeTargetForSnapshot(config, snapshot.date, snapshotHistory),
    actual: snapshot.totalValueEur,
  }));
}
