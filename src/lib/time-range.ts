export type TimeRange = "30d" | "90d" | "6m" | "ytd" | "12m";

export const timeRangeLabels: Record<TimeRange, string> = {
  "30d": "30 jours",
  "90d": "90 jours",
  "6m": "6 mois",
  "ytd": "YTD",
  "12m": "12 mois",
};

export function getTimeRangeCutoff(range: TimeRange, now = new Date()): Date {
  switch (range) {
    case "30d":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    case "90d":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
    case "6m":
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case "ytd":
      return new Date(now.getFullYear(), 0, 1);
    case "12m":
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  }
}
