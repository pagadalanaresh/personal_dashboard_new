"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isMarketOpen } from "@/lib/market-hours";

export function MarketStatus({
  lastUpdated,
  isRefreshing,
  onRefresh,
}: {
  lastUpdated: number | null;
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  const [now, setNow] = React.useState<Date | null>(null);

  React.useEffect(() => {
    // Clock starts client-side only (server can't know local market hours).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const open = now ? isMarketOpen(now) : null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {open !== null && (
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              open ? "bg-positive" : "bg-muted-foreground/50"
            )}
            aria-hidden
          />
          {open ? "Market open" : "Market closed"}
        </span>
      )}
      <span className="text-sm text-muted-foreground">
        {lastUpdated
          ? `Updated ${new Date(lastUpdated).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
          : "Loading…"}
      </span>
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
        <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
        Refresh
      </Button>
    </div>
  );
}
