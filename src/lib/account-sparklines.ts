export interface AccountSnapshotPoint {
  accountId: number;
  date: string | null;
  totalValueEur: number | null;
}

export function buildAccountSparklineHistory(
  snapshotRows: AccountSnapshotPoint[]
): Map<number, Array<{ date: string; value: number }>> {
  const historyByAccount = new Map<number, Array<{ date: string; value: number }>>();

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
