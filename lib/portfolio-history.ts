import "server-only";
import type { HistoryPoint } from "@/lib/market-data";

type WeightedSeries = {
  points: HistoryPoint[];
  quantity: number;
};

// Merges per-symbol histories into a single portfolio-value series.
// Real data sources don't guarantee identical timestamps/lengths across
// symbols (different listing dates, exchange calendars, etc.), so this
// forward-fills each series to the union of all timestamps rather than
// assuming the arrays line up index-for-index.
export function mergeWeightedHistories(series: WeightedSeries[]): HistoryPoint[] {
  const nonEmpty = series.filter((s) => s.points.length > 0);
  if (nonEmpty.length === 0) return [];

  const timestamps = Array.from(
    new Set(nonEmpty.flatMap((s) => s.points.map((p) => p.timestamp)))
  ).sort((a, b) => a - b);

  return timestamps.map((timestamp) => {
    const value = nonEmpty.reduce((sum, { points, quantity }) => {
      let latest = points[0].value;
      for (const point of points) {
        if (point.timestamp > timestamp) break;
        latest = point.value;
      }
      return sum + latest * quantity;
    }, 0);
    return { timestamp, value: Number(value.toFixed(2)) };
  });
}
