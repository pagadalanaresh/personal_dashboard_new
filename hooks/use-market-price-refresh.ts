"use client";

import * as React from "react";
import { isMarketOpen } from "@/lib/market-hours";
import { useRefreshInterval } from "@/hooks/use-refresh-interval";

// Polls `refresh` on the user's configured interval, but only while the NSE
// market is open — no point re-fetching quotes that can't have changed.
export function useMarketPriceRefresh(refresh: () => void) {
  const [intervalMinutes] = useRefreshInterval();
  const refreshRef = React.useRef(refresh);

  React.useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      if (isMarketOpen(new Date())) refreshRef.current();
    }, intervalMinutes * 60_000);
    return () => clearInterval(interval);
  }, [intervalMinutes]);
}
