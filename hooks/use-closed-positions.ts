"use client";

import * as React from "react";
import type { ClosedPosition } from "@/lib/closed-positions";
import { useMarket } from "@/lib/market-context";

async function parseOrThrow(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

export function useClosedPositions() {
  const { market } = useMarket();
  const [positions, setPositions] = React.useState<ClosedPosition[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/closed-positions?market=${market}`, { cache: "no-store" });
      const data = await parseOrThrow(response);
      setPositions(data.positions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load closed positions");
    } finally {
      setIsLoading(false);
    }
  }, [market]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const deletePositions = React.useCallback(
    async (transactionIds: string[]) => {
      const response = await fetch("/api/closed-positions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionIds }),
      });
      await parseOrThrow(response);
      await load();
    },
    [load]
  );

  // Notes for a closed position live on its closing transaction — there's
  // no separate row for the episode itself to attach them to.
  const updateNotes = React.useCallback(
    async (closingTransactionId: string, notes: string) => {
      const response = await fetch(`/api/transactions/${closingTransactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      await parseOrThrow(response);
      await load();
    },
    [load]
  );

  return { positions, isLoading, error, deletePositions, updateNotes };
}
