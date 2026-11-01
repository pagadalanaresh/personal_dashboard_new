"use client";

import * as React from "react";
import type { TransactionDto } from "@/lib/transactions";
import type { TransactionInput } from "@/lib/validations";
import { useMarket } from "@/lib/market-context";
import { getCached, setCached } from "@/hooks/client-cache";

function cacheKeyFor(market: string) {
  return `transactions:${market}`;
}

async function parseOrThrow(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

export function useTransactions() {
  const { market } = useMarket();
  const [transactions, setTransactions] = React.useState<TransactionDto[]>(
    () => getCached<TransactionDto[]>(cacheKeyFor(market)) ?? []
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
        const response = await fetch(`/api/transactions?market=${market}`, { cache: "no-store" });
        const data = await parseOrThrow(response);
        setTransactions(data.transactions);
        setCached(cacheKeyFor(market), data.transactions);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load transactions");
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

  const addTransaction = React.useCallback(
    async (input: Omit<TransactionInput, "market">) => {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, market }),
      });
      await parseOrThrow(response);
      await load();
    },
    [load, market]
  );

  const deleteTransaction = React.useCallback(
    async (id: string) => {
      const response = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      await parseOrThrow(response);
      await load();
    },
    [load]
  );

  const deleteTransactions = React.useCallback(
    async (ids: string[]) => {
      const response = await fetch("/api/transactions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      await parseOrThrow(response);
      await load();
    },
    [load]
  );

  return {
    transactions,
    isLoading,
    isRefreshing,
    error,
    addTransaction,
    deleteTransaction,
    deleteTransactions,
  };
}
