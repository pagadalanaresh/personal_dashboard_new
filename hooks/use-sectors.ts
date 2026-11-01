"use client";

import * as React from "react";
import { useMarket } from "@/lib/market-context";

export function useSectors(symbols: string[]) {
  const { market } = useMarket();
  const key = symbols.slice().sort().join(",");
  const [sectors, setSectors] = React.useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    if (!key) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSectors({});
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    fetch(`/api/market-data/sectors?symbols=${encodeURIComponent(key)}&market=${market}`, {
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setSectors(data.sectors ?? {});
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, market]);

  return { sectors, isLoading };
}
