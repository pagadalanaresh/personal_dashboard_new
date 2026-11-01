"use client";

import * as React from "react";
import type { EnrichedHolding } from "@/lib/holdings";
import type { HoldingInput } from "@/lib/validations";
import { useMarketPriceRefresh } from "@/hooks/use-market-price-refresh";
import { useMarket } from "@/lib/market-context";
import { getCached, setCached } from "@/hooks/client-cache";

function cacheKeyFor(market: string) {
  return `holdings:${market}`;
}

async function parseOrThrow(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

export function useHoldings() {
  const { market } = useMarket();
  const [holdings, setHoldings] = React.useState<EnrichedHolding[]>(
    () => getCached<EnrichedHolding[]>(cacheKeyFor(market)) ?? []
  );
  const [isLoading, setIsLoading] = React.useState(() => getCached(cacheKeyFor(market)) == null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(
    async (opts?: { silent?: boolean }) => {
      if (opts?.silent) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/holdings?market=${market}`, { cache: "no-store" });
        const data = await parseOrThrow(response);
        setHoldings(data.holdings);
        setCached(cacheKeyFor(market), data.holdings);
        setLastUpdated(Date.now());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load holdings");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [market]
  );

  React.useEffect(() => {
    // Fetch-on-mount and on every market switch: `load` itself sets
    // loading/error state before its internal await, which the new
    // set-state-in-effect rule flags — this is the standard "load data
    // when this hook mounts (or its market changes)" pattern. Silent when
    // a previous mount already cached data for this market — avoids
    // re-blanking to a loading skeleton for data we already have.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load({ silent: getCached(cacheKeyFor(market)) != null });
  }, [load, market]);

  useMarketPriceRefresh(React.useCallback(() => load({ silent: true }), [load]));

  const addHolding = React.useCallback(
    async (input: Omit<HoldingInput, "market">) => {
      const response = await fetch("/api/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, market }),
      });
      await parseOrThrow(response);
      await load({ silent: true });
    },
    [load, market]
  );

  const updateHolding = React.useCallback(
    async (id: string, input: Omit<HoldingInput, "market">) => {
      const response = await fetch(`/api/holdings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, market }),
      });
      await parseOrThrow(response);
      await load({ silent: true });
    },
    [load, market]
  );

  const deleteHolding = React.useCallback(
    async (id: string) => {
      const response = await fetch(`/api/holdings/${id}`, { method: "DELETE" });
      await parseOrThrow(response);
      await load({ silent: true });
    },
    [load]
  );

  const deleteHoldings = React.useCallback(
    async (ids: string[]) => {
      const response = await fetch("/api/holdings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      await parseOrThrow(response);
      await load({ silent: true });
    },
    [load]
  );

  return {
    holdings,
    isLoading,
    isRefreshing,
    lastUpdated,
    error,
    refresh: () => load({ silent: true }),
    addHolding,
    updateHolding,
    deleteHolding,
    deleteHoldings,
  };
}
