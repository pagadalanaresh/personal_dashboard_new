"use client";

import * as React from "react";
import type { StockDetails } from "@/lib/market-data";
import { useMarketPriceRefresh } from "@/hooks/use-market-price-refresh";
import { useMarket } from "@/lib/market-context";

export function useStockDetails(symbol: string) {
  const { market } = useMarket();
  const [details, setDetails] = React.useState<StockDetails | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(
    (opts?: { silent?: boolean }) => {
      let cancelled = false;
      if (!opts?.silent) setIsLoading(true);
      fetch(`/api/stocks/${encodeURIComponent(symbol)}?market=${market}`, { cache: "no-store" })
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error ?? "Failed to load stock details");
          if (!cancelled) setDetails(data.details);
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong");
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
      return () => {
        cancelled = true;
      };
    },
    [symbol, market]
  );

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    return load();
  }, [load]);

  useMarketPriceRefresh(React.useCallback(() => load({ silent: true }), [load]));

  return { details, isLoading, error };
}
