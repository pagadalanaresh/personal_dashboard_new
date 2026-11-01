"use client";

import * as React from "react";
import { getCached, setCached } from "@/hooks/client-cache";

const CACHE_KEY = "market-indexes";

export type IndexQuote = {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
};

export function useMarketIndexes() {
  const [indexes, setIndexes] = React.useState<IndexQuote[]>(
    () => getCached<IndexQuote[]>(CACHE_KEY) ?? []
  );
  const [isLoading, setIsLoading] = React.useState(() => getCached(CACHE_KEY) == null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/market/indexes", { cache: "no-store" });
        const data = await response.json();
        if (!cancelled) {
          const next = data.indexes ?? [];
          setIndexes(next);
          setCached(CACHE_KEY, next);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { indexes, isLoading };
}
