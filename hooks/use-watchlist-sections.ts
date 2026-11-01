"use client";

import * as React from "react";
import type { WatchlistSection } from "@prisma/client";
import type { WatchlistSectionInput } from "@/lib/validations";
import { useMarket } from "@/lib/market-context";
import { getCached, setCached } from "@/hooks/client-cache";

function cacheKeyFor(market: string) {
  return `watchlist-sections:${market}`;
}

async function parseOrThrow(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

export function useWatchlistSections() {
  const { market } = useMarket();
  const [sections, setSections] = React.useState<WatchlistSection[]>(
    () => getCached<WatchlistSection[]>(cacheKeyFor(market)) ?? []
  );
  const [isLoading, setIsLoading] = React.useState(() => getCached(cacheKeyFor(market)) == null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/watchlist/sections?market=${market}`, {
          cache: "no-store",
        });
        const data = await parseOrThrow(response);
        setSections(data.sections);
        setCached(cacheKeyFor(market), data.sections);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load sections");
      } finally {
        setIsLoading(false);
      }
    },
    [market]
  );

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load({ silent: getCached(cacheKeyFor(market)) != null });
  }, [load, market]);

  const addSection = React.useCallback(
    async (input: Omit<WatchlistSectionInput, "market">) => {
      const response = await fetch("/api/watchlist/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, market }),
      });
      const data = await parseOrThrow(response);
      await load({ silent: true });
      return data.section as WatchlistSection;
    },
    [load, market]
  );

  const renameSection = React.useCallback(
    async (id: string, input: Omit<WatchlistSectionInput, "market">) => {
      const response = await fetch(`/api/watchlist/sections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, market }),
      });
      await parseOrThrow(response);
      await load({ silent: true });
    },
    [load, market]
  );

  const deleteSection = React.useCallback(
    async (id: string) => {
      const response = await fetch(`/api/watchlist/sections/${id}`, { method: "DELETE" });
      await parseOrThrow(response);
      await load({ silent: true });
    },
    [load]
  );

  return { sections, isLoading, error, addSection, renameSection, deleteSection };
}
