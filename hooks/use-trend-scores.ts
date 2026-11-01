"use client";

import * as React from "react";
import type { HistoryPoint } from "@/lib/market-data";
import { analyzeTrend, type TrendAnalysis } from "@/lib/trend-analysis";

// Batched version of the single-symbol history fetch in useStockHistory —
// list views (watchlist, holdings) need a trend score per row, both to
// render the badge and to sort the column by it, so the scores need to
// live in the table component rather than inside each row's own badge.
export function useTrendScores(symbols: string[]) {
  const [scores, setScores] = React.useState<Map<string, TrendAnalysis | null>>(new Map());
  const [isLoading, setIsLoading] = React.useState(true);

  // Symbols are typically re-derived (mapped) on every render by the
  // caller, so key on their content rather than array identity.
  const key = symbols.join(",");

  React.useEffect(() => {
    let cancelled = false;
    const uniqueSymbols = Array.from(new Set(symbols));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    // An empty list resolves immediately via the .then() below — no need
    // for a separate early-return branch.
    Promise.all(
      uniqueSymbols.map(async (symbol) => {
        try {
          const response = await fetch(
            `/api/stocks/${encodeURIComponent(symbol)}/history?range=1M`,
            { cache: "no-store" }
          );
          const data = await response.json();
          const points: HistoryPoint[] = data.points ?? [];
          return [symbol, analyzeTrend(points)] as const;
        } catch {
          return [symbol, null] as const;
        }
      })
    ).then((entries) => {
      if (cancelled) return;
      setScores(new Map(entries));
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { scores, isLoading };
}
