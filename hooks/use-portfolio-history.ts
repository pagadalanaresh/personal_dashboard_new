"use client";

import * as React from "react";
import type { HistoryRange, HistoryPoint } from "@/lib/market-data";
import { useMarket } from "@/lib/market-context";
import { getCached, setCached } from "@/hooks/client-cache";

function cacheKeyFor(range: HistoryRange, market: string) {
  return `portfolio-history:${market}:${range}`;
}

export function usePortfolioHistory(range: HistoryRange, dependency: number) {
  const { market } = useMarket();
  const [points, setPoints] = React.useState<HistoryPoint[]>(
    () => getCached<HistoryPoint[]>(cacheKeyFor(range, market)) ?? []
  );
  const [isLoading, setIsLoading] = React.useState(
    () => getCached(cacheKeyFor(range, market)) == null
  );

  React.useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const key = cacheKeyFor(range, market);
    const cached = getCached<HistoryPoint[]>(key);
    if (cached) {
      // Show the last known data for this range/market instantly instead of
      // blanking to a skeleton — e.g. navigating back from a details page.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPoints(cached);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
    fetch(`/api/portfolio/history?range=${range}&market=${market}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          const nextPoints = data.points ?? [];
          setPoints(nextPoints);
          setCached(key, nextPoints);
        }
      })
      .catch((error) => {
        if (error?.name !== "AbortError") throw error;
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
      // Navigating away mid-fetch drops the browser's connection immediately
      // instead of leaving it (and the server-side Yahoo queue slot it's
      // waiting on) occupied until the abandoned response finally arrives.
      controller.abort();
    };
  }, [range, market, dependency]);

  return { points, isLoading };
}
