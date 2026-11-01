"use client";

import * as React from "react";
import type { NewsArticle } from "@/lib/market-data";
import { useMarket } from "@/lib/market-context";

export function useStockNews(symbol: string, name?: string) {
  const { market } = useMarket();
  const [articles, setArticles] = React.useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!name) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    const query = `?name=${encodeURIComponent(name)}&market=${market}`;
    fetch(`/api/stocks/${encodeURIComponent(symbol)}/news${query}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setArticles(data.articles ?? []);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, name, market]);

  return { articles, isLoading };
}
