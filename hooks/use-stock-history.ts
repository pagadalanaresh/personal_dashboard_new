"use client";

import * as React from "react";
import type { HistoryPoint, HistoryRange } from "@/lib/market-data";

export function useStockHistory(symbol: string, range: HistoryRange) {
  const [points, setPoints] = React.useState<HistoryPoint[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    fetch(`/api/stocks/${encodeURIComponent(symbol)}/history?range=${range}`, {
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setPoints(data.points ?? []);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, range]);

  return { points, isLoading };
}
