"use client";

import * as React from "react";
import type { EnrichedWatchlistItem } from "@/lib/watchlist";
import type { WatchlistInput } from "@/lib/validations";
import { useMarketPriceRefresh } from "@/hooks/use-market-price-refresh";
import { useMarket } from "@/lib/market-context";
import { getCached, setCached } from "@/hooks/client-cache";

function cacheKeyFor(market: string) {
  return `watchlist:${market}`;
}

async function parseOrThrow(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

export function useWatchlist() {
  const { market } = useMarket();
  const [items, setItems] = React.useState<EnrichedWatchlistItem[]>(
    () => getCached<EnrichedWatchlistItem[]>(cacheKeyFor(market)) ?? []
  );
  const [isLoading, setIsLoading] = React.useState(() => getCached(cacheKeyFor(market)) == null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(
    async (opts?: { silent?: boolean }) => {
      if (opts?.silent) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/watchlist?market=${market}`, { cache: "no-store" });
        const data = await parseOrThrow(response);
        setItems(data.items);
        setCached(cacheKeyFor(market), data.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load watchlist");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [market]
  );

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load({ silent: getCached(cacheKeyFor(market)) != null });
  }, [load, market]);

  useMarketPriceRefresh(React.useCallback(() => load({ silent: true }), [load]));

  const addItem = React.useCallback(
    async (input: Omit<WatchlistInput, "market">) => {
      const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, market }),
      });
      await parseOrThrow(response);
      await load();
    },
    [load, market]
  );

  const updateItem = React.useCallback(
    async (id: string, input: Omit<WatchlistInput, "market">) => {
      const response = await fetch(`/api/watchlist/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, market }),
      });
      await parseOrThrow(response);
      await load();
    },
    [load, market]
  );

  const deleteItem = React.useCallback(
    async (id: string) => {
      const response = await fetch(`/api/watchlist/${id}`, { method: "DELETE" });
      await parseOrThrow(response);
      await load();
    },
    [load]
  );

  const deleteItems = React.useCallback(
    async (ids: string[]) => {
      const response = await fetch("/api/watchlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      await parseOrThrow(response);
      await load();
    },
    [load]
  );

  // Optimistically reflects a drag-and-drop move immediately, then persists
  // it in the background — rolling back just that item if the save fails.
  const moveToSection = React.useCallback(
    async (id: string, sectionId: string | null) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      const previousSectionId = item.sectionId;

      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, sectionId } : i)));

      try {
        const response = await fetch(`/api/watchlist/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: item.symbol,
            name: item.name,
            buyPrice: item.buyPrice ?? undefined,
            targetPrice: item.targetPrice ?? undefined,
            stopLoss: item.stopLoss ?? undefined,
            position: item.position,
            market: item.market,
            sectionId,
            notes: item.notes ?? undefined,
          }),
        });
        await parseOrThrow(response);
      } catch (err) {
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, sectionId: previousSectionId } : i))
        );
        throw err;
      }
    },
    [items]
  );

  return {
    items,
    isLoading,
    isRefreshing,
    error,
    addItem,
    updateItem,
    deleteItem,
    deleteItems,
    moveToSection,
  };
}
