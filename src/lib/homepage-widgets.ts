export interface AccountSnapshotPoint {
  accountId: number;
  date: string | null;
  totalValueEur: number | null;
}

export interface AccountSparklinePoint {
  date: string;
  value: number;
}

export function buildAccountSparklineHistory(
  snapshotRows: AccountSnapshotPoint[]
): Map<number, AccountSparklinePoint[]> {
  const historyByAccount = new Map<number, AccountSparklinePoint[]>();

  for (const row of snapshotRows) {
    if (!row.date || row.totalValueEur === null) {
      continue;
    }

    const history = historyByAccount.get(row.accountId) ?? [];
    history.push({
      date: row.date,
      value: row.totalValueEur,
    });
    historyByAccount.set(row.accountId, history);
  }

  for (const [accountId, history] of historyByAccount.entries()) {
    historyByAccount.set(
      accountId,
      history.sort((a, b) => a.date.localeCompare(b.date))
    );
  }

  return historyByAccount;
}

export function computePositionAllocation(
  positionValue: number,
  portfolioTotalValue: number
): number {
  if (portfolioTotalValue <= 0) {
    return 0;
  }

  return positionValue / portfolioTotalValue;
}
