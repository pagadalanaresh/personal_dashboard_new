"use client";

import * as React from "react";
import type { NewsArticle } from "@/lib/market-data";
import { useMarket } from "@/lib/market-context";
import { getCached, setCached } from "@/hooks/client-cache";

export type AggregatedNewsArticle = NewsArticle & {
  symbol: string;
  companyName: string;
};

function cacheKeyFor(market: string) {
  return `news:${market}`;
}

export function useAllStockNews() {
  const { market } = useMarket();
  const [articles, setArticles] = React.useState<AggregatedNewsArticle[]>(
    () => getCached<AggregatedNewsArticle[]>(cacheKeyFor(market)) ?? []
  );
  const [isLoading, setIsLoading] = React.useState(() => getCached(cacheKeyFor(market)) == null);

  const load = React.useCallback(
    async (signal?: AbortSignal) => {
      const key = cacheKeyFor(market);
      setIsLoading(getCached(key) == null);
      try {
        const response = await fetch(`/api/news?market=${market}`, { cache: "no-store", signal });
        const data = await response.json();
        const next = data.articles ?? [];
        setArticles(next);
        setCached(key, next);
      } catch (error) {
        if ((error as { name?: string })?.name !== "AbortError") throw error;
        return;
      } finally {
        setIsLoading(false);
      }
    },
    [market]
  );

  React.useEffect(() => {
    const controller = new AbortController();
    // Fetch-on-mount and on every market switch: `load` sets loading state
    // before its internal await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(controller.signal);
    // Navigating away mid-fetch cancels the request instead of leaving the
    // News page's full symbol fan-out running and hogging Yahoo Finance's
    // shared request queue for whatever page comes next.
    return () => controller.abort();
  }, [load]);

  const refresh = React.useCallback(() => load(), [load]);

  return { articles, isLoading, refresh };
}
