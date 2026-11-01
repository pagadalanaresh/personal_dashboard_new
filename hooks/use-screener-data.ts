"use client";

import * as React from "react";
import type { ScreenerData } from "@/lib/screener";

export function useScreenerData(symbol: string) {
  const [data, setData] = React.useState<ScreenerData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setNotFound(false);
    fetch(`/api/stocks/${encodeURIComponent(symbol)}/screener`, { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const json = await response.json();
        if (!cancelled) setData(json);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return { data, isLoading, notFound };
}
